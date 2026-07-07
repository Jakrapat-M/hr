#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# ⛔ SINGLE MERGE LANE — this script is the ONLY sanctioned path to master.
#    merge-ready.sh and ship.mjs both delegate every actual merge here.
#    Never run `gh pr merge` directly (the one legitimate call site is inside
#    this script). Runbook: docs/two-session-workflow.md
# ═════════════════════════════════════════════════════════════════════════════
# pr-merge-gate.sh — validate a PR on the tip it will ACTUALLY land on, then merge safely.
#
# GitHub's MERGEABLE only means "no git conflict". It does NOT catch:
#   - stale-base override (PR off an old master silently reverts sibling work)
#   - semantic file overlap between two open PRs (last-merged wins, clobbers the first)
#   - accidental deletion of existing i18n keys / routes (feature vanishes)
# This gate closes those gaps by rebasing each PR onto FRESH origin/master and
# asserting nothing existing disappeared, before it lets the merge happen.
#
# Tests are BASELINE-DIFFED: the suite is run once on origin/master (cached per SHA
# under .omc/state/) and once on the rebased PR — the PR fails ONLY if it introduces
# a failure that master doesn't already have. So a PR is never blocked by someone
# else's pre-existing red; it is blocked only by regressions IT causes.
#
# Usage:
#   pr-merge-gate.sh <PR#> [<PR#>...]      # DRY validate the given PR(s) — merge nothing
#   pr-merge-gate.sh --all                 # DRY validate every open MERGEABLE PR
#   pr-merge-gate.sh --go <PR#> [...]      # validate then MERGE each PR that passes (serialized)
#   pr-merge-gate.sh --go --all            # validate+merge all, re-checking each on the new master
#
# Flags:
#   --fast              skip `npm run build` (run vitest only) — quicker, less thorough
#   --allow-removals    let a PR that deletes existing i18n keys / routes still pass
#                       (use only when the deletion is the intended change, e.g. a "remove X" ticket)
#   --rebase-source     auto-repair a branch that is merely behind: rebase it in its
#                       source worktree, `git push --force-with-lease`, then re-gate.
#                       Never resolves conflicts — a real conflict still fails with
#                       instructions. Force-push invalidates the ticket's verified preview.
#   --allow-hot-overlap let a PR that overlaps another OPEN PR on a hot file (i18n
#                       catalogs, sidebar, registries, mock-data seeds) pass anyway —
#                       hot-file overlap is otherwise a gate FAILURE (see HOT_FILES).
#
# Guarantees: runs in a throwaway worktree off origin/master — NEVER touches the shared tree,
# never merges on red, serializes merges (re-validates the next PR against the just-updated master),
# and leaves Linear alone (Done is human-only).
set -uo pipefail

REPO="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "❌ not inside a git repo"; exit 1; }
cd "$REPO" || exit 1
command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI not found"; exit 1; }
FE="$REPO/src/frontend"                       # the active Next.js app
ROOT_NM="$REPO/node_modules"

GO=0; ALL=0; FAST=0; ALLOW_RM=0; REBASE_SRC=0; ALLOW_HOT=0; PRS=()
for a in "$@"; do
  case "$a" in
    --go) GO=1 ;;
    --all) ALL=1 ;;
    --fast) FAST=1 ;;
    --allow-removals) ALLOW_RM=1 ;;
    --rebase-source) REBASE_SRC=1 ;;
    --allow-hot-overlap) ALLOW_HOT=1 ;;
    [0-9]*) PRS+=("$a") ;;
    *) echo "⚠️  ignoring unknown arg: $a" ;;
  esac
done

git fetch origin --prune -q 2>/dev/null

# ---- resolve the PR list ---------------------------------------------------
RAW=$(gh pr list --state open --json number,title,mergeable --limit 50 2>/dev/null)
[ -z "$RAW" ] && { echo "⚠️  gh returned nothing (transient/auth) — aborting, retry."; exit 1; }
if [ "$ALL" -eq 1 ]; then
  while IFS= read -r n; do [ -n "$n" ] && PRS+=("$n"); done < <(echo "$RAW" | python3 -c '
import json,sys
for p in sorted(json.load(sys.stdin),key=lambda x:x["number"]):
    if p["mergeable"]=="MERGEABLE": print(p["number"])')
fi
if [ ${#PRS[@]} -eq 0 ]; then echo "✅ no PRs to gate"; exit 0; fi
echo "▶ gating PRs: ${PRS[*]}   (mode: $([ $GO -eq 1 ] && echo MERGE || echo DRY-RUN)$([ $FAST -eq 1 ] && echo ' ,fast'))"

# ---- helpers ---------------------------------------------------------------
# flatten en.json leaf key-paths for a given git ref (BEFORE the rebased tree exists we read from a ref)
i18n_keys_from_file() {  # $1 = path to en.json
  python3 - "$1" <<'PY' 2>/dev/null
import json,sys
def walk(o,p=""):
    if isinstance(o,dict):
        for k,v in o.items(): walk(v,p+"/"+k)
    else: print(p)
try:
    walk(json.load(open(sys.argv[1])))
except Exception: pass
PY
}

# extract "file :: fullName" for every FAILED test from a vitest json-reporter file
vitest_failset() {  # $1 = path to vitest --reporter=json output
  python3 - "$1" <<'PY' 2>/dev/null
import json,sys
try: d=json.load(open(sys.argv[1]))
except Exception: sys.exit(0)
for tr in d.get("testResults",[]):
    f=tr.get("name","")
    i=f.find("/src/frontend/")          # normalize absolute worktree path → repo-relative
    if i>=0: f=f[i+1:]                   # so baseline & PR identifiers are comparable
    for a in tr.get("assertionResults",[]):
        if a.get("status")=="failed":
            print(f+" :: "+(a.get("fullName") or a.get("title") or ""))
PY
}

# baseline fail-set of origin/master (cached per SHA so multiple PRs in one run share it)
BASELINE_DIR="$REPO/.omc/state"; mkdir -p "$BASELINE_DIR" 2>/dev/null
baseline_failset() {  # echoes path to a file listing origin/master's pre-existing failing tests
  local sha cache bwt
  sha=$(git rev-parse origin/master)
  cache="$BASELINE_DIR/gate-baseline-$sha.txt"
  [ -f "$cache" ] && { echo "$cache"; return; }
  bwt="$REPO/../hr-gate-baseline"
  git worktree remove "$bwt" --force >/dev/null 2>&1 || true
  git worktree add --detach "$bwt" origin/master >/dev/null 2>&1 || { : > "$cache"; echo "$cache"; return; }
  ln -s "$ROOT_NM" "$bwt/node_modules" 2>/dev/null || true
  ln -s "$ROOT_NM" "$bwt/src/frontend/node_modules" 2>/dev/null || true
  ( cd "$bwt/src/frontend" && npx vitest run --reporter=json --outputFile="$bwt/.vres.json" ) >/dev/null 2>&1 || true
  if [ -s "$bwt/.vres.json" ]; then vitest_failset "$bwt/.vres.json" | sort -u > "$cache"; else : > "$cache"; fi
  git worktree remove "$bwt" --force >/dev/null 2>&1 || true
  echo "$cache"
}

WT_BRANCHES=$(git worktree list --porcelain | awk '/^branch /{sub("refs/heads/","",$2); print $2}')

# Conflict magnets: nearly every ticket touches these, so two open PRs on the
# same one = whoever merges second silently reverts the first. Overlap here is
# a gate FAILURE (merge one, --rebase-source the other, re-gate) unless
# --allow-hot-overlap is passed.
HOT_FILES=$(sort <<'EOF'
src/frontend/messages/en.json
src/frontend/messages/th.json
src/frontend/src/components/humi/shell/Sidebar.tsx
src/frontend/src/lib/approval-registry.ts
src/frontend/src/lib/humi-mock-data.ts
src/frontend/src/lib/humi-mock-data-sf-parity.ts
src/frontend/src/lib/humi-mock-data-sf-real.ts
src/frontend/src/lib/ec-maintain-registry.ts
EOF
)

# invalidate a ticket's ship state after a force-push (preview must be re-verified)
invalidate_ship_preview() {  # $1 = branch name
  local ticket sf
  ticket=$(echo "$1" | grep -oiE '[a-z]+-[0-9]+' | head -1 | tr '[:lower:]' '[:upper:]')
  [ -z "$ticket" ] && return 0
  sf="$REPO/.claude/skills/ship/.state/$ticket.json"
  [ -f "$sf" ] || return 0
  python3 - "$sf" <<'PY' 2>/dev/null || true
import json,sys
p=sys.argv[1]
d=json.load(open(p)); d["previewVerified"]=False
open(p,"w").write(json.dumps(d,indent=2)+"\n")
PY
  echo "  ℹ️  ship state $ticket: previewVerified → false (force-push)"
}

PASSED=(); FAILED=(); SKIPPED=()

# ---- per-PR gate -----------------------------------------------------------
for NUM in "${PRS[@]}"; do
  echo ""
  echo "════════════════════ PR #$NUM ════════════════════"
  git fetch origin --prune -q 2>/dev/null
  META=$(gh pr view "$NUM" --json headRefName,mergeable,title 2>/dev/null)
  [ -z "$META" ] && { echo "  ✗ cannot read PR #$NUM"; FAILED+=("$NUM(read)"); continue; }
  HEAD=$(echo "$META" | python3 -c 'import json,sys;print(json.load(sys.stdin)["headRefName"])')
  MRG=$(echo  "$META" | python3 -c 'import json,sys;print(json.load(sys.stdin)["mergeable"])')
  echo "  branch: $HEAD   mergeable(GH): $MRG"
  if [ "$MRG" = "CONFLICTING" ]; then echo "  ✗ GH reports CONFLICTING — rebase in the source worktree first."; FAILED+=("$NUM(conflict)"); continue; fi

  # (0) --rebase-source auto-repair: branch merely behind fresh master → rebase it
  # in its SOURCE worktree and force-push (with lease), then gate the fresh head.
  if [ "$REBASE_SRC" -eq 1 ] && ! git merge-base --is-ancestor origin/master "origin/$HEAD" 2>/dev/null; then
    SRC=$(git worktree list --porcelain | awk -v b="refs/heads/$HEAD" '/^worktree /{w=$2} $0=="branch "b{print w}')
    if [ -z "$SRC" ]; then
      echo "  ✗ (0) --rebase-source: no worktree has '$HEAD' checked out — recreate the ticket worktree, rebase there, push, re-gate"
      FAILED+=("$NUM(no-source-worktree)"); continue
    fi
    if [ -n "$(git -C "$SRC" status --porcelain 2>/dev/null)" ]; then
      echo "  ✗ (0) --rebase-source: source worktree $SRC is DIRTY — commit there first, then re-gate"
      FAILED+=("$NUM(dirty-source)"); continue
    fi
    if git -C "$SRC" rebase origin/master >/dev/null 2>&1; then
      if git -C "$SRC" push --force-with-lease origin "$HEAD" >/dev/null 2>&1; then
        echo "  ✓ (0) rebased '$HEAD' onto fresh origin/master in $SRC + force-pushed (with lease)"
        invalidate_ship_preview "$HEAD"
        git fetch origin -q
      else
        echo "  ✗ (0) --rebase-source: force-with-lease push rejected (remote moved?) — inspect $SRC manually"
        FAILED+=("$NUM(push-rejected)"); continue
      fi
    else
      git -C "$SRC" rebase --abort >/dev/null 2>&1 || true
      CONFL=$(comm -12 <(git diff --name-only origin/master "origin/$HEAD" 2>/dev/null | sort -u) \
                       <(git diff --name-only "$(git merge-base origin/master "origin/$HEAD" 2>/dev/null)" origin/master 2>/dev/null | sort -u) | head -6 | tr '\n' ',' | sed 's/,$//')
      echo "  ✗ (0) --rebase-source: REAL rebase conflict for '$HEAD' — resolve manually in $SRC (likely files: ${CONFL:-unknown}), rebuild, re-gate"
      FAILED+=("$NUM(rebase-conflict)"); continue
    fi
  fi

  GATE="$REPO/../hr-gate-$NUM"
  git worktree remove "$GATE" --force >/dev/null 2>&1 || true
  # detached checkout of the REMOTE head → never collides with a worktree-locked local branch
  if ! git worktree add --detach "$GATE" "origin/$HEAD" >/dev/null 2>&1; then
    echo "  ✗ could not create gate worktree for origin/$HEAD"; FAILED+=("$NUM(worktree)"); continue; fi
  ln -s "$ROOT_NM" "$GATE/node_modules" 2>/dev/null || true
  ln -s "$ROOT_NM" "$GATE/src/frontend/node_modules" 2>/dev/null || true

  ok=1; reasons=""

  # (1) FRESHNESS REBASE onto latest origin/master — catches stale-base override / semantic conflict
  if git -C "$GATE" rebase origin/master >/dev/null 2>&1; then
    echo "  ✓ (1) rebases clean onto fresh origin/master"
  else
    git -C "$GATE" rebase --abort >/dev/null 2>&1 || true
    echo "  ✗ (1) REBASE CONFLICT on fresh origin/master — stale base / real conflict. Source branch must rebase + re-test."
    ok=0; reasons="stale-base/rebase-conflict"
  fi

  # (5) FEATURE-PRESERVATION sentinel — did this PR delete existing i18n keys (EN *and* TH) or routes?
  if [ "$ok" -eq 1 ]; then
    REMOVED_KEYS=""
    for LOC in en th; do
      BASE_KEYS=$(mktemp); NEW_KEYS=$(mktemp)
      git show "origin/master:src/frontend/messages/$LOC.json" > "$GATE/.gate-base-$LOC.json" 2>/dev/null
      i18n_keys_from_file "$GATE/.gate-base-$LOC.json" | sort > "$BASE_KEYS"
      i18n_keys_from_file "$GATE/src/frontend/messages/$LOC.json" | sort > "$NEW_KEYS"
      rm -f "$GATE/.gate-base-$LOC.json"
      RM_LOC=$(comm -23 "$BASE_KEYS" "$NEW_KEYS" | head -12 | sed "s/^/[$LOC] /")
      [ -n "$RM_LOC" ] && REMOVED_KEYS="${REMOVED_KEYS}${REMOVED_KEYS:+
}$RM_LOC"
      rm -f "$BASE_KEYS" "$NEW_KEYS"
    done
    # routes present on master must still exist
    BASE_ROUTES=$(mktemp); NEW_ROUTES=$(mktemp)
    git ls-tree -r --name-only origin/master | grep -E '\[locale\].*page\.tsx$' | sort > "$BASE_ROUTES"
    ( cd "$GATE" && git ls-files 'src/frontend/src/app/*page.tsx' | grep -E '\[locale\].*page\.tsx$' | sort ) > "$NEW_ROUTES"
    REMOVED_ROUTES=$(comm -23 "$BASE_ROUTES" "$NEW_ROUTES" | head -12)
    rm -f "$BASE_ROUTES" "$NEW_ROUTES"
    if [ -n "$REMOVED_KEYS" ] || [ -n "$REMOVED_ROUTES" ]; then
      echo "  ⚠ (5) this PR REMOVES things that exist on master:"
      [ -n "$REMOVED_KEYS" ]   && { echo "     i18n keys:";  echo "$REMOVED_KEYS"   | sed 's/^/       /'; }
      [ -n "$REMOVED_ROUTES" ] && { echo "     routes:";     echo "$REMOVED_ROUTES" | sed 's/^/       /'; }
      if [ "$ALLOW_RM" -eq 1 ]; then echo "     (--allow-removals set → treated as intended)";
      else ok=0; reasons="${reasons:+$reasons; }removes-existing-features (pass --allow-removals if intended)"; fi
    else
      echo "  ✓ (5) no existing i18n key (en/th) or route removed"
    fi
  fi

  # (5b) LOCALE PARITY — en.json and th.json must carry the same leaf key-paths.
  # Baseline-diffed like the tests: only asymmetry INTRODUCED by this PR fails
  # (a pre-existing asymmetry on master never blocks an unrelated PR).
  if [ "$ok" -eq 1 ]; then
    EN_K=$(mktemp); TH_K=$(mktemp); PR_ASYM=$(mktemp); BASE_ASYM=$(mktemp)
    i18n_keys_from_file "$GATE/src/frontend/messages/en.json" | sort > "$EN_K"
    i18n_keys_from_file "$GATE/src/frontend/messages/th.json" | sort > "$TH_K"
    { comm -23 "$EN_K" "$TH_K" | sed 's/^/en-only /'; comm -13 "$EN_K" "$TH_K" | sed 's/^/th-only /'; } | sort > "$PR_ASYM"
    git show "origin/master:src/frontend/messages/en.json" > "$GATE/.gate-p-en.json" 2>/dev/null
    git show "origin/master:src/frontend/messages/th.json" > "$GATE/.gate-p-th.json" 2>/dev/null
    i18n_keys_from_file "$GATE/.gate-p-en.json" | sort > "$EN_K"
    i18n_keys_from_file "$GATE/.gate-p-th.json" | sort > "$TH_K"
    { comm -23 "$EN_K" "$TH_K" | sed 's/^/en-only /'; comm -13 "$EN_K" "$TH_K" | sed 's/^/th-only /'; } | sort > "$BASE_ASYM"
    NEW_ASYM=$(comm -23 "$PR_ASYM" "$BASE_ASYM" | head -12)
    rm -f "$EN_K" "$TH_K" "$PR_ASYM" "$BASE_ASYM" "$GATE/.gate-p-en.json" "$GATE/.gate-p-th.json"
    if [ -n "$NEW_ASYM" ]; then
      echo "  ✗ (5b) EN/TH PARITY BROKEN by this PR (key exists in one catalog only):"
      echo "$NEW_ASYM" | sed 's/^/       /'
      ok=0; reasons="${reasons:+$reasons; }locale-parity (add the missing twin key)"
    else
      echo "  ✓ (5b) en/th key-path parity preserved"
    fi
  fi

  # (2) BUILD + TEST on the rebased result
  if [ "$ok" -eq 1 ]; then
    if [ "$FAST" -eq 0 ]; then
      if ( cd "$GATE/src/frontend" && npm run build ) >"$GATE/.gate-build.log" 2>&1; then
        echo "  ✓ (2a) build clean"
      else echo "  ✗ (2a) BUILD FAILED — tail:"; tail -6 "$GATE/.gate-build.log" | sed 's/^/       /'; ok=0; reasons="${reasons:+$reasons; }build-failed"; fi
    fi
    if [ "$ok" -eq 1 ]; then
      # baseline-diff: only fail if THIS PR introduces failures origin/master doesn't already have
      ( cd "$GATE/src/frontend" && npx vitest run --reporter=json --outputFile="$GATE/.vres.json" ) >"$GATE/.gate-test.log" 2>&1 || true
      if [ ! -s "$GATE/.vres.json" ]; then
        echo "  ✗ (2b) vitest produced no results (infra/crash) — tail:"; tail -6 "$GATE/.gate-test.log" | sed 's/^/       /'
        ok=0; reasons="${reasons:+$reasons; }test-infra"
      else
        PR_FS=$(mktemp); vitest_failset "$GATE/.vres.json" | sort -u > "$PR_FS"
        BASE_FS=$(baseline_failset)
        NEWFAILS=$(comm -23 "$PR_FS" "$BASE_FS")
        PREN=$(wc -l < "$BASE_FS" | tr -d ' '); PRN=$(wc -l < "$PR_FS" | tr -d ' ')
        if [ -n "$NEWFAILS" ]; then
          echo "  ✗ (2b) PR INTRODUCES NEW test failures (not on master baseline):"
          echo "$NEWFAILS" | head -10 | sed 's/^/       /'
          ok=0; reasons="${reasons:+$reasons; }new-test-failures"
        else
          echo "  ✓ (2b) no NEW failures (PR fails:$PRN ⊆ master baseline:$PREN pre-existing)"
        fi
        rm -f "$PR_FS"
      fi
    fi
  fi

  # (3) OVERLAP scan vs other open PRs + shared-tree WIP.
  # Non-hot overlap = warning. Overlap on a HOT file with another OPEN PR = gate
  # FAILURE (serial landing: merge one, --rebase-source the other, re-gate).
  PRF=$(git -C "$GATE" diff --name-only origin/master...HEAD 2>/dev/null | sort -u)
  if [ -n "$PRF" ]; then
    SHARED_WIP=$(cd "$REPO" && { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)
    HITW=$(comm -12 <(echo "$PRF") <(echo "$SHARED_WIP") | head -8)
    [ -n "$HITW" ] && echo "  ⚠ (3) OVERLAP with uncommitted WIP in the shared tree (merge may collide): $(echo "$HITW" | tr '\n' ',' | sed 's/,$//')"
    for ONUM in $(echo "$RAW" | python3 -c 'import json,sys;[print(p["number"]) for p in json.load(sys.stdin)]'); do
      [ "$ONUM" = "$NUM" ] && continue
      OF=$(gh pr view "$ONUM" --json files -q '.files[].path' 2>/dev/null | sort -u)
      [ -z "$OF" ] && continue
      HITP=$(comm -12 <(echo "$PRF") <(echo "$OF"))
      [ -z "$HITP" ] && continue
      HOTHIT=$(comm -12 <(echo "$HITP") <(echo "$HOT_FILES") | head -6)
      if [ -n "$HOTHIT" ]; then
        if [ "$ALLOW_HOT" -eq 1 ]; then
          echo "  ⚠ (3) HOT-FILE overlap with open PR #$ONUM (--allow-hot-overlap set → allowed): $(echo "$HOTHIT" | tr '\n' ',' | sed 's/,$//')"
        else
          FIRST=$(( NUM < ONUM ? NUM : ONUM )); SECOND=$(( NUM < ONUM ? ONUM : NUM ))
          echo "  🔴 (3) HOT-FILE OVERLAP with open PR #$ONUM: $(echo "$HOTHIT" | tr '\n' ',' | sed 's/,$//')"
          echo "     resolution: merge #$FIRST first, then pr-merge-gate.sh --rebase-source --go $SECOND (re-gate on the new tip)"
          ok=0; reasons="${reasons:+$reasons; }hot-file-overlap(#$ONUM)"
        fi
      else
        echo "  ⚠ (3) OVERLAP with open PR #$ONUM (whoever merges 2nd overrides 1st): $(echo "$HITP" | head -6 | tr '\n' ',' | sed 's/,$//')"
      fi
    done
  fi

  # ---- verdict + merge ----
  git worktree remove "$GATE" --force >/dev/null 2>&1 || true
  git branch -D "$(basename "$GATE")" >/dev/null 2>&1 || true
  if [ "$ok" -ne 1 ]; then
    echo "  🔴 GATE FAILED (#$NUM): $reasons"
    FAILED+=("$NUM"); continue
  fi
  echo "  🟢 GATE PASSED (#$NUM)"
  PASSED+=("$NUM")
  if [ "$GO" -eq 1 ]; then
    echo "  MERGE-LANE: pr-merge-gate --go #$NUM ($HEAD)"   # single-lane audit marker
    echo "  → merging #${NUM} ..."
    if printf '%s\n' "$WT_BRANCHES" | grep -qx "$HEAD"; then
      gh pr merge "$NUM" --merge 2>&1 | tail -1
      git push origin --delete "$HEAD" >/dev/null 2>&1 && echo "  🗑️  remote branch deleted (local kept — worktree-locked)" || true
    else
      gh pr merge "$NUM" --merge --delete-branch 2>&1 | tail -1
    fi
    ST=$(gh pr view "$NUM" --json state --jq '.state' 2>/dev/null)
    echo "  #$NUM → $ST"
    # serialize: pull the just-merged commit into local master so the NEXT PR gates on the new tip
    git fetch origin -q
    [ "$(git branch --show-current)" = "master" ] && git merge --ff-only origin/master >/dev/null 2>&1 || true
  fi
done

# ---- summary ---------------------------------------------------------------
echo ""
echo "════════════════════ SUMMARY ════════════════════"
echo "  🟢 passed: ${PASSED[*]:-none}"
echo "  🔴 failed: ${FAILED[*]:-none}"
[ ${#SKIPPED[@]} -gt 0 ] && echo "  ⏭️  skipped: ${SKIPPED[*]}"
if [ "$GO" -eq 1 ]; then echo "  ℹ️  Linear NOT touched (Done is human-only)."
else echo "  ℹ️  DRY-RUN — nothing merged. Re-run with --go to merge the passed PRs."; fi
# non-zero when any PR failed the gate, so delegators (ship.mjs, merge-ready.sh) can propagate
[ ${#FAILED[@]} -gt 0 ] && exit 1
exit 0
