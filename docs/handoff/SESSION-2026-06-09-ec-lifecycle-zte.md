# Session Handoff — 2026-06-09 (EC Lifecycle / Audit · ZTE)

Mode: **ZTE (Zero-Touch Engineer)** — each ticket: validate in Linear → branch off master → build → verify (build/lint/Vitest/Playwright smoke) → **separate `code-reviewer` lane (APPROVE)** → **self-merge to master** → BA-friendly Linear comment + screenshots → move to **In Review** (never Done). No waiting for human merge.

Phase: **UI mockup only** — clickable flows + realistic seed data, NO backend.

---

## ✅ Shipped this session (7 PRs, all merged to master)

| PR | Linear | What | Key files |
|----|--------|------|-----------|
| #256 | STA-91 | **Termination form reconciled to BA spec** — added the 5 missing spec fields + a derived-logic registry | new `lib/admin/termination-logic.ts` (+test), `admin/employees/[id]/terminate/page.tsx` |
| #258 | STA-55 | **Acting card test coverage** (card already existed) — e2e smoke + actionAvailability unit test | new `e2e/sta-55-acting-card.spec.ts`, `lib/admin/actionAvailability.test.ts` |
| #260 | STA-57 | **Shared compensation master data + payroll handoff preview** (persona-gated amounts) | new `lib/admin/compensation-master.ts` (+test), `admin/employees/[id]/pay-rate-change/page.tsx` |
| #262 | STA-94 | **Foundation IA guard** — regression test locking `/admin/foundation` under System, never under ME | new `components/cnext/shell/__tests__/sidebar-foundation-ia.test.ts` |
| #263 | STA-56 | **Contract-renewal reads real `contract_end_date`** (mock source of truth) + honest Day-30 copy | `mocks/employees.ts`, new `contract-renewal/contract-renewal.helpers.ts` (+test), `contract-renewal/page.tsx` |
| #264 | — | **Completed an orphan WIP** — wired Time Policy + Benefit Catalog config leaves into System nav + i18n (TH/EN) + tests. **payroll-rules intentionally skipped** (payroll team's domain — page stays untracked/unwired) | `Sidebar.tsx`, `messages/{en,th}.json`, `sidebar-hris-config-leaves.test.ts`, `sidebar-dedupe.test.tsx`, new `admin/system/{time-policy,benefit-catalog}/page.tsx` |
| #265 | — | **Sidebar quick wins** — removed leaf opposite-language `title` (hover-overlap bug) + de-truncated long labels (wrap not ellipsis) + fixed a guard-coverage baseline regression introduced by #264 | `Sidebar.tsx`, `globals.css`, `sidebar-guard-coverage.test.tsx` |

Every PR: `npm run build` + `eslint` + Vitest + a Playwright smoke (verified rendered output) + a `code-reviewer` APPROVE, all green before self-merge.

⚠️ **CI gap discovered:** PR checks run only Vercel `next build`, **NOT** the Vitest suite — so a stale hardcoded test baseline (sidebar-guard-coverage) merged red in #264 and was only caught when #265 ran tests locally. Run `npm test` locally before merging sidebar/MODULES changes.

---

## 📋 Linear state (Stark-xix)
All five moved to **In Review** (AI cap — human moves to Done):
- **STA-91** (Termination), **STA-55** (Acting), **STA-57** (Comp master), **STA-56** (Contract-renewal) — feature/test complete.
- **STA-94** (Foundation, Urgent) — was **NOT reproducible**: foundation already sits under System for the admin persona. Deep-interview (2 rounds, ambiguity 14%) crystallized it as a forward-looking IA requirement → shipped a regression guard. **Comment posted asking BA to confirm the persona/scenario where they saw it under ME** — answer that before assuming more is needed. Spec: `.omc/specs/deep-interview-sta-94-foundation.md` (gitignored, local).

### Honest-status note (important)
Two "audit" tickets were **already satisfied** before I touched them — I did NOT fabricate fixes:
- **STA-55**: the Acting card was already in `ACTION_CARDS`; only the AC-3 test was missing → added tests only.
- **STA-94**: placement was already correct → added a guard test only.
Always investigate-first on audit/backlog tickets.

---

## 🚧 Scope constraints (do NOT cross)
- **Payroll = another team's in-flight work**, merges later → do NOT implement **STA-58** (payroll nav), **STA-59** (real downloads), **STA-60** (payroll reviewer role). (memory: `project_payroll_owned_by_team.md`)
- **Backend on hold** during mockup phase → **STA-64** (real HRBP/SPD scope filtering) is out of scope too.
- After the above, **no mockup-appropriate EC tickets remain** in the Backlog that are unblocked.

---

## 🧠 Key technical notes / traps discovered
1. **Lifecycle action pages hide their form behind `EffectiveDateGate`** (render-prop). Terminate / pay-rate-change / contract-renewal: the reason selects + fields DON'T render until you fill the date input and click **`ยืนยันวันที่มีผล`**. E2E/smoke must pass the gate first. (memory: `reference_lifecycle_effectivedategate_e2e.md`)
2. **Employee gating + ids**: `actionAvailability(employee)` gates each action. `contract_renewal` = active **PARTIME** only → demo ids **EMP-0009/0010/0021/0025**. `terminate`/`pay-rate` = active (EMP-0005 canonical). **EMP-0001 INACTIVE** (all locked).
3. **MCP Playwright was locked** ("Browser is already in use") by parallel agents all session → used **standalone Playwright** scripts: `import pkg from '<repo>/node_modules/playwright/index.js'; const {chromium}=pkg;` (CJS default import), seed `cnext-auth` + `page.route('**/api/auth/session', …'{}')`.
4. **Dev-internal copy lurks in EXISTING lifecycle pages** — swept & removed this session: terminate ("Sprint 2 backend wiring"), pay-rate ("STA-41 demo boundary" + English backend paragraph), contract-renewal ("(stub: …)" + a false "ระบบจะ auto-terminate" banner). When editing a lifecycle page, grep rendered JSX for leakage + don't overstate non-existent behavior. (memory updated)
5. **New schema field** `MockEmployee.contract_end_date?: string` (ISO) — seeded for PARTIME employees; resolved via `resolveContractEndDate(employee) = contract_end_date ?? hire_date+1y`. Optional field → didn't break the mock-shape tests (34/34 green).
6. **STA-91 traps**: `termination-logic.ts` registry keys the 13 spec reasons → derived {voluntary, sub-reason LOV+default, transferOut default, okToRehire default, ESS/MSS/HRBP/SPD visibility}; Termination date = Resigned+1 (read-only); OK-to-Rehire is Not-required + default-per-reason (the old SPD-only gate was dropped per BA spec); reason list restricted to 13 codes via ReasonPicker `restrictTo`.
7. **STA-57**: `compensation-master.ts` is the single shared picklist source; the pay-rate "Payroll handoff preview" masks amounts unless `useCapabilities().entities.EmpCompensation === 'full'`.
8. **Executor agents return a terse "Complete."** with no detail — always re-verify independently (git diff + run all gates) before trusting.

---

## 🎨 Sidebar review — DEFERRED IA work (needs design sign-off)
User flagged the sidebar "ดู complex มาก". Quick wins shipped in #265 (hover + truncation). An `oh-my-claudecode:architect` review identified the complexity drivers and a prioritized plan. **The following were NOT done — they change navigation IA and need the user's sign-off** (user said "พอก่อน" / stop for now):

1. **Shrink System group 6→4** — nest Time Policy + Benefit Catalog as **sub-tabs under "ฐานข้อมูลกลาง" (Master Catalog `/admin/foundation`)** instead of standalone System leaves. ⚠️ This REVERTS the #264 wiring and **breaks `sidebar-hris-config-leaves.test.ts:38-48`** (which pins them as system-group leaves with `/admin/system/*` hrefs) — that test must be rewritten.
2. **Collapse leaf-panel by default** — show only the icon rail; expand on click (collapse-persist already exists at `Sidebar.tsx:261-277`). Reduces the always-open 2-column nav.
3. **Trim the bilingual horizontal tab bar** (รายงาน (Reporting) / การเชื่อมต่อ (Integration) / …) — it's a 3rd nav layer with doubled-up TH+EN text. Drop the EN suffix or the layer.

Complexity drivers (architect-ranked): ① 3 stacked nav layers (icon rail + leaf panel + page tab bar) ② dual-language text everywhere ③ System group bloat + (now-fixed) label truncation.

## 🔭 Suggested next steps
1. **Decide the sidebar IA items above** (1-3) — #1 is the highest-impact but reverts #264, so confirm before doing it.
2. Get the **BA answer on STA-94** (which persona/view showed Foundation under ME) — only then decide if more than the guard is needed.
3. Human: move the In-Review tickets to Done after BA sign-off.
4. New EC mockup tickets only — payroll + backend-wiring stay parked until those teams/phases unblock.
5. `npm test` locally before merging sidebar/MODULES changes (CI runs only `next build`, not Vitest — see the CI-gap note above).

Memory written this session: `feedback_zte_mode`, `reference_lifecycle_effectivedategate_e2e`, `project_payroll_owned_by_team`, updated `feedback_no_dev_internal_copy_in_mockup_ui`.

## ⚠️ Untracked / left-as-is (intentional)
- `admin/system/payroll-rules/page.tsx` — scaffolded but **unwired & untracked**; payroll team's domain (do not commit/wire). Its `settings.hrisConfig.payrollRules*` i18n keys were NOT added.
- Prior-session artifacts still untracked: `agents/time-module-*`, `docs/time-module/*`, `docs/handoff/SESSION-2026-06-09.md`, `plan.html`, `plan-assets/`, `sidebar-redesign-mockup.html`. None affect the build.
