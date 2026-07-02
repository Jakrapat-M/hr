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
3. **Write** the consensus plan to `.omc/plans/` (repo-root state dir) — one file per ticket, `Status: pending approval`. ⚠️ This copy is **session-local**: `.omc/` is git-ignored and worktree-local, so the implement session's fresh worktree (off `origin/master`) will **not** see this file.
4. **Persist for cross-session handoff (REQUIRED — the plan is useless if the implement session can't find it).** Post the full plan as a **Linear comment** on the ticket via `mcp__linear__save_comment` (header `## 📋 Implementation plan (ralplan consensus — APPROVED)`), containing: the exact edit set (file:line), AC checklist, verification steps, and any execution-order / cross-plan-collision / ship-order constraints the loop surfaced. **The Linear ticket is the portable source of truth** the implement loop reads in its step 1 — the local `.omc/plans/*.md` is only a convenience for this checkout. Do this for every APPROVED plan before finishing.
5. Report which plans were produced — cite both the local path AND the Linear comment link; do NOT implement them.

## Guardrails

- Don't move tickets to Done (In Review max is the implementer's call, not this loop's).
- Respect scope: payroll (other team) + backend (on hold during mockup phase) are out of scope.
- `feedback_zte_mode` does **not** apply during this plan-only loop.

## Related memory

`feedback_hr_loop_plan_only_never_build`, `feedback_two_session_plan_implement_split`, `feedback_ralplan_auto_loop`, `feedback_unassigned_backlog_todo_in_scope`, `feedback_validate_requirement_in_linear`.
