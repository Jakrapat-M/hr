# Mockup Matrix — HR Platform Replacement (EC + Benefits)

**Compiled:** 2026-05-02
**Goal:** Clickable mockups of every persona × feature for HR team approval before production implementation.
**Code base:** Continue on `src/frontend/` (Next.js 16 + React 19 + next-intl 4 + Zustand 5). Use existing **Humi** design system (`src/components/humi/`).
**Persona model:** Hybrid — **3 UI shells × 5 capability variants** (locked 2026-05-02 per SF RBAC evidence).

## Persona Model (locked)

| Shell | Capability Variants | Primary Routes | Walkthrough |
|---|---|---|---|
| **User** | Employee | `/home`, `/me`, `/profile/me`, `/ess/*`, `/benefits-hub/*`, `/requests` | 1 demo flow |
| **Approver** | Manager · SPD · HRBP — same shell, **field-level RBAC + queue scope** ต่าง | `/manager-dashboard`, `/quick-approve`, `/spd/inbox`, `/spd-management`, `/hrbp/*` (new) | 3 demo flows (toggle via mock-auth) |
| **Admin** | HR Admin · HRIS Admin — `/admin/system/*` extra สำหรับ HRIS เท่านั้น | `/admin/*` (47 pages) | 2 demo flows |

### Why hybrid (not pure 3 personas)

SF RBAC evidence (`01-sf-system-baseline.md` §3, 75 entities × 4 personas):
- **Manager** sees **0 fields** of `BenefitEmployeeClaim`, `EmpCompensation`, `PerNationalId`, `PerPerson`, `Background_*` → cannot be in BE approval chain at all in SF.
- **HRBP** has full HR-Admin parity on 4 high-stakes entities (EmpEmployment, EmpJob, PerPersonal, Background_PreferredNextMove) + Talent Search.
- **SPD** is restricted on 17 entities (subset of HR Admin), no Talent.
- Collapsing these to 1 "Approver" UI hides the RBAC posture HR must validate.

**Implication for build:** Approver shell needs runtime field-level RBAC from day one (this is cross-cutting pattern #7 anyway). Build once, mock-auth toggles capability bundle.

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ | **EXISTS** — page is real (>100 lines) and likely substantive |
| 🟡 | **PARTIAL** — page exists but is shallow (40–100 lines) or known to be a starter |
| 🔴 | **STUB** — page is ≤40 lines or just a placeholder |
| ⛔ | **MISSING** — no route at all |
| 🟢 | **N/A** — out of scope (Performance/Learning external) |

Line counts pulled from `find src/app/[locale] -name page.tsx \| wc -l`.

## BE approval chain — corrected

`00-DEEP-INTERVIEW-INPUT.md` §4 pattern #1 had `Employee → Manager → HRBP → SPD → Admin`. Per SF reality, **BE approval chain skips Manager** (Manager has 0 fields on `BenefitEmployeeClaim`). Corrected default:

```
Employee submit → HRBP review → SPD specialist → HR Admin payment
                  (or Manager for non-BE workflow only)
```

Confirm in deep-interview, but build mockups against this corrected chain.

---

## Shell 1: User (Employee) — `/home`, `/me`, `/profile`, `/ess`, `/benefits-hub`

### EC features (User scope)

| # | Screen | Route | Status | Lines | Notes |
|---|---|---|---|---|---|
| U-EC-1 | Home dashboard | `/home` | ✅ | 660 | Existing — review against Humi tokens |
| U-EC-2 | Profile (own, view) | `/profile/me` | ✅ | 2345 | Largest page — likely complete |
| U-EC-3 | Profile (own, edit) | `/ess/profile/edit` | ✅ | 736 | Substantive |
| U-EC-4 | My documents | `/me/documents` | 🟡 | 117 | Needs E-Sig flow + categorization |
| U-EC-5 | My workflows / requests | `/ess/workflows` + `/requests` | ✅ | 148 + 767 | Two pages — clarify roles, possibly merge |
| U-EC-6 | Org chart | `/org-chart` | ✅ | 664 | View-only |
| U-EC-7 | Lifecycle request: Resignation | `/resignation` | — | ? | Audit needed |
| U-EC-8 | Lifecycle request: Transfer (own) | (none — Admin-initiated only?) | ⛔ | — | **P1 question — can employee initiate transfer request?** |
| U-EC-9 | Special Information form | (BRD #35–84) | ⛔ | — | **Entire framework absent (50/50 ❌)** |
| U-EC-10 | Time off request | `/timeoff` | ✅ | 593 | — |
| U-EC-11 | Overtime request | `/overtime` | — | ? | Audit needed |
| U-EC-12 | Hospital referral | `/hospital-referral` | — | ? | Audit needed |

### BE features (User scope) — claim & enrollment surface

User submits / views own benefit data. Maps to BE features 02–25 from TTT decks.

| # | Feature | Workflow template | Route | Status | Notes |
|---|---|---|---|---|---|
| U-BE-1 | Benefits Hub (launcher) | — | `/benefits-hub` | ✅ | 640 lines, recent commit "Focus on one service launcher" |
| U-BE-2 | Annual enrollment (BE_02) | lifecycle-admin | `/benefits-hub/enrollment` | ⛔ | **MISSING** |
| U-BE-3 | Submit Reimbursement claim (BE_06,08,22,23,24) | simple-claim | `/benefits-hub/reimbursement` | 🔴 | 40 lines — page exists, panel built (`ReimbursementRequestPanel.tsx`); needs full claim wizard |
| U-BE-4 | Submit Medical Reimbursement w/ dependent (BE_07) | hospital-claim | `/benefits-hub/reimbursement?type=medical-dep` | ⛔ | Variant of BE-3, needs dependent picker |
| U-BE-5 | Submit Hospital referral (BE_06 hospital) | hospital-claim | `/hospital-referral` (existing top-level) | — | Audit — overlaps with U-EC-12 |
| U-BE-6 | Submit Funeral assistance (BE_09–14) | records-flat / records-dependent | `/benefits-hub/funeral` | ⛔ | 6 funeral variants → 1 form with type/relation picker |
| U-BE-7 | Submit Gift claim (BE_17–21) | records-flat | `/benefits-hub/gift` | ⛔ | 5 gift variants → 1 form with occasion picker |
| U-BE-8 | Physical Checkup (BE_16) | simple-claim | `/benefits-hub/physical-checkup` | ⛔ | — |
| U-BE-9 | View Life/Accident self-funded (BE_15) | records-computed (info only) | `/benefits-hub/life-accident` | ⛔ | View-only, salary-driven calc |
| U-BE-10 | Manage Beneficiary (BE_25) | records-flat | `/benefits-hub/beneficiary` | ⛔ | — |
| U-BE-11 | View claim history & status | — | `/benefits-hub/history` | ⛔ | — |
| U-BE-12 | Tax planning | — | `/benefits-hub/tax` (under benefits/tax/) | 🟡 | Panel built, route needs wiring |
| U-BE-13 | Salary statement | — | (under benefits-hub/salary?) | — | Recent commit "Clarify benefit and salary statement journeys" — audit |

**User shell Subtotal:** ~25 screens. **EXISTS+PARTIAL: ~10. MISSING: ~13. STUB: 2.**

---

## Shell 2: Approver (Manager / SPD / HRBP) — biggest gap

This shell is **almost entirely stubs**. Build effort concentrated here.

### Capability matrix per variant

| Capability | Manager | SPD | HRBP |
|---|---|---|---|
| Approve own-team workflow | ✅ | ✅ | ✅ |
| View `BenefitEmployeeClaim` | ❌ (0 fields) | ✅ (38f) | ✅ (38f) |
| Bulk approve | ❌ | ✅ | ✅ |
| Reroute / reassign | ❌ | ✅ | ✅ |
| Override / escalate | ❌ | ✅ | ✅ |
| Talent Search / Succession | ❌ | ❌ | ✅ |
| Edit `EmpEmployment` / `EmpJob` | view | view | ✅ (HR Admin parity) |
| Compensation visibility | ❌ | partial | ✅ |
| Background_* visibility | ❌ | ❌ | ✅ |

UI = same shell. `mockUser.capabilities` flag toggles features.

### Approver screens

| # | Screen | Route | Status | Lines | Used by | Notes |
|---|---|---|---|---|---|---|
| A-1 | Approver landing — Manager | `/manager-dashboard` | 🔴 | **11** | Manager | Build KPIs + queue snippet + direct-report list |
| A-2 | Approver landing — SPD | `/spd/inbox` (or `/spd-management`) | 🟡 / 🔴 | 137 / 7 | SPD | Inbox exists, management page is stub |
| A-3 | Approver landing — HRBP | `/hrbp/dashboard` (NEW) | ⛔ | — | HRBP | Build new — KPIs + talent + workflow + reports access |
| A-4 | **Unified Approval Workspace** | `/quick-approve` | 🔴 | **7** | All 3 | **Build this once — biggest leverage.** Filterable inbox + detail viewer. Field-level RBAC. |
| A-5 | Approval detail viewer (workflow request) | `/quick-approve/[id]` | ⛔ | — | All 3 | Show diff, history, comments; capability-gated actions |
| A-6 | Bulk approval queue | `/quick-approve/bulk` | ⛔ | — | SPD, HRBP | Mass-action UI |
| A-7 | Team profile drill-down | `/team/[employeeId]` (Manager view of `/profile/me`) | ⛔ | — | Manager | Reuse profile component, scope filter |
| A-8 | Talent Search | `/hrbp/talent-search` (NEW) | ⛔ | — | HRBP only | Advanced filter (30 inputs from SF) |
| A-9 | Position management (Manager team) | `/manage-positions` (linked from SF Home) | ⛔ | — | Manager | — |
| A-10 | BE claim approval queue (specialty) | `/quick-approve?type=benefit` | ⛔ | — | SPD, HRBP (no Manager) | Filter view of A-4; BE-specific detail panel |
| A-11 | BE claim payment approval | `/quick-approve?type=payment` | ⛔ | — | HRBP, HR Admin | Stage before SAP posting |
| A-12 | Reports access | `/reports` (existing top-level) | — | ? | HRBP, HR Admin | Audit existing route |

**Approver shell Subtotal:** ~12 screens. **EXISTS+PARTIAL: 1. MISSING+STUB: 11.** This is the build focus.

---

## Shell 3: Admin (HR Admin / HRIS Admin)

Heavy build already — 47 pages, 14,601 lines. Mostly normalize + fill BE gaps.

### EC Admin (mostly built)

| # | Screen | Route | Status | Lines | Notes |
|---|---|---|---|---|---|
| AD-EC-1 | Admin landing | `/admin` | ✅ | 263 | — |
| AD-EC-2 | Employees list | `/admin/employees` | ✅ | 553 | Search-empty-by-default per RIS |
| AD-EC-3 | Employee detail | `/admin/employees/[id]` | ✅ | **979** | Largest admin page |
| AD-EC-4 | Employee edit | `/admin/employees/[id]/edit` | ✅ | 765 | — |
| AD-EC-5 | Hire wizard | `/admin/hire` | ✅ | 260 | Has clusters & steps |
| AD-EC-6 | Lifecycle: Acting | `/admin/employees/[id]/acting` | ✅ | 336 | — |
| AD-EC-7 | Lifecycle: Promotion | `/admin/employees/[id]/promotion` | ✅ | 400 | — |
| AD-EC-8 | Lifecycle: Transfer | `/admin/employees/[id]/transfer` | ✅ | 513 | — |
| AD-EC-9 | Lifecycle: Contract Renewal | `/admin/employees/[id]/contract-renewal` | ✅ | 475 | — |
| AD-EC-10 | Lifecycle: Probation | `/admin/employees/[id]/probation` | ✅ | 657 | — |
| AD-EC-11 | Lifecycle: Rehire | `/admin/employees/[id]/rehire` | ✅ | 647 | — |
| AD-EC-12 | Lifecycle: Terminate | `/admin/employees/[id]/terminate` | ✅ | 661 | Picklist 5 vs 17 codes — P0-Q4 |
| AD-EC-13 | Organization | `/admin/organization` | ✅ | 812 | — |
| AD-EC-14 | Positions | `/admin/positions` | ✅ | 342 | — |
| AD-EC-15 | Jobs | `/admin/jobs` | ✅ | 260 | — |
| AD-EC-16 | Change requests review | `/admin/change-requests` | ✅ | 206 | — |
| AD-EC-17 | Reports landing | `/admin/reports` | ✅ | 312 | 28-sheet vs hub — P1-Q13 |
| AD-EC-18 | Special Information admin | (BRD #35–84) | ⛔ | — | **MISSING — entire framework** |

### BE Admin (gaps — biggest)

| # | Screen | Route | Status | Lines | Notes |
|---|---|---|---|---|---|
| AD-BE-1 | Benefits admin landing | `/admin/benefits` | 🟡 | 153 | Starter |
| AD-BE-2 | Plan catalog (CRUD 40 plans) | `/admin/benefits/plans` | ⛔ | — | Plan ID, eligibility rules, limits, schemas |
| AD-BE-3 | Plan eligibility config | `/admin/benefits/plans/[id]/eligibility` | ⛔ | — | 16 employee-data attributes drive rules |
| AD-BE-4 | Annual enrollment cycle setup | `/admin/benefits/enrollment-cycles` | ⛔ | — | BE_02 admin side |
| AD-BE-5 | On-boarding bulk action | `/admin/benefits/onboarding` | ⛔ | — | BE_03 |
| AD-BE-6 | Off-boarding bulk action | `/admin/benefits/offboarding` | ⛔ | — | BE_05 |
| AD-BE-7 | Beneficiary mgmt (admin view) | `/admin/benefits/beneficiaries` | ⛔ | — | BE_25 admin scope |
| AD-BE-8 | Payment cycle runs | `/admin/benefits/payments` | ⛔ | — | BE_27 — SAP IT0015/IT0267 posting + 3 Z-transactions, segment cut-offs |
| AD-BE-9 | Benefit reporting | `/admin/benefits/reports` | ⛔ | — | BE_26 |
| AD-BE-10 | Benefit change ops (mid-year) | `/admin/benefits/changes` | ⛔ | — | BE_04 |

### HRIS Admin (system config — already substantial)

| # | Screen | Route | Status | Lines | Notes |
|---|---|---|---|---|---|
| HRIS-1 | System landing | `/admin/system` | ✅ | 84 | Hub |
| HRIS-2 | Security settings | `/admin/system/security/settings` | ✅ | 280 | — |
| HRIS-3 | Consent (PDPA) | `/admin/system/security/consent` | ✅ | 158 | — |
| HRIS-4 | Traffic / audit | `/admin/system/security/traffic` | ✅ | 184 | — |
| HRIS-5 | Integration | `/admin/system/integration` | ✅ | 213 | — |
| HRIS-6 | E-documents | `/admin/system/system-features/edocuments` | ✅ | 157 | EC Document hub — P1-Q12 |
| HRIS-7 | Data migration | `/admin/system/system-features/data-migration` | ✅ | 202 | — |
| HRIS-8 | Language | `/admin/system/system-features/language` | ✅ | 75 | TH/EN/VN — P2-Q25 |
| HRIS-9 | Reports — favourites | `/admin/system/reports/favourites` | ✅ | 122 | — |
| HRIS-10 | Reports — schedule | `/admin/system/reports/schedule` | ✅ | 124 | — |
| HRIS-11 | Reports — automation | `/admin/system/reports/automation` | ✅ | 127 | — |
| HRIS-12 | Reports — builder | `/admin/system/reports/builder` | ✅ | 285 | — |
| HRIS-13 | User mgmt — list | `/admin/users` | ✅ | 130 | — |
| HRIS-14 | User mgmt — assignment | `/admin/users/user-assignment` | ✅ | 305 | — |
| HRIS-15 | User mgmt — role groups | `/admin/users/role-groups` | ✅ | 359 | — |
| HRIS-16 | User mgmt — data permissions | `/admin/users/data-permissions` | ✅ | 432 | — |
| HRIS-17 | User mgmt — audit report | `/admin/users/audit-report` | ✅ | 326 | — |
| HRIS-18 | User mgmt — proxy | `/admin/users/proxy` | ✅ | 367 | — |
| HRIS-19 | User mgmt — foundation audit | `/admin/users/foundation-audit` | ✅ | 244 | — |
| HRIS-20 | Self-service config (6 sub-pages) | `/admin/self-service/*` | ✅ | 157+157+158+186+195+307+343 | All 6 built |
| HRIS-21 | Picklist Centre | (none) | ⛔ | — | **MISSING — needs UI for 251 picklists / 78k LOVs** |
| HRIS-22 | Workflow definitions | `/workflows` (existing) | ✅ | 172 | Audit |
| HRIS-23 | Business rules registry | (none) | ⛔ | — | **MISSING — 551 SF rules need UI surface (or code-managed; P2-Q30)** |

**Admin shell Subtotal:** ~50 screens. **EXISTS: ~37. PARTIAL: 1. MISSING: ~12 (mostly BE admin + Special Info + Picklist + Rules).**

---

## Build Order (priority for ultrawork fan-out)

### Sprint 0 — Foundation (sequential, before any parallel work)

| Task | Output | Why first |
|---|---|---|
| F1 | **Mock-auth persona switcher** in `AppShell` (User / Manager / SPD / HRBP / HR Admin / HRIS Admin) | All 5 demo flows depend on this |
| F2 | **Field-level RBAC primitive** — `useCapabilities()` hook + `<Capability>` gate | Pattern #7; Approver shell can't ship without it |
| F3 | **Token sweep** — replace `rounded-[6px]` arbitrary with `--radius-xs` / `rounded-md` (KM #109, #110) | Hygiene; do once, all subsequent work conforms |
| F4 | **6 BE workflow template components** (simple-claim, hospital-claim, records-flat, records-dependent, records-computed, lifecycle-admin) | Drives 13+ MISSING BE screens |
| F5 | **Mock data layer** — pull from extracted-context (40 plans, 296 EC fields, 78k LOVs, 53 event reasons) | Mockup needs realistic data |

### Sprint 1 — Approver shell (PARALLEL — biggest gap)

Spawn ~5 ultrawork agents:

| Agent | Builds | Effort |
|---|---|---|
| Agent 1 | **A-4 Unified Approval Workspace** (`/quick-approve` from 7 → ~600 lines) | L |
| Agent 2 | **A-1 + A-3** Manager + HRBP landings (`/manager-dashboard`, `/hrbp/dashboard`) | M |
| Agent 3 | **A-2** SPD inbox polish + `/spd-management` build-out | M |
| Agent 4 | **A-5 + A-6** Detail viewer + bulk approve | M |
| Agent 5 | **A-8** Talent Search (HRBP only) | M |

### Sprint 2 — User BE features (PARALLEL)

Spawn ~4 ultrawork agents using F4 templates:

| Agent | Builds | Maps to BE features |
|---|---|---|
| Agent 1 | U-BE-3, U-BE-4 Reimbursement variants (medical/dental/gas/toll/parking) | BE_06,07,08,22,23,24 |
| Agent 2 | U-BE-6 Funeral form (6 variants) | BE_09,10,11,12,13,14 |
| Agent 3 | U-BE-7 Gift form (5 variants) | BE_17,18,19,20,21 |
| Agent 4 | U-BE-8, U-BE-9, U-BE-10, U-BE-11 (checkup, life/accident, beneficiary, history) | BE_15,16,25 |

### Sprint 3 — BE Admin gaps (PARALLEL)

| Agent | Builds | Maps to |
|---|---|---|
| Agent 1 | AD-BE-2, AD-BE-3 Plan catalog + eligibility | BE_01 |
| Agent 2 | AD-BE-4, AD-BE-5, AD-BE-6 Cycle / on / off-boarding | BE_02,03,05 |
| Agent 3 | AD-BE-8, AD-BE-9 Payment + reports | BE_26, BE_27 |
| Agent 4 | AD-BE-7, AD-BE-10 Beneficiary admin + change ops | BE_25, BE_04 |

### Sprint 4 — EC gaps (sequential review then PARALLEL)

| Task | Builds | Notes |
|---|---|---|
| AD-EC-18 | Special Information framework | BRD #35–84 — biggest EC gap (50/50 ❌) |
| HRIS-21 | Picklist Centre UI | 251 picklists / 47k options — needs CRUD |
| HRIS-23 | Business Rules registry | 551 rules — decide UI vs code-managed |

### Sprint 5 — Demo polish + walkthrough script

| Task | Output |
|---|---|
| Click-through demo paths per persona variant (5 scripted flows) | `WALKTHROUGH-SCRIPT.md` |
| HR review session prep — one-pager per shell | `HR-REVIEW-DECK.md` |
| Capture redlines from HR session | `REDLINES-2026-MM-DD.md` |

---

## Effort estimate

| Sprint | Screens / tasks | Parallelizable? | Wall-clock (rough) |
|---|---|---|---|
| Sprint 0 | 5 foundation tasks | mostly sequential | 1 turn (foundation work) |
| Sprint 1 | 11 Approver screens | yes (5 agents) | 1 turn |
| Sprint 2 | 13 User BE screens | yes (4 agents) | 1 turn |
| Sprint 3 | 8 Admin BE screens | yes (4 agents) | 1 turn |
| Sprint 4 | 3 EC framework screens | partially | 1–2 turns |
| Sprint 5 | Demo polish | sequential | 1 turn |

**Total:** ~40 missing/stub screens to build, ~5 turns with `/oh-my-claudecode:ultrawork` parallelism.

## Open decisions still needed (don't block start)

These can be defaulted now and HR redirects during walkthrough:

| ID | Default to use for mockup | Confirm in walkthrough |
|---|---|---|
| P0-Q3 | Effective dating: show "Effective As Of" date picker in profile header (SF posture) | HR confirms posture |
| P0-Q4 | Termination picklist: full SF 17 codes | HR confirms full set vs simplified |
| P0-Q6 | BE: 6 templates (per F4) | HR validates template-vs-bespoke |
| P0-Q8 | Approval chain: skip Manager for BE; chain = HRBP → SPD → HR Admin | HR confirms chain shape |
| P1-Q11 | Notifications: in-app + email (no SMS for v1) | HR confirms channels |
| P1-Q15 | T&A integration: iframe embed `cnext-time` for now | HR confirms BUILD vs INTEGRATE |

---

## Provenance / source files

- `extracted-context-2026-05-02/00-DEEP-INTERVIEW-INPUT.md` — master question backlog
- `extracted-context-2026-05-02/01-sf-system-baseline.md` — SF RBAC truth (75×4 entity probes)
- `extracted-context-2026-05-02/02-ba-requirements.md` — BA scope, 207 BRDs, 25 open decisions
- `extracted-context-2026-05-02/03-brd-flow-matrices.md` — BRD↔TTT mapping, 11 flows × 16 manuals
- `extracted-context-2026-05-02/04-benefit-features.md` — 27 BE features, 6 workflow templates
- `extracted-context-2026-05-02/05-field-dictionary.md` — 296 EC fields + BE entities

Route inventory: `find src/app/[locale] -name page.tsx | xargs wc -l` on 2026-05-02.
