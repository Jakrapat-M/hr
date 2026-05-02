# HR Walkthrough Script — Mockup Demo

**Purpose:** Drive the live demo with HR for **mockup approval before production implementation**.
**Audience:** HR business team (HR Admin, HRBP lead, SPD lead, Benefits ops).
**Persona model:** 3 UI shells × 5 capability variants — toggle via Topbar `PersonaSwitcher`.
**Tour duration:** ~45 min total (5 demo flows × ~8 min each + 5 min intro).

## Pre-flight (ensure ready before HR arrives)

- [ ] `npm run dev` from `src/frontend/` → http://localhost:3000
- [ ] Login as `admin@humi.test` / `admin2026` (super-user proxies into all 5 personas)
- [ ] Open Topbar → PersonaSwitcher dropdown → confirm 5 demo users + 4 SF-canonical names visible
- [ ] Pre-load 1 sample claim per workflow template into the mock benefit-claims store
- [ ] Have the MOCKUP-MATRIX.md and 00-DEEP-INTERVIEW-INPUT.md open in a second screen for reference

## Intro (5 min)

1. Show MOCKUP-MATRIX coverage tally: **67% built (61 ✅), 34% gap (35 🔴/⛔)**.
2. Explain persona model — 3 shells × 5 variants vs SF's 6-tier reality. Show the SF RBAC evidence behind the BE approval chain skipping Manager.
3. State the goal: **HR redlines today → production sprint 1 starts tomorrow**.

## Demo 1 — Employee (User shell) — 8 min

**Persona switch:** `employee@humi.test` (สมชาย ใจดี).

| Step | Click target | What HR should see | Watch for redline triggers |
|---|---|---|---|
| 1 | `/home` | Tile-based ESS landing | "Is the tile order right?" / Quick-action menu items |
| 2 | `/profile/me` | Own profile, 2,345 lines, 6 tabs | Bilingual labels, Effective As Of date picker |
| 3 | `/benefits-hub` | One-launcher pattern (post-recent-commit) | Service routing matches HR's mental model? |
| 4 | `/benefits-hub/reimbursement` | SimpleClaimForm + plan-registry plan picker | Plan names readable in Thai? Required-doc list complete? |
| 5 | Submit a sample medical OPD claim | Approval chain visualizer shows `HRBP → SPD → HR Admin` (Manager skipped) | "Why no Manager?" — explain SF probe truth |
| 6 | `/me/documents` | Letter/document list | Document types align with EC Document hub plan |
| 7 | `/timeoff` | Leave request | Sanity check the leave flow integrates |

**Capture:** What's missing for daily-employee tasks? What labels need to change?

## Demo 2 — Manager (Approver shell, restricted variant) — 8 min

**Persona switch:** `manager@humi.test` (พิชญ์ ม.).

| Step | Click target | Expected behavior | Demonstrates |
|---|---|---|---|
| 1 | `/manager-dashboard` | KPI cards + team list + queue snippet | Manager's daily homepage |
| 2 | `/quick-approve` | Inbox filtered to team scope | `queueScope: 'team'` from F2 |
| 3 | Open a non-BE workflow (e.g. position change) | Detail viewer with diff + approve/reject | Standard approval UX |
| 4 | Try to filter by "benefit claim" | **No results / option disabled** | `Capability` gates BE entity from Manager view |
| 5 | Try bulk-approve toolbar | **Bulk button hidden** | `Capability action="bulkApprove"` denied |
| 6 | Open a team member's profile | Compensation row hidden, Benefits tab hidden | Hard-blocked entities per SF probe |

**Talking point:** "Manager sees ONLY what SF actually shows them today (0 fields on BenefitEmployeeClaim). The hard-blocks are intentional."

**Capture:** Does HR want to LOOSEN any of these (e.g. show comp totals to Manager for budget visibility)?

## Demo 3 — HRBP (Approver shell, full variant) — 8 min

**Persona switch:** `hrbp@humi.test` (วิทยา ส.) or `worawee@humi.test` (SF-canonical).

| Step | Click target | Expected behavior |
|---|---|---|
| 1 | `/hrbp/dashboard` | HRBP landing — KPIs + Talent Search nav + queue snippet |
| 2 | `/quick-approve` | Inbox at company scope, all queues visible |
| 3 | `/quick-approve/bulk` | Bulk-action panel **visible** (was hidden for Manager) |
| 4 | Open a BE claim | Full detail viewer with 38 fields visible |
| 5 | Reroute action | Reroute drawer opens (capability-gated) |
| 6 | `/hrbp/talent-search` | Advanced filter (~30 inputs) + result grid |
| 7 | Open employee profile | Comp + Background + all sensitive entities visible |

**Talking point:** "HRBP has HR Admin parity on 4 high-stakes entities + Talent Search. Same shell as Manager, different capability bundle."

**Capture:** Is HRBP scope right? Should it be team-bounded or full company?

## Demo 4 — SPD (Approver shell, specialist variant) — 6 min

**Persona switch:** `spd@humi.test` (ดารณี ล.) or `apinya@humi.test`.

| Step | Click target | Expected |
|---|---|---|
| 1 | `/spd/inbox` | Specialty queue (claims + sensitive workflows) |
| 2 | `/spd-management` | Case-load + escalations + override actions |
| 3 | Open a BE claim | 38 fields visible (same as HRBP — partial visibility tier) |
| 4 | Try Talent Search nav | **Hidden** — SPD has no `talentSearch` capability |
| 5 | Override action | Override drawer opens |

**Talking point:** "SPD = HRBP minus Talent + minus Background data. Same shell, narrower bundle."

## Demo 5 — Admin (HR Admin + HRIS Admin) — 10 min

**Persona switch:** `admin@humi.test` (super-user proxy).

### HR Admin tour (5 min)

| Step | Route | Highlight |
|---|---|---|
| 1 | `/admin` | Admin landing |
| 2 | `/admin/employees` | Search-empty-by-default (240K employee dataset) |
| 3 | `/admin/employees/[id]` | 979-line employee detail page |
| 4 | `/admin/employees/[id]/transfer` | Lifecycle wizard (Transfer) |
| 5 | `/admin/hire` | Hire wizard (clusters & steps) |
| 6 | `/admin/benefits` | Benefits admin landing (currently 153 lines — STARTER) — **show as Sprint 3 work-in-progress** |

### HRIS Admin tour (5 min) — switch capability bundle

The same admin@ session has HRIS Admin powers. Highlight system-config surface:

| Step | Route | Highlight |
|---|---|---|
| 1 | `/admin/system` | System config hub |
| 2 | `/admin/system/security/settings` | Security settings (280 lines) |
| 3 | `/admin/system/security/consent` | PDPA consent management |
| 4 | `/admin/system/integration` | Integration registry |
| 5 | `/admin/system/system-features/edocuments` | EC Document hub (P1-Q12 — ~50K letters/year) |
| 6 | `/admin/system/reports/builder` | Custom report builder |
| 7 | `/admin/users/role-groups` | RBAC role groups (359 lines) |
| 8 | `/admin/users/data-permissions` | Data permissions (432 lines) |
| 9 | `/admin/users/audit-report` | Access audit trail |

**Talking point:** "HR Admin and HRIS Admin share `/admin/*` shell — different sections enabled by `Capability`."

## Closing & redline capture (5 min)

1. Summarize the gaps from MOCKUP-MATRIX:
   - 35 screens 🔴/⛔ remaining (Approver shell biggest, then BE Admin)
   - Sprint 1 will fan out 5 parallel agents on Approver shell
   - Sprint 2 will use the 6 BE workflow templates to build 13 user-facing claim screens
2. Open `REDLINES-2026-MM-DD.md` (TBD on demo day) and capture HR feedback per persona variant.
3. Confirm the 6 P0/P1 defaults (MOCKUP-MATRIX §"Open decisions") — let HR redirect any.

## Redline capture template

Drop this template into `REDLINES-{date}.md` after the session:

```markdown
# Redlines — {date}

## Persona × screen feedback

| Persona | Screen | Issue | Severity (P0/P1/P2) | Owner |
|---|---|---|---|---|
| Employee | /benefits-hub/reimbursement | "Plan name in Thai too long" | P2 | designer |
| Manager | /quick-approve | "Should see comp totals for budget" | P1 | hrbp+arch |
| HRBP | /hrbp/talent-search | "Need filter for branch code" | P1 | builder |
| HR Admin | /admin/benefits | "Plan catalog missing" | P0 | sprint-3 |

## Decisions confirmed (defaults accepted)

- [ ] P0-Q1 — HRBP/SPD as same shell + capability variant
- [ ] P0-Q3 — Effective dating UX = SF posture
- [ ] P0-Q4 — Termination picklist = full SF 17 codes
- [ ] P0-Q6 — BE = 6 reusable templates
- [ ] P0-Q8 — BE chain = HRBP → SPD → HR Admin (Manager skipped)
- [ ] P1-Q11 — Notifications = in-app + email (no SMS for v1)
- [ ] P1-Q15 — T&A = iframe embed cnext-time

## Decisions changed (HR redirected)

| Decision ID | New direction | Rationale |
|---|---|---|
| | | |

## Net new requirements surfaced

| ID | Description | Affected screens | Priority |
|---|---|---|---|
| | | | |
```
