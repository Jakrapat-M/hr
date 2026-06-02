# Plan — Persona Menu/Journey Audit Defect Fixes

**Status:** `pending approval` — do NOT execute, do NOT edit files until approved.
**Date:** 2026-06-01
**Branch:** off `master` (human merges; AI never moves Linear to Done)
**Phase:** UI-mockup — NO backend wiring. Menu/route truth + deep-link correctness only.

---

## Context

A deep per-persona menu/journey audit surfaced two confirmed defects and two soft issues in
the HR Next.js app (`src/frontend/`). All evidence is verified against current source:

- **D1 (HIGH — menu-truth violation):** SPD sees the "ค้นหาคนเก่ง" (talent-search) sidebar leaf,
  but `/hrbp/talent-search` is HRBP-only → SPD lands on NotAuthorized ("ฟีเจอร์นี้สำหรับ HRBP เท่านั้น").
  Violates the standing **remove-not-hide** rule (never render a leaf a persona can't enter).
- **D2 (MED — confusing deep-link):** `/profile/me?tab=compensation` opens the EMERGENCY-CONTACT
  tab, not the compensation cards. The comp cards (`CompensationSummary` + `CompensationHistory`)
  live inside the `job` panel.
- **S3 (LOW — soft):** "ผลงานทีม" (`/performance-form`) lands on an external-system placeholder
  (Performance is intentionally external to this HRMS).
- **S4 (LOW — soft):** Menu polish — Resign separator, single-leaf System group for hradmin,
  long-Thai-label truncation.

### Verified evidence (read at plan time)

| Ref | File / Line | Fact |
|-----|-------------|------|
| D1-leaf | `src/components/humi/shell/Sidebar.tsx:140` | `talent-search` leaf `show: ['hrbp', 'spd']` |
| D1-cap-spd | `src/lib/capabilities.ts:69` | SPD bundle `talentSearch: false` |
| D1-cap-hrbp | `src/lib/capabilities.ts:165` | HRBP bundle `talentSearch: true` |
| D1-gate | `src/app/[locale]/hrbp/talent-search/page.tsx:48` | `<Capability action="talentSearch" fallback={<NotAuthorized/>}>` |
| D1-test | `src/__tests__/sidebar-admin-menu-rbac.test.ts:84-91` | **Existing test asserts SPD DOES see talent-search** (lines 85-86). Must be updated. |
| D1-sibling | `src/components/humi/shell/Sidebar.tsx:139,141` | `employees-bu` → `/hrbp/employees`, `benefits-reports` → `/hrbp/benefits/reports`, both `show:['hrbp','spd']` — must be VERIFIED, not assumed correct |
| D2-map1 | `src/app/[locale]/profile/me/page.tsx:90-101` | `PROFILE_TAB_FROM_QUERY.compensation: 'compensation'` |
| D2-map2 | `src/app/[locale]/profile/me/page.tsx:72-79` | `SLICE_TO_PANEL.compensation: 'emergency'`; `employment: 'job'` (comp cards live in `job` panel) |
| D2-emerg | `src/app/[locale]/profile/me/page.tsx:94` | `PROFILE_TAB_FROM_QUERY.emergency: 'compensation'` — emergency deep-link MUST keep working |
| S4-resign | `src/components/humi/shell/Sidebar.tsx:112` | `resign` leaf `show: ALL6`, last in "ฉัน" group |
| S4-system | `src/components/humi/shell/Sidebar.tsx:154-172` | System group: for `hradmin` only `audit` leaf is visible (single rail stop) |

---

## Work Objectives

1. Restore menu truth for SPD talent-search (remove-not-hide) without weakening the route's
   defense-in-depth gate.
2. Make `?tab=compensation` deep-link land on the compensation cards while preserving the
   emergency and employment deep-links.
3. Decide the lightest safe treatment for the external-system Performance leaf.
4. Apply only the cheap/safe subset of menu polish; explicitly defer the rest.
5. Keep all gates green and add focused regression coverage for D1 + D2.

## Guardrails

**Must Have**
- `npm test` stays green (~2327 passing) and `npm run build` (typecheck) passes.
- Each task = one atomic commit, small + reversible.
- TH/EN i18n parity for any user-facing string (`messages/en.json` + `messages/th.json`).
- NO-RED: any new affordance uses pumpkin `--color-danger`, never red.
- Reconcile-in-place: edit existing screens; no new tabs/views.
- Defense-in-depth intact: the `<Capability>` route gate on talent-search stays.

**Must NOT Have**
- No backend wiring, no new dependencies.
- Do NOT touch `/hrbp/employees` dead-end (OUT OF SCOPE — disproven false-positive;
  guard at `hrbp/employees/layout.tsx:22` already admits hrbp/spd/hr_admin/hr_manager).
- Do NOT grant SPD the `talentSearch` capability (page is intentionally HRBP-only per SF parity).
- Do NOT change visible in-app tab-click behavior on the profile screen.

---

## RALPLAN-DR Summary

### Principles (4)
1. **Menu = truth.** A persona only sees leaves it can actually enter (remove-not-hide). The menu yields to the capability, not vice-versa.
2. **Defense-in-depth survives the fix.** Removing a leaf is a UX correction; the route's own `<Capability>` gate stays as the security backstop.
3. **Smallest reversible diff.** Prefer a one-token `show` edit / one map-entry edit over refactors. No architecture changes.
4. **Verify, don't assume.** Sibling leaves and "fixed" behavior get a Playwright/unit assertion, not a hand-wave.

### Decision Drivers (top 3)
1. **SF parity** — talent-search is HRBP-only by product intent; SPD must not gain the capability.
2. **Deep-link correctness without regressing siblings** — `?tab=compensation` must move, but `?tab=emergency` and `?tab=employment` must not break.
3. **Test-suite truth** — an existing test currently encodes the wrong behavior (SPD sees talent-search); the fix must rewrite that assertion, not silently break it.

### Viable Options per non-trivial decision

**Decision A — How to fix the D1 talent-search mismatch**
- **A1 (CHOSEN): Remove `'spd'` from the leaf `show` → `['hrbp']`.**
  - Pros: menu matches capability; respects SF parity; one-token diff; reversible.
  - Cons: must update the existing test that asserts SPD-visibility (line 85-86).
- **A2: Grant SPD the `talentSearch` capability (`capabilities.ts:69 → true`).**
  - Pros: SPD gains the feature; no test rewrite of visibility direction.
  - Cons: **violates SF parity** (page is intentionally HRBP-only); changes product scope; touches the security bundle. Rejected.
- **A3: Leave leaf, soften page to a "coming soon for SPD" panel instead of NotAuthorized.**
  - Pros: no menu change.
  - Cons: still a dead-end UX; adds surface; contradicts remove-not-hide. Rejected.

**Decision B — How to fix the D2 `?tab=compensation` deep-link**
- **B1 (CHOSEN): Remap `PROFILE_TAB_FROM_QUERY.compensation → 'employment'`** (the slice that
  resolves to the `job` panel where comp cards render). Keep `emergency → 'compensation'` slice
  untouched so the emergency tab still works.
  - Pros: external deep-links land on comp cards; one map-entry edit; emergency + employment links unaffected; visible tab clicks unchanged.
  - Cons: the slice name `compensation` stays a legacy misnomer (query string ≠ slice name); needs a clear code comment.
- **B2: Rename the legacy `compensation` slice to a comp-correct panel across the slice + both maps.**
  - Pros: removes the legacy misnomer entirely.
  - Cons: larger blast radius (Zustand slice + `SLICE_TO_PANEL` + `PROFILE_TAB_QUERY` + emergency tab routing); higher regression risk on the emergency tab; not warranted in mockup phase. Rejected.

**Decision C — S3 Performance external-system leaf**
- **C1 (CHOSEN): Leave as-is (no code).** The placeholder already communicates "external system";
  low priority; adding an affordance is net new surface with no clear payoff this phase.
- **C2: Add an external-link icon/badge to the leaf.** Pros: clearer affordance. Cons: i18n + icon
  surface for marginal value; defer to a polish pass. Documented as a follow-up, not done now.

### Mode
**SHORT** (default). No `--deliberate` flag and no high-risk signal — these are bounded, reversible
UI/routing fixes in mockup phase. No pre-mortem / expanded e2e matrix required.

---

## Task Flow (ordered, atomic — one commit each)

```
T1 (D1 leaf + test)  ─┐
T2 (D1 sibling verify)─┼─ independent of T3/T4; T2 depends on T1's leaf edit landing
T3 (D2 remap + test) ─┘   (T3 fully independent of T1/T2)
T4 (S4 menu polish — cheap subset only)   depends on nothing; do last
Gate: full npm test + npm run build green after each commit
```

Sequencing notes:
- **T1 must precede T2** (T2 re-walks SPD's menu via Playwright to confirm talent-search is gone AND siblings remain).
- **T3 is independent** of T1/T2 (different file) — can be done in any order, separate commit.
- **T4 last** — pure polish; keep out of the defect commits for clean reverts.

---

## Detailed TODOs

### T1 — Remove SPD from talent-search leaf + fix the existing test (D1)  · size: S
**Files:**
- `src/components/humi/shell/Sidebar.tsx:140` — change `show: ['hrbp', 'spd']` → `show: ['hrbp']`; update the trailing comment to note SPD removed (menu yields to HRBP-only capability per SF parity).
- `src/__tests__/sidebar-admin-menu-rbac.test.ts:84-91` — rewrite the `talent-search` test:
  flip `leafVisible(leaf('talent-search'), SPD)` from `true` → `false`; keep HRBP `true`;
  keep the rename/intent of the describe block accurate.

**Acceptance criteria:**
- [ ] `leaf('talent-search').show` is `['hrbp']`.
- [ ] Test asserts SPD does NOT see talent-search; HRBP still does; employee/manager/hr_admin still `false`.
- [ ] No change to `capabilities.ts` (SPD `talentSearch` stays `false`).
- [ ] No change to the page gate at `talent-search/page.tsx:48`.
- [ ] `npm test -- --run sidebar-admin-menu-rbac` passes.
- [ ] `npm run build` typecheck clean.

### T2 — Verify sibling leaves + defense-in-depth via per-persona Playwright smoke (D1)  · size: M
Confirms (not assumes) that `employees-bu` and `benefits-reports` are correctly reachable for SPD,
that talent-search no longer appears, and that the route gate still blocks a direct nav.

**Harness (RELIABLE pattern — required):** standalone Playwright script, imports from **REPO-ROOT**
`node_modules` (not `src/frontend`). For each persona, BEFORE seeding the persona:
```js
await page.route('**/api/auth/session', r =>
  r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
// THEN seed localStorage['humi-auth'] with the persona's roles
```
(Order matters — otherwise AuthSync overwrites the seed with a 4-role super-user.)

**Assertions (SPD persona):**
- [ ] SPD sidebar does NOT render the `ค้นหาคนเก่ง` / talent-search leaf.
- [ ] Direct nav to `/th/hrbp/talent-search` as SPD still shows NotAuthorized (defense-in-depth intact).
- [ ] SPD can open `/hrbp/employees` (employees-bu) — no dead-end.
- [ ] SPD can open `/hrbp/benefits/reports` (benefits-reports) — no dead-end.
- [ ] Screenshots saved to `~/claude-artifacts/hr/2026-06-01/`.
- [ ] If a sibling IS a dead-end (unexpected): STOP and report — do not auto-fix in this task.

**Acceptance criteria:** all five assertions pass; screenshots captured; sibling-mismatch escape hatch documented.

### T3 — Remap `?tab=compensation` deep-link to the job/compensation panel + regression test (D2)  · size: S
**Files:**
- `src/app/[locale]/profile/me/page.tsx:95` — change `PROFILE_TAB_FROM_QUERY.compensation: 'compensation'`
  → `'employment'` (the slice → `job` panel where `CompensationSummary` + `CompensationHistory` render).
  Add a clear comment that the `compensation` *query key* intentionally routes to the employment/job
  panel, while the legacy `compensation` *slice* (→ emergency panel) is reached via `?tab=emergency`.
- Do NOT touch line 94 (`emergency: 'compensation'`) or line 93 (`job: 'employment'`).
- Add/extend a regression test (new `src/__tests__/profile-tab-routing.test.ts` or extend an existing
  profile test): assert `resolveProfileTab({get:k=>k==='tab'?'compensation':null})` resolves to the
  profile tab that renders the job/comp panel; assert `?tab=emergency` still resolves to the emergency tab.

**Acceptance criteria:**
- [ ] `?tab=compensation` resolves to the tab whose panel renders `CompensationSummary`/`CompensationHistory`.
- [ ] `?tab=emergency` still resolves to the emergency-contact tab (no regression).
- [ ] `?tab=employment` unchanged.
- [ ] Visible in-app tab clicks unchanged (`PROFILE_TAB_QUERY` untouched).
- [ ] New/extended regression test passes.
- [ ] Playwright (reuse T2 harness, any authenticated persona): `/th/profile/me?tab=compensation` shows the comp cards. Screenshot to artifacts dir.

### T4 — Cheap/safe menu polish only; defer the rest (S4)  · size: S
**Do (cheap + safe):**
- [ ] Add a visual separator/divider above the Resign (`ลาออก`) leaf in the "ฉัน" group, if the
  Nav primitive already supports a divider/`separator` prop. If it does NOT, **defer** (do not invent a new primitive).

**Defer explicitly (document in open-questions, no code):**
- Long Thai leaf-label truncation at ~256px panel width — needs a width/typography decision
  (touches shell layout; larger-than-normal-text rule interacts here). Defer to a shell-polish pass.
- HR-Admin "ระบบ" single-leaf group (one rail stop for one destination) — IA decision, not a bug;
  defer pending product call on whether to flatten.

**Acceptance criteria:**
- [ ] Resign separator added ONLY if the existing Nav primitive supports it; otherwise no-op + deferred.
- [ ] No new primitive, no hardcoded hex, no red.
- [ ] Deferred items written to `.omc/plans/open-questions.md`.

### S3 — Performance external-system leaf: NO CODE (decision recorded)
- [ ] Confirmed: leave `/performance-form` leaf + placeholder as-is (Option C1). Record the
  external-link-affordance idea (C2) in open-questions as a future polish item.

---

## Success Criteria
- D1: SPD no longer sees talent-search leaf; route gate still blocks direct nav; siblings verified reachable.
- D2: `?tab=compensation` lands on comp cards; emergency + employment deep-links intact.
- S3: decision recorded (no-code).
- S4: only the safe separator applied; rest deferred with rationale.
- Gates: full `npm test` (~2327) + `npm run build` green; focused regression tests added for D1 + D2.
- Per-persona Playwright smoke green with screenshots in `~/claude-artifacts/hr/2026-06-01/`.

---

## ADR — Persona Menu/Journey Audit Fixes

**Decision**
1. Fix D1 by removing `'spd'` from the talent-search sidebar leaf `show` (→ `['hrbp']`) and updating
   the existing RBAC test that wrongly asserts SPD-visibility. Keep the route `<Capability>` gate and
   keep SPD's `talentSearch` capability `false`.
2. Fix D2 by remapping `PROFILE_TAB_FROM_QUERY.compensation` from slice `compensation` to slice
   `employment` (which renders the `job`/compensation panel), leaving the emergency + employment
   deep-links and all visible tab clicks unchanged.
3. Leave the Performance external-system leaf as-is (no code).
4. Apply only the Resign-separator polish if the Nav primitive already supports it; defer label
   truncation and the single-leaf System group.

**Drivers**
- SF parity (talent-search is HRBP-only by intent).
- Remove-not-hide menu-truth rule.
- Deep-link correctness without regressing sibling tabs.
- Smallest reversible diff in a UI-mockup phase; keep the test suite encoding *correct* behavior.

**Alternatives considered**
- Grant SPD `talentSearch` (A2) — rejected: violates SF parity, changes scope, touches security bundle.
- Soften the talent-search page for SPD (A3) — rejected: still a dead-end, contradicts remove-not-hide.
- Rename the legacy `compensation` slice end-to-end (B2) — rejected: larger blast radius, higher
  regression risk on the emergency tab, unwarranted this phase.
- Add an external-link affordance to the Performance leaf now (C2) — deferred, not rejected.

**Why chosen**
The chosen options are the minimal, reversible edits that make the menu/route/deep-link behavior
truthful while preserving the security backstop and SF parity. They keep the diff to a handful of
lines per concern, each behind its own commit and regression test.

**Consequences**
- The profile slice name `compensation` remains a legacy misnomer (query key routes to the job panel);
  mitigated by an explicit code comment. A future cleanup may rename it (tracked).
- The existing RBAC test is rewritten to assert the corrected SPD behavior — intentional, documented.
- Defense-in-depth is unchanged; a stale direct link to talent-search still yields NotAuthorized for SPD.

**Follow-ups (→ `.omc/plans/open-questions.md`)**
- Rename the legacy profile `compensation` slice to a comp-accurate name (B2) once mockup phase closes.
- Long Thai leaf-label truncation at ~256px — shell typography/width decision.
- HR-Admin single-leaf "ระบบ" group — IA flatten decision (product call).
- Performance leaf external-system affordance/icon (C2) — polish pass.
