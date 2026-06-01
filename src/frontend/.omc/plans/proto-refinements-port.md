# Plan — Port 3 verified design refinements from prototype bundle into live HR app

**Status:** `pending approval` (do NOT execute — no source edits until approved)
**Branch:** off `master` (human merges; AI never moves Linear to Done)
**Phase constraints:** UI-mockup, NO backend — all new math/state client-side over existing mock data + Zustand. NO-RED (danger = pumpkin `--color-danger`). TH/EN parity. Larger-than-normal text. Reconcile-in-place. Buddhist-era dates via `lib/date.ts`. Reuse Humi primitives + stores first.

---

## Context (grounded in source — both sides read)

**Prototype (extract UX/layout only; foreign Darwinbox palette + Babel/UMD — none of it ports verbatim):**
- `/tmp/humi-ecbe-v2/humi-all-ec-be/project/db-leave-apply.jsx` — month calendar w/ start/end range (`from`/`to` ints, `onCell` range logic L40-45), `totalDays = halfDay ? 0.5 : (to-from+1)` (L24), `willBal = bal - totalDays` with `เกินสิทธิ` over-quota (L202-203, uses `DB.absent` = red → must convert), weekend (`we`) + holiday markers (L130, hardcoded `[13,14]`), 4-node approval chain preview (L311-348), team-on-leave conflict + coverage-floor note (L381-401, uses `DB.leave` soft), half-day AM/PM toggle (L168-192), CC-notify chips (L254-269), delegate-to select (L280-289).
- `mod-benefit-1.jsx` — per-claim horizontal 5-step stepper `["ยื่น","ตรวจ","ผจก.","Admin","จ่ายเงิน"]` driven by integer `c.step` (L79-95), active node ringed `var(--color-warning)`, done node `var(--color-accent)`. **Wallet grid (L23-46) is OUT (dup of existing allowance strip).**
- `mod-employee.jsx` — profile hero with `อายุงาน 2 ปี 7 ด.` tenure counter (L38-41) + `ต้องอัปเดต · N รายการรอคุณ` task callout (L105-123, urgent flag uses `var(--color-warning)` not red).

**Live targets (confirmed):**
- `src/app/[locale]/timeoff/page.tsx` — `RequestTab` L444; plain `<input type="text">` date fields L546/L558 (free-text, placeholder "เช่น 28 เม.ย."); validation L461-473 is string-compare only; `ApprovalChain` imported L25, `TIMEOFF_CHAIN=['manager','hr_admin']` L29, rendered in **History** rows L672 (post-submit only — not in RequestTab). 3 balance KPIs from `HUMI_LEAVE_BALANCES` L221, `b.remaining` is a **string** (`'8.5'`, `'ไม่จำกัด'`).
- `src/app/[locale]/benefits-hub/page.tsx` — `inFlight` list L243-277 builds `{statusLabel, statusTone, days}` from `referrals[].status` (`pending_spd|spd_reviewing|approved|send_back`, mapped L253) + `HUMI_CLAIM_HISTORY` filtered by `CLAIM_STATUS_META[r.status]?.label !== 'Approved'`. Side tracker cards render L431-468 (status chip + days only — no stepper).
- `src/app/[locale]/profile/me/page.tsx` — hero card L841-900; `const p = HUMI_MY_PROFILE` L329; `pendingChanges` from `humi-profile-slice` L341. Hero currently shows `p.startLabel` tag L898 (string), **no tenure counter, no task callout**.

**Reuse inventory (confirmed):**
- `components/humi/` primitives: Card, Button, Avatar, Toggle, Modal, FormField, DataTable, etc. **No date-range picker. No numbered-node stepper.**
- `components/manager-dashboard/TeamCalendar.tsx` — month grid exists but **display-only** (events→dots, no range selection), gregorian `DAYS`/`MONTHS`, uses `bg-danger` for `sick_leave`. Not reusable as-is for selection.
- `components/quick-approve/ApprovalChain.tsx` — `ApprovalChain({chain: ApproverStage[], locale, activeStage, size})` horizontal pill chain → **reuses cleanly for #1 chain preview** (confirmed `:41` optional `activeStage`; `undefined` → all-inactive preview look). Sibling `ApprovalTimelineChain` (status pills) ≠ a numbered-node stepper.
- **[Architect-caught prior art — reuse, don't rebuild]** `components/leave/leave-request-form.tsx:39` already has `calculateWorkingDays(start,end)` (weekend-excluding) + half-day→0.5 (`:78`) + `workingDays<=remaining` exceed check (`:89`). **ORPHANED** (no live `.tsx` importer — verified). Its test `lib/__tests__/leave.test.ts` *replicates* the logic inline rather than importing it. → relocate the fn into `lib/leave-math.ts`, extend with holidays, delete the orphan, fix the test to import.
- **[Architect-caught prior art — reuse, don't rebuild]** `lib/calculations/calcYearOfService.ts:75` returns `{years, months, display:'2 ปี 7 เดือน', decimal}`, already imported in `humi-mock-data.ts:1058`. → #3 calls it. `lib/date.ts` needs NO new tenure helper.
- Data: `HUMI_LEAVE_BALANCES` / `HUMI_LEAVE_PENDING` / `HUMI_LEAVE_COVERAGE` exist; **no holiday dataset** → add `HUMI_TH_HOLIDAYS`. `ClaimStatus = 'approved'|'pending'|'info'` (3 values — NOT a 5-stage pipeline). **Referrals carry a REAL 4-stage pipeline** (`benefits-hub/page.tsx:253`: รอ HRBP → SPD ตรวจ → รอออกใบ → ส่งกลับแก้). `HUMI_MY_PROFILE.hireDate?: string` (ISO) on the type; instance carries `startLabel: 'Hire Date · 14 ต.ค. 2566'` + `job` row `['Hire Date','14 ตุลาคม 2566']`.

---

## Work Objectives

1. **#1 [HIGH·M-L]** Replace free-text leave dates with a selectable month calendar (range + weekend/holiday markers), add live day-count + remaining-after + over-quota warning, surface a pre-submit `ApprovalChain` preview, and a team-on-leave conflict + coverage-floor panel for the selected range. Optional: half-day AM/PM.
2. **#2 [MED·M]** Add a per-claim horizontal **status-faithful** stepper to in-flight cards in benefits-hub — referrals render their genuine 4-stage pipeline, reimbursement claims render a 3-node (or chip) treatment from their 3 real states — driven by a tested per-source mapping. No fictional uniform 5-step pipeline. (Wallet grid NOT ported.)
3. **#3 [LOW-MED·S]** Add a live tenure counter + "ต้องอัปเดต · N รายการรอคุณ" task callout to the profile hero, re-skinned to Humi, no red.

## Guardrails

**Must Have:** ONE leave-day semantic (`calculateWorkingDays` relocated, orphan deleted, test imports it); range-select calendar updates day-count live; over-quota fires pumpkin (not red) at boundary; chain preview visible before submit (reused `ApprovalChain`); status-faithful stepper per in-flight item (referral 4-stage / claim 3-node-or-chip — no invented 5); tenure via `calcYearOfService` (no new helper); hero shows tenure + task count; every new i18n key in BOTH `en.json`+`th.json`; BE dates via `lib/date.ts`; danger = `--color-danger` only; focused Vitest for each pure function; `npx vitest run` + `npm run build` green.
**Must NOT Have:** any backend wiring / real POST; any `red-`/`rose-`/coral/crimson hex or Tailwind class in the diff; new routes or bolt-on tabs (reconcile-in-place); the prototype wallet grid; the standalone payslip card; token edits; changes to out-of-scope screens (shell/home/hire/probation/orgchart/payroll); moving any Linear ticket to Done.

---

## Decision summary (defaults — override on review)

> **Architect review applied (SOUND-WITH-CHANGES, 2026-06-01).** Reuse-first was violated by omission in v1: real prior art exists for leave-day math, half-day, and tenure. v2 reuses it. D1's framing flips: **build-visual-new BUT reuse-math-existing.**

- **D1 (reframed — build-visual-new, reuse-math-existing):** Build the *visual* `LeaveRangeCalendar` net-new (genuinely missing — this is the app's FIRST custom calendar; everything else uses native `<input type="date">`). But the *day-count math is NOT new*: **relocate the existing `calculateWorkingDays` from `components/leave/leave-request-form.tsx:39` into `lib/leave-math.ts` as single source of truth**, then layer Thai-holiday exclusion on top. Do NOT refactor `TeamCalendar` (confirmed blast radius, no benefit). **← RISKIEST visual piece + biggest call.**
- **D2 (reframed — status-faithful, NOT a uniform invented 5):** Stepper node-count is driven by the *source's real states*. **Referrals** already carry a genuine 4-stage pipeline (`benefits-hub/page.tsx:253`: รอ HRBP → SPD ตรวจ → รอออกใบ → ส่งกลับแก้) → render 4 nodes. **Reimbursement claims** only have `ClaimStatus = approved|pending|info` (3 values) → render a 3-node treatment (or keep the existing status chip). No fictional 5-step pipeline.
- **D3 optional extras:** Include half-day AM/PM only — **reuse the `halfDayOption: 'none'|'morning'|'afternoon'` + `→0.5` logic from `leave-request-form.tsx:68,78`**, don't reinvent. CC-notify chips + delegate-to deferred → Open Questions.
- **D4 (tenure — reuse, do NOT add a new helper):** #3 **calls `calcYearOfService(hireDate, events, asOf)`** from `lib/calculations/calcYearOfService.ts:75` (already imported in `humi-mock-data.ts:1058`; returns `{years, months, display:'2 ปี 7 เดือน', decimal}`). Do NOT add `tenureFromHireDate()`/`diffYearsMonths()` to `lib/date.ts`. One tenure semantic.

---

## Task Flow (atomic, per-commit; sequenced)

### T1a — #1 · Reconcile leave-day math (PURE, zero UI)  `[S, do FIRST]`
Establish ONE leave-day semantic before any UI touches it. No React, no screen edits — atomically revertible on its own.

- **Relocate** `calculateWorkingDays(start, end)` (weekend-excluding loop) **from** `components/leave/leave-request-form.tsx:39` **into** `src/lib/leave-math.ts` as the single source of truth. Re-export it; the orphaned form (if kept short-term) imports from there. **Layer Thai-holiday exclusion ON TOP** as an extended `countLeaveDays(start, end, { holidays?, halfDay? })` that delegates to the relocated base then subtracts holiday-dated working days — do NOT fork a 2nd day-count.
- **Reuse** the half-day rule from `leave-request-form.tsx:78` (`isSingleDay && halfDayOption !== 'none' → 0.5`); fold it into `countLeaveDays`'s `halfDay` branch.
- **Add** `remainingAfter(balanceRemaining: string, days)` (parses `'8.5'`; returns `null` for `'ไม่จำกัด'`) + `isOverQuota(...)`.
- **New** `HUMI_TH_HOLIDAYS: string[]` (ISO) in `humi-mock-data.ts` (realistic 2026 TH public-holiday seed).
- **Deprecate/delete** the orphan `calculateWorkingDays` in `leave-request-form.tsx` (point any remaining reference at `lib/leave-math.ts`; confirm zero live `.tsx` importers — already verified none).
- **Tests — EXTEND, do not duplicate:** update `src/lib/__tests__/leave.test.ts` to **import the real relocated function** (today it replicates the logic inline — comment "replicated from the form component") and add holiday-exclusion + over-quota-boundary + `'ไม่จำกัด'`→no-warning cases. No second `leave-math.test.ts` that re-tests the same base.
- **AC:** `leave.test.ts` imports from `lib/leave-math.ts` (no inline replica left); weekend + holiday exclusion + half-day=0.5 + over-quota boundary all green via `npx vitest run leave`; grep shows the orphan `calculateWorkingDays` definition is gone from `leave-request-form.tsx`.
- **Touches:** `lib/leave-math.ts` (new), `components/leave/leave-request-form.tsx` (remove local fn → import), `lib/humi-mock-data.ts` (holiday seed), `lib/__tests__/leave.test.ts` (extend).

### T1b — #1 · LeaveRangeCalendar primitive + wire into RequestTab  `[M, riskiest visual]`
Build the *visual* primitive (app's first custom calendar) and consume the T1a math. Depends on T1a.

- **New** `src/components/humi/LeaveRangeCalendar.tsx` (client): month grid (prev/next), Sun–Sat header, weekend dim, holiday dot (from `HUMI_TH_HOLIDAYS`), range select (`from`/`to` ISO), legend; danger states use `--color-danger`; selected = `bg-accent`/`bg-accent-soft`. Export via `components/humi/index.ts`. (Header BE/TH month label via existing `lib/date.ts` `formatDate(...,'th')` — no new date helper.)
- **Edit** `timeoff/page.tsx` `RequestTab`: replace L544-569 free-text inputs with `<LeaveRangeCalendar>`; store `from`/`to` as ISO; render total-days + remaining-after + over-quota chip (pumpkin) — all computed via `countLeaveDays`/`remainingAfter`/`isOverQuota` from T1a; keep existing `submit()` shape. **Reformat the ISO `from`/`to` into a BE/TH label via `lib/date.ts` (`formatDate(...,'th')`) BEFORE submit** — the History tab (`timeoff/page.tsx:645`) renders `fromDate`/`toDate` **verbatim**, so a raw ISO string would leak into the history row. Add half-day toggle (Humi `Toggle`) feeding `countLeaveDays`.
- **i18n:** `timeoff.calendar.*`, `timeoff.totalDays`, `timeoff.remainingAfter`, `timeoff.overQuota`, `timeoff.halfDay`, AM/PM (en+th).
- **AC:** calendar renders; clicking start then end paints a range and updates the day-count (driven by T1a math, weekend+holiday aware); exceeding remaining shows the pumpkin "เกินสิทธิ" warning (zero `red-`/`rose-` in diff).
- **Touches:** `components/humi/LeaveRangeCalendar.tsx` (new), `components/humi/index.ts`, `app/[locale]/timeoff/page.tsx`, `messages/en.json`, `messages/th.json`.

### T2 — #1 · Chain preview + team-conflict/coverage panel  `[M-S]`
- **Edit** `timeoff/page.tsx` `RequestTab`: render `<ApprovalChain chain={TIMEOFF_CHAIN} locale activeStage={undefined} size="sm"/>` as a pre-submit preview block (label "เส้นทางอนุมัติ"). **Reuse confirmed:** `ApprovalChain.tsx:41` accepts optional `activeStage`; `undefined` → all-inactive preview look. No change to the component.
- **[LOWEST-PRIORITY sub-item of #1 — DROP FIRST if effort runs over]** Conflict panel computing, from `HUMI_LEAVE_COVERAGE` (+`HUMI_LEAVE_PENDING`), who overlaps the selected ISO range, plus a coverage-floor note ("ทีมเหลือ N/M คน · ผ่าน/ต่ำกว่าเกณฑ์ X%") — floor breach uses pumpkin, not red. This is the closest thing to *inventing* a feature rather than re-skinning; keep only if the chain preview landed cheaply.
- **New** pure `overlapsRange()` + `coverageFloor()` in `lib/leave-math.ts` — tested (only if conflict panel is kept).
- **i18n:** `timeoff.chainPreview` (always); `timeoff.teamConflict.*`, `timeoff.coverageFloor` (only if panel kept) (en+th).
- **AC:** with a selected range, chain preview shows manager→hr_admin before submit (all-inactive). If conflict panel kept: lists overlapping mock teammates + coverage note, floor-breach pumpkin.
- **Touches:** `app/[locale]/timeoff/page.tsx`, `messages/*.json`; (+ `lib/leave-math.ts` & test only if conflict panel kept).

### T3 — #2 · Benefit claim status-faithful stepper  `[M]`
Status-faithful, NOT a uniform invented 5. Node count comes from the source's real pipeline.

- **New** `src/components/humi/ClaimStepper.tsx` — token-based numbered stepper that takes a **steps array + activeIndex** (variable length), connector lines between nodes; done=`bg-accent`, active=ring `--color-warning`; no red. Renders N nodes (N from caller), not a hardcoded 5.
- **New** pure `claimPipeline(source, status)` in `lib/benefit-claim-steps.ts` returning `{ steps: string[]; activeIndex: number; rework?: boolean }`:
  - **Referrals (real 4-stage):** steps `[รอ HRBP, SPD ตรวจ, รอออกใบ]` for forward progress (`pending_spd`→0, `spd_reviewing`→1, `approved`→2 รอออกใบ) — mirrors `benefits-hub/page.tsx:253`. **`send_back` is a rework/rejection, NOT progress to the final node** (Critic note): set `rework:true` and render the **chip fallback** ("ส่งกลับแก้") rather than lighting the rightmost node as if near-done.
  - **Reimbursement claims (only 3 real states `approved|pending|info`):** 3-node treatment `[ยื่น, ตรวจ, อนุมัติ]` (`pending`→1, `info`→1, `approved`→2) — OR keep the existing status chip if 3 nodes read as padding at impl review. Do NOT manufacture a 5-step pipeline for claims.
- **Edit** `benefits-hub/page.tsx`: add `pipeline` to each `InFlightItem` (call `claimPipeline(source, status)` in the `useMemo` L243, where `source` is already known: referral vs claim branch), render `<ClaimStepper steps={item.pipeline.steps} activeIndex={item.pipeline.activeIndex}/>` inside each in-flight card (L434 block); when `rework`, render the chip instead. Keep existing chip + days.
- **i18n (F2 — NO new keys; this page is hardcoded-TH):** `benefits-hub/page.tsx` has **NO `useTranslations` call** — all copy is hardcoded inline TH (e.g. `:286` "สวัสดิการของคุณ", `:253` "รอ HRBP"). There is no `benefitsHub` namespace in the catalogs. So **HARDCODE the stepper labels in TH** (the referral labels derive from the same source strings as `:253`); **DROP the `benefitsHub.stepper.*` keys AND the TH/EN-parity step from T3.** Introducing the page's first `useTranslations` hook is out of scope. (The global TH/EN-parity guardrail still binds #1/#3, which go through existing i18n — only T3 is exempt because its host page is hardcoded-TH.)
- **Tests** `lib/__tests__/benefit-claim-steps.test.ts`: each real status → expected `{steps.length, activeIndex, rework?}` for BOTH sources (referral forward-3 + `send_back` rework flag, claim 3-node); unknown→safe default.
- **AC:** referral cards render a forward stepper matching their genuine status, with `send_back` shown as a distinct rework chip (not a near-final node); claim cards render a 3-node (or chip) treatment — never a fictional uniform 5; **no new i18n keys, no `useTranslations` added to the page**; wallet grid NOT added; zero red in diff.
- **Touches:** `components/humi/ClaimStepper.tsx` (new), `components/humi/index.ts`, `lib/benefit-claim-steps.ts` (new), `app/[locale]/benefits-hub/page.tsx`, `lib/__tests__/benefit-claim-steps.test.ts` (new). **No `messages/*.json` (T3 is i18n-exempt).**

### T4 — #3 · Profile hero tenure + task callout  `[S]`
Reuse `calcYearOfService` — no new tenure helper. **Critic F1: must consume the EXISTING Original-Start-Date tenure semantic, not the re-hire date.**

- **CRITICAL (F1) — single tenure semantic:** `HUMI_MY_PROFILE` (instance `humi-mock-data.ts:1065`) has **NO `hireDate` key** → calling `calcYearOfService(undefined,…)` returns `{years:0, display:'0 เดือน'}` (a silent regression). The page ALREADY has the correct value: `_yos = calcYearOfService('2019-03-01' /*Original Start Date*/, HUMI_LIFECYCLE_EVENTS)` at `humi-mock-data.ts:1059`, rendered as the "Year of service" job row (`:1113`, ~7 ปี). The `startLabel`/job "Hire Date" row is the **2566 re-hire date (~2.5 ปี)** — using it would create **two tenure semantics on one page**.
- **FIX:** add `hireDate: '2019-03-01'` (Original Start Date) to the `HUMI_MY_PROFILE` instance (or export `_yos` from `humi-mock-data.ts`), and have the hero call `calcYearOfService(HUMI_MY_PROFILE.hireDate, HUMI_MY_PROFILE.lifecycleEvents)`. **EXPLICITLY FORBIDDEN:** the `startLabel` / job-row (2566) fallback. The hero tenure MUST equal `_yos.display` (the value already on the Job tab).
- **Edit** `profile/me/page.tsx` hero (L882-900): add the tenure line (from the above) + a "ต้องอัปเดต · N รายการรอคุณ" callout where N = count of `pendingChanges` with `status==='pending'`. Re-skin to Humi tokens; urgent accent = pumpkin/warning, no red.
- **i18n:** `profile.tenure`, `profile.tasksPending` (en+th, `{count}` ICU) — these go through the existing profile `useTranslations`, so TH/EN parity applies. EN tenure label formats from `{years, months}` (note: `calcYearOfService.display` is TH-only).
- **Tests:** `calcYearOfService` already has its own coverage — extend its existing test only if an EN-format wrapper is added; otherwise no new tenure test (reusing tested code).
- **AC:** hero tenure **equals `_yos.display` (~"7 ปี …"), NOT "0 เดือน" and NOT the 2566 re-hire ~"2 ปี"**; task callout shows the live pendingChanges count (0 → graceful "ไม่มีรายการรอคุณ"); zero red; no new tenure helper in `lib/date.ts`; no `startLabel`/job-row fallback in the diff.
- **Touches:** `lib/humi-mock-data.ts` (add `hireDate: '2019-03-01'` to instance / or export `_yos`), `app/[locale]/profile/me/page.tsx`, `messages/{en,th}.json`. (EN-format wrapper, if added: also `lib/calculations/calcYearOfService.ts` + its test.)

### T5 — Verification & gates  `[S]`
Per-refinement Playwright smoke + NO-RED scan + parity check + full gates. (Detail below.)

**Sequencing:** T1a (pure math reconcile — FIRST, isolates the one-semantic decision) → T1b (visual, depends on T1a) → T2 (depends on T1b's ISO range state; conflict panel droppable) → T3 (independent — can run after T1a) → T4 (independent) → T5 (after all). Recommended linear order T1a,T1b,T2,T3,T4,T5 for small reversible diffs. ~6 commits.

---

## Verification (per refinement)

**Playwright harness (reliable pattern — mandatory):**
```js
// BEFORE seeding localStorage, stub session so AuthSync can't overwrite the persona:
await page.route('**/api/auth/session', r => r.fulfill({status:200, contentType:'application/json', body:'null'}));
await page.addInitScript(() => localStorage.setItem('humi-auth', /* employee persona seed */));
// Playwright imports from REPO-ROOT node_modules. Screenshots → ~/claude-artifacts/hr/2026-06-01/
```
- **#1:** nav `/th/timeoff` → calendar renders; click start+end → assert day-count text updates; select over-quota range → assert pumpkin "เกินสิทธิ" visible; assert chain preview (manager→hr_admin) present pre-submit; assert conflict panel lists ≥1 teammate. Screenshot.
- **#2:** nav `/th/benefits-hub` → assert each in-flight card renders a status-faithful stepper: referral cards show a 3-node forward stepper (or a "ส่งกลับแก้" rework chip when send_back), claim cards a 3-node-or-chip treatment — exactly one active node each, never a uniform invented 5. Screenshot.
- **#3:** nav `/th/profile/me` → assert hero tenure is **NONZERO and matches `_yos.display` (~"7 ปี …")** — explicitly NOT "0 เดือน" and NOT the 2566 re-hire "~2 ปี" (guards the F1 regression), and "รายการรอคุณ" callout present. Screenshot.

**NO-RED scan:** `git diff` then grep for `red-`, `rose-`, `coral`, `crimson`, `#ef4444`/`#f87171`/`#dc2626`/clay/coral hex → must be **zero**; danger uses `--color-danger`/pumpkin token only. **Not a violation:** existing `text-danger` / `variant="error"` already in `leave-request-form.tsx` are TOKEN-based (resolve to pumpkin) — if T1a touches that file, the scan must not false-positive on those token names; it flags only raw red/rose/coral/crimson hex + literal `red-`/`rose-` Tailwind classes.

**TH/EN parity:** for every new key, assert present in BOTH `messages/en.json` and `messages/th.json` (script or manual diff of key sets).

**Focused Vitest:** **extend existing `leave.test.ts`** to import the relocated `countLeaveDays` from `lib/leave-math.ts` (weekend + new holiday exclusion, over-quota boundary, `'ไม่จำกัด'`, half-day=0.5) — no duplicate `leave-math.test.ts`; new `benefit-claim-steps` (per-source status→`{steps.length, activeIndex}`); conflict-overlap (only if conflict panel kept). **Tenure reuses `calcYearOfService`'s existing tests** — no new tenure test unless an EN-format wrapper is added.

**Gates:** `npx vitest run` (NOT `npm test` — that's watch mode) + `npm run build` (typecheck) both green.

---

## RALPLAN-DR Summary (mode: SHORT) — v2 (Architect-revised)

**Principles (4):**
1. **Reuse-first (sharpened after Architect caught v1 omissions):** reuse existing LOGIC before building, not just primitives. Concretely: relocate+extend `calculateWorkingDays` (`leave-request-form.tsx:39`) instead of writing new day-count; call `calcYearOfService` (`calcYearOfService.ts:75`) instead of a new tenure helper; reuse the orphan's half-day rule; reuse `ApprovalChain` as-is. Build net-new ONLY the two genuinely-missing *visual* pieces (`LeaveRangeCalendar`, `ClaimStepper`).
2. Pure-function core — leave-day + stepper math is React-free + unit-tested; UI stays thin. Tenure delegates to an already-tested function.
3. Token discipline — NO-RED, BE dates, larger text, reconcile-in-place are non-negotiable hard gates verified by scan, not by eyeball.
4. Small reversible commits — 1 capability per commit (T1 split into T1a pure / T1b visual so the one-semantic reconciliation is revertible before any UI), each independently green.
5. **Data honesty** — UI must reflect the source's *real* states; do not manufacture pipeline detail that no field backs (drives the status-faithful stepper).

**Decision Drivers (top 3):**
1. **Reuse-first / single-semantic** → one leave-day function, one tenure function; eliminate duplicate/orphan logic rather than add a parallel copy.
2. Regression risk on shared components → net-new isolated *visual* primitives; do NOT refactor `TeamCalendar` (confirmed blast radius, no benefit).
3. Data honesty + verifiability → stepper node-count tracks genuine states; every claim has a Playwright assert + a unit test; gates scripted.

**Viable options for non-trivial decisions:**

*D1 — Leave calendar & day-count (RISKIEST; framing FLIPPED by Architect):*
- **(A) Build VISUAL new + REUSE MATH existing [CHOSEN].** Build `LeaveRangeCalendar` net-new (genuinely missing — app's first custom calendar); but relocate+extend `calculateWorkingDays` as the single day-count source, layering Thai-holiday exclusion on top. Pros: zero regression to manager-dashboard; ONE leave-day semantic; honors reuse-first. Cons: ~120 new visual lines; a 2nd month-grid *renderer* (not a 2nd *math*) coexists with `TeamCalendar`.
- **(B) Build BOTH visual AND math new (v1's mistake).** Cons: forks a 2nd day-count beside the orphan → two semantics drift. → *Invalidated by Driver 1 — this was the Architect's HIGH finding.*
- **(C) Refactor `TeamCalendar` into a selectable picker.** Cons: range-select + BE/TH labels + `bg-danger` conversion; regresses the live manager screen. → *Invalidated by Driver 2; revisit only if a 3rd consumer appears.*

*D2 — Benefit stepper shape (reframed: status-faithful, not uniform-5):*
- **(A) Status-faithful, per-source node count [CHOSEN].** Referrals → genuine 4-stage pipeline; reimbursement claims → 3-node (or chip) from their 3 real states. Pros: every node maps to a real state; safe for HR sign-off demo; reuses existing status strings. Cons: stepper component must accept a variable-length steps array (slightly more general) — cheap.
- **(B) Force a uniform invented 5-step pipeline (v1's approach).** Cons: manufactures `ผจก./Admin/จ่ายเงิน` detail no field backs; could mislead HR in sign-off. → *Invalidated by Driver 3 (data honesty) — Architect MED finding.*
- **(C) Add a real `stage` field to mock data.** Cons: invents data the app doesn't otherwise read; drift. → *Invalidated by Driver 1.*

*D3 — #1 optional extras:*
- **(A) Half-day only, REUSING the orphan's logic [CHOSEN].** Reuse `halfDayOption`/`→0.5` from `leave-request-form.tsx:68,78`. Pros: cheap, single semantic. Cons: none material.
- **(B) Half-day + CC chips + delegate.** Cons: extra form state + i18n for low mockup value → deferred to Open Questions.

*D4 — Tenure (new in v2):*
- **(A) Call `calcYearOfService` [CHOSEN].** Already imported in `humi-mock-data.ts:1058`; returns `{years, months, display, decimal}`, already tested. Pros: one tenure semantic, zero new test surface. Cons: `.display` is TH-only → format EN from `{years,months}` if an EN line is needed.
- **(B) Add `tenureFromHireDate()`/`diffYearsMonths()` to `lib/date.ts` (v1's approach).** Cons: second tenure semantic beside a tested existing one. → *Invalidated by Driver 1 — Architect HIGH finding.*

*D5 — Team-conflict/coverage panel (scope tightening):*
- **(A) Keep as LOWEST-priority sub-item of #1, drop first if effort runs over [CHOSEN].** It is the closest thing to inventing a feature vs re-skinning. The chain preview (pure reuse) is the must-keep; the conflict panel is the cuttable.
- **(B) Treat it as core #1.** → *De-prioritized; it carries the most "new feature" risk and least prototype-fidelity grounding.*

---

## ADR (v2 — Architect-revised)

- **Decision:** Port the 3 refinements by building net-new only the two genuinely-missing *visual* primitives (`LeaveRangeCalendar`, `ClaimStepper`), while **reusing existing logic**: relocate+extend `calculateWorkingDays` (`leave-request-form.tsx:39`) into `lib/leave-math.ts` as the single leave-day source (Thai-holiday exclusion layered on top); call `calcYearOfService` (`calcYearOfService.ts:75`) for tenure; reuse the orphan's half-day rule; reuse `ApprovalChain` as-is (confirmed `activeStage?` → all-inactive preview). The benefit stepper is **status-faithful** (referrals 4-stage / claims 3-node-or-chip), not a uniform invented 5. All dynamic values derive client-side from existing mock data/stores.
- **Drivers:** reuse-first / single-semantic (one leave-day fn, one tenure fn — eliminate the orphan, don't fork it); minimize regression on shared screens (no `TeamCalendar` refactor); data honesty + verifiability (nodes track real states; unit tests + Playwright + scripted NO-RED/parity).
- **Alternatives considered:** build both visual AND math new (D1-B — v1's mistake, forks day-count); refactor `TeamCalendar` (D1-C); uniform invented 5-step stepper (D2-B — manufactures detail); add a `stage` backing field (D2-C); add a new tenure helper to `lib/date.ts` (D4-B — second tenure semantic); port CC/delegate/wallet grid (rejected — wallet dup, extras low-value).
- **Why chosen:** delivers the verified UX gains at lowest blast radius AND highest reuse — one leave-day semantic, one tenure semantic, no orphaned duplicate logic, no fictional pipeline. **Note (accepted divergence, not silent):** `LeaveRangeCalendar` is the app's FIRST custom calendar — every other date entry uses native `<input type="date">` (admin/hire steps). The divergence is justified solely by the range-select + Thai-holiday-marker UX that a native input cannot provide; it is NOT a precedent for replacing native date inputs elsewhere. Every gate (NO-RED, parity, BE dates, tests, build) is mechanically checkable.
- **Consequences:** a 2nd month-grid *renderer* coexists with `TeamCalendar` (acceptable — different purpose; shared *math* now lives in one place); the orphan `calculateWorkingDays` is removed (net reduction in duplicate logic); the stepper component is variable-length (slightly more general); `HUMI_TH_HOLIDAYS` is a new seed to maintain; `calcYearOfService.display` is TH-only so an EN tenure line needs a small `{years,months}` format. **(F1)** `HUMI_MY_PROFILE` gains `hireDate: '2019-03-01'` so the hero tenure binds to the SAME Original-Start-Date semantic already shown on the Job tab (`_yos`) — re-hire date 2566 is forbidden as a source. **(F2)** T3 is i18n-exempt: benefits-hub is hardcoded-TH (no `useTranslations`), so the stepper labels are hardcoded TH and add no catalog keys — TH/EN parity remains enforced on #1/#3 only.
- **Follow-ups:** if a 3rd calendar consumer appears, consider unifying the two renderers; revisit CC-notify/delegate-to + the droppable conflict panel when leave gets a real backend; if claims later gain a real multi-stage backend, the status-faithful stepper extends to match (no invented detail to unwind).

---

## Estimated effort
Total ~M-L, ~6 commits: T1a (S — pure math reconcile, removes orphan), T1b (M — the bulk + visual risk), T2 (M-S — chain preview cheap; conflict panel droppable), T3 (M — status-faithful stepper), T4 (S — reuses `calcYearOfService`), T5 (S). v2 is slightly *less* net-new code than v1 (deletes the orphan, adds no tenure helper, no duplicate leave-math test).

## Riskiest task & biggest reuse-vs-build call
- **Riskiest:** **T1b** `LeaveRangeCalendar` — net-new interactive primitive replacing working inputs; range-select + holiday/weekend rendering are the failure-prone bits (the math behind it is the relocated, already-tested `calculateWorkingDays` + a tested holiday layer, so the *logic* risk is low; the *interaction* risk is what remains). T1a de-risks it by locking the one-semantic math first.
- **Biggest reuse-vs-build:** D1 — resolved as **build the visual, reuse the math**. Build `LeaveRangeCalendar` (genuinely missing) but relocate/extend the existing `calculateWorkingDays` rather than fork a second day-count; do not refactor `TeamCalendar`.
