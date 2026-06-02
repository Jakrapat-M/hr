# Open Questions

> Triaged & cleared 2026-06-01. All prior items below are RESOLVED, STALE, or
> DECIDED. Only the "Accepted-as-deferred" list at the bottom remains live, and
> each carries a recorded decision (so nothing is ambiguously open).

## Resolved / stale (verified against current source 2026-06-01)

### 7-Part Shell/IA (2026-05-25)
- [x] Req2 impersonation ribbon — **DECIDED & SHIPPED**: `LoginAsRibbon.tsx` renders ONLY while impersonating (`originalUser !== null`), nothing otherwise (SF-realignment 2026-05-28). No always-visible identity strip.
- [x] Req3 calendar i18n/data "dead code" — **NOT DEAD**: `HUMI_CAL_EVENTS`/`CAL_DAYS_TH`/`humiHero.calendar*` still consumed by `TeamCalendar.tsx` + `manager-dashboard-page.tsx`. Leave as-is (removing would break live components).
- [x] Req4 access-tier A/B/C/D mapping — **SHIPPED**: `persona-tiers.ts` (A=hr_admin/hr_manager, B=hrbp/spd, C=manager, D=employee), used across the shell + this session's audit.
- [x] Req7 replace 861-line `quick-approve-page.tsx` — **STALE**: that file no longer exists; the simplified unified `/quick-approve` table is the default.
- [x] Req1 / Req6 token + inbox-icon — resolved in ralplan iter-2 (accent-alt tokens exist; lucide `Mail`).
- [x] Proxy-exit destination — `/${locale}/home` for both ribbon + PersonaSwitcher.
- [x] Linear coverage (Reqs 1/3/4/6) — **N/A this phase**: UI-mockup work has shipped ticketless by established pattern (P1/P2/audit PRs #203–#216). Create an umbrella ticket only if tracking is later wanted.

### Sidebar Menu Simplification (2026-05-25)
- [x] Notifications System leaf — **DECIDED**: cut; reachable via `/admin/system` (System group stays 4 leaves). `Sidebar.tsx:168`.
- [x] `docreview` vs `hr-docs` → `/admin/documents` — documented Principle-1 exception (same screen, two persona contexts).
- [x] `probation` href — **DECIDED**: keep `/manager-dashboard/probations` (current, renders for manager/hrbp/hradmin, 0 dead-ends in the 2026-06-01 per-persona walk). `/workflows/probation` remains a detail route, not the manager-group entry.
- [x] Timesheet h1 relabel depth — **DECIDED**: eyebrow-only (minimal diff); keep h1 `บันทึกเวลางาน`/`Timesheet`.

### Persona Menu/Journey Audit (2026-06-01) — fixed in PR #216
- [x] SPD talent-search menu-truth violation — fixed (`Sidebar.tsx:140` → `['hrbp']`).
- [x] `?tab=compensation` deep-link → wrong tab — fixed (`PROFILE_TAB_FROM_QUERY.compensation: 'employment'`).

## Accepted-as-deferred (decision recorded — revisit only in a post-mockup polish pass)

These are NOT blockers and NOT bugs; each has a decision. Left out of mockup scope deliberately.

- **Profile `compensation` slice rename** — DECISION: keep the legacy slice name + the code comment shipped in #216 (URL-divergence seam). Real rename is post-mockup cleanup (ADR B2); no user-visible impact.
- **Long Thai sidebar leaf-label truncation (~256px panel)** — DECISION: leave; EN tooltip mitigates. A width/typography change interacts with the larger-than-normal-text rule and belongs to a dedicated shell-polish pass, not a one-off.
- **HR-Admin "ระบบ"/System group = single leaf** — DECISION: keep. It's an IA grouping choice, not a defect; flattening would scatter the System destination. No change.
- **Performance external-system leaf (`/performance-form`) link affordance** — DECISION: leave as-is. Performance is an external system; the placeholder copy already states this. Add an external-link icon only if a broader external-systems pass happens.

## Prototype Refinements Port — 2026-06-01 (v2, Architect-revised)
- [x] D1 Calendar reuse-vs-build — **RESOLVED (Architect):** build the *visual* `LeaveRangeCalendar` new (app's first custom calendar — accepted divergence noted in ADR) BUT reuse the *math* — relocate+extend `calculateWorkingDays` from `leave-request-form.tsx:39`, don't fork. No `TeamCalendar` refactor.
- [x] D2 Benefit stepper — **RESOLVED (Architect):** status-faithful, NOT a uniform invented 5. Referrals → genuine 4-stage; reimbursement claims → 3-node-or-chip from 3 real states. No fictional pipeline.
- [x] D4 Tenure — **RESOLVED (Architect + Critic F1):** call existing `calcYearOfService`; do NOT add a helper to `lib/date.ts`. **F1 pins the source:** add `hireDate: '2019-03-01'` (Original Start Date) to `HUMI_MY_PROFILE` so the hero tenure equals the `_yos` already shown on the Job tab (~7 ปี); the 2566 re-hire date / `startLabel` / job "Hire Date" row are FORBIDDEN as the source (would create two tenure semantics + a `0 เดือน` regression).
- [ ] D3 #1 optional extras — Default: half-day AM/PM only (reuse orphan's `halfDayOption`/→0.5 logic); DEFER CC-notify chips + delegate-to. — Confirm whether CC/delegate are wanted in mockup.
- [ ] D5 Team-conflict/coverage panel — De-prioritized to lowest #1 sub-item; **drop first if effort runs over** (closest to inventing a feature vs re-skinning). — Confirm whether HR wants it in the mockup at all.
- [ ] #2 claim 3-node-vs-chip — For reimbursement claims (only 3 real states), confirm at impl whether a 3-node stepper reads as value or padding; fall back to the existing status chip if padding.
- [x] #3 hireDate source — **RESOLVED (Critic F1):** `hireDate: '2019-03-01'` (Original Start Date) added to the instance; hero tenure must equal `_yos.display`; re-hire/`startLabel`/job-row fallback forbidden. EN tenure line formats from `{years,months}` (`calcYearOfService.display` is TH-only).
- [x] T3 i18n — **RESOLVED (Critic F2):** benefits-hub is hardcoded-TH (no `useTranslations`); stepper labels hardcoded TH, NO new catalog keys, T3 exempt from TH/EN-parity step. Adding the page's first `useTranslations` is out of scope.
- [ ] #2 claim send_back rendering — render `send_back` as a distinct rework chip (not the rightmost node lit as near-done); confirmed in T3, restated here for the impl reviewer.
- [ ] #2 ClaimStatus future backend — `ClaimStatus`(3) reconciles with any future multi-stage claim backend; status-faithful stepper extends cleanly then. — ADR follow-up.
