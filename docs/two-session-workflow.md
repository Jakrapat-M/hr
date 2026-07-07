# Two-Session Workflow — Merge Integrity Runbook

One page for the parallel `/linear-loop` (plan-only) + `/linear-implement` (ZTE build) pipeline.
Parallel **authoring**, strictly serial + verified **landing**. Every rule below is enforced by a
script — none of it relies on an agent remembering.

## The 4 invariants

| # | Invariant | Enforced by |
|---|-----------|-------------|
| I1 | **One merge lane.** The only path to `master` is `pr-merge-gate.sh --go` (fresh-master rebase → feature-preservation → build → baseline-diffed tests → serialized merge). `ship.mjs merge` and `merge-ready.sh --go` both delegate to it. Never run `gh pr merge` yourself. | `.claude/skills/git-hygiene-loop/pr-merge-gate.sh` (+ GitHub ruleset `master-single-merge-lane`: PRs required, merge-commit only) |
| I2 | **One ticket, one worktree, one session.** Implementation never happens in the main checkout; branches are cut from **fetched** `origin/master`; every worktree is registered. | `.claude/skills/git-hygiene-loop/worktree-guard.sh` + `.omc/state/worktrees.json` |
| I3 | **Hot files land serially.** Overlap between two open PRs on a conflict magnet (`messages/en.json`, `messages/th.json`, `Sidebar.tsx`, registries, mock-data seeds) is a gate **failure**, not a warning. EN and TH are both protected, and EN/TH key parity is asserted. | `HOT_FILES` + steps (3)/(5)/(5b) in `pr-merge-gate.sh` |
| I4 | **Vercel is proven, not assumed.** The app self-reports its build SHA at `/api/version`; `ship.mjs postmerge` polls production until it serves the merge SHA. The BA-facing Linear comment is blocked until `prodVerified: true`. | `src/frontend/src/app/api/version/route.ts` + `ship.mjs postmerge` + `.claude/skills/ship/config.json` |

## Per-ticket happy path (implement session)

```bash
# 0. top of every cycle
bash .claude/skills/git-hygiene-loop/git-hygiene.sh

# 1. worktree off FETCHED master, then guard before the first edit
git fetch origin
git worktree add ../hr-<slug> -b feat/<TICKET>-<slug> origin/master
cd ../hr-<slug>
bash /Users/tachongrak/Projects/hr/.claude/skills/git-hygiene-loop/worktree-guard.sh preflight <TICKET>

# 2. implement → verify → independent review (see /linear-implement)

# 3. ship: PR + preview + gate-only merge
node .claude/skills/ship/scripts/ship.mjs pr --ticket <TICKET>
node .claude/skills/ship/scripts/ship.mjs merge --ticket <TICKET> --confirm-merge   # delegates to pr-merge-gate.sh --go

# 4. prove production before telling the BA anything
node .claude/skills/ship/scripts/ship.mjs postmerge --ticket <TICKET>

# 5. screenshots from the VERIFIED prod URL → Linear comment (build <sha7>) → In Review
node .claude/skills/ship/scripts/linear-report.mjs --ticket <TICKET> --screenshots <files>

# 6. cleanup
cd /Users/tachongrak/Projects/hr
bash .claude/skills/git-hygiene-loop/worktree-guard.sh cleanup <TICKET>
```

Plan session (`/linear-loop`): **read-only git** in the shared checkout — no `checkout` / `switch` /
`stash` / `reset`; writes only under `src/frontend/.omc/plans/`.

## Failure playbook

| Signal | Meaning | Action |
|--------|---------|--------|
| `STALE_BASE` / stale-base rebase conflict | PR built on an old master; merging would revert siblings | `bash .claude/skills/git-hygiene-loop/pr-merge-gate.sh --rebase-source --go <PR#>`. If it reports a REAL conflict, resolve in the ticket worktree, rebuild, re-gate. |
| `hot-file-overlap(#N)` | Two open PRs edit a conflict magnet | Merge the printed first PR, then `--rebase-source` the second, re-gate. Intentional double-edit: `--allow-hot-overlap`. |
| `locale-parity` | PR added/removed a key in one catalog only | Add the missing EN/TH twin key, push, re-gate. |
| `DEPLOY_NOT_LIVE` | Production is not serving the merge SHA | Check the Vercel build logs. Do **not** comment on Linear or move the ticket until `postmerge` passes. If the output mentions deployment protection, set `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Project → Deployment Protection → Protection Bypass for Automation). |
| guard: main-checkout refusal | Implementation attempted in the shared tree | Create/enter the ticket worktree; the shared tree belongs to the plan session. |
| guard: branch BEHIND origin/master | Worktree cut from a stale local master | `git rebase origin/master` before the first edit. |
| guard: cross-worktree overlap | Another worktree has uncommitted edits to your files | Resolve there first (commit or drop) — parallel edits WILL clobber. |
| guard/hygiene: ORPHAN / GHOST worktrees | Leftovers from crashed cycles | `worktree-guard.sh list`, confirm no uncommitted work, then `worktree-guard.sh cleanup <TICKET>` each. |
| stash warning | `git stash` is shared repo-wide | Never stash in a ticket worktree — commit instead. |

## Platform backstop status

GitHub ruleset `master-single-merge-lane` (repo `aeiouboy/hr`) is **active**: merging into
`master` requires a pull request and allows merge-commits only. It cannot run the gate's semantic
checks — `pr-merge-gate.sh` remains the authoritative enforcement.

## Contract files

- `.claude/commands/linear-implement.md` / `.claude/commands/linear-loop.md` — the two loop contracts
- `.claude/skills/git-hygiene-loop/SKILL.md` — gate / guard / hygiene reference
- `.claude/skills/ship/SKILL.md` — ship + postmerge stages
