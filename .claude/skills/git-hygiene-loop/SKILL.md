---
name: git-hygiene-loop
description: Conflict/override early-warning and BUILD-SIGNAL detector for the multi-session HR Linear loop. Run before pushing, before switching branches, or at the top of each implement cycle to catch merge-override risk, stale/conflicting PRs, cross-worktree file overlap, and freshly-pushed builds from the other session. Use when the user says "git hygiene", "check for conflicts", "is it safe to push/rebase", or is running the plan-only + implement two-session split.
---

# Git Hygiene Loop

Early-warning scan for the HR project's two-session workflow (`/linear-loop` plan-only + `/linear-implement` ZTE) where multiple sessions and git worktrees share one set of branches. It surfaces override/conflict risk **before** it clobbers work, and detects when the other session has pushed a new build.

## When to run

- Top of each `/linear-implement` cycle — pick up BUILD SIGNALs (new PRs / new commits) from the plan-only or sibling session.
- Before `git push` / `gh pr merge` — confirm you're not overriding sibling work or a same-file PR.
- Before switching branches in a shared checkout — catch cross-worktree file overlap.
- Any time the user asks "safe to push?", "any conflicts?", "what changed?".

## How to run

```bash
bash .claude/skills/git-hygiene-loop/git-hygiene.sh
```

- Auto-detects the repo from cwd (`git rev-parse --show-toplevel`) — works from any worktree.
- Requires `gh` (open-PR data), `git`, `python3`.
- Keeps per-repo build-watch state in `.omc/state/git-hygiene-build-watch.state`. **First run only sets a baseline** ("signals start next cycle") — real BUILD SIGNALs appear from the 2nd run on. Fetches `origin --prune` each run.

## What it reports

**🔨 BUILD SIGNAL** (triggers the full review sequence: feature-vs-master → close dead PRs → Linear pull-back):
- New open PR, new commits on a PR, or CONFLICTING→MERGEABLE (rebased/ready).
- New or advanced `origin/feat|fix|codex|chore/*` branch not yet merged to master.

**Action items:**
- 🟠 branch behind `origin/master` → rebase before pushing (avoid overriding sibling work).
- 🟡 branch ahead with unpushed commits → verify not already-merged before re-push.
- 🟡 uncommitted tracked + untracked → commit/stash to survive reset/switch.
- 🔴 PR CONFLICTING → rebase or close. 🟡 PR stale >7d → merge/close.
- ⚠️ OVERLAP: current edits touch the same files as an open PR → merge-override risk.
- ⚠️ OVERLAP: another worktree edits the same files → do not switch branch over it.
- ✅ clean, plus a worktree inventory footer.

## Interpreting results

- A BUILD SIGNAL from the other session = incoming work — reconcile/rebase before continuing your own ticket.
- Any ⚠️ OVERLAP = stop; resolve the shared-file collision before push/merge/branch-switch (this is the exact clobber the two-session split guards against).
- Clean output = safe to proceed.

## Related memory

`feedback_one_session_per_worktree`, `feedback_worktree_branch_off_origin_master`, `feedback_two_session_plan_implement_split`, `feedback_zte_mode`.
