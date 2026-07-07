# Linear Implement (ZTE)

Zero-Touch-Engineer implement loop for the HR project. Pick an **approved plan**, ship it end-to-end autonomously per ticket — no waiting for a human merge.

## Role boundary (read first)

- This is the **implement** role. The **plan-only** role is `/linear-loop` in a SEPARATE session — never author plans or run `ralplan` here.
- Never move a Linear ticket to **Done** (AI cap = **In Review** max).
- One **git worktree per task**, off fetched `origin/master` — never edit the main checkout (the plan-only session flips branches there and will clobber uncommitted work).
- Payroll tickets (STA-58/59/60) and backend wiring are **out of scope** (owned by another team / on hold during the mockup phase).

## Inputs

- `plan`: `$1` — path to a plan under `src/frontend/.omc/plans/` (or a ticket ID). If omitted, list available approved plans and pick the oldest unimplemented one, or ask which to run.

## Loop (per ticket)

0. **Git hygiene (hard step, not a suggestion)** — run `bash .claude/skills/git-hygiene-loop/git-hygiene.sh` at the top of every cycle; act on BUILD SIGNALs and OVERLAP warnings before picking work.
1. **Validate in Linear** — read the ticket ACs; download any attachments/embeds (signed URLs expire ~5 min). Confirm the plan matches the ticket; flag mismatches before coding. Cite the ticket ID in the commit + PR.
2. **Fresh worktree off origin/master + guard preflight**
   - `git fetch origin`
   - `git worktree add ../hr-<slug> -b feat/<TICKET>-<slug> origin/master`
   - **Immediately, before any edit:** `bash /Users/tachongrak/Projects/hr/.claude/skills/git-hygiene-loop/worktree-guard.sh preflight <TICKET>` — refuses the main checkout, asserts the branch contains fetched `origin/master`, blocks cross-worktree overlap, and registers the worktree. Fix every ❌ before editing.
   - Symlink node_modules to the repo-root hoist (instant vs `npm install`).
   - Run dev on **:3100** (`npx next dev --port 3100`) — `next dev` hardcodes :3000.
3. **Investigate first** — many "audit" tickets are already-satisfied. Do NOT fabricate a fix; ship only the genuinely-missing piece (a guard test, a missing tab, etc.) or flag it as already done.
4. **Implement** — delegate to `oh-my-claudecode:executor` (`model=opus` for complex work).
5. **Independently verify** (executors return a terse "Complete." with no detail — re-run the gates yourself):
   - `npm run build` (also the TS typecheck gate) + `npm run lint`
   - Vitest (`npm test -- --run <pattern>`)
   - Playwright smoke — **verify RENDERED output**, not just green tests; capture screenshots.
   - Sweep changed files for dev-internal copy (STA-XX / "post-backend" phrases) and fake-completion (`test.skip`/`.only`, TODO stubs).
6. **Separate code-review lane** — spawn `oh-my-claudecode:code-reviewer`; get an explicit **APPROVE** (ask again if the verdict is vague). Never self-approve.
7. **Ship (gate-only merge)** — run `/ship <TICKET>` from the ticket worktree. The skill creates or reuses the PR, waits for a live Vercel preview, enforces the preview review gate, and **delegates the merge to `pr-merge-gate.sh --go` (the single merge lane — never merge via the GitHub CLI or UI directly)**: fresh-master rebase, feature-preservation (EN+TH), hot-file collision policy, baseline-diffed tests, serialized merge. Never moves Linear to Done.
8. **Deploy-verify (postmerge)** — `node .claude/skills/ship/scripts/ship.mjs postmerge --ticket <TICKET>` polls production `/api/version` until it serves the merge SHA. On `DEPLOY_NOT_LIVE`, check Vercel build logs and STOP — no Linear comment, no ticket transition.
9. **Report on Linear** — only after `prodVerified: true`: screenshots captured from the **verified production URL** (localhost only as a supplement), BA-friendly comment with the prod link + `build <sha7>`, ticket to **In Review**.
10. **Clean up** — `bash .claude/skills/git-hygiene-loop/worktree-guard.sh cleanup <TICKET>` (removes the worktree, deregisters it, prunes).

Full failure playbook: [docs/two-session-workflow.md](../../docs/two-session-workflow.md).

## Cadence

- One PR per ticket. Do one ticket, report, then move to the next (`/one-topic-at-a-time`).
- Pick up **unassigned** Backlog/Todo tickets too (no-assignee ≠ skip). A fresh APPROVED plan = build-queue signal even if auto-assigned to Chongrak.

## Related memory

`feedback_zte_mode`, `feedback_two_session_plan_implement_split`, `feedback_one_session_per_worktree`, `feedback_worktree_branch_off_origin_master`, `feedback_ai_never_moves_to_done`, `feedback_verify_rendered_output_not_just_green_tests`.
