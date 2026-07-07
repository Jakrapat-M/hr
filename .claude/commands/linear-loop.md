# Linear Loop (Plan-Only)

Plan-only discovery loop for the HR project. Scan Linear for new tickets + BA feedback, produce consensus plans. **Never build.**

## Role boundary (read first)

- This is the **plan-only** role. Its job is to WRITE PLANS, not code.
- **Never** run `npm build`, edit source, execute code, commit, or open PRs from this loop. A SEPARATE session (`/linear-implement`, ZTE) does all building + merging — if this session also edits, the two working trees/branches **conflict** ("เราจะไม่ build เดี๋ยว conflict กัน").
- On ANY request here — even "เพิ่ม X / ทำ Y" — default to producing a PLAN. The word "plan" (or "ทำ X") literally means make a plan under `.omc/plans/`, not code.
- Only cross into execution when the user gives an explicit, current go-ahead ("execute / ลุย / build it") AND no other session is mid-flight.

## Loop

1. **Discover** — scan Linear for:
   - New Backlog/Todo tickets (including **unassigned** / no-assignee — those are in scope, not skip).
   - BA feedback / comments on already-shipped tickets.
   - Validate each against its ticket description + ACs before planning; download attachments (signed URLs expire ~5 min).
2. **Plan** — run `ralplan` (auto-loop Planner→Architect→Critic until APPROVE or 5-cap; don't pause to ask mid-loop unless `--interactive`).
3. **Write** the consensus plan to `src/frontend/.omc/plans/` — one file per ticket, ready for the implement session to consume.
4. Report which plans were produced; do NOT implement them.

## Guardrails

- **Git-state ban (hard rule):** this session may READ git (`status`, `log`, `diff`, `fetch`) but never mutate it in the shared tree — no `checkout`, `switch`, `stash`, `reset`, `rebase`, `commit`, or branch creation. The shared checkout's branch belongs to whoever is holding it; a switch here wipes their uncommitted work. Writes go only under `src/frontend/.omc/plans/`.
- Don't move tickets to Done (In Review max is the implementer's call, not this loop's).
- Respect scope: payroll (other team) + backend (on hold during mockup phase) are out of scope.
- `feedback_zte_mode` does **not** apply during this plan-only loop.

Two-session integrity runbook (invariants + failure playbook): [docs/two-session-workflow.md](../../docs/two-session-workflow.md).

## Related memory

`feedback_hr_loop_plan_only_never_build`, `feedback_two_session_plan_implement_split`, `feedback_ralplan_auto_loop`, `feedback_unassigned_backlog_todo_in_scope`, `feedback_validate_requirement_in_linear`.
