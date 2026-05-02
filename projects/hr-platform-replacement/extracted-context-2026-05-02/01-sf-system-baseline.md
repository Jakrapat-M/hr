# SF System Baseline (Existing State)

**Source:** `/Users/tachongrak/stark/projects/hr-platform-replacement/sf-extract/`
**Tenant:** SAP SuccessFactors `performancemanager10.successfactors.com` · CENTRAL / CENTRALQAS
**Crawl method:** browser-harness (CDP), OData v2/v4 metadata pulls, RBAC probes across 4 personas
**Coverage:** 12/16 modules schema-extracted + 443 EC entities / 7,213 fields enumerated from QAS metadata.xml
**Compiled:** 2026-05-02 for hr-platform-replacement deep-interview input

---

## 1. Module Inventory

All 16 SF modules visible to a non-admin ESS user (Ken / employee-id 20196782). In-scope = Employee Center (EC) + Benefits (BE). Performance & Learning are EXTERNAL systems — captured for context only.

| # | Module ID | Label (EN/TH) | Route | Persona owner | Scope | Source |
|---|---|---|---|---|---|---|
| 1 | HOME | Home / Dashboard | `/sf/home` | All | **EC adjacent** (replaces) | `home/schema.json` |
| 2 | EMPLOYEE_FILE | Employee Files / People Profile | `/sf/liveprofile` | Employee, Manager, HRBP, HR Admin | **EC core** | `ec-core/EC_CORE_SCHEMA.md` |
| 3 | ADMIN | Admin Centre | `/sf/admin` | HRIS Admin only | EC admin | `ec-core/admin-*.json` (RBAC-blocked for Ken) |
| 4 | COMPANY_INFO | Org Chart / ผังองค์กร | `/sf/orgchart` | All | EC adjacent | `company-info/`, `pages/view-org-chart.json` |
| 5 | GOAL | Goals / เป้าหมายและผลงาน | `/sf/goals` | Employee, Manager | OUT (Performance external) | `goals/`, `pages/manage-my-goals.json` |
| 6 | LEARNING | Learning / การเรียนรู้ | `/sf/learning` | Employee, Manager | **OUT (external system)** | `learning/`, `pages/view-my-learning.json` |
| 7 | PERFORMANCE | Performance Mgmt Forms / ประเมินผลงาน | `/sf/pmreviews` | Manager, HRBP | **OUT (external system)** | `performance/` |
| 8 | DEVELOPMENT | DNA Career Worksheet / การพัฒนา | `/sf/careerworksheet` | Employee | OUT | `development/` |
| 9 | SUCCESSION | Talent Search / สายการสืบทอด | `/sf/talentsearch` | HRBP | OUT | `succession/` |
| 10 | UXR_CONTINUOUS_FEEDBACK | Continuous Feedback | `/sf/uxrFeedback` | Employee, Manager | OUT | `uxr-feedback/` |
| 11 | UXR_CPM | Continuous Performance / Coaching | `/xi/ui/talentuxr` | Employee, Manager | OUT | `uxr-cpm/` |
| 12 | CAREERS | Internal Jobs / ตำแหน่งว่างภายใน | `/sf/careers/jobsearch` | Employee | OUT (Recruiting) | `careers/` |
| 13 | RECRUITING | Job Requisition Dashboard / สรรหา | `/xi/ui/rcmjobreqsummary` | HR Admin | OUT (Recruiting) | `recruiting/` |
| 14 | REPORT | Report Centre / รายงาน | `/xi/ui/reportcenter` | HR Admin, HRBP | OUT (analytics) | `report/`, `pages/view-report-centre.json` |
| 15 | CUSTOM_EXTERNAL | Time & Attendance | `/sf/customExternalModule` → `cnext-time.centralgroup.com` | Employee, Manager | **OUT (external domain)** | `EC_CORE_FINDINGS.md` F1 |
| 16 | (id 30) | Mobile Link (TAM) | `http://cnext-time.centralgroup.com` | Employee | OUT (external) | `sf-modules.json` |

**EC lifecycle modules** (placeholder dirs `terminate/`, `transfer/`, `rehire/`, `probation/`, `contract-renewal/`, `hire/`, `my-time/`, `my-benefits/`, `my-profile/`, `my-team/` are empty — these are *intended* sub-flows surfaced through `EmpEmployment` events / `WfRequest` workflows, not separate SF pages). The 53 `FOEventReason` codes drive these (see §5).

**Confirmed in-scope for replacement:** HOME (dashboard), EMPLOYEE_FILE (people profile + 6 tabs), COMPANY_INFO (org chart), and Benefits (which lives as a tab inside EMPLOYEE_FILE, not a top-level module — see §2).

---

## 2. Per-Module Page Map (EC + BE focus)

### 2.1 HOME (`/sf/home`)
**Source:** `home/schema.json` (24 XHRs, 45 actions, no form fields — pure tile launcher).

**Layout:** Grid of "Quick Action" tiles (`QuickActionTile_*` CSS modules). Each tile is either an `<a href>` or `<button>` (modal). Tiles observed:

| Tile | Type | Target | Notes |
|---|---|---|---|
| View My Profile | link | `/sf/liveprofile` | EC entry |
| View Org Chart | link | `/sf/orgchart` | |
| View My Pay Statement | modal | overlay | Compensation overlay (XHR-driven) |
| Manage My Goals | link | `/sf/goals` | OUT |
| View My Learning | link | `/sf/learning?Treat-As=WEB` | OUT (external) |
| View Report Centre | link | `/sf/reportcenter` | OUT |
| View Favourite Reports | modal | overlay | OUT |
| Request Feedback / Give Feedback | modal | overlay | OUT |
| Manage My Data | modal | overlay | EC self-service edit triggers |
| Manage Team Positions | link | `/sf/manage-positions` | Manager only |
| View Pending Workflows | link | `/sf/pendingworkflows#/workflow/request-for-approval` | EC workflow inbox |
| View Reminders | modal | overlay | |
| View Favourites | modal | overlay | |
| Create Activity | modal | overlay | UXR-CPM |

Other home surfaces: To-do panel (`getTodoPanelInitializer` + `TodoEntryV2`), notification bell (`GetNumberOfNewNotifications`), `cust_Goalscontextual` widget (Central custom), WalkMe overlays.

### 2.2 EMPLOYEE_FILE / People Profile (`/sf/liveprofile`)
**Source:** `ec-core/EC_CORE_SCHEMA.md`, `ec-core/section-labels-tab1.json`, `ec-core/employment-tab-v3.json`, `ec-core/benefits-tab-labels.json`, `pages/view-my-profile.json`.

Header card: Name, title, role, employee ID, work location, "Effective As Of <date>" date-travel selector, Microsoft Teams Chat button, "Take Action" / Actions menu, "Show More". 6 top-level tabs:

| Tab | Sections | Fields captured | Purpose |
|---|---|---|---|
| **Personal Information** | Personal Info, Advanced Info (collapsed), Global Information (TH flag), Dependents, Contact Info, Address Info, Work Permit, Emergency Contact & Dependents | 14 (Personal) + sub-portlet sections | Person-level identity (PerPerson, PerPersonal, PerEmail, PerPhone, PerAddressDEFLT, PerNationalId, PerEmergencyContacts, PerDependent, PerWorkPermit) |
| **Employment Information** | Org. Chart widget, Employment Details (12 fields), Organization Information (10 fields), Job Information, Job Relationship | 22 confirmed | Employment-level effective-dated state (EmpEmployment, EmpJob) |
| **Compensation** | Compensation Information | 5 labels confirmed (Salutation, Firstname, Middle, Lastname, Nickname — header re-render, real comp behind `EmpCompensation` 18-field entity per §4) | Salary/band/pay components |
| **Benefits** | Per-employee benefits enrolment | 12 labels confirmed (header re-render: salutation+name+IDs+org tier) — actual enrolment data lives in `Benefit` (80f), `BenefitEnrollment` (41f), `BenefitInsurancePlan` (39f), `BenefitEmployeeClaim` (47f) | Benefits enrolment + claims; **driven by 33 BE business rules** |
| **Profile (Talent)** | Background entities | (talent-module) | Background_* (Education, Languages, Certificates, WorkExperience, Skills, etc.) — RBAC-gated |
| **Scorecard** | Performance scorecard | (talent-module) | OUT — performance data |

**Key actions on profile:** Edit pencil per section → opens **modal overlay** with mandatory "When should these changes take effect?" date gate (see §5 Pattern 1). "Take Action" dropdown (header) triggers `WfRequest` workflow start (Hire, Transfer, Terminate, Rehire, Pay Change, etc.) — `pendingworkflows` page tracks the inbox, with API surface `/rest/workforce/workflow/v1/wfRequests`.

### 2.3 Personal Information tab — confirmed 14 fields
Source: `ec-core/section-labels-tab1.json`.

`Salutation (EN)`, `Firstname (EN)`, `Middle Name (EN)`, `Lastname (EN)`, `Nickname (EN/TH)`, `Salutation (Local/TH)`, `Other Title (TH)`, `Firstname (Local)`, `Gender`, `Nationality`, `Marital Status`, `Marital Status Since` (effective-date), plus Emergency Contact mini-section: `Name`, `Relationship`, `Phone`.

### 2.4 Employment Information tab — 22 effective-dated fields
Source: `ec-core/employment-tab-v3.json`.

**Employment Details (12):** `Hire Date`, `Original Start Date`, `Seniority Start Date`, `Year of service` (computed), `Pass Probation Date/Confirm Date`, `Current Job Effective Date`, `Current Years in Job` (computed), `Current Corporate Title Effective Date`, `Current Years in Corporate Title` (computed), `Current Position Effective Date`, `Current Years in Position` (computed), `Current Store Branch Effective Date`.

**Organization Information (10):** `Company`, `Group`, `Business Unit`, `Function`, `Organization`, `Position`, `Store/Branch Code` ⚠ Central custom, `HR District` ⚠ Central custom, `Cost Centre`, `Work Location`. Same 10 fields appear as the universal filter bar across Performance, Reports, EC.

### 2.5 Benefits tab (`benefits-tab-labels.json`)
View-mode header surfaces: `Salutation (EN)`, `Firstname (EN)`, `Middle Name (EN)`, `Lastname (EN)`, `Nickname (EN/TH)`, `Salutation (TH)`, `Employee ID`, `Country`, `Company Name`, `Group`, `Business Unit`, `Function`. The actual enrolment + claim entities (Benefit, BenefitEnrollment, BenefitInsurancePlan, BenefitEmployeeClaim, BenefitProgram, BenefitClaim, BenefitMaternityLeave, BenefitTax, BenefitTaxRule, BenefitEnrollmentProcessScreenTemplate) are crawl-confirmed in metadata but were NOT individually navigated — they're rendered via SF "Benefit Enrollment" modal flow which Ken did not invoke (read-only crawl). 33 SF business rules in `benefits-management` domain port-target — examples include `TH-EXCRC-BE-OC-DentalDVT_CheckCrossEntitlementAmount` (cross-entitlement check between Dental + Medical Reimbursement for ex-CRC employees).

### 2.6 Org Chart (`/sf/orgchart`)
Source: `pages/view-org-chart.json`, `company-info/`. Tree visualisation rooted at CEO (`Suthisarn Chirathivat — Chief Executive Officer - CRC`). Employee card = initials circle + name + title + direct-report count badge. Headcount sub-totals (e.g. 18 / 66,444 / 14 / 57,641) shown at each org tier. Drill-down navigation by clicking a node.

### 2.7 Pending Workflows (`/sf/pendingworkflows`)
Source: `pages/view-pending-workflows.json`. Inbox-style page. Backed by `/rest/workforce/workflow/v1/wfRequests` (with `$filter`, `$select`, `$orderby`, `$top`, `$skip`, `$count`, `includeAllAssignments`) plus `TodoEntryV2`. Workflows include `EC : EMP Resignation for Manager`, plus all 53 FOEventReason-driven flows (Hire, New Hire, HIRE - DATA MIGRATION, HIRE Corrected Entry, HIRE Incorrect Entry, Position Change, Change in Pay, Change in SSO Location, Change in Time, Change in Manager, Extend Probation, Extend Retirement, Completion of Probation, Change to Retirement, System Change, …).

### 2.8 Manage My Data overlay (Home tile)
Modal-based EC self-service edits — same effective-dating gate as profile edit. Underlying entities: PerPersonal, PerAddressDEFLT, PerEmail, PerPhone, PerEmergencyContacts (which are `🟢 universal` RBAC, see §3).

---

## 3. Persona Surface Area

Derived from `qas-fields-2026-04-25/sf-rbac-probe-{ken,apinya,worawee,rungrote}-V2-2026-04-26.json` and `RBAC-MATRIX-V2-2026-04-26.md` (4 personas × 75 entities = 300 OData probes).

| Persona (sample user) | Modules they enter | EC entity access | BE access | Distinctive ability |
|---|---|---|---|---|
| **Employee** (Ken-as-Self) | Home, Profile (own), Org Chart, Goals, Learning, Pay Statement modal, Pending Workflows (own), Career Worksheet, Internal Jobs, Continuous Feedback, UXR-CPM | Read self only via ESS portlets; edit gated by effective-date modal + workflow approval | Self enrolment + self claim (BenefitEmployeeClaim) | "Take Action" → fire WfRequest for own data changes |
| **Manager** (Rungrote, Senior VP) | Home, Profile (self + direct reports via Manager view), Org Chart, **Manage Team Positions**, Goals (Team View), Learning (Team View), Pending Workflows (team), Continuous Feedback, UXR-CPM ("My Activities with <employee>") | EmpEmployment (29f) / EmpJob (69f) for direct reports; `🔒 manager-blocked` on 10 sensitive entities (PerPerson, PerNationalId, EmpCompensation, BenefitEmployeeClaim, all Background_*, PerGlobalInfoVNM) | NONE (BenefitEmployeeClaim = 0 fields); reads Benefit catalog only | Approve workflows in `WfRequest` queue; "Send a Reminder" action; team aggregate dashboards |
| **HRBP** (Worawee) | All HR modules + Talent Search (Succession) | `⭐ HRBP=HRAdmin` parity on 4 high-stakes entities (EmpEmployment 45f, EmpJob 135f, PerPersonal 35f, Background_PreferredNextMove 12f) | Benefit (70f), BenefitEnrollment (24f), BenefitInsurancePlan (32f), but BenefitEmployeeClaim only 38f (vs HR Admin 47f) | Initiate non-routine workflows; Talent Search filter (30 inputs); access succession data |
| **SPD** (Apinya) | EC entities partial; Benefits SPD-tier | `🟡 SPD-restricted` on 17 entities — sees subset of HR Admin's fields (e.g., EmpJob 83/135, Position 47/62, cust_HRDistrict 9/15) | Benefit 69f, BenefitEnrollment 24f, BenefitInsurancePlan 32f, BenefitEmployeeClaim 38f | Specialised personnel-data processing; cannot see Background_* talent data |
| **HR Admin** (Ken-as-HRAdmin role) | All EC + BE + Reports | Full Per/Emp parity, sees `Background_Certificates` (15f), `Background_InsideWorkExperience` (25f), all BE entities (Benefit 80f, BenefitEmployeeClaim 47f) | Full | Edit foundation objects (FO*); pseudo-admin (true HRIS Admin = blocked for Ken — see §5 Pattern 7) |
| **HRIS Admin** (not extracted) | Admin Centre `/sf/admin`, Data Model, Object Definitions, Picklist Centre, Workflow Config, RBAC | Full schema config | Full BE config (BenefitProgram, BenefitTaxRule) | Owns picklists, business rules, role definitions |

**Universal-read entities** (all 4 personas same fields): 17 Foundation Objects + reference data — `FOBusinessUnit`, `FOCompany`, `FODepartment`, `FOEventReason` (53 codes), `FOFrequency`, `FOJobCode`, `FOJobFunction`, `FOLocation`, `FOLocationGroup`, `FOPayGrade`, `FOPayGroup`, `PerAddressDEFLT`, `PerEmail`, `PerEmergencyContacts`, `PerPhone`, `User`, `WfRequest`.

**All-blocked entities** (RBP-gated for everyone): 18 entities including BenefitClaim, BenefitMaternityLeave, BenefitTax, BenefitTaxRule, all unmapped Background_* (FormalEducation, KnowledgeAreas, OnlineCourse, PerformanceReview, Skills, TalentPool, TempInformation, WorkExperience), FOJobFamily, FOLegalEntity, FOPaymentMethod, FOTaxCode.

---

## 4. Field-Level Captures (qas-fields-* contents)

Two snapshot dirs:

### `qas-fields-2026-04-25/` — schema/picklist/rules/workflow/RBAC catalog
- `metadata.xml` (10.4 MB) — full SF EC OData metadata (gitignored, regenerable). **443 EC entities / 7,213 fields.**
- `sf-qas-ec-fields-FULL-2026-04-25.json` (3.9 MB) — flattened entity × field catalog.
- `sf-qas-picklists-2026-04-25.json` (1.8 MB) + `sf-qas-picklist-options-FULL-2026-04-25.json` (11 MB) + `sf-qas-picklist-options-LINKED-2026-04-26.json` (10.5 MB, with parent pickListId for diffability) + `sf-qas-picklist-labels-FULL-2026-04-25.json` (12 MB, 5 locales: TH 39%, EN 49%, VN 8%, debug 5%) — **251 picklist defs / 47,265 options / ~147,000 labels**.
- `picklist-synonym-map-2026-04-25.json` — 30/33 HR-repo picklists mapped to SF (91%): `BloodType→BLOODGROUP`, `BusinessUnit→cust_businessUnit`, `CompanyAll→cust_companyCode` (164 HR / 85 SF — divergent!), `EventReasonAll→event` (53/29), `Religion→RELIGION_THA`, `MaritalStatus→ecMaritalStatus`, etc. Three HR-only picklists with no SF equivalent: `DynamicRole`, `PayComponent`, `PayComponentGroup`.
- `sf-qas-workflow-2026-04-25.json` (367 KB) — 53 `FOEventReason` codes (event ids 5585, 5589, 5591, 5601, 5609, …) + 500 `WfRequest` records.
- `sf-business-rules-FULL-2026-04-25.json` (1.4 MB) — **551 business rules** with full DSL bodies. Top base objects: `jobInfo` (263 rules), `Position` (35), `BenefitEmployeeClaim` (41), `homeAddress` (3), `employmentInfo` (7). 537/551 rules pre-assigned to HR services (employee-center=344, payroll=16, benefits=33, organization=42, smart-claims=43, recruitment-onboarding=58, time=1).
- `ec-entity-classification-2026-04-25.json` (40 KB) — 443 entities tagged by SF prefix and HR service domain.
- `hr-repo-catalog-2026-04-25.json` (167 KB) — current HR repo Prisma model snapshot.
- `EC-PARITY-DIFF-MATRIX-2026-04-25.md` — coverage report (HR repo: 82 entities / 1,069 fields = 18.5% raw / 70-90% semantic via consolidation).
- `RBAC-MATRIX-V2-2026-04-26.md` — 75 entities × 4 personas truth-tested.
- `sf-rbac-probe-{ken,apinya,worawee,rungrote}-{V1,V2}.json` — raw OData responses per persona.
- `sf-t8-liveprofile-rungrote-via-ken-2026-04-25.json` — proxy-as-subordinate UI capture.

### `qas-fields-2026-04-26/` — per-entity full-field dumps for the EC core
21 JSON files, one per entity (`-aligned-` variant = re-aligned against HR repo schema):
- **Person-level (`Per*`):** `PerPerson` (16f), `PerPersonal` (37f, 35 visible to HR Admin), `PerAddressDEFLT` (43f), `PerEmail` (12f), `PerPhone` (14f), `PerNationalId` (17f), `PerEmergencyContacts` (45f).
- **Employment-level (`Emp*`):** `EmpEmployment` (47f), `EmpJob` (136f — the largest single entity), `EmpCompensation` (18f).
- **Foundation Objects (`FO*`):** `FOBusinessUnit` (34f), `FODepartment` (46f), `FOJobCode` (34f), `FOLocation` (41f), `FOPayGrade` (16f).
- **Position & User:** `Position` (62f), `User` (180f).

These are the ground-truth field lists the replacement backend Prisma needs to mirror (subject to picklist synonym mapping above).

**Top 30 SF entities missing from HR repo (by field count)** — see EC-PARITY-DIFF-MATRIX §"Top 30": leads with `UserPermissions` (219f), `User` (180f), `EmpJob` (136f), `Benefit` (80f), `TimeAccountType` (71f), `BenefitEnrollmentProcessScreenTemplate` (53f), then a long tail of Benefits/Time/FO entities.

---

## 5. Notable Quirks / SF-Specific Patterns

### Pattern 1 — UI-enforced effective dating (the dominant idiom)
Every Edit pencil opens a modal overlay where the **only initially visible field** is "When should these changes take effect?" (required date picker, defaults blank). Save is disabled until a valid date is chosen; only then does the rest of the form render. Profile header carries an "Effective As Of <date>" selector that time-travels the entire page state. **Architectural implication:** every `Emp*` entity and most `Per*` entities are stored as time-bounded rows (`effective_start_date` / `effective_end_date`), not as mutable records. Computed display fields (`Year of service`, `Current Years in Job`, `Current Years in Corporate Title`, `Current Years in Position`) are derived at read time from the corresponding `Effective Date` columns. Replacement UI **must** decide whether to replicate this gate or hide it.

### Pattern 2 — `Per*` vs `Emp*` entity split
SAP convention: `Per*` = person-level, time-invariant identity (PerPerson, PerEmail, PerPhone, PerAddressDEFLT, PerDependent, PerEmergencyContacts, PerNationalId, PerWorkPermit, PerPersonal). `Emp*` = employment-level, time-variant, effective-dated (EmpEmployment, EmpJob, EmpCompensation, EmpEmploymentHigherDuty, EmpGlobalAssignment). Mirror this split in any replacement schema or a layer of consolidation gets messy.

### Pattern 3 — Bilingual everything (TH + EN)
Every name + salutation field is dual: `Salutation (EN)` + `Salutation (Local/TH)`, `Firstname (EN)` + `Firstname (Local)`, `Lastname (EN)` + `Lastname (Local)`, plus `Other Title (TH)` for ranks (พ.อ., ดร., อ., …). Picklist labels also store 5 locales (TH 39% / EN 49% / VN 8% / debug 5%). Replacement UI cannot collapse to a single string per name field.

### Pattern 4 — 5-tier org hierarchy + 2 retail-specific fields
Universal filter bar across EC, Performance, Reports: `Company → Group → Business Unit → Function → Organization` plus `Position`, `Store/Branch Code` ⚠ Central custom, `HR District` ⚠ Central custom, `Cost Centre`, `Work Location`. Foundation Objects have own SF entities (`FOBusinessUnit`, `FOCompany`, `FODepartment`, `FOLocation`). Custom MDF objects: `cust_HRDistrict` (15f), `cust_StoreFormat` (10f), `cust_WorkLocation` (14f), `cust_WorkLocationAddressThailand` (22f), `cust_brand` (12f), `cust_EmployeeClass` (11f).

### Pattern 5 — 3 distinct start dates + Pass Probation/Confirm
`Hire Date` (physical start) ≠ `Original Start Date` (earliest-ever employment, for rehires) ≠ `Seniority Start Date` (adjusted for prior service credit). `Pass Probation Date/Confirm Date` is a separate field from any inferred probation_end. Benefits, pension and leave accrual all read different dates — collapsing to one is a data-loss bug.

### Pattern 6 — Corporate Title ≠ Job Title
Two parallel title axes: `Corporate Title` (drives salary band + reporting level — `zCorporateTitle` picklist with 17 options) vs `Job Title` (day-to-day role). Each has its own effective-date stream (`Current Corporate Title Effective Date` vs `Current Job Effective Date`). HR repo currently has only `job_title`.

### Pattern 7 — Strict RBAC tiers, including HRBP=HRAdmin parity
4 effective tiers: Employee / Manager / SPD / HRBP / HR Admin / HRIS Admin. **HRBP has full parity with HR Admin on 4 high-stakes entities** (EmpEmployment, EmpJob, PerPersonal, Background_PreferredNextMove) — SPD does NOT. Manager is hard-blocked from 10 sensitive entities (BenefitEmployeeClaim, EmpCompensation, PerNationalId, PerPerson, …) including all background/talent data. 18 entities are RBP-gated for all four probed personas (only HRIS Admin can grant). HRIS Admin (Data Model / Object Definitions / Picklist Centre / Workflow Config) was permission-blocked for Ken throughout the crawl.

### Pattern 8 — 53 FOEventReason codes drive the full lifecycle
Hire, New Hire, HIRE - DATA MIGRATION, HIRE Corrected/Incorrect Entry, Position Change, Change in Pay, Change in SSO Location, Change in Time, Change in Manager, Extend Probation, Extend Retirement, Completion of Probation, Change to Retirement, EMP Resignation, System Change, … Each event reason maps to a `WfRequest` workflow with approval routing. The empty placeholder dirs (`hire/`, `terminate/`, `transfer/`, `rehire/`, `probation/`, `contract-renewal/`) correspond to event-reason-driven flows, not separate pages.

### Pattern 9 — Hybrid OData v2 + v4
SF mixes legacy v2 (`/odata/v2/PerPerson`, session-scoped via `_s.crb`) with newer v4 (`/odatav4/talent/goals/TGM.svc`, `/odatav4/CPM.svc`, `/odatav4/workforce/Workforce.svc`, `/odatav4/Widget.svc`, `/odatav4/NotificationService.svc`). Replacement does not need to ship v2/v4 split, but any during-migration sync layer does.

### Pattern 10 — Custom Central entity: `cust_Goalscontextual`
Hit by **every** page load — Central-specific customisation, not stock SF. Plus DNA Career Worksheet (Development), CRA Catalogue/Calendar (Learning), Store Code + HR District (EC + Performance) = ≥4 distinct customisation surfaces Central depends on.

### Pattern 11 — UI framework heterogeneity (across modules)
Legacy JSP iframes (`/sf/pmreviews`, `/sf/careers`), SAP UI5 classic (`/sf/liveprofile`, `/sf/learning`), React + CSS Modules + xweb components (`/sf/goals`), legacy with modern wrapper (`/sf/orgchart`). Coordinate-click via CDP `Input.dispatchMouseEvent` was required during crawl because UI5 tabs ignore `.click()` (React Synthetic Events fine). Single-framework Next.js replacement is a UX win.

### Pattern 12 — Modal overlay edit, not nested page
Every edit is a centred white card on semi-transparent backdrop, no URL change. Cancel restores view-mode immediately. No multi-step wizards in EC-core view.

### Pattern 13 — Time & Attendance is an external domain, not SF
Central uses `cnext-time.centralgroup.com` (also surfaced as "Mobile Link (TAM)"). T&A fields (clock-in, schedules, leave balances) live there, not in SF. SF only stores the EmpEmployment effective-state record. Replacement must decide build-native vs API-integrate vs SSO+iframe.

### Pattern 14 — 551 business rules in DSL
Rules are stored declaratively (e.g. `rule(core_java:SystemContext, ec_sdm:jobInfo) { if(true) jobInfo.fte = divide(...); }`). Examples include FTE calculation, cross-entitlement Benefit checks (Dental ↔ Medical for ex-CRC employees), address concatenation from coded substrings (`TH-XXX-AI-OS-SetAddressForRep`), confirm-date setting based on event + employee group, store-specific cost centre rewrites. Replacement either ports these as TypeScript validators or adopts a rules engine.

### Pattern 15 — Quick Action panel + To-do panel + Notifications
Three persistent UI elements on Home: tile grid (Quick Actions), to-do inbox (`TodoEntryV2`), notification bell (`NotificationService.svc`). All three are surfaced cross-module via the page metadata service (`/odata/v2/restricted/_PageMetaData_/getPageMetaData`).

### Pattern 16 — Multi-country flag on Person entities
"Global Information" portlet on profile carries a country flag (Thailand seen on Ken). PerNationalId is country-scoped. PerGlobalInfoTHA / PerGlobalInfoVNM are sibling entities (Vietnam = `manager-blocked`). Replacement should design `country_code` as first-class on Address/NationalId/WorkPermit/BankAccount.

---

## 6. Open Questions for Deep Interview

1. **Effective-dating gate.** Replicate the SF "When should these changes take effect?" forced-first-step modal, or move to inline edit with effective-date as a normal field? Power-user vs casual-employee tradeoff is real.
2. **Time travel selector.** Profile header has an "Effective As Of <date>" date picker that recasts the whole page. Keep the time-machine UX, or restrict to HR Admin/HRBP audit views?
3. **Quick Action panel pattern.** Replace the SF home tile grid with a persona-tuned dashboard, or keep the launcher metaphor (lower training cost for migrating users)?
4. **Benefits surface location.** SF buries Benefits as a tab inside the Employee File. Keep that nesting, or promote Benefits to a top-level navigation (which is what `my-benefits/` placeholder dir hints at)?
5. **Workflow inbox vs entity pages.** SF separates `WfRequest` / `TodoEntryV2` from the entity edit pages. Do we keep an explicit inbox, or merge approvals into context (e.g. show "approve" inline on the team-member profile)?
6. **`Per*` / `Emp*` split in our schema.** Adopt the SAP nomenclature or rename to plainer English (`PersonIdentity` / `EmploymentState`)? Rename costs migration mapping clarity later.
7. **Corporate Title field.** Add as separate field (matches Central usage + 17-option `zCorporateTitle` picklist), or treat as a job-band attribute on Position? Affects salary-band reports.
8. **Three start dates.** Surface Hire / Original Start / Seniority as three separate fields (SF), or compute Seniority server-side and only persist Hire + Original?
9. **5-tier org hierarchy + retail customs.** Replicate Company→Group→BU→Function→Org as five physical levels, or use a generic recursive `OrgUnit.parent_id` with a `level` enum? Plus: where do `Store/Branch Code`, `HR District`, `cust_StoreFormat`, `cust_brand` live — on OrgUnit, on EmploymentState, or on both?
10. **53 FOEventReason codes.** Port all 53 with their workflow routing, prune to a Central-relevant subset, or adopt a generic "Employee Lifecycle Event" enum and map externally?
11. **551 business rules.** Port one-for-one as TypeScript guards, route through a rules engine (json-rules-engine, Drools-style), or treat each as a deep-interview question on its own (especially the 41 BenefitEmployeeClaim cross-entitlement rules)?
12. **HRBP=HRAdmin parity.** SF gives HRBP full HR-Admin powers on EmpEmployment / EmpJob / PerPersonal / Background_PreferredNextMove. Maintain that, or split for safety (force HR Admin ticket for high-stakes edits)?
13. **Manager hard-blocks.** Manager sees 0 fields on PerPerson / PerNationalId / EmpCompensation / BenefitEmployeeClaim / Background_*. Replicate exactly, or partially loosen (e.g. show Compensation totals to manager for budget visibility)?
14. **SPD persona.** Currently 17 entities are SPD-restricted (subset of HR Admin). Confirm this tier survives — or merge SPD into HR Admin / HRBP for the replacement?
15. **External T&A.** Build native time-attendance, integrate `cnext-time.centralgroup.com` API, or SSO+iframe-embed? Decision changes 36 SF time entities + 660 fields of scope.
16. **External Performance & Learning.** Confirmed out of scope, but Goals / Learning / UXR-CPM / UXR-Feedback / Continuous Feedback / Career Worksheet still hit `cust_Goalscontextual` on every page. Where's the integration boundary — do we deep-link out, embed, or just suppress these UI elements?
17. **Custom MDF objects.** `cust_Goalscontextual`, `cust_HRDistrict`, `cust_StoreFormat`, `cust_WorkLocation`, `cust_WorkLocationAddressThailand`, `cust_brand`, `cust_companyCode`, `cust_dateSpecification`, `cust_EmployeeClass`, `cust_businessUnit` — are these business-required (port as first-class entities) or workarounds for missing core fields (fold into normal models)?
18. **Picklist coverage gap.** 30/33 HR picklists mapped, but `CompanyAll` is 164 HR / 85 SF (HR is wider — phantom values?), `Currency` is 8 / 158 (HR is sparse), `Division` is 437 / 7 (HR is wildly wider). Which side is canonical?
19. **Bilingual handling.** Store both name fields (TH + EN) with no fallback (SF), or auto-romanise/transliterate when one is missing? Salutation (Local) + Other Title (TH) drive official-document generation.
20. **Country scope.** SF tenant supports multi-country (PerGlobalInfoTHA, PerGlobalInfoVNM). Is the replacement TH-only at v1, or do we design for VN/KH from day one?
21. **HRIS Admin tier.** Admin Centre / Data Model / Picklist Centre / Object Definitions / Workflow Config / RBAC Editor — is the replacement going to expose a self-serve admin UI for these, or are picklists/rules code-managed?
22. **Profile / Scorecard tabs.** Tabs 5 + 6 of the People Profile (Talent + Scorecard) hit Background_* and performance-form data — both flagged out of scope. Do we hide entirely, or keep a read-only stub with deep-link to the external system?
23. **Effective-As-Of vs audit log.** SF's effective-dating supports "what did this employee look like on 1 Jan 2025" queries. The replacement's `created_at`/`updated_at` won't. Is point-in-time reporting in scope, and at what granularity?
24. **Pending Workflows inbox.** SF has unified `WfRequest` queue across all event reasons. Do we want the same single inbox, or per-domain queues (Benefits approvals separate from Job Change approvals)?
