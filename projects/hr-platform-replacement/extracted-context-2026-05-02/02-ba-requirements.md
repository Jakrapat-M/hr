# BA-Driven Requirements & Open Decisions

**Compiled**: 2026-05-02
**Sources** (all under `projects/hr-platform-replacement/`):
- `ba-source/BA-EC-SUMMARY.md` (BA workbook archive index)
- `BA-AUDIT-BACTIONS-2026-04-24.md` (7 B-action field catalog)
- `BA-REVIEW-PREP-2026-04-24.md` (BA review companion)
- `BRD-COVERAGE-MATRIX-2026-04-24.md` (212 BRD rows + 28 reports)
- `P-B1-DECISION-BRIEF-2026-04-24.md` (infra decisions)
- `PLACEHOLDER-AUDIT-2026-04-24.md` (24 routes audit)
- `RIS-WALKTHROUGH-2026-04-24.md` (RIS reviewer journey)

Scope: **Employee Center (EC) + Benefits (BE)**. Performance & Learning are EXTERNAL.

---

## 1. Scope Statement (BA-confirmed)

### In Scope (Phase 1 mockup → Phase 2 backend)

| Area | Confirmation | Source |
|---|---|---|
| EC Hire flow (37 fields, Identity 19 + Personal Info 18) | BA-compiled, awaiting HR Expert sign-off | `BA-EC-SUMMARY.md` §"Hiring workflow — 37 fields" |
| 7 B-actions: Hire, Transfer, Terminate, Contract Renewal, Rehire, Promotion, Acting, Probation | Real forms shipped (UI-only), schema drift acknowledged | `BA-AUDIT-BACTIONS-2026-04-24.md` §"Summary tally" |
| EC Picklist infra (78,388 SF picklist rows; tree-shake on demand) | Archived; subset wired per field | `BA-EC-SUMMARY.md` §"EC Picklist sheet summary" |
| Foundation Objects: Organization (#1), Position (#5), Job (#4) | Routes shipped: `/admin/organization`, `/admin/positions`, `/admin/jobs` | `BRD-COVERAGE-MATRIX` Flow 11; `RIS-WALKTHROUGH` Group 2 |
| ESS: profile view/edit, payslip view, benefits view, org chart, home tile | 5 ESS routes shipped | `BRD-COVERAGE-MATRIX` Flow 04; `RIS-WALKTHROUGH` ESS Journey |
| User Management (Roles, Permissions, Proxy, Audit) BRD #184–189 | All 6 routes ✅ | `BRD-COVERAGE-MATRIX` Flow 05 |
| Self-Service Admin (BRD #178–183 field config / visibility / mandatory / readonly / quick actions / tiles) | All 6 sub-routes ✅ | `BRD-COVERAGE-MATRIX` Flow 04 |
| Reporting tooling layer: Story Report, Builder, Schedule, Favourites, Automation | Tooling shipped; 28 per-sheet layouts deferred | `BRD-COVERAGE-MATRIX` Flow 02–03 |
| Benefits ESS tile + medical claims UI (1185-line page) | `/benefits` shipped | `PLACEHOLDER-AUDIT` §1 row 1 |
| i18n th/en across all `[locale]` routes | Architecture-wide | `BRD-COVERAGE-MATRIX` #195 |

### Deferred (Phase 2 / Phase 2.5)

| Area | Why deferred | Source |
|---|---|---|
| Backend wiring: audit log, cron jobs, email, RBAC enforcement | Phase 1 = mockup only | `RIS-WALKTHROUGH` §"Out of Scope" |
| Approval workflow chain Employee→Manager→HRBP→SPD (BRD #111) | Phase 2.5 | `BA-AUDIT-BACTIONS` §"Terminate / Deferred rules" |
| Cron jobs: Day-30 contract auto-terminate (#93), Day-119 probation auto-pass (#117), Probation 30/75/90-day mail | Backend infra not in mockup | `BA-REVIEW-PREP` §2 row 7 |
| 50-ทวิ (tax form) auto-generation | Phase 2 backend | `BA-AUDIT-BACTIONS` §"Terminate" |
| Real file upload for attachments (currently text stub) | Phase 2.5+ | `BA-AUDIT-BACTIONS` §"Terminate" |
| Mass import / mass change (BRD #99–100) | Not in Phase 1 | `BRD-COVERAGE-MATRIX` Flow 08 |
| 28 per-sheet report replications (BRD #121–161) | Hub KPI dashboard pattern used instead | `BRD-COVERAGE-MATRIX` §"Reports" |
| Special Information framework — 50 BRDs (#35–#84) | Not started, not classified deferred | `BRD-COVERAGE-MATRIX` Flow 07 |

### Out of Scope (External / Backend-only)

| Area | Classification | Source |
|---|---|---|
| Performance full module (BRD #32, #149) | External SF parity, deferred | `BRD-COVERAGE-MATRIX` Flow 06 #32 |
| Learning / e-Learning | External system per project memory + #105 EC Document | `BRD-COVERAGE-MATRIX` #105 |
| Payroll engine, Leave engine, Time engine, Training | External SF parity | `BRD-COVERAGE-MATRIX` §"Out-of-scope confirmations" |
| API/IC Integration Center (BRD #191) | Backend-only, no UI | `BRD-COVERAGE-MATRIX` #191 |
| Data Encryption (BRD #203) | Infra, not mockup | `BRD-COVERAGE-MATRIX` #203 |
| Pay Component Foundation (BRD #6, #25, #26, #28) | Seed-only, no admin CRUD | `BRD-COVERAGE-MATRIX` #6 |

---

## 2. Confirmed Requirements

### EC — Hire (BRD #109, 37 fields)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| H1 | 3-cluster wizard (Who / Job / Review) with auto-save Zustand persist | `RIS-WALKTHROUGH` | `/admin/hire` |
| H2 | Identity section: 19 fields (Hire Date, Company, Event Reason, Salutation EN, Names EN, DOB, Country/Region of Birth, Age, Employee ID, National ID Card Type+Country+Number, Issue/Expiry Date, IsPrimary, [VN] Issue Place) | `BA-EC-SUMMARY.md` | "Identity section" |
| H3 | Personal Info section: 18 fields (Salutation Local, Other Title TH, Names Local+EN dup, Nickname, Military, Gender, Nationality, Foreigner, Blood Type, Marital Status + Since, Attachment) | `BA-EC-SUMMARY.md` | "Personal Information section" |
| H4 | 27 of 37 fields are mandatory (73%) | `BA-EC-SUMMARY.md` | "Δ vs Plan v2 assumption" |
| H5 | Validation: "Recent Date should be greater than Date of Birth" cross-field | `BA-EC-SUMMARY.md` | "Validation rules" |
| H6 | LOVs to wire: ISOCountryList, idType_ID_Card, Yes/No, Event Reason, Hire Company, Salutation EN, Nationality, Religion, Gender, Marital, Blood, Military | `BA-EC-SUMMARY.md` | "LOVs to wire" |
| H7 | Event Reason picklist `EventReasonHire.json` 6 codes (H_NEWHIRE, H_RPLMENT, H_TEMPASG, HIREDM, H_CORENTRY, H_INENTRY) — UI aligned ✅ | `BA-REVIEW-PREP` | §4 Hire row |
| H8 | HRBP SH4 mail trigger on submit (stub today, backend Phase 2) | `BRD-COVERAGE-MATRIX` | #109 |
| H9 | DB column identifiers: BA Col K is authoritative (e.g., DATE_OF_BIRTH, COUNTRY_OF_BIRTH, NATIONAL_ID, ISPRIMARY) | `BA-EC-SUMMARY.md` | "Column schema" |
| H10 | Permanent vs Partime visibility flags per field (BA Col H/I) | `BA-EC-SUMMARY.md` | "Column schema" |

### EC — Transfer (BRD #110)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| T1 | 8 fields: targetCompany, targetBusinessUnit, targetPosition, effectiveDate, targetLocation, costCenter, reason, migrationNote | `BA-AUDIT-BACTIONS` | §1 Transfer Fields |
| T2 | 4 mandatory: targetCompany, targetBusinessUnit, targetPosition, effectiveDate | `BA-AUDIT-BACTIONS` | §1 Fields table |
| T3 | EffectiveDateGate: `effectiveDate >= today` | `BA-AUDIT-BACTIONS` | §1 Conditional |
| T4 | Event Reason picklist `EventReasonTrans.json` 3 codes: TRN_TRNWIC (within), TRN_TRNACCOMP (across), TRN_ROTATION — schema enum exists, UI uses free-text (DRIFT) | `BA-AUDIT-BACTIONS` | §1 Event Reason |
| T5 | Cross-BG transfer keeps employee code | `BRD-COVERAGE-MATRIX` | #110 |
| T6 | Seniority carry-over (auto-fill "Seniority continuous" note; not yet persisted) | `BA-AUDIT-BACTIONS` | §1 Deferred |

### EC — Terminate (BRD #111, #112, #113, #114)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| TM1 | 6 fields: reasonCode, reasonNote, lastDay, payrollEffectiveDate, okToRehire, attachmentNote | `BA-AUDIT-BACTIONS` | §2 Terminate |
| TM2 | 4 mandatory: reasonCode, lastDay, payrollEffectiveDate, okToRehire | `BA-AUDIT-BACTIONS` | §2 |
| TM3 | EffectiveDateGate: `lastDay >= hire_date`, `payrollEffectiveDate >= lastDay` | `BA-AUDIT-BACTIONS` | §2 Conditional |
| TM4 | Event Reason picklist `EventReasonTerm.json` 17 codes (TERM_*) — UI uses 5-code stub (DRIFT) | `BA-AUDIT-BACTIONS` | §2 Event Reason |
| TM5 | OK-to-Rehire flag persists for downstream Rehire guard (BRD #114) | `BRD-COVERAGE-MATRIX` | #114 |
| TM6 | Reason role visibility (BRD #113) — Phase 2.5 RBAC | `BRD-COVERAGE-MATRIX` | #113 |
| TM7 | 50-ทวิ auto-gen — Phase 2 backend | `BA-AUDIT-BACTIONS` | §2 Deferred |
| TM8 | Approval chain E→M→HRBP→SPD — Phase 2.5 | `BA-AUDIT-BACTIONS` | §2 Deferred |

### EC — Contract Renewal (BRD #93)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| CR1 | 5 fields: currentEndDate (readonly), newEndDate, renewalReason, newAllowanceAmount, newAllowanceNote | `BA-AUDIT-BACTIONS` | §3 |
| CR2 | 1 mandatory: newEndDate; 1 conditional: newAllowanceNote shown if amount > 0 | `BA-AUDIT-BACTIONS` | §3 |
| CR3 | Day-30 banner if `daysUntilExpiry <= 30`; auto-terminate cron deferred | `BA-AUDIT-BACTIONS` | §3 Day-30 |
| CR4 | No SF Event Reason picklist exists (custom event) — free-text acceptable pending BA confirm | `BA-REVIEW-PREP` | §4 Contract Renewal |
| CR5 | currentEndDate currently stub `hire_date + 1 year` — needs real contract record schema field | `BA-AUDIT-BACTIONS` | §3 Deferred |

### EC — Rehire (BRD #102)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| RH1 | 5 fields: newHireDate, useNewCode, newEmployeeCode (conditional), seniorityDateOverride, reason | `BA-AUDIT-BACTIONS` | §4 |
| RH2 | 2 mandatory + 1 conditional (newEmployeeCode required if useNewCode=true) | `BA-AUDIT-BACTIONS` | §4 |
| RH3 | Company rule: CRC default `useNewCode=true` (seniority reset); CPN default `useNewCode=false` (carry); 10+ other companies need rules | `BA-AUDIT-BACTIONS` | §4 Company rule |
| RH4 | Auto-classify Event Reason RE_REHIRE_LT1 (<1y) vs RE_REHIRE_GE1 (≥1y) — picklist exists, UI doesn't expose | `BA-AUDIT-BACTIONS` | §4 Event Reason |
| RH5 | OK-to-Rehire guard from prior termination | `BA-AUDIT-BACTIONS` | §4 Deferred |

### EC — Promotion (BRD #95, #103)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| PR1 | 4 fields: selectedPosition (PositionLookup cascade), effectiveDate, salaryChangePct (0–50), notes | `BA-AUDIT-BACTIONS` | §5 |
| PR2 | 2 mandatory: selectedPosition, effectiveDate | `BA-AUDIT-BACTIONS` | §5 |
| PR3 | EffectiveDateGate: `>= hire_date` | `BA-AUDIT-BACTIONS` | §5 |
| PR4 | salaryChangePct range 0–50 is **arbitrary** — needs BA confirm | `BA-AUDIT-BACTIONS` | §5 Gap |
| PR5 | No Event Reason picklist exists (no `PRM_*` ids) — needs BA confirm | `BA-AUDIT-BACTIONS` | §5 Gap |
| PR6 | corporate_title field missing in MockEmployee schema | `BA-AUDIT-BACTIONS` | §5 |

### EC — Acting (BRD #104)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| AC1 | 5 fields: actingPosition (free text), effectiveDate, endDate, isPrimary, notes | `BA-AUDIT-BACTIONS` | §6 |
| AC2 | 2 mandatory: actingPosition, effectiveDate | `BA-AUDIT-BACTIONS` | §6 |
| AC3 | endDate conditional `>= effectiveDate` | `BA-AUDIT-BACTIONS` | §6 |
| AC4 | No Acting picklist found in SF — BA must confirm if free-text OK or link to Position Master | `BA-AUDIT-BACTIONS` | §6 Gap |
| AC5 | Acting Start vs Acting End event split — needs picklist mapping | `BA-AUDIT-BACTIONS` | §6 Deferred |

### EC — Probation (BRD #117)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| PB1 | 6 fields: outcome (pass/no_pass/extend), effectiveDate, extendUntil, allowanceAmount, confirmDate, note | `BA-AUDIT-BACTIONS` | §7 |
| PB2 | 2 mandatory + 2 conditional (extendUntil if outcome=extend; allowance/confirmDate shown if pass) | `BA-AUDIT-BACTIONS` | §7 |
| PB3 | EffectiveDateGate: `hire_date <= effectiveDate <= hire_date+119d` | `BA-AUDIT-BACTIONS` | §7 |
| PB4 | outcome=no_pass → confirm dialog → emit `terminate_during_probation` event | `BA-AUDIT-BACTIONS` | §7 Conditional |
| PB5 | Auto-pass at day 119 — UI banner only, cron deferred | `BA-AUDIT-BACTIONS` | §7 Deferred |
| PB6 | Probation 30/75/90-day mail reminder — backend deferred | `BA-REVIEW-PREP` | §2 row 7 |
| PB7 | Picklist codes exist: COMPROB_COMPROB (pass), TERM_UNSUCPROB (no_pass) — currently outcome enum, not wired | `BA-AUDIT-BACTIONS` | §7 Gap |

### EC — Personal Information (Flow 06, 23 BRDs)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| PI1 | Biographical (#12), Personal (#13 HR-only), National ID (#14), Email (#15), Phone (#16), Address (#17), Work Permit (#18 foreigners-only conditional), Emergency Contact (#19), Dependents (#20), Employment readonly (#21), Job Info readonly (#23), Formal Education (#33) | `BRD-COVERAGE-MATRIX` | Flow 06 |
| PI2 | VN Issue Place conditional on nationality=VN ✅ shipped (BRD #16) | `BA-REVIEW-PREP` | §2 row 5 |
| PI3 | Foreigner=YES gates Work Permit sub-form (BRD #9) — currently NOT conditional in UI | `BA-REVIEW-PREP` | §2 row 2 |
| PI4 | Sections 01–10 in `ec-personal-info.tsx` correspond to BRD #12, #13, #15+#16, #17, #19, #20, #21, #23 | `BRD-COVERAGE-MATRIX` | Flow 06 evidence |

### EC — Org / Position / Job Foundations (Flow 11)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| OR1 | Organization tree (#1, #2): 5-tier cascade, 437 SF divisions, 132 functions | `BRD-COVERAGE-MATRIX` | #2 evidence |
| OR2 | Org tree: drawer edit (480px), search auto-expands ancestors, breadcrumb, +Add unit, dirty-confirm on Escape | `RIS-WALKTHROUGH` | `/admin/organization` |
| OR3 | Jobs (#4): ~108 entries; fields: รหัส, ชื่องาน TH/EN, กลุ่ม, ระดับ; status badges (active/closed) | `RIS-WALKTHROUGH` | `/admin/jobs` |
| OR4 | Positions (#5, #95): ~324 entries; columns: รหัส, ชื่อตำแหน่ง TH/EN, บริษัท, งาน, หน่วยงาน, headcount, สถานะ | `RIS-WALKTHROUGH` | `/admin/positions` |
| OR5 | currentHeadcount column **readOnly** — derived from active employees | `RIS-WALKTHROUGH` | `/admin/positions` |
| OR6 | Reporting Structure / Org Chart (#8, #11): `/org-chart` shipped (621 lines) | `BRD-COVERAGE-MATRIX` | Flow 11 |
| OR7 | Year-of-X computed fields (BRD #86–#92): YoS, YearInJob, YearInPosition, YearInJobGrade, YearInBU, calcAge — display chips on detail | `BRD-COVERAGE-MATRIX` | Flow 08 |

### EC — Compensation (Flow 10, 3 BRDs)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| CP1 | Payment Method (#118): PICKLIST_PAY_FREQUENCY (6 items) | `BRD-COVERAGE-MATRIX` | #118 |
| CP2 | Payroll Information / Cost Distribution (#119): FOPayComponentGroup 9 SF groups | `BRD-COVERAGE-MATRIX` | #119 |
| CP3 | Salary Base Currency (#120): non-TH supported via PICKLIST_CURRENCY | `BRD-COVERAGE-MATRIX` | #120 |

### EC — Self-Service Admin (Flow 04, BRD #178–183)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| SS1 | Field configuration hub (`/admin/self-service`) with 6 editor cards | `RIS-WALKTHROUGH` | `/admin/self-service` |
| SS2 | Sub-routes: `/field-config` (#178), `/visibility` (#179), `/mandatory` (#180), `/readonly` (#181), `/quick-actions` (#182), `/tiles` (#183) | `BRD-COVERAGE-MATRIX` | Flow 04 |
| SS3 | Dirty-state banner: "มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก" | `RIS-WALKTHROUGH` | `/admin/self-service` |
| SS4 | Footer note: "การตั้งค่าทั้งหมดจะมีผลทันทีเมื่อบันทึก" | `RIS-WALKTHROUGH` | `/admin/self-service` |

### EC — User Management (Flow 05, BRD #184–189)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| UM1 | 6 sub-tools: Data Permission Group (#184), Application Role Group (#185), User Assignment (#186), Proxy (#187), Foundation Audit (#188), Audit Report (#189) | `BRD-COVERAGE-MATRIX` | Flow 05 |
| UM2 | Hub badges: orange = pending proxy approvals; blue = today's audit log count | `RIS-WALKTHROUGH` | `/admin/users` |
| UM3 | Actor footer shows scope: HRIS Admin / SPD Admin / Admin | `RIS-WALKTHROUGH` | `/admin/users` |
| UM4 | CSV export covered by `csvExport.ts` for #189 | `BRD-COVERAGE-MATRIX` | #189 |

### EC — System / Reporting Tooling (Flow 02)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| SY1 | System hub stat widgets: total reports, active scheduled jobs, favourites, integration endpoints, pending consents | `RIS-WALKTHROUGH` | `/admin/system` |
| SY2 | Reports tooling: Story Report (#162), Builder/Customize (#190, #193), Schedule (#192, #196), Favourites (#196, #206), Automation (#163, #207) | `BRD-COVERAGE-MATRIX` | Flow 02 |
| SY3 | E-Document (#197), Data Migration (#198), Consent Form (#199), Traffic Report (#200), Hidden Profile (#201), Direct User (#202), Security Hub (#204) | `BRD-COVERAGE-MATRIX` | Flow 02 |
| SY4 | i18n switcher (#195) | `BRD-COVERAGE-MATRIX` | #195 |

### Benefits (BE)

| # | Requirement | Source doc | Section |
|---|---|---|---|
| BE1 | `/benefits` = medical claims full UI (1185 lines) | `PLACEHOLDER-AUDIT` | §1 row 1 |
| BE2 | `/employees/me/benefits` = ESS tile with 3 cards: ประกันกลุ่ม, กองทุนสำรองเลี้ยงชีพ (5% บริษัทสมทบ), สวัสดิการพิเศษ ("เร็ว ๆ นี้") | `RIS-WALKTHROUGH` | `/employees/me/benefits` |
| BE3 | BE Special Privilege report (#138) | `BRD-COVERAGE-MATRIX` | #138 (❌ not started) |
| BE4 | Each card has Phase 2 placeholder note | `RIS-WALKTHROUGH` | `/employees/me/benefits` |

### ESS Journey

| # | Requirement | Source doc | Section |
|---|---|---|---|
| ES1 | `/home`: greeting (time-of-day), Today Presence ring chart, pending requests, pending docs, announcements, mini-calendar, Week Recognition | `RIS-WALKTHROUGH` | `/home` |
| ES2 | `/profile/me`: 3 read-only cards (Contact, Position, Personal); Phase 2 will add edit | `RIS-WALKTHROUGH` | `/profile/me` |
| ES3 | `/employees/me/payslip`: 6-month table; status "พร้อมดาวน์โหลด" / "รอประมวลผล"; Thai locale formatting | `RIS-WALKTHROUGH` | `/employees/me/payslip` |
| ES4 | View Quick Actions Tile (#171) | `BRD-COVERAGE-MATRIX` | #171 |

---

## 3. Open Decisions / B-Actions

| Decision ID | What needs to be decided | Decider | UI build impact | Source |
|---|---|---|---|---|
| **BA-OPEN-1** (#5) | National ID mod-11 checksum: which library/algorithm? (e.g., `thai-national-id-validator` npm) | BA + HR Expert | Blocks Sprint 2 validator on Hire StepIdentity | `BA-REVIEW-PREP` §2 row 1 |
| **BA-OPEN-2** (#9) | Foreigner=YES → Work Permit sub-form design (fields, mandatory, layout) | BA | UI currently has no conditional branch — needs sub-form spec | `BA-REVIEW-PREP` §2 row 2 |
| **BA-OPEN-3** (#14) | HRBP SH4 mail trigger: recipient list + template + trigger event | BA + Backend infra | Blocks Phase 2 backend mail wiring | `BA-REVIEW-PREP` §2 row 3 |
| **BA-OPEN-4** (#15) | ID Issue Date < Expiry Date — strict `<` or `≤`? Allow blank? | BA | Cross-field Zod validator wording | `BA-REVIEW-PREP` §2 row 4 |
| **BA-OPEN-5** (#27) | Military status gender gate — male-only, or visible to all genders? | BA | Section visibility rule on Hire wizard | `BA-REVIEW-PREP` §2 row 6 |
| **BA-OPEN-6** (#117) | Probation Day 119 / 30/75/90-day mail timing — business days vs calendar days? | BA + Backend | Determines cron schedule | `BA-REVIEW-PREP` §2 row 7 |
| **BA-OPEN-7** (#102) | Rehire `useNewCode` rule for 10+ companies beyond CRC/CPN | HR Expert (May 1) | Defaults dropdown per company; today shows tooltip "ตรวจสอบกับ HR" | `BA-AUDIT-BACTIONS` §4 Company rule |
| **BA-OPEN-8** | BA workbook missing 7 B-action sheets (Transfer/Terminate/Contract Renewal/Rehire/Promotion/Acting/Probation) — currently only Hire 37 fields | BA team | Field list, DB column, LOV per action all unconfirmed | `BA-REVIEW-PREP` §2 row 8 |
| **BA-OPEN-9** | Terminate picklist: code currently uses `RESIGN/RETIRE/LAYOFF/MISCONDUCT/CONTRACT_END` (5) but SF uses `TERM_*` prefix (17 codes) — (a) wire to SF 17 or (b) BA add unprefixed to SF? | BA + Ken | Determines reasonCode dropdown contents | `BA-REVIEW-PREP` §4; `BA-AUDIT-BACTIONS` §2 |
| **BA-OPEN-10** | Transfer & Rehire UI: free-text vs wire to existing schema picklists (3 transfer codes, 2 rehire codes) | BA | Page swaps textarea → `<select>` if confirmed | `BA-REVIEW-PREP` §4 |
| **BA-OPEN-11** | Contract Renewal / Promotion / Acting picklists — does SF have dedicated picklists or is free-text final? | BA | If picklist exists: add to `EventReasonAll.json`; if not: note in BA workbook | `BA-REVIEW-PREP` §4 |
| **BA-OPEN-12** | Probation outcome → SF event reason wiring (COMPROB_COMPROB / TERM_UNSUCPROB / TBD-extend) | BA | Page emits proper SF code on submit | `BA-REVIEW-PREP` §4 |
| **BA-OPEN-13** | Promotion `salaryChangePct` 0–50 range — is this the correct ceiling? | BA | Validator bounds | `BA-AUDIT-BACTIONS` §5 Gap |
| **BA-OPEN-14** | Acting `actingPosition` — link Position Master (lookup) or keep free text? | BA | Component swap (PositionLookup vs text input) | `BA-AUDIT-BACTIONS` §6 Gap |
| **BA-OPEN-15** | Acting `isPrimary` cascade — relationship between "ตำแหน่งหลัก" vs "รักษาการ-หลัก" | BA | Toggle behavior | `BA-AUDIT-BACTIONS` §6 Deferred |
| **DUP-1** | `/recruiting` (placeholder) vs `/recruitment` (213-line requisition) + `/screening` (88-line kanban): hide / merge / keep? | BA + RIS joint | Sidebar IA decision | `BA-REVIEW-PREP` §3; `PLACEHOLDER-AUDIT` §2 row 5 |
| **DUP-2** | `/reports` top-level placeholder vs `/admin/reports` shipped — hide top-level or enrich as ESS report hub? | BA + RIS joint | Sidebar IA decision | `BA-REVIEW-PREP` §3; `PLACEHOLDER-AUDIT` §2 row 6 |
| **PLACE-1** | `/admin/employment-info` (9-line "Coming soon — Phase 2") — scope? Job/Comp change history? CV? | Ken + BA | Defines next placeholder enrichment | `PLACEHOLDER-AUDIT` §2 row 1 |
| **PLACE-2** | `/careers`, `/development`, `/performance-form` placeholders — keep + Phase 2 note default; enrich? | Ken + RIS | Sidebar IA | `PLACEHOLDER-AUDIT` §2 rows 2–4 |
| **P-B1-Q1** | DB Provider: Neon (recommended) / Supabase / Vercel Postgres / Cloud SQL | Ken | Sprint 2 unblocks #63–#70 | `P-B1-DECISION-BRIEF` §"Q1" |
| **P-B1-Q2** | Auth: next-auth v5 (already installed) / Azure B2C / Azure AD | Ken | Sprint 2 unblocks; B2C is Phase 2.5+ | `P-B1-DECISION-BRIEF` §"Q2" |
| **P-B1-Q3** | Prisma scaffold from `hr-db-schema.sql` ~60 tables — execute now? | Ken | Already recommended; just go | `P-B1-DECISION-BRIEF` §"Q3" |
| **P-B1-Q4** | Env strategy: Neon branches + Vercel envs | Ken | Mirrors Cashflow precedent | `P-B1-DECISION-BRIEF` §"Q4" |
| **P-B1-Q5** | Secrets: Vercel env vars (default) | Ken | Same as `hr-opal-gamma` deploy | `P-B1-DECISION-BRIEF` §"Q5" |

---

## 4. Coverage Gaps

From `BRD-COVERAGE-MATRIX-2026-04-24.md`:

| Area | Nature of gap | Severity | Source row |
|---|---|---|---|
| Flow 03 EC Reporting per-sheet (BRD #121–161) | 29/45 ❌ Not Started; only Reports Hub KPI dashboard exists; 28 xlsx report layouts not replicated | High (BRD coverage 5✅/11🟡/29❌) | `BRD-COVERAGE-MATRIX` Flow 03 |
| Flow 07 EC Special Information (BRD #35–84) | 50/50 ❌ — entire flexible-section framework absent (no `/admin/special-info` route) | Critical (full module not started) | `BRD-COVERAGE-MATRIX` Flow 07 |
| 28 report sheets | 23/28 ❌, 5 🟡 (REP-EMP MOVEMENT, REP-PENDING WF, REP-POSITION, REP-ORGANIZATION, STORY REPORT) | High | `BRD-COVERAGE-MATRIX` §"Reports" |
| BRD #34 Disability | Field exists in mock data; no admin CRUD, no disability report (REP-DISABILITY ACTIVE/INACTIVE ❌) | Medium | Flow 06 #34 |
| BRD #30 Employee Group / #31 Subgroup | No admin CRUD or view page | Medium | Flow 06 #30, #31 |
| BRD #97 SSO_Location | No standalone admin page (covered indirectly by Org Foundation cascade) | Low | Flow 08 #97 |
| BRD #99–100 Mass Import / Mass Change | No mass-ops UI | Medium | Flow 08 |
| BRD #115 Auto-Terminate Contract Employee | No cron / no rule | Medium | Flow 09 #115 |
| BRD #116 Revert Terminate Flow | No revert UI; implicit via rehire | Medium | Flow 09 #116 |
| BRD #105–108 EC Document hub | No Document Management hub; ~50K Merit Bonus letters/yr expected; profile attachments only | High | Flow 08 #105–108 |
| BRD #134 Pending Workflow Approval report | `/ess/workflows` + `/workflows/probation` exist but formal report layout missing | Medium | Flow 03 #134 |
| BRD #174 View Team Information / #175 Team Org Chart / #176 View Team Reports | `/manager-dashboard` (12-line wrapper) and `/hrbp-reports` (12-line wrapper) are thin/placeholder for Manager persona | High (Manager journey gap) | Flow 04 #174–176 |
| BRD #173 Document Access | Document viewer in profile sections; formal Document Access hub ❌ | Medium | Flow 04 #173 |
| BRD #177 Position & Vacancy Overview (MSS-scoped) | Positions CRUD exists; MSS-scoped overview ❌ | Medium | Flow 04 #177 |
| BRD #146 Job Relationships dedicated editor | Manager shown in detail; dedicated editor ❌ | Low | Flow 06 #24 |
| BRD #91 Year In Personal Grade (PG) | Calc framework exists but PG-specific variant missing | Low | Flow 08 #91 |
| BRD #34, #50, #53, #63, #66, #72, #76 (HR-only `🔒` Special Info sections) | Sensitive sections not surfaced anywhere | Medium | Flow 07 |

**Tally**: 207 EC BRDs total → 74 ✅ / 38 🟡 / 93 ❌ / 7 🔇 (non-trivial: ~45% not yet shipped or partial).

---

## 5. Placeholder Audit Findings

Source: `PLACEHOLDER-AUDIT-2026-04-24.md`.

### Section 1 — 18 Thin-Wrapper Routes (all ✅ real components)

No bare placeholders found in this set; "Coming soon" hits are sub-section copy not whole pages.

### Section 2 — 6 Pure Placeholders (Decision Register)

| Route | Current state | Workaround / current behavior | What's missing |
|---|---|---|---|
| `/admin/employment-info` | 9-line raw `<h1>Employment Info</h1><p>Coming soon — Phase 2</p>` | Sidebar link present; route renders Coming soon | Scope undefined (Job/Comp change history? CV?); no i18n key (others use `humi-card` + `placeholders.comingSoon`) |
| `/careers` | 17-line i18n placeholder using `humi-card` + `placeholders.comingSoon` | Top-level link in sidebar | Phase 2 = full careers portal; recipients/scope TBD |
| `/development` | 17-line i18n placeholder | Sidebar link reserved | Phase 2 = learning/development hub; binds to `/idp` (✅) |
| `/performance-form` | 17-line i18n placeholder | Sidebar link present | Performance form workflow; ties to `/performance` ✅ list |
| `/recruiting` | 17-line i18n placeholder | Duplicate-risk vs `/recruitment` (213 lines, requisition+candidate) and `/screening` (88-line kanban) | Decision: hide or define separate scope |
| `/reports` (top-level) | 17-line i18n placeholder | Duplicate-risk vs `/admin/reports` (✅ shipped EC report hub) | Decision: hide, or enrich as ESS-scoped reports |

**Recommendation default**: keep + Phase 2 note for all 6; RIS may flip `/recruiting` and `/reports` to **hide**. Surprise: no bare `<PageLayout>` empty case found — spec assumption "mix of ✅/🟡/❌" did not match post-PR-#31–#44 state.

---

## 6. RIS Walkthrough Insights

Source: `RIS-WALKTHROUGH-2026-04-24.md`.

### Branding / Visual System

- **Humi grain texture** on hero cards (Admin Center)
- Hover animation: `-translate-y-0.5` on cards
- Status badge color codes: ใช้งาน=green, ปิด=gray, รอประมวลผล=gray, พร้อมดาวน์โหลด=green, มีผล=green, "เร็ว ๆ นี้"=gray
- Drawer width: 480px (Org admin)
- Empty state phrasing: "ยังไม่มีกิจกรรมในระบบ" (Recent Activity)
- Search default for `/admin/employees`: **empty by default** with "เริ่มต้นด้วยการค้นหา" empty state — performance optimization (200ms debounce, virtualized list ≥1000 rows)

### Locale & Formatting

- All routes prefixed with `[locale]` (e.g., `/th/admin`)
- Dual labels everywhere: TH first, then EN
- Numbers formatted as Thai locale with "บาท" suffix (payslip)
- Greeting time-of-day Thai: สวัสดีตอนเช้า/บ่าย/เย็น

### Admin IA (Information Architecture)

Three groups in `/admin`:
1. **Group 1**: Lifecycle Actions + Employee Data (`/admin/hire`, `/admin/employees`, `/admin/employment-info`)
2. **Group 2**: Master Data (`/admin/organization`, `/admin/jobs`, `/admin/positions`)
3. **Group 3**: Reports / Self-Service / Users / System

Stat widgets on Admin Center: **240K+ พนักงาน, 0 Workflow รอ, 164 บริษัท, 17K แผนก** — sets target dataset scale for backend.

### Admin Center Cards (6)

การจ้างพนักงาน / ข้อมูลพนักงาน / Self-Service / ผู้ใช้และสิทธิ์ / จัดการระบบ / รายงาน.

### Wizard Behavior (Hire)

- 3 steps with status tabs (completed/locked indicator)
- Auto-save Zustand persist on every input
- "ถัดไป" disabled until step valid; locked steps not jumpable
- Last-saved timestamp visible in WizardShell header
- Submit logs to console (Phase 2 will wire API)
- Reset to step 1 after submit

### Org Tree Behavior

- Expand 5 บริษัท by default
- Search auto-expands ancestor nodes; footer shows match count
- Drawer slides from right (480px) with breadcrumb path
- Escape / scrim click with unsaved changes → confirm dialog
- "+ เพิ่มหน่วยงาน" form fields: รหัสหน่วยงาน / ชื่อ TH / ชื่อ EN / บริษัท / หน่วยงานแม่ / วันที่มีผล / ใช้งาน

### Position Behavior

- Dropdown "งาน" filters to **active jobs only**
- Dropdown "หน่วยงาน" reads OrgUnits store
- "จำนวนพนักงานปัจจุบัน" is **readOnly** (derived)
- บริษัท dropdown uses `PICKLIST_COMPANY` shared picklist

### Reports Hub Pattern

KPI dashboard aggregating: total headcount / probation count / job count / position count / org units / 30-day movement. Bar charts for company breakdown and ประจำ vs บางเวลา. Footer: "ข้อมูลจากฐานข้อมูลจำลอง".

### Self-Service Hub Pattern

Hub of editor cards (BRD #178–183). Dirty-state banner. "การตั้งค่าทั้งหมดจะมีผลทันทีเมื่อบันทึก".

### Users Hub Badges

- Orange badge: pending proxy approvals count
- Blue badge: today's audit log entries count
- Each card footer cites actor: HRIS Admin / SPD Admin / Admin

### ESS Patterns

- `/profile/me` is **read-only** (Phase 2 adds edit)
- Payslip rows: 6-month range
- Benefits cards each carry Phase 2 placeholder note at end

---

## 7. Persona-Specific Requirements

Personas: **Employee, Manager, HRBP, SPD, Admin**.

### Employee (ESS)

| # | Capability | Source |
|---|---|---|
| E1 | View `/home` dashboard: greeting, presence ring, requests, docs, announcements, calendar, recognition | `RIS-WALKTHROUGH` `/home` |
| E2 | View `/profile/me` (read-only, 3 sections: contact, position, personal) | `RIS-WALKTHROUGH` `/profile/me` |
| E3 | Edit personal info via `/ess/profile/edit` (BRD #166) | `BRD-COVERAGE-MATRIX` #166 |
| E4 | Manage Emergency Contact (BRD #167) | `BRD-COVERAGE-MATRIX` #167 |
| E5 | View employment info (BRD #168) | `BRD-COVERAGE-MATRIX` #168 |
| E6 | View `/org-chart` (BRD #169) | `BRD-COVERAGE-MATRIX` #169 |
| E7 | View payslip `/employees/me/payslip` 6-month list (BRD #170) | `RIS-WALKTHROUGH` |
| E8 | View benefits `/employees/me/benefits` (3 cards) | `RIS-WALKTHROUGH` |
| E9 | View Quick Actions Tile (BRD #171) | `BRD-COVERAGE-MATRIX` #171 |
| E10 | Submit Termination Request (BRD #172) — `/resignation` thin wrapper today | `BRD-COVERAGE-MATRIX` #172 |
| E11 | Document Access (BRD #173) — partial via profile attachments | `BRD-COVERAGE-MATRIX` #173 |
| E12 | Pending workflow visibility `/ess/workflows` | `BRD-COVERAGE-MATRIX` #134 |

### Manager

| # | Capability | Source |
|---|---|---|
| M1 | View Team Information (BRD #174) — **❌ no team view today** (`/manager-dashboard` is 12-line wrapper) | `BRD-COVERAGE-MATRIX` #174 |
| M2 | Team Org Chart (BRD #175) — shared with #169 today; team-scoped variant ❌ | `BRD-COVERAGE-MATRIX` #175 |
| M3 | View Team Reports (BRD #176) — `/hrbp-reports` placeholder | `BRD-COVERAGE-MATRIX` #176 |
| M4 | Position & Vacancy Overview (BRD #177) — MSS-scoped variant ❌ | `BRD-COVERAGE-MATRIX` #177 |
| M5 | Manager Dashboard / KPIs / list views (505 lines exist) | `PLACEHOLDER-AUDIT` row 6 |
| M6 | Quick Approve inbox `/quick-approve` (611 lines) | `PLACEHOLDER-AUDIT` row 10 |
| M7 | Approval chain participation E→M (Phase 2.5) | `BA-AUDIT-BACTIONS` §2 Deferred |

### HRBP

| # | Capability | Source |
|---|---|---|
| HB1 | HRBP Reports dashboard (343 lines exist) | `PLACEHOLDER-AUDIT` row 2 |
| HB2 | Receive HRBP SH4 mail on Hire submit (BRD #14, #109) — backend stub | `BA-REVIEW-PREP` §2 row 3 |
| HB3 | Approval chain participation M→HRBP (Phase 2.5) | `BA-AUDIT-BACTIONS` §2 |
| HB4 | Hidden Profile (BRD #201) toggle visibility — Phase 2 RBAC | `BRD-COVERAGE-MATRIX` #201 |

### SPD

| # | Capability | Source |
|---|---|---|
| S1 | SPD Management (`/spd-management`, 658 lines) | `PLACEHOLDER-AUDIT` row 14 |
| S2 | Approval chain HRBP→SPD termination (Phase 2.5) | `BA-AUDIT-BACTIONS` §2 |
| S3 | SPD Admin actor (Audit Report, Foundation Audit) | `RIS-WALKTHROUGH` `/admin/users` |
| S4 | EMP Movement SPDHR report variant (#131) — ❌ | `BRD-COVERAGE-MATRIX` Reports |

### Admin (HRIS Admin)

| # | Capability | Source |
|---|---|---|
| A1 | Admin Center landing with 6 hubs | `RIS-WALKTHROUGH` `/admin` |
| A2 | Hire wizard (`/admin/hire`) with 3 clusters | `RIS-WALKTHROUGH` |
| A3 | Employee directory (`/admin/employees`) search-first | `RIS-WALKTHROUGH` |
| A4 | Employee detail page (`/admin/employees/[id]`, 665 lines) | `BRD-COVERAGE-MATRIX` #207 |
| A5 | 7 lifecycle actions on detail (Hire, Transfer, Terminate, Contract Renewal, Rehire, Promotion, Acting, Probation) | `BA-AUDIT-BACTIONS` |
| A6 | Master Data CRUD: Org, Jobs, Positions | `RIS-WALKTHROUGH` Group 2 |
| A7 | Self-Service config (BRD #178–183) | `RIS-WALKTHROUGH` `/admin/self-service` |
| A8 | Users + Permissions (BRD #184–189) | `RIS-WALKTHROUGH` `/admin/users` |
| A9 | System (Reports tooling, Integration, Features, Security) | `RIS-WALKTHROUGH` `/admin/system` |
| A10 | Reports Hub `/admin/reports` (KPI dashboard) | `RIS-WALKTHROUGH` |
| A11 | i18n switch (BRD #195) | `BRD-COVERAGE-MATRIX` #195 |
| A12 | Audit Report CSV export (BRD #189) | `BRD-COVERAGE-MATRIX` #189 |

---

## 8. Questions for Deep Interview

These are unresolved ambiguities a human PM/BA must answer before coding the replacement UI:

1. **Manager persona is the biggest gap.** `/manager-dashboard` and `/hrbp-reports` are 12-line wrappers, and BRD #174–177 are not shipped. What is the canonical Manager IA — separate route tree, or scoped views of admin pages with role filter?
2. **Approval chain UI.** BRD #111 specifies E→M→HRBP→SPD for Termination. Is the same chain (or a subset) required for Transfer, Promotion, Contract Renewal, Probation? What does each step's UI look like — inline buttons in `/quick-approve`, or per-action approval pages?
3. **Termination picklist canonicalization (BA-OPEN-9).** Wire UI to SF's 17 `TERM_*` codes, or have BA add the 5 unprefixed codes to SF? This blocks the reasonCode dropdown.
4. **Free-text vs picklist for B-action reasons.** Five B-actions (Transfer, Rehire, Contract Renewal, Promotion, Acting) currently use free text. Which become enum dropdowns (Sprint 2) and which stay free-text by design?
5. **Promotion `salaryChangePct` ceiling.** UI uses 0–50 — is 50% the actual cap, or arbitrary? (BA-OPEN-13)
6. **Acting position semantics.** Is `actingPosition` a free-text label, or must it link to the Position Master like Promotion? (BA-OPEN-14) And how does `isPrimary` interact with the employee's existing primary position?
7. **Contract Renewal data model.** `currentEndDate` is currently `hire_date + 1 year` stub — what is the real contract record schema (separate `contracts` table? versioned events on employment?).
8. **Day-30/119 cron timing (BA-OPEN-6).** Business days or calendar days? Where is the timezone authority (UTC store + Asia/Bangkok display)?
9. **Foreigner=YES Work Permit sub-form (BA-OPEN-2).** What fields, mandatory rules, and layout? UI has no conditional branch today.
10. **Special Information module (Flow 07, 50 BRDs).** Is the entire flexible-section framework in scope for Phase 2, deferred to Phase 3, or replaced by a different design? This is the largest "❌ Not Started" cluster.
11. **EC Document hub (BRD #105–108).** ~50K Merit Bonus letters/year is a meaningful storage signal. Where do these live — S3-style object store, SharePoint, file system? Inline preview or new-tab? Document Management hub UI scope?
12. **28 report sheets vs Reports Hub.** Reports Hub uses a KPI dashboard pattern instead of replicating 28 xlsx layouts. Does HR BU accept the hub-as-replacement, or are specific xlsx layouts contractually required (e.g., REP-DISABILITY ACTIVE/INACTIVE for compliance)?
13. **Mass operations (BRD #99, #100).** Required for Phase 2, or out of scope?
14. **Revert Termination flow (BRD #116).** Is rehire-as-revert acceptable, or is a dedicated "revert within 30 days" workflow required?
15. **Rehire company rules (BA-OPEN-7).** What are the `useNewCode` defaults for the 10+ companies beyond CRC and CPN?
16. **Duplicate routes (DUP-1, DUP-2).** Final disposition of `/recruiting` and top-level `/reports` — hide, merge, or enrich with separate ESS scope?
17. **Hidden Profile (BRD #201) and Direct User (BRD #202).** RBAC enforcement is currently UI-only. What are the actual permission rules and who can see what?
18. **Performance & Learning external integration.** Per project memory these are external systems with placeholder pages. What is the integration contract — link out, embed, or sync data?
19. **National ID validator (BA-OPEN-1).** Pick the library (`thai-national-id-validator` or other) and confirm if other countries' ID formats need validators too (e.g., VN, foreigner workflow).
20. **Dataset scale for backend planning.** RIS walkthrough cites **240K+ employees, 164 companies, 17K departments**. Does the 60-table Prisma schema and Neon free tier accommodate this, or do production deployments need Pro tier (P-B1 §"TL;DR" notes $19/mo Pro)?
21. **Audit log scope.** Which mutations write events? `useLifecycleWizard` writes timeline events for 7 actions, but Org / Position / Job edits, Self-Service config edits, and User / Permission changes — do they all emit audit entries?
22. **Effective dating (BRD #205) granularity.** `EffectiveDateGate` exists. Is effective dating per-action only, or per-field (BRD #94 Custom Field Effective Date is partial)?
23. **Year-in-PG (BRD #91).** Calc framework exists but Personal Grade variant is missing. Is PG a real concept in the target schema, or has it been replaced by Job Grade?
24. **`/admin/employment-info` scope (PLACE-1).** What is this page actually for? Job/Comp change history view? CV summary? It currently has no defined scope.
25. **Locale strategy beyond TH/EN.** Picklists carry VN labels (`Label VN`). Is Vietnamese UI in scope, or is Vietnam workforce served by the EN locale with VN-specific data fields only?
