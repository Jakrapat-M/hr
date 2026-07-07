#!/usr/bin/env bash
# merge-ready.sh — discovery/dry-run FRONT-END for the single merge lane.
# Companion to git-hygiene.sh: the detector WARNS about ready PRs; this lists them
# and, with --go, hands every actual merge to pr-merge-gate.sh (the ONLY merge path).
#
# Usage:
#   merge-ready.sh                 # dry-run: list open PRs + mergeability, merge NOTHING
#   merge-ready.sh --go            # gate + merge every MERGEABLE open PR via pr-merge-gate.sh
#   merge-ready.sh --go 393 395    # gate + merge only these PRs (if MERGEABLE)
#
# Safety:
#   - Dry-run by default. Nothing is merged without --go.
#   - This script NEVER calls `gh pr merge` itself — pr-merge-gate.sh --go does the
#     rebase-validation (fresh-master rebase, feature-preservation, baseline-diffed
#     tests, hot-file policy) and performs the serialized merge.
#   - Only forwards PRs GitHub reports MERGEABLE (skips CONFLICTING / UNKNOWN — re-run after GH recomputes).
#   - Never touches Linear (AI stops at merge; "Done" is human-only).
set -uo pipefail

REPO="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "❌ not inside a git repo"; exit 1; }
cd "$REPO" || exit 1

command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI not found"; exit 1; }

GO=0; PRS=()
for a in "$@"; do
  case "$a" in
    --go) GO=1 ;;
    [0-9]*) PRS+=("$a") ;;
    *) echo "⚠️  ignoring unknown arg: $a" ;;
  esac
done

git fetch origin --prune -q 2>/dev/null

# ---- gather open PRs (guard against a gh hiccup: empty output ≠ "no PRs") ----
RAW=$(gh pr list --state open --json number,title,mergeable --limit 50 2>/dev/null)
if [ -z "$RAW" ]; then
  echo "⚠️  gh returned nothing (transient error / auth?) — not merging. Retry."
  exit 1
fi

# bash 3.2 (macOS) has no mapfile → read rows via a while loop into an array
ROWS=()
while IFS= read -r line; do
  [ -n "$line" ] && ROWS+=("$line")
done < <(echo "$RAW" | python3 -c '
import json,sys
prs=json.load(sys.stdin)
for p in sorted(prs,key=lambda x:x["number"]):
    print("{}\t{}\t{}".format(p["number"], p["mergeable"], p["title"][:60]))')

if [ ${#ROWS[@]} -eq 0 ]; then
  echo "✅ no open PRs — nothing to merge"
  exit 0
fi

echo "Open PRs:"
TO_MERGE=()
for r in "${ROWS[@]}"; do
  IFS=$'\t' read -r NUM MRG TITLE <<<"$r"
  # if explicit PR list was given, only consider those
  if [ ${#PRS[@]} -gt 0 ] && ! printf '%s\n' "${PRS[@]}" | grep -qx "$NUM"; then
    continue
  fi
  case "$MRG" in
    MERGEABLE)   echo "  ✅ #$NUM  $TITLE"; TO_MERGE+=("$NUM") ;;
    CONFLICTING) echo "  🔴 #$NUM  $TITLE  (conflicting — rebase first, skipping)" ;;
    *)           echo "  ⏳ #$NUM  $TITLE  (mergeable=$MRG — GH still computing, skipping)" ;;
  esac
done

if [ ${#TO_MERGE[@]} -eq 0 ]; then
  echo "── nothing MERGEABLE to act on"
  exit 0
fi

if [ "$GO" -ne 1 ]; then
  echo ""
  echo "DRY-RUN — would delegate to the merge lane: pr-merge-gate.sh --go ${TO_MERGE[*]}"
  echo "Run again with --go to gate + merge."
  exit 0
fi

# ---- delegate every actual merge to the single merge lane -------------------
GATE_SH="$REPO/.claude/skills/git-hygiene-loop/pr-merge-gate.sh"
[ -f "$GATE_SH" ] || { echo "❌ pr-merge-gate.sh not found — cannot merge outside the gate"; exit 1; }
echo ""
echo "→ delegating to the single merge lane: pr-merge-gate.sh --go ${TO_MERGE[*]}"
bash "$GATE_SH" --go "${TO_MERGE[@]}"
RC=$?
echo ""
echo "ℹ️  Linear NOT touched (Done is human-only). If GitHub auto-moved a ticket to Done, pull it back to In Review."
exit $RC
