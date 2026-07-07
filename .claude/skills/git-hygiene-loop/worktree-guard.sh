#!/usr/bin/env bash
# worktree-guard.sh — I2 enforcement: one ticket, one worktree, one session.
# Turns the "mixed worktree" memory rules (one-session-per-worktree,
# branch-off-origin-master, stash-is-shared) into a preflight the implement loop
# must pass BEFORE its first edit, plus a registered cleanup and a drift report.
#
# Usage:
#   worktree-guard.sh preflight <TICKET>   # assert isolation before editing (run INSIDE the ticket worktree)
#   worktree-guard.sh cleanup   <TICKET>   # remove the ticket worktree + registry entry (run from the MAIN checkout)
#   worktree-guard.sh list                 # registry vs `git worktree list` drift (orphans / ghosts)
#
# Registry: .omc/state/worktrees.json in the main checkout — every ticket worktree
# is upserted on preflight and deleted on cleanup, so leftovers are visible.
# Runbook: docs/two-session-workflow.md
set -uo pipefail

MODE="${1:-}"; TICKET="${2:-}"
COMMON="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || { echo "❌ not inside a git repo"; exit 1; }
MAIN="$(dirname "$COMMON")"                      # main checkout root
REG="$MAIN/.omc/state/worktrees.json"
mkdir -p "$MAIN/.omc/state" 2>/dev/null

registry_upsert() {  # $1 ticket  $2 branch  $3 path
  python3 - "$REG" "$1" "$2" "$3" "${CLAUDE_SESSION_ID:-unknown}" <<'PY'
import json, os, sys, datetime
reg, ticket, branch, path, session = sys.argv[1:6]
data = {}
if os.path.exists(reg):
    try: data = json.load(open(reg))
    except Exception: data = {}
entry = data.get(ticket, {})
data[ticket] = {
    "ticket": ticket,
    "branch": branch,
    "path": path,
    "createdAt": entry.get("createdAt") or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "sessionId": session,
}
json.dump(data, open(reg, "w"), indent=2)
open(reg, "a").write("\n")
PY
}

registry_delete() {  # $1 ticket
  [ -f "$REG" ] || return 0
  python3 - "$REG" "$1" <<'PY'
import json, sys
reg, ticket = sys.argv[1:3]
try: data = json.load(open(reg))
except Exception: data = {}
data.pop(ticket, None)
json.dump(data, open(reg, "w"), indent=2)
open(reg, "a").write("\n")
PY
}

registry_path_for() {  # $1 ticket → echoes registered path (or nothing)
  [ -f "$REG" ] || return 0
  python3 - "$REG" "$1" <<'PY' 2>/dev/null
import json, sys
data = json.load(open(sys.argv[1]))
e = data.get(sys.argv[2])
if e: print(e["path"])
PY
}

case "$MODE" in

# ─────────────────────────────────────────────────────────────── preflight ──
preflight)
  [ -z "$TICKET" ] && { echo "usage: worktree-guard.sh preflight <TICKET>"; exit 1; }
  TICKET=$(echo "$TICKET" | tr '[:lower:]' '[:upper:]')
  FAILS=0

  # (1) must be a LINKED worktree — implementation never happens in the main checkout
  GITDIR="$(git rev-parse --path-format=absolute --git-dir)"
  if [ "$GITDIR" = "$COMMON" ]; then
    echo "❌ (1) this is the MAIN checkout — it belongs to the plan session."
    echo "   Implementation goes in a ticket worktree:"
    echo "   git worktree add ../hr-<slug> -b feat/$TICKET-<slug> origin/master"
    exit 1
  fi
  HERE="$(git rev-parse --show-toplevel)"
  echo "✓ (1) linked worktree: $HERE"

  # (2) branch ↔ ticket mapping
  BRANCH="$(git branch --show-current)"
  if echo "$BRANCH" | grep -qiE "^(feat|fix|chore)/$TICKET-"; then
    echo "✓ (2) branch '$BRANCH' matches ticket $TICKET"
  else
    echo "❌ (2) branch '$BRANCH' does not match ^(feat|fix|chore)/$TICKET-… — wrong worktree or wrong ticket"
    FAILS=$((FAILS+1))
  fi

  # (3) branch must contain FETCHED origin/master (never build on a stale base)
  git fetch origin -q 2>/dev/null
  if git merge-base --is-ancestor origin/master HEAD 2>/dev/null; then
    echo "✓ (3) branch contains fresh origin/master"
  else
    echo "❌ (3) branch is BEHIND fetched origin/master — merging it would silently revert sibling tickets."
    echo "   Fix now, before any edit:  git rebase origin/master"
    FAILS=$((FAILS+1))
  fi

  # (4) cross-contamination: no OTHER worktree may have uncommitted edits to files this branch touches
  F4=0
  MY_FILES=$(mktemp)
  { git diff --name-only origin/master...HEAD 2>/dev/null; git diff --name-only HEAD 2>/dev/null; \
    git ls-files --others --exclude-standard 2>/dev/null; } | sort -u > "$MY_FILES"
  while IFS= read -r WT; do
    [ "$WT" = "$HERE" ] && continue
    OF=$({ git -C "$WT" diff --name-only HEAD 2>/dev/null; git -C "$WT" ls-files --others --exclude-standard 2>/dev/null; } | sort -u)
    [ -z "$OF" ] && continue
    HITS=$(comm -12 "$MY_FILES" <(echo "$OF") | head -6)
    if [ -n "$HITS" ]; then
      echo "❌ (4) worktree $(basename "$WT") has UNCOMMITTED edits to the same files: $(echo "$HITS" | tr '\n' ',' | sed 's/,$//')"
      echo "   Resolve there first (commit or drop) — parallel edits to the same file WILL clobber."
      FAILS=$((FAILS+1)); F4=$((F4+1))
    fi
  done < <(git worktree list --porcelain | awk '/^worktree /{print $2}')
  rm -f "$MY_FILES"
  [ "$F4" -eq 0 ] && echo "✓ (4) no cross-worktree uncommitted overlap"

  # (5) stash is SHARED repo-wide — never stash in a ticket worktree
  NSTASH=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
  if [ "$NSTASH" -gt 0 ]; then
    echo "⚠️  (5) git stash has $NSTASH entr$([ "$NSTASH" = 1 ] && echo y || echo ies) — the stash is SHARED across ALL worktrees."
    echo "   NEVER stash/pop here: you may grab another session's stash. Use commits instead."
  else
    echo "✓ (5) stash empty"
  fi

  # (6) the main checkout must not be accumulating implementation (plan session is read-only on src)
  STAGED=$(git -C "$MAIN" diff --cached --name-only -- src/frontend/src 2>/dev/null | head -6)
  if [ -n "$STAGED" ]; then
    echo "❌ (6) MAIN checkout has STAGED changes under src/frontend/src — implementation is leaking into the plan session's tree:"
    echo "$STAGED" | sed 's/^/     /'
    FAILS=$((FAILS+1))
  else
    echo "✓ (6) main checkout has no staged implementation"
  fi

  if [ "$FAILS" -gt 0 ]; then
    echo "🔴 preflight FAILED ($FAILS) — fix the ❌ items before editing."
    exit 1
  fi
  registry_upsert "$TICKET" "$BRANCH" "$HERE"
  echo "🟢 preflight OK — registered $TICKET → $HERE in $REG"
  ;;

# ──────────────────────────────────────────────────────────────── cleanup ──
cleanup)
  [ -z "$TICKET" ] && { echo "usage: worktree-guard.sh cleanup <TICKET>"; exit 1; }
  TICKET=$(echo "$TICKET" | tr '[:lower:]' '[:upper:]')
  WPATH="$(registry_path_for "$TICKET")"
  if [ -z "$WPATH" ]; then
    # fall back: find a linked worktree whose branch embeds the ticket id
    WPATH=$(git worktree list --porcelain | awk -v RS= -v t="/$(echo "$TICKET" | tr '[:upper:]' '[:lower:]')-" '
      { lw=tolower($0); if (lw ~ ("branch refs/heads/(feat|fix|chore)" t)) { split($0, a, "\n"); sub("^worktree ", "", a[1]); print a[1]; exit } }')
  fi
  [ -z "$WPATH" ] && { echo "ℹ️  no worktree found for $TICKET (registry + branch scan) — nothing to clean"; registry_delete "$TICKET"; exit 0; }
  case "$(pwd)/" in "$WPATH"/*) echo "❌ you are INSIDE $WPATH — cd to the main checkout first: cd $MAIN"; exit 1 ;; esac
  if git worktree remove "$WPATH" 2>/dev/null; then
    echo "🗑️  removed worktree $WPATH"
  else
    echo "❌ could not remove $WPATH — it likely has uncommitted work. Inspect it, commit/discard, then re-run."
    echo "   (or: git worktree remove --force \"$WPATH\" if you are SURE nothing there matters)"
    exit 1
  fi
  registry_delete "$TICKET"
  git worktree prune 2>/dev/null
  echo "🟢 cleanup OK — $TICKET deregistered"
  ;;

# ─────────────────────────────────────────────────────────────────── list ──
list)
  echo "── worktrees (git) ──"
  git worktree list
  echo ""
  echo "── registry ($REG) ──"
  if [ -f "$REG" ]; then
    python3 - "$REG" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
if not d: print("  (empty)")
for t, e in d.items():
    print("  {}: {}  ({}, since {}, session {})".format(t, e.get("path"), e.get("branch"), e.get("createdAt"), e.get("sessionId")))
PY
  else echo "  (no registry yet)"; fi
  echo ""
  DRIFT=0
  REG_PATHS=$([ -f "$REG" ] && python3 - "$REG" <<'PY' 2>/dev/null
import json, sys
for e in json.load(open(sys.argv[1])).values(): print(e.get("path", ""))
PY
)
  # orphans: linked worktrees nobody registered (gate worktrees hr-gate-* are transient → skipped)
  while IFS= read -r WT; do
    [ "$WT" = "$MAIN" ] && continue
    case "$(basename "$WT")" in hr-gate-*) continue ;; esac
    if ! printf '%s\n' "$REG_PATHS" | grep -qxF "$WT"; then
      echo "🟡 ORPHAN worktree: $WT — not in the registry (crashed cycle?). Confirm no uncommitted work, then: worktree-guard.sh cleanup <TICKET>"
      DRIFT=$((DRIFT+1))
    fi
  done < <(git worktree list --porcelain | awk '/^worktree /{print $2}')
  # ghosts: registry entries whose path no longer exists
  if [ -f "$REG" ]; then
    while IFS=$'\t' read -r T P; do
      [ -z "$T" ] && continue
      [ -d "$P" ] || { echo "🟡 GHOST registry entry: $T → $P (path gone) — run: worktree-guard.sh cleanup $T"; DRIFT=$((DRIFT+1)); }
    done < <(python3 - "$REG" <<'PY' 2>/dev/null
import json, sys
for t, e in json.load(open(sys.argv[1])).items(): print("{}\t{}".format(t, e.get("path", "")))
PY
)
  fi
  [ "$DRIFT" -eq 0 ] && echo "✅ no orphans / ghosts — registry and git agree"
  ;;

*)
  echo "usage: worktree-guard.sh {preflight <TICKET> | cleanup <TICKET> | list}"
  exit 1
  ;;
esac
