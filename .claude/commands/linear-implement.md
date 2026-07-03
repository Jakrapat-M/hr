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

1. **Validate in Linear** — read the ticket ACs; download any attachments/embeds (signed URLs expire ~5 min). Confirm the plan matches the ticket; flag mismatches before coding. Cite the ticket ID in the commit + PR.
2. **Fresh worktree off origin/master**
   - `git fetch origin`
   - `git worktree add ../hr-<slug> -b feat/<TICKET>-<slug> origin/master`
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
7. **Ship** — run `/ship <TICKET>` from the ticket worktree. The skill creates or reuses the PR, waits for a live Vercel preview, enforces the preview review gate, blocks stale-base merges, merges only when safe, and never moves Linear to Done.
8. **Report on Linear** — continue `/ship <TICKET>` through screenshot review, BA-friendly Linear comment, and ticket transition to **In Review**.
9. **Clean up** the worktree (`git worktree remove`).

## Cadence

- One PR per ticket. Do one ticket, report, then move to the next (`/one-topic-at-a-time`).
- Pick up **unassigned** Backlog/Todo tickets too (no-assignee ≠ skip). A fresh APPROVED plan = build-queue signal even if auto-assigned to Chongrak.

## Related memory

`feedback_zte_mode`, `feedback_two_session_plan_implement_split`, `feedback_one_session_per_worktree`, `feedback_worktree_branch_off_origin_master`, `feedback_ai_never_moves_to_done`, `feedback_verify_rendered_output_not_just_green_tests`.
