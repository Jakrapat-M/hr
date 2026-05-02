# BRD Flow Matrices & BRD↔TTT Mapping

> Synthesized from `planning/docs/brd-207-flow-matrix.xlsx`, `planning/docs/brd-207-manual-workflow-matrix.xlsx`, `planning/docs/brd-vs-ttt-mapping.md`, and `planning/docs/sap-ec-core-summary.md`.
> Scope: Employee Center (EC) + Benefits (BE). Performance & Learning out of scope.
> Personas: Employee, Manager, HRBP, SPD, Admin.

---

## 1. Source Inventory

### 1.1 `brd-207-flow-matrix.xlsx`

| Sheet | Rows | Cols | Purpose |
|---|---|---|---|
| `BRD × Flow Matrix` | 208 (1 header + 207 BRDs) | 19 | Maps each of 207 BRD requirements to 11 flows (`flow-01`…`flow-11`), TTT coverage, and TTT process. |
| `Coverage Summary` | 25 | 3 | Coverage stats: Full / Partial / Gap / No-mapping; per-flow distribution. |

**`BRD × Flow Matrix` columns:** `No`, `Category`, `Sub-Category`, `Feature`, `flow-01`…`flow-11` (✓ marker), `Flow Count`, `TTT Coverage`, `TTT Process`, `BU Feedback`.

### 1.2 `brd-207-manual-workflow-matrix.xlsx`

| Sheet | Rows | Cols | Purpose |
|---|---|---|---|
| `BRD × Manual Workflow` | 209 (2 header rows + 207 BRDs) | 24 | Maps each BRD to 11 EC Core TTT manuals (`TTT-01`…`TTT-11`) and 5 EC FO (Foundation Object) manuals (`FO-10`…`FO-50`). |
| `Workflow Legend` | 17 | 3 | Decodes `TTT-NN` and `FO-NN` IDs to manual section + source document. |
| `Coverage Summary` | 28 | 3 | Coverage by manual: Supported / Partial / Referenced / Not-in-Manual; counts per TTT and per FO. |
| `Gap — Not in Manual` | 67 | 5 | The 66 BRDs with **no** manual coverage — direct candidates for new custom build. |

**`BRD × Manual Workflow` columns (row 2):** `No`, `Category`, `Sub-Category`, `Feature`, `TTT-01..TTT-11`, `FO-10..FO-50`, `Workflows #`, `Coverage`, `Source Manual Process`, `BU Feedback`.

### 1.3 `brd-vs-ttt-mapping.md`
Pre-summarized BRD→TTT process mapping with detailed per-flow tables and TTT process heat map. ~335 lines.

### 1.4 `sap-ec-core-summary.md`
Distillation of CNeXt TTT V0.02 (Oct 2018, 12 PDFs) — describes the AS-IS SAP SuccessFactors EC Core implementation that the new HRMS replaces. ~254 lines.

---

## 2. BRD-207 Flow Matrix Summary

The matrix decomposes 207 BRD requirements into **11 functional flows**. Every BRD maps to ≥1 flow (100% coverage). Distribution skews heavily to **flow-07 Special Information (50)** and **flow-03 Reporting (44)** — together ~45% of all requirements.

### 2.1 Flow-by-flow walk-through

| Flow | Title | BRDs | Primary Actors | What it covers | Decision points / approvals | Key data entities |
|---|---|---|---|---|---|---|
| **flow-01** | EC Core & Foundation | 3 | Admin, HRIS | System foundation: Org Foundation Object, Payment Foundation Object, EC Picklist | Config-time only (no runtime decisions) | Org structure, payment metadata, picklist values |
| **flow-02** | EC Data Management | 18 | Admin, HRIS, SPD | System-wide capabilities: API/IC, Story Report, Customize Report, Schedule Report, Consent Form, Survey, Switch Language, E-Document, Data Encryption, Data Migration, Hidden Profile, Direct User, MS Teams/Viva, UX/UI | Consent acceptance gate (first-login); Hidden Profile visibility decision | Reports, surveys, consent records, encrypted PII, e-documents |
| **flow-03** | EC Reporting | 44 | HR, Manager, HRBP | Operational + foundation reports: 23 Personal Info reports, 9 Foundation reports (Position/Org/Function/Store/Location/CostCenter/Brand/HR District/Section), 4 Org & Position, 4 Employment, 2 Compensation, Pending Workflow, Audit, Role-based data control | Filter scoping by role/BU/company/cost center; export format choice | Employee, Position, Org, Compensation, Workflow logs |
| **flow-04** | EC Self Service | 19 | Employee (ESS), Manager (MSS), Admin | 9 ESS (View/Update Personal, Emergency, View Employment, Org Chart, Compensation/Payroll, Quick Actions, Termination Request, Document Access), 4 MSS (View Team, Team Org Chart, Team Reports, Position & Vacancy), 6 Admin Self Service (Field Config, Visibility, Mandatory Rule, Read-Only Control, Quick Actions, Tile/Home) | Termination Request → triggers flow-09; field-level RBAC decisions; consent re-prompts | Employee profile, team hierarchy, tiles, field metadata |
| **flow-05** | EC User Management | 6 | Admin, HRIS | Data Permission Group, Application Role Group, User Assignment, Proxy, Revised Foundation, Audit Report | Proxy approval (Admin-only, audit logged); permission group assignment | Users, roles, permission groups, audit log |
| **flow-06** | EC Personal Information | 23 | Employee, Manager, HR | Biographical, Personal, National ID 🔒, Email, Phone, Address, Work Permit, Emergency Contact, Dependents, Employment, Terminate, Job Info, Job Relationships, Pay Component Recurring 🔒, Alt Cost Distribution, Payment Info 🔒, HR District, UserAccountInfo, Employee Group/Subgroup, Performance, Formal Education, Disability 🔒 | **Workflow-triggering edits:** First/Last Name, Name TH, Marital Status, Military Status, Address Info → Employee→Manager→HRBP approval. Sensitive fields require re-auth. | Employee Master Data (~24 entities) |
| **flow-07** | EC Special Information | 50 | Employee, HR | All `cust_*` background elements: Awards, Certificates, Community, Compensation 🔒, Courses, Achievement, Assessment, Coaching Feedback, Company Asset, Company Loan 🔒, Court Order 🔒, Development Goals/Needs, Disciplinary 🔒, EBO, Goodness, Guarantee 🔒, Insurance, Leadership Competency, Learning Activities, MTMA Reference, Potential, Rotation Plan, Salary History, Scholarship, Strength, Student Loan, Talent Reference, Work Experience, Personality Assessment, Documents, FSA, Func/Lead Experience, Languages, Memberships, Mobility, Outside Work, Career Goals, Previous Employment | Per-section visibility/edit RBAC; attach-document gate on every section | 50 background-element tables |
| **flow-08** | EC Employment Information | 24 | HR, Manager | Assignment Details (Hire/Transfer/Terminate), Promotability, DVT Project, Special Assignment, Year-In-* (Store, Position, Job, Job Grade, Personal Grade, BU), Age/Generation, Custom Field Effective Date Override, Change Position, Alt Cost Distribution, SSO_Location, Revert Termination, Mass Import/Delete, Mass Change Emp Job, Hire Date Correction, Re-Hiring, Promotion / PT→FT, Acting Position, EC Documents (Merit letters, attachments, preview) | Effective-date validation (block backdate if future record exists); Mass-op confirmation; Hire Date Correction = 2-event sequence (Incorrect→Corrected) | Job assignment history, position, cost distribution, e-documents |
| **flow-09** | EC Employee Lifecycle | 9 | HR, Manager, HRBP | Hiring Flow, Transfer Flow (cross-company), **Terminate Request Workflow**, Termination Documents (50ทวิ), Terminate Reason Visibility, OK to Rehire Flag, Auto-Terminate Contract, Revert Terminate Flow, Pass Probation (auto-pass + reminders) | **Multi-level approval on Termination** (Manager→HRBP→HR or vice versa); OK-to-Rehire decision (blacklist gate); auto-pass probation rule | Hire/Term events, contract end dates, probation dates, 50ทวิ docs |
| **flow-10** | EC Compensation | 3 | HR, Payroll | Payment Information 🔒, Payroll Information, Salary Base + History | Sensitive-field re-auth | Pay components, payment method, bank info, salary history |
| **flow-11** | EC Organization & Position | 8 | Admin, HRIS | Position Management, Job Classification, Org Visualization, Org Unit Management, Position Budget, Position Hierarchy, Job Profile Builder, Succession Org Chart | Position approval (FO workflow); budget vs headcount validation | Position, Job, Org Unit, Budget, Hierarchy |

### 2.2 Coverage stats from `Coverage Summary` (flow-matrix)

| Metric | Count | % |
|---|---|---|
| Total BRDs | 207 | 100% |
| BRDs mapped to ≥1 flow | 207 | 100% |
| TTT — Full | 92 | 44.4% |
| TTT — Partial | 44 | 21.3% |
| TTT — Gap | 34 | 16.4% |
| No TTT mapping found | 37 | 17.9% |

> The flow-matrix file uses a slightly different bucketing than the markdown summary (which reports Full=108 / Partial=58 / Gap=41). Reconciliation note: the xlsx has a fourth bucket "No TTT mapping found" (37) absorbed into Gap (41) in the markdown. Net story is identical: ~52% Full+No-mapping consolidation, ~21% Partial, ~17–20% true Gap.

---

## 3. Manual Workflow Matrix Summary

The manual matrix maps the same 207 BRDs against **AS-IS SAP TTT manuals** (16 total: 11 EC Core TTT + 5 EC FO).

### 3.1 Coverage stats from `Coverage Summary` (manual)

| Bucket | Count | % | Meaning |
|---|---|---|---|
| 🟢 Supported | 107 | 51.7% | Full TTT or FO manual maps the requirement |
| 🟡 Partial | 34 | 16.4% | TTT touches data/concept only, not the BRD outcome |
| ⚪ Referenced | 0 | 0.0% | (unused) |
| 🔴 Not in Manual | 66 | 31.9% | **Candidate for new custom build** — no AS-IS reference |

### 3.2 BRD distribution per TTT manual

| TTT | Title | BRDs | % | Note |
|---|---|---|---|---|
| TTT-01 | Hire & Rehire | 16 | 7.7% | Lifecycle entry — 5-step wizard |
| TTT-02 | Manage Probation | 1 | 0.5% | Thin manual; BRD #117 adds auto-pass + reminders |
| **TTT-03** | **Maintain Master Data** | **70** | **33.8%** | **The backbone — biggest replacement surface** |
| TTT-04 | Manage Employee Movement | 16 | 7.7% | Transfer/Promotion/Demotion |
| TTT-05 | Manage Pay Rate Change | 13 | 6.3% | Mass + individual |
| TTT-06 | Manage Change Emp Type | 6 | 2.9% | Permanent↔Contract conversions |
| TTT-07 | Manage Suspension | 0 | 0.0% | **No BRD maps here — feature retained but unrequested** |
| TTT-08 | Acting Assignment | 3 | 1.4% | Concurrent employment |
| TTT-09 | Manage Contract Renewal | 1 | 0.5% | Thin; BRD #115 wants auto-renewal |
| TTT-10 | Terminate | 12 | 5.8% | Multi-scenario + workflow |
| **TTT-11** | **EC Report** | **42** | **20.3%** | All flow-03 reports |

### 3.3 BRD distribution per FO manual

| FO | Title | BRDs |
|---|---|---|
| FO-10 | Maintain Organization Structure | 7 |
| FO-20 | Organization Re-structuring | 2 |
| FO-30 | Maintain Job | 0 |
| FO-40 | Position Management | 6 |
| FO-50 | Other Foundation Object | 2 |

### 3.4 Manual gaps — automation candidates (`Gap — Not in Manual`, 66 BRDs)

Concrete features the new UI must build from scratch (no SAP precedent):

**Special Information (24 BRDs)** — `cust_potentialDetails`, `cust_rotationPlan`, `cust_salaryHistory`, `cust_scholarship`, `cust_strength`, `cust_studentLoan`, `cust_talentReference`, `cust_workExperience`, `custAdvancedInformation`, `custHistPerformanceGroup`, `custPerformance` (E-Letter), `custPerformance_PW`, `custPersonalityAssessment`, `documents`, `education` (formal), `fsaelection`, `funcExperience`, `insideWorkExperience`, `languages`, `leadExperience`, `memberships`, `mobility`, `outsideWorkExperience`, `preferredNextMove`.

**EC Document (4 BRDs, #105–108)** — File-store integration with SPD's e-doc system; merit/bonus/performance letters (~50,000 PDFs/year); attach to every Personal/Job/Payment/Special Info section; PC + mobile preview; new-tab open without download; supports `.jpg/.png/.webp/.pdf`.

**EC Reporting Foundation (9 BRDs, #153–161)** — Foundation Structure reports for Position, Organization, Function, Store Branch, Work Location, Cost Center, Brand, HR District, Section Group. Each requires a templated XLSX export.

**EC Self Service (10 BRDs, #169, 171, 173–175, 177–183)** — View Org Chart, Quick Actions Tile, Document Access, View Team Information, Team Org Chart, Position & Vacancy Overview, Field Config, Field Visibility, Field Mandatory, Field Read-Only, Manage Quick Actions, Manage Tile & Home Page.

**EC User Management (5 BRDs, #184–188)** — Data Permission Group, Application Role Group, User Assignment, Proxy (with audit log), Revised Foundation (sync trigger fix — must use original effective date, not 1st of month).

**EC Data Management (10 BRDs, #191, 193–195, 197, 198, 199, 201–205)** — API/Integration Center, Survey form (replacing O365), MS Teams/Viva, Switch Language (TH/EN/VN across EC/TIME/Benefit), E-Document, Data Migration, Consent Form (first-login), Hidden Profile, Direct User (job-runner identity), Data Encryption, Security/Session Timeout, Mobile UX/UI.

> **Net implication:** ~32% of BRDs have **no AS-IS reference manual**. The new UI specification cannot be derived by mimicking SAP — these require fresh design grounded in BU feedback.

---

## 4. BRD↔TTT Mapping

### 4.1 Per-flow coverage matrix

| Flow | Title | BRDs | Full | Partial | Gap | Primary TTT Process |
|---|---|---|---|---|---|---|
| flow-01 | EC Core & Foundation | 3 | 0 | 0 | **3** | — (config, no TTT) |
| flow-02 | EC Data Management | 18 | 0 | 5 | **13** | TTT-11 (Reports partial) |
| flow-03 | EC Reporting | 44 | 13 | 26 | 5 | **TTT-11 EC Report** |
| flow-04 | EC Self Service | 19 | 3 | 5 | **11** | TTT-03 (Master Data) |
| flow-05 | EC User Management | 6 | 0 | 1 | **5** | — (admin config) |
| flow-06 | EC Personal Information | 23 | **19** | 4 | 0 | **TTT-03 Maintain Master Data** |
| flow-07 | EC Special Information | 50 | **46** | 4 | 0 | **TTT-03 Maintain Master Data** |
| flow-08 | EC Employment Information | 24 | 14 | 8 | 2 | TTT-01, 03, 04, 05, 06 (mixed) |
| flow-09 | EC Employee Lifecycle | 9 | **8** | 1 | 0 | TTT-01, 02, 04, 09, 10 |
| flow-10 | EC Compensation | 3 | **3** | 0 | 0 | TTT-03, 05 |
| flow-11 | EC Organization & Position | 8 | 2 | 4 | 2 | — (foundation + 11) |
| **Total** | | **207** | **108** | **58** | **41** | |

### 4.2 TTT process → BRD heat map

| TTT Process | BRDs Mapped | % of 207 | Concentrated in |
|---|---|---|---|
| **03 Maintain Master Data** | ~96 | **46%** | flow-06, flow-07, flow-08 |
| **11 EC Report** | ~48 | 23% | flow-03 (all reports) |
| 04 Employee Movement | ~14 | 7% | flow-08, flow-09 |
| 01 Hire & Rehire | ~12 | 6% | flow-08, flow-09 |
| 05 Pay Rate Change | ~10 | 5% | flow-08, flow-10 |
| 10 Terminate | ~10 | 5% | flow-09, flow-06 |
| 06 Change Employee Type | ~5 | 2% | flow-08 |
| 08 Acting Assignment | ~3 | 1% | flow-08, flow-03 |
| 02 Manage Probation | ~1 | <1% | flow-09 |
| 09 Contract Renewal | ~1 | <1% | flow-09 |
| 07 Manage Suspension | ~1 | <1% | flow-08 |
| **No TTT coverage** | ~41 | **20%** | flow-01, flow-02, flow-04, flow-05 |

### 4.3 Unmapped clusters (require fresh design)

1. **Foundation setup** — flow-01 (3 BRDs)
2. **System admin** — flow-04 #178–183, flow-05 #184–188 (11 BRDs)
3. **Integration/data plumbing** — flow-02 #191, 197, 198, 202 (4 BRDs)
4. **Security/UX shell** — flow-02 #199, 203, 204, 205 (4 BRDs)
5. **Org visualization** — flow-04 #169, flow-04 #175, flow-11 #4, #5 (4 BRDs)

### 4.4 BRDs that **add new capability** beyond TTT

Even where TTT covers a process, BRD often demands more:

| BRD | Capability | TTT delta |
|---|---|---|
| #98, #116 | Revert Termination | New — TTT had no revert path |
| #115 | Auto-Terminate Contract | TTT only manual extend |
| #117 | Auto-pass probation + reminders | TTT only manual pass/extend/fail |
| #111 | Multi-step termination approval | TTT only had Dismissal workflow; BRD wants it for all term types |
| #99, #100 | Mass operations (Import/Delete/Change Emp Job) | TTT had only Mass Pay Rate |
| #197 | E-Document repository | TTT none |
| #194 | MS Teams/Viva integration | TTT none |
| #166 | ESS Update Personal Info | TTT covers HR-side edit; BRD adds employee-driven workflow |

### 4.5 Sensitive fields requiring RBAC + re-auth (🔒)

BRDs flagged 🔒 (must map to Keycloak roles in new system): **#13** Personal Info, **#14** National ID, **#25** Pay Component Recurring, **#27** Payment Info, **#34** Disability, **#40** Compensation, **#46** Company Loan, **#47** Court Order, **#50** Disciplinary, **#53** Guarantee, **#57** Insurance, **#118** Payment Information.

---

## 5. SAP EC Core Summary Distillation

What the new system must respect (data model, events) or replace (workflow rigidity, UI paths).

### 5.1 Data model — must respect

- **Employee Group + Sub-Group taxonomy** (8 groups A/W/C/D/E/F/G/H × 13 sub-groups including pay modes P1/P2/P3, X7-XB, Y7-YB, D1/D2, T1/T2, C1) — referenced everywhere; legacy data carries these codes.
- **Contract types**: Regular, Contract-Monthly, Contract-Yearly, Contract-Long term.
- **Event + Event Reason taxonomy** — pre-delivered, can relabel but not invent. Examples: `HIRE_NEWHIRE`, `TRN_TRNWICWSO` (Transfer w/ SSO), `TRN_TRNBWC` (Transfer across Co.), `PRM_PRM`, `PRM_DEMO`, `PRCHG_MERIT/ADJPOS/SALCUT/SALADJ/PRM`, `DC_EXTPROB/EXTRET/EXCONT/DC/CHGINPAY/CHGINTM/SC`, `JCHG_EMPTYPE`, `SUSP_SUSP`, `RESUSP_RESUSP`, `TERM_RESIGN/UNSUCPROB/RETRIE/DISMIS/ENDASSIGN`.
- **Foundation Objects**: Position (auto-fills Org/Job/Time), Job, Org Unit, Cost Center, Pay Group, Location.
- **Effective-dating**: every Master Data section is historical; insert/edit by effective date; future-dated record blocks backdated insert (must delete future first).
- **Probation rule**: Probation End Date = Hire Date + 119 days (system-calculated).
- **Retirement rule**: Retirement Date = DOB + 60 years (CPN: 1 Jan year+1; others: 1 Mar year+1).

### 5.2 Roles

| Role | Allowed actions |
|---|---|
| HR Admin | Add New Employee (sole owner), all Master Data CRUD, all 11 TTT processes |
| Manager | View team, initiate Dismissal workflow, Promotability edit |
| Employee (ESS) | View own profile, edit subset (workflow-triggered fields), submit Termination Request |
| HRBP | Approve Dismissal workflow; reviews termination decisions |
| (New: SPD, HRIS) | Implied for Hidden Profile visibility, Proxy, Field Config; **not** modeled in TTT |

### 5.3 Workflows (AS-IS minimal)

Only **2 of 11 TTT processes** have built-in workflows:
1. **Process 03 Maintain Master Data** → workflow on First Name, Last Name, Name TH, Lastname TH, Marital Status, Military Status, Address Info edits.
2. **Process 10 Terminate (Dismissal only)** → Manager↔HRBP approval. Other termination types (Resign, Retire, No Show, Transfer Out) are **direct, no workflow**.

The other 9 TTT processes (Hire, Probation, Movement, Pay Rate, Emp Type, Suspension, Acting, Contract Renewal) execute as **direct HR Admin actions** with no approval routing. **BRD #111 explicitly expands this** — multi-step approval becomes the norm.

### 5.4 Integrations

- **Position auto-fill** → Org/Job/Time info pulled automatically (FO is source of truth).
- **SSO Location change** → triggers separate Compensation step (Pay Group follows SSO).
- **Transfer across Company** = Terminate at source + Hire at destination (two events, atomic).
- **Acting** = Concurrent Employment + Pay Group 99 (Non-PY relevant) — bypasses payroll.
- **Mass Pay Rate** = 2-file CSV import (`CompInfoImportTemplate.csv` + `PayComponentRecurringImportTemplate.csv`); Incremental Load, dd/MM/yyyy, UTF-8.
- **National ID Card Type 2** = employee concurrently hired in 2 CG companies.

### 5.5 Critical AS-IS rules to preserve

(Verbatim from SAP summary — these became BRD assumptions.)

1. HR Admin only can add new employee.
2. Employee ID auto-generated, never manual.
3. Probation = Hire + 119 days.
4. Retirement = DOB + 60 years; CPN 1 Jan, others 1 Mar of year+1.
5. Rehire Duplicate Check on DOB + National ID.
6. OK to Rehire = No → permanent blacklist.
7. Position auto-fill drives Org/Job/Time.
8. Suspension uses History → Insert (NOT Actions menu) — UI inconsistency.
9. Dismissal mandatory workflow; all other terminations direct.
10. Multi-position → must select "All Employments" to terminate from company.
11. Alt Cost Distribution must sum to 100%.
12. FTE reduction → Weekly Hours auto-adjust proportionally.
13. Future-dated record blocks backdated insert.

---

## 6. Cross-Cutting Workflow Patterns

Patterns that appear across multiple flows. The new UI must implement each as a reusable primitive.

### 6.1 Multi-level approval routing (Employee → Manager → HRBP → SPD → Admin)

- **Where**: flow-04 #166 (Update Personal Info), flow-04 #172 (Termination Request), flow-06 (workflow-triggering fields), flow-09 #111 (Termination Workflow), flow-08 #99/#100 (Mass ops).
- **Definition**: Initiator submits → routing rule resolves next approver(s) by role + org context → approver acts (approve/reject/return) → effective date applies on final approval.
- **UI implication**: Approval inbox per persona; in-flight request list; status tags (Submitted, Pending Manager, Pending HRBP, Approved, Rejected, Withdrawn); audit timeline on each request.

### 6.2 Effective-dating + history insertion

- **Where**: All flows touching Master Data (flow-06, 07, 08, 10) and lifecycle (flow-09).
- **Definition**: Every change writes a new historical row keyed by Effective Date; Event + Event Reason classify the change; future-dated record blocks backdate.
- **UI implication**: Date picker with payroll-period awareness (effective date often locked to 01.mm or 21.mm); History view per section; "Insert New Record" + "Edit History" actions; visual conflict warning if future record exists.

### 6.3 Sensitive-field re-authentication

- **Where**: flow-06, flow-07, flow-10 — 12 BRDs flagged 🔒.
- **Definition**: Before viewing/editing sensitive PII (National ID, Bank Account, Salary, Loan, Court Order, Disciplinary, Disability), system requires re-auth (SH1).
- **UI implication**: Modal re-auth challenge; per-section RBAC gate; HR-only sections collapse for non-HR; audit log entry on view.

### 6.4 Document upload & preview (universal attach)

- **Where**: Flow-06 (National ID, Work Permit), flow-07 (every cust_* section can attach), flow-08 (Merit letters, EC Documents, ~50k PDFs/year), flow-09 (50ทวิ termination docs).
- **Definition**: Per-section file picker; validates extension (`.jpg/.png/.webp/.pdf`); previews in new tab without download; works on PC and mobile.
- **UI implication**: Reusable `<DocumentAttach>` component; integration with E-Document repo (flow-02 #197) and SPD legacy doc store; thumbnail + metadata table; access-control inherited from parent record.

### 6.5 Email / push notifications

- **Where**: flow-09 #117 (probation reminders), flow-09 #115 (contract auto-terminate alerts), flow-04 #172 (termination ack), workflow approval prompts across flows.
- **Definition**: Event-driven notification on workflow transitions, date-based reminders, system-generated alerts.
- **UI implication**: Notification center per user; email + in-app channel; reminder scheduling rules engine; opt-in preferences per category.

### 6.6 Audit trail

- **Where**: flow-05 #189 (Audit Report), flow-05 #187 (Proxy log), every workflow approval, every sensitive-field view, mass ops.
- **Definition**: Append-only log of who did what when, including who viewed under proxy, who approved/rejected.
- **UI implication**: Audit viewer with filter by actor, date, entity, action; export; immutable storage; legal-hold support.

### 6.7 Field-level RBAC + dynamic config

- **Where**: flow-04 #178–181 (Field Config, Visibility, Mandatory, Read-Only), all profile flows.
- **Definition**: Admin-controlled rules: `(field, role, country, org, employee_group) → (visible|hidden, editable|read-only, mandatory|optional)`.
- **UI implication**: Field-metadata service; render-time evaluation; admin UI for rule CRUD; rule simulation/preview.

### 6.8 Mass operations (Import / Bulk Edit)

- **Where**: flow-08 #99 (Mass Import/Delete), flow-08 #100 (Mass Change Emp Job), TTT-05 (Mass Pay Rate, 2-file CSV).
- **Definition**: Upload templated CSV → preview → validate → commit; incremental load; dd/MM/yyyy, UTF-8.
- **UI implication**: Template download; preview grid with row-level validation errors; commit-or-discard; job status tracking; rollback on failure.

### 6.9 Concurrent / multi-position handling

- **Where**: flow-08 #104 (Acting), flow-09 #110 (Transfer across Co.), TTT-08, TTT-10.
- **Definition**: Employee can hold N positions; primary marked with star icon; payroll only for primary (or Pay Group 99 for acting).
- **UI implication**: Position list per employee with primary indicator; position-scoped actions ("Terminate selected" vs "All Employments"); pay-group derivation.

### 6.10 Consent + first-login gates

- **Where**: flow-02 #199 (Consent Form).
- **Definition**: Group- or all-employee consent prompt at first login; track non-consenters.
- **UI implication**: Pre-app modal; consent-state in user store; admin dashboard of pending consents.

---

## 7. Questions for Deep Interview

Ambiguities the matrices reveal — must crystallize before building.

### 7.1 Persona & RBAC ambiguity

1. **SPD persona is undefined in TTT** but referenced in flow-02 #201 (Hidden Profile visibility) and BU feedback. What are SPD's exact data scopes vs HRBP and HRIS?
2. **HRIS role** (BRD #178 Field Config) — separate from Admin? Or a sub-role of Admin?
3. **Manager vs HRBP routing** in BRD #111 termination workflow — who approves first? Configurable per company?
4. **Proxy** (BRD #187) — Admin-only per legend, but BU feedback suggests SPD also needs proxy. Confirm.

### 7.2 Workflow scope expansion

5. **BRD #111 multi-step termination** — does this apply to all 5 termination types (Resign, Retire, Dismissal, No Show, Transfer Out) or just Dismissal? TTT only workflows Dismissal.
6. **BRD #166 ESS Update Personal Info** — which exact fields trigger workflow vs direct edit? TTT lists 7 (Name×4, Marital, Military, Address) — does BRD expand?
7. **BRD #117 auto-pass probation** — what's the trigger condition? Time-based only, or manager confirmation required?
8. **BRD #115 auto-terminate contract** — fully automatic on contract end date, or with grace period + reminder?

### 7.3 Special Information (flow-07) — 24 unmapped fields

9. **The 24 cust_* fields not in TTT** (potentialDetails, rotationPlan, salaryHistory, scholarship, strength, studentLoan, talentReference, workExperience, advancedInformation, histPerformanceGroup, performance, performance_PW, personalityAssessment, documents, education, fsaelection, funcExperience, insideWorkExperience, languages, leadExperience, memberships, mobility, outsideWorkExperience, preferredNextMove): are these still in scope? Some look like Performance/Learning leakage (Performance Group, Personality Assessment, Development Goals).
10. **Performance/Learning boundary** — BRD #32 "Performance" (Partial, PM module), #56 cust_HistPerformance, #71 custPerformance (E-Letter): which stay in HRMS as cached data vs which are read-only mirrors of external systems?

### 7.4 Document model

11. **EC Document #105–108** — 50k PDFs/year merit letters. Stored where? In HRMS DB, S3, SharePoint, SPD's existing E-doc system?
12. **E-Document #197** — does BRD intend a *replacement* of SPD's e-doc system, or a *mirror* into HRMS?
13. **DigiSign integration** (Special Info documents) — required at upload time, or post-hoc verification?

### 7.5 Reporting (flow-03, 44 BRDs)

14. **Story Report (#162) vs Customize Report (#190)** — same engine, different UI? Or two separate capabilities?
15. **Foundation Structure reports (#153–161)** — 9 specific XLSX templates. Do BU reports need to match SAP layouts byte-for-byte for compliance?
16. **Schedule Report (#192) + Report Automation (#163)** — overlap; clarify.
17. **Role-based Data Control on Reports (#164)** — row-level filter or column-level masking? Both?

### 7.6 Foundation & Org Visualization

18. **flow-11 has 8 BRDs but no TTT coverage** — Position Management, Org Visualization, Job Profile Builder, Succession Org Chart. Are these greenfield, or is there a separate Foundation Object manual we haven't seen?
19. **BRD #188 Revised Foundation sync bug** — current SAP syncs only on 1st of month, missing employees hired mid-month. Confirm fix: trigger sync immediately on Position change?

### 7.7 Self-service & UI

20. **BRD #169 View Org Chart, #175 Team Org Chart** — same component or different? Field-visibility differences?
21. **BRD #182 Quick Actions, #183 Tile/Home** — admin-configurable per role + org. Is this static config or runtime CMS?
22. **BRD #195 Switch Language** — TH/EN/VN. Does VN require Vietnamese fields in master data, or just UI labels?
23. **BRD #205 Mobile UX/UI** — full feature parity, or a mobile-tailored subset?

### 7.8 Data migration & integration

24. **BRD #198 Data Migration** — HRIS prepares template, RIS uploads. What's the cutover model — big bang, parallel run, or phased per company?
25. **BRD #191 API/IC** — which downstream systems consume? Payroll, Time, Benefits, MS365, Viva?
26. **BRD #194 MS Teams/Viva** — read-only profile sync, or write-back from Teams to HRMS?

### 7.9 Conflicts to resolve

27. **TTT-07 Suspension has 0 BRDs mapped** — is suspension still a required feature, or deprecated? Existing suspended employees in legacy?
28. **Coverage discrepancy** — flow-matrix xlsx says 92 Full / 44 Partial / 34 Gap / 37 No-mapping; markdown says 108/58/41. Reconcile counting rules before claiming "X% covered" to stakeholders.
29. **Mass operations scope** — BRD #99 Mass Import/Delete and #100 Mass Change Emp Job are tagged Partial. Which entities support mass ops in v1 vs deferred?
30. **Acting Pay Group 99** — BRD silent on whether this convention persists. If new payroll is built differently, does Pay Group 99 still mean "non-PY"?

### 7.10 Benefits (BE) module — out of this matrix?

31. **The 207 BRDs are EC-only.** Where is the Benefits BRD inventory? Flow-04 #170 mentions "View Compensation & Payroll" but Benefits module flows aren't decomposed here. Need a parallel matrix for BE before scope-locking.
