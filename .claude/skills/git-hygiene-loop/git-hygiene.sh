#!/usr/bin/env bash
# git-hygiene.sh — conflict/override early-warning + BUILD-SIGNAL detector.
# Portable: auto-detects the repo from cwd; keeps build-watch state per-repo in .omc/state/.
set -uo pipefail

REPO="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "❌ not inside a git repo"; exit 1; }
cd "$REPO" || exit 1
mkdir -p "$REPO/.omc/state" 2>/dev/null
STATE="$REPO/.omc/state/git-hygiene-build-watch.state"

BRANCH_GLOBS=(refs/remotes/origin/feat/* refs/remotes/origin/fix/*
              refs/remotes/origin/codex/* refs/remotes/origin/chore/*)

ACTIONS=(); BUILD=()
git fetch origin --prune -q 2>/dev/null

PRS_JSON=$(gh pr list --state open --json number,title,mergeable,headRefName,headRefOid,updatedAt --limit 40 2>/dev/null || echo "[]")

# ============ (0) BUILD SIGNAL ============
SNAP=$(mktemp)
if [ "$PRS_JSON" != "[]" ] && [ -n "$PRS_JSON" ]; then
  echo "$PRS_JSON" | python3 -c '
import json,sys
for p in json.load(sys.stdin):
    print("PR:{}:{}:{}".format(p["number"], (p.get("headRefOid") or "")[:12], p["mergeable"]))' >> "$SNAP"
fi
git for-each-ref --format='BR:%(refname:short):%(objectname:short)' "${BRANCH_GLOBS[@]}" 2>/dev/null \
  | sed 's#origin/##' >> "$SNAP"
sort -o "$SNAP" "$SNAP"

if [ -f "$STATE" ]; then
  while IFS=: read -r _ NUM SHA MRG; do
    if ! grep -q "^PR:$NUM:" "$STATE"; then
      T=$(echo "$PRS_JSON" | python3 -c "import json,sys;print(next((p['title'] for p in json.load(sys.stdin) if p['number']==$NUM),''))" 2>/dev/null)
      BUILD+=("🔨 NEW PR #$NUM — build opened: $T")
    else
      OLD=$(grep "^PR:$NUM:" "$STATE" | head -1)
      OLDSHA=$(echo "$OLD" | cut -d: -f3); OLDMRG=$(echo "$OLD" | cut -d: -f4)
      [ -n "$SHA" ] && [ "$SHA" != "$OLDSHA" ] && BUILD+=("🔨 PR #$NUM got NEW COMMITS ($OLDSHA→$SHA) — build pushed")
      [ "$OLDMRG" = "CONFLICTING" ] && [ "$MRG" = "MERGEABLE" ] && BUILD+=("🔨 PR #$NUM CONFLICTING→MERGEABLE — rebased/ready")
    fi
  done < <(grep '^PR:' "$SNAP")
  while IFS=: read -r _ BRN SHA; do
    # Skip branches already merged into master — head moving is leftover noise, not a new build.
    git merge-base --is-ancestor "origin/$BRN" origin/master 2>/dev/null && continue
    OLD=$(grep -F "BR:$BRN:" "$STATE" | head -1)
    if [ -z "$OLD" ]; then
      BUILD+=("🔨 NEW branch origin/$BRN pushed — build in progress (no PR yet?)")
    elif [ "$(echo "$OLD" | cut -d: -f3)" != "$SHA" ]; then
      BUILD+=("🔨 branch origin/$BRN advanced — build pushed new commits")
    fi
  done < <(grep '^BR:' "$SNAP")
  BASELINE=""
else
  BASELINE="ℹ️ build-watch baseline set (first run) — signals start next cycle"
fi
cp "$SNAP" "$STATE"; rm -f "$SNAP"

# ============ (1) behind / ahead ============
read -r BEHIND AHEAD < <(git rev-list --left-right --count origin/master...HEAD 2>/dev/null || echo "0 0")
BR="$(git branch --show-current)"
[ "${BEHIND:-0}" -gt 0 ] && ACTIONS+=("🟠 branch '$BR' behind origin/master by $BEHIND — rebase before pushing (avoid overriding sibling work)")
[ "${AHEAD:-0}" -gt 0 ]  && ACTIONS+=("🟡 branch '$BR' ahead $AHEAD unpushed commit(s) — verify not already-merged before re-push")

# ============ (2) uncommitted ============
MOD=$(git diff --name-only | wc -l | tr -d ' ')
UNT=$(git status --porcelain | grep -c '^??')
{ [ "$MOD" -gt 0 ] || [ "$UNT" -gt 0 ]; } && ACTIONS+=("🟡 uncommitted: $MOD tracked + $UNT untracked in $BR — commit/stash to survive reset/switch")

CUR_FILES=$(mktemp)
{ git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u > "$CUR_FILES"

# ============ (3) PR conflict/stale + (5a) overlap ============
if [ "$PRS_JSON" != "[]" ] && [ -n "$PRS_JSON" ]; then
  while IFS=$'\t' read -r NUM MRG HEAD AGE; do
    if [ "$MRG" = "CONFLICTING" ]; then
      ACTIONS+=("🔴 PR #$NUM CONFLICTING ($HEAD) — rebase or close")
    elif [ "${AGE%.*}" -gt 168 ]; then
      ACTIONS+=("🟡 PR #$NUM stale ~$((${AGE%.*}/24))d ($HEAD) — merge/close")
    fi
  done < <(echo "$PRS_JSON" | python3 -c '
import json,sys,datetime
now=datetime.datetime.now(datetime.timezone.utc)
for p in json.load(sys.stdin):
    u=datetime.datetime.fromisoformat(p["updatedAt"].replace("Z","+00:00"))
    print("{}\t{}\t{}\t{:.0f}".format(p["number"], p["mergeable"], p["headRefName"], (now-u).total_seconds()/3600))')
  if [ -s "$CUR_FILES" ]; then
    for NUM in $(echo "$PRS_JSON" | python3 -c 'import json,sys;[print(p["number"]) for p in json.load(sys.stdin)]'); do
      PRF=$(gh pr view "$NUM" --json files -q '.files[].path' 2>/dev/null | sort -u)
      [ -z "$PRF" ] && continue
      HITS=$(comm -12 "$CUR_FILES" <(echo "$PRF") | head -6)
      [ -n "$HITS" ] && ACTIONS+=("⚠️  OVERLAP: $BR touches same files as PR #$NUM ($(echo "$HITS" | wc -l | tr -d ' ') file) → merge-override risk: $(echo "$HITS" | tr '\n' ',' | sed 's/,$//')")
    done
  fi
fi

# ============ (4)+(5b) worktrees + cross-worktree overlap ============
WTS=$(git worktree list --porcelain | awk '/^worktree /{print $2}')
NWT=$(echo "$WTS" | grep -c .)
if [ "$NWT" -gt 1 ] && [ -s "$CUR_FILES" ]; then
  for WT in $WTS; do
    [ "$WT" = "$REPO" ] && continue
    OF=$(git -C "$WT" diff --name-only HEAD 2>/dev/null | sort -u)
    [ -z "$OF" ] && continue
    HITS=$(comm -12 "$CUR_FILES" <(echo "$OF") | head -6)
    [ -n "$HITS" ] && ACTIONS+=("⚠️  OVERLAP: worktree $(basename "$WT") edits same files as this working tree → do not switch branch over it: $(echo "$HITS" | tr '\n' ',' | sed 's/,$//')")
  done
fi
rm -f "$CUR_FILES"

# ============ report ============
if [ ${#BUILD[@]} -gt 0 ]; then
  echo "🔨🔨 BUILD SIGNAL — run FULL review sequence (feature-vs-master → close dead PRs → Linear pull-back):"
  printf '%s\n' "${BUILD[@]}"
  echo "───"
fi
if [ ${#ACTIONS[@]} -eq 0 ]; then
  [ ${#BUILD[@]} -eq 0 ] && echo "✅ git clean — nothing to action"
else
  printf '%s\n' "${ACTIONS[@]}"
fi
[ -n "${BASELINE:-}" ] && echo "$BASELINE"
echo "ℹ️ worktrees ($NWT): $(echo "$WTS" | xargs -n1 basename 2>/dev/null | tr '\n' ' ')"
