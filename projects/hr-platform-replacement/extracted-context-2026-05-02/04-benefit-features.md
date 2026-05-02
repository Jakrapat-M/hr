# Benefit (BE) Feature Catalog — Extracted from TTT Decks

Source: `/Users/tachongrak/Downloads/02-BE/` (29 PowerPoint decks, all parsed successfully — no failures).
Legacy system: SAP SuccessFactors Employee Central — Employee Central Benefits (EC-BE), with payroll posting to SAP EC-PY (HCM Infotypes 0015 / 0267).

---

## 1. Feature Inventory

| # | Feature (Card ID) | Source PPTX | Category | Personas Involved (primary action) |
|---|---|---|---|---|
| BE-01 | BE Plans & Related Employee Data (foundation) | `BE_01` | Foundation / data model | HRBP, Admin |
| BE-02 | Benefit Enrollment at Beginning of Each Year | `BE_02` | Annual lifecycle | Admin (Benefit Admin) |
| BE-03 | Manage Benefit On-boarding (new hire) | `BE_03` | Lifecycle | Admin, HRBP |
| BE-04 | Manage Benefit Change (promotion/transfer/exception) | `BE_04` | Lifecycle | Admin |
| BE-05 | Manage Benefit Off-boarding (termination) | `BE_05` | Lifecycle | Admin |
| BE-06 | Medical Reimbursement (Self) | `BE_06` | Reimbursement (claimable) | Employee, Manager (approver), Admin |
| BE-07 | Medical Reimbursement — Dependent (Spouse / Child) | `BE_07` | Reimbursement (claimable, dependent) | Employee, Manager, Admin |
| BE-08 | Dental Reimbursement (Part of Medical) | `BE_08` | Reimbursement (claimable) | Employee, Manager, Admin |
| BE-09 | Funeral Assistance (Self/Records) | `BE_09` | Funeral / Records-only | Admin |
| BE-10 | Funeral Assistance (Spouse) | `BE_10` | Funeral / Records-only | Admin |
| BE-11 | Host of Funeral Ceremony (Self) | `BE_11` | Funeral / Records-only | Admin |
| BE-12 | Host of Funeral Ceremony — Dependent (Spouse / Parents / Child) | `BE_12` | Funeral / Records-only | Admin |
| BE-13 | Wreath (Self) | `BE_13` | Funeral / Records-only | Admin |
| BE-14 | Wreath — Dependent (Spouse / Parents / Child) | `BE_14` | Funeral / Records-only | Admin |
| BE-15 | Life / Accident — Self-Funded | `BE_15` | Life event / Records-only | Admin |
| BE-16 | Physical Check Up | `BE_16` | Reimbursement (claimable) | Employee, Manager, Admin |
| BE-17 | Gift — Patient's Visit | `BE_17` | Gift / Records-only | Admin |
| BE-18 | Gift — Ordination | `BE_18` | Gift (claimable, requires enrol) | Employee, Manager, Admin |
| BE-19 | Gift — Wedding | `BE_19` | Gift (claimable, requires enrol) | Employee, Manager, Admin |
| BE-20 | Gift — Child Birth (Records) | `BE_20` | Gift / Records-only | Admin |
| BE-21 | Gift — Child Birth Claim | `BE_21` | Gift (claimable) | Employee, Manager, Admin |
| BE-22 | Gasoline Reimbursement | `BE_22` | Reimbursement (claimable, annual enrol) | Employee, Manager, Admin |
| BE-23 | Toll Reimbursement | `BE_23` | Reimbursement (claimable, annual enrol) | Employee, Manager, Admin |
| BE-24 | Car Parking Reimbursement | `BE_24` | Reimbursement (claimable, annual enrol) | Employee, Manager, Admin |
| BE-25 | Manage Beneficiary Data (Life Insurance, Provident Fund) | `BE_25` | Document storage | Admin |
| BE-26 | Benefit Reporting | `BE_26` | Reporting | HRBP, Admin |
| BE-27 | Benefit Payment (SF → SAP transfer) | `BE_27` | Payroll integration | PY Admin, Admin |
| — | Basic Navigation (cross-cutting) | `Main_Basic Navigation` | UX scaffolding | All |
| — | Benefits Administration overview | `Main_EC_BE` | Module intro | All |

Personas (legacy → CG replacement mapping inferred):
- **Employee** = self-service requestor
- **Manager** = first-line approver (`Approve Requests` tile)
- **HRBP** = mostly read/report (decks barely distinguish HRBP vs Admin)
- **SPD (Shared/Special)** = the decks do **not** explicitly name SPD; closest match is "Benefit Admin" handling [Records] plans and bulk imports
- **Admin** = "Benefit Administrator" — owns onboarding/offboarding, exceptions, imports, payment runs
- "Benefit Admin's Manager" appears only as approver of admin-keyed records (`Main_EC_BE` slide 13)

Parse status: **29/29 decks parsed cleanly** (272 KB JSON), no errors.

---

## 2. Cross-Cutting Concepts

### 2.1 Plan Naming Convention (BE_01 slide 8)

Reimbursement plan name prefix encodes who can transact and how:

| Prefix | Meaning | Who can submit | Workflow |
|---|---|---|---|
| `[Records] …` | Record-keeping only | Benefit Admin only | Admin keys → Admin's Manager approves |
| `[Info] …` | Display-only (Mobile Package) | Nobody — view in profile | None |
| (no prefix) | Live claim plan | Employee or Admin | Employee → Manager approves |

### 2.2 Benefit Type Categories (Main_EC_BE slide 8–10)

- **Reimbursement** — employee incurs expense, submits claim, receives money back. Subdivided into: claimable (with workflow & payment) and `[Records]` (logging only).
- **Insurance** — auto-enrol, display-only in EC-BE: `Life/Accident-Insurance`, `Accidental Insurance (DVT)`, `Health Insurance`. No claim flow in this system; insurer handles claims out-of-band.

### 2.3 Plan Inventory (BE_01 slides 9–12, 33)

40 plan IDs split across categories. Highlights:

| Plan ID | Plan Name | Enrolment | Eligibility |
|---|---|---|---|
| TH_MED_001 | Medical Reimbursement | Auto | All (exclude CFR SKT) |
| TH_MED_002 | Medical Reimbursement (Spouse) | Manual | PG 21+ Foreigner=Yes |
| TH_MED_003 | Medical Reimbursement (Child) | Manual | PG 21+ Foreigner=Yes |
| TH_MED_004 | Medical Reimbursement — Part Time | Auto | CFR Daily/Monthly/Hourly |
| TH_MED_005 | Medical Reimbursement — DVT (Ex-CRC) | Auto | DVT project |
| TH_DEN_001 | Dental (Part of Medical) | Auto | All (exclude SKT) |
| TH_CHK_001 | Physical Check Up | Auto | PG 17+ |
| TH_WED_001 | Gift-Wedding | Manual | All |
| TH_ORD_001 | Gift-Ordination | Manual | CFR only, all PG |
| TH_GAS_001 | Gasoline Reimbursement | Manual annual | PG 11+ |
| TH_TOL_001 | Toll Reimbursement | Manual annual | CFR PG 17–19 by job code |
| TH_PAR_001 | Car Parking Reimbursement | Manual annual | CFR PG 17–19 by job code |
| TH_CHI_001 | [Records] Gift-Child Birth (500 THB) | Auto | All (exclude SKT) |
| TH_CHI_002 | Gift-Child Birth Claim (500 THB) | Auto | All (exclude SKT) |
| TH_PAT_001 | [Records] Gift-Patient's Visit (500 THB) | Auto | All (exclude SKT) |
| TH_LIF_009 | [Records] Life/Accident Self-Funded | Auto | PG 7–16 (exclude SKT) |
| TH_FUN_001 | [Records] Funeral Assistant | Auto | All (exclude SKT) |
| TH_FUN_002 | [Records] Funeral Assistant (Spouse) | Auto | All (exclude SKT) |
| TH_HOS_001..004 | [Records] Host of Funeral (Self/Spouse/Parents&Child/Part-time) | Auto | All variants |
| TH_WRE_001..006 | [Records] Wreath (6 variants) | Auto | All variants |
| TH_MOB_001..004 | [Info] Mobile Package (1k/1.5k/2k/Actual) | Manual | PG 17–27 by tier |
| TH_HEA_001/002 | Health Insurance PG17-20 / PG21+ | Auto | PG-based, Foreigner≠Yes |
| TH_LIF_001 | Life/Accident — Insurance PG17+ | Auto | PG 17+ |
| TH_ACC_001 | Accidental Insurance — DVT | Auto | DVT project |

Eligibility code: `*1 CFR SKT = พนักงานสาขา format ซูเปอร์คุ้มตำบล JG 8-9 เริ่มงานตั้งแต่ 1 ก.ค. 60` is excluded from most reimbursement and `[Records]` plans.

### 2.4 Eligibility Inputs (BE_01 slide 16)

Eligibility composed from 16 employee-data attributes:

1. Company (e.g., CDS)
2. Policy Profile (e.g., CDG, CFR)
3. Store Brand / Format (e.g., CFR Tops Super Koom Tumbon)
4. Work Schedule code (e.g., D05H0400 = 5 days × 4hr)
5. Employee Group (Permanent, Part Time)
6. Employee Subgroup (11, 12, P2 Monthly, …)
7. Job Code
8. DVT Project Name
9. Special Benefit Group flag (Yes/No)
10. Is Concurrent Employment? (Null)
11. Hire Date — also drives years-of-service rules (Wedding-Gift)
12. Pass Probation / Confirm Date
13. Gender (Male/Female)
14. Foreigner (Yes/No) — drives Spouse/Child medical plan eligibility
15. Dependent Relationship (Father, Mother, Spouse, Child)
16. Dependent Date of Birth (child age)

Part-time first-year eligibility waits 6–8 months depending on Work Schedule (BE_01 slide 12, e.g., `D05H0400` → 8 months; all other D05/D06/D55 schedules → 6 months).

### 2.5 Page Model & Common Screens (Main_Basic Nav + recurrent across BE_06–BE_24)

Every claim deck navigates the same path:

```
Home → My Employee File → search EE → Benefits section → "Go to Benefits"
   → Reimbursements sub-section → "Start a Claim" under <plan>
```

Manager approval path (every claimable plan):

```
Home → Approve Requests tile → Benefit Employee Claim → Approve | Send Back | Update
```

Common screens / components:

- **Benefits Overview tile** (`My Active Enrolments`, `Enrolments`, `Reimbursements`, `Insurances` sections)
- **Entitlement bar** — shows entitlement amount, accumulated claims, remaining amount, days to claim window close
- **Claim form** — uniform header (Selected Benefit, Claim Date = system date, Remaining Amount, Currency = THB)
- **Confirmation popup** — `Show workflow participants` reveals approvers chain before submit
- **In-process Claims / Recently Approved Claims** sections per plan
- **Effective-dating** picker on Benefits Overview (any past/future date, refresh shows snapshot)
- **History** button on Job Information & Benefit Enrolment records
- **Admin Centre** → `Manage Data`, `Import & Export Data`, `Monitor Job` for bulk ops
- **Approve Requests tile** with `Send Back` (returns to requester for edit/withdraw/resubmit) — sent-back claims do **not** restore the entitlement until the requester explicitly withdraws

### 2.6 Bulk Import Pattern (used by BE_02, BE_05, BE_06)

Four-step ritual repeated verbatim:

1. **Export the Template** — Admin Centre → Import & Export Data → Export Data → Generic Object (`Benefit Enrolment` or `Benefit Employee Claim`) → Monitor Job → Download CSV.
2. **Prepare Data** — fill CSV; Thai content must be saved as UTF-8 via Notepad.
3. **Validate** — re-upload with `Purge Type = Incremental Load`, `File Encoding = Unicode (UTF-8)`, `Use Locale Format = No` (MM/DD/YYYY) or `Yes`+`en_GB` (DD/MM/YYYY); click `Validate`; Monitor Job → check status.
4. **Import** — same screen, click `Import`; Monitor Job → confirm.

### 2.7 Workflow Engine

- All employee-submitted claims route through SuccessFactors Workflow → Manager approver (visible via `Show workflow participants`).
- Admin-keyed `[Records]` plans route to "Benefit Admin's Manager" (Main_EC_BE slides 13–14).
- Send-back behaviour: requester gets a To-Do; can `Update` (resubmit with edits), `Withdraw` (frees entitlement), or `Resubmit` unchanged.

### 2.8 Benefit Exception (BE_04 slides 19–23, BE_06 slides 35–37)

Mechanism for one-off entitlement adjustments:
- Admin Centre → Manage Data → Create New = `Benefits Exception`
- Fields: Worker ID, Exception For = `Claim`, Benefit (plan), Relevant For Benefit Period (year), Adjustment Amount (+/-)
- Pattern: borrow forward = +exception this year **and** −exception next year (two records).

---

## 3. Per-Feature Workflow Cards

### BE-01: BE Plans and Related Employee Data
- **Purpose:** foundation — list plans, define eligibility input data on the employee record.
- **Trigger / when used:** reference; opened to verify why an employee sees/doesn't see a plan.
- **Personas & roles:** HRBP / Admin (read), all (read own).
- **Workflow steps:**
  1. My Employee File → search EE → Benefits section
  2. View `My Active Enrolments`, `Enrolments`, `Reimbursements`, `Insurances`, `Show more`
  3. Click `Go to Benefits` for full Benefits Sections screen
  4. Toggle effective date (calendar) to inspect past/future state
- **Approval/routing:** none (read-only).
- **Required fields / inputs:** none — eligibility derived from Org Info + Job Info + Employment Details + Personal Info + Dependents.
- **Documents/attachments needed:** none.
- **Limits / eligibility rules:** see Section 2.3 / 2.4.
- **Calculations / amounts:** entitlement amount per plan; accumulated claim shown as bar.
- **Notifications:** none.
- **Edge cases:** CFR SKT excluded from most plans; foreigner flag drives spouse/child medical.
- **Source slides:** BE_01 slides 5, 8–16, 33.

### BE-02: Benefit Enrollment at Beginning of Each Year
- **Purpose:** Re-enrol annually-renewing plans for all eligible employees.
- **Trigger / when used:** Start of each calendar year.
- **Personas & roles:** Admin (primary).
- **Workflow steps:**
  1. Single-employee path: My Employee File → Benefits → `Enrol Now` → input Enrolment Amount (≤ Entitlement) → Save
  2. Bulk path: Admin Centre → Import & Export → Export `Benefit Enrolment` → edit CSV → Validate → Import → Monitor Job
- **Approval/routing:** none (Admin keys directly).
- **Required fields / inputs:** Plan ID, Schedule Period ID, Effective Date (MM/DD/YYYY), Employee ID, Entitlement Amount, Enrolled Amount.
- **Documents/attachments needed:** none.
- **Limits / eligibility rules:** Enrolment Amount ≤ Plan Entitlement. Annual plans: Gasoline, Mobile Package (1k/1.5k/2k/Actual), Car Parking, Toll, Medical (Spouse), Medical (Child).
- **Calculations / amounts:** entitlement set by plan config + employee PG.
- **Notifications:** (not specified)
- **Edge cases:** CSV must be UTF-8 for Thai; locale toggles for date format.
- **Source slides:** BE_02 slides 5, 8–9, 11–19.

### BE-03: Manage Benefit On-boarding
- **Purpose:** Wire up benefits for a new hire, including special privileges.
- **Trigger / when used:** New hire processed in EC.
- **Personas & roles:** Admin (primary), HRBP (verify).
- **Workflow steps:**
  1. Verify default plans on Benefits screen
  2. (If privileged) My Employee File → Employment Information → Job Information → Edit → Event=`Data Change` → Special Benefit Group=Yes → Save
  3. Benefits → `Benefit Special Privilege Information` → Edit → pick Schedule Period, Schedules, Plan; input Entitlement Amount, Maximum Per Claim → Add → Save
  4. Refresh → enrol relevant plans (`Enrol Now`)
- **Approval/routing:** none.
- **Required fields / inputs:** Special Benefit Group flag; Benefit Schedule Period; Benefit Schedules; Plan; Entitlement Amount; Max Per Claim.
- **Documents/attachments needed:** none.
- **Limits / eligibility rules:** Privileged record overrides default eligibility; status must be Active.
- **Calculations / amounts:** Entitlement defined per privilege record.
- **Notifications:** (not specified)
- **Edge cases:** Privilege rows can be added/deleted with effective dating.
- **Source slides:** BE_03 slides 5, 8–12, 14–15.

### BE-04: Manage Benefit Change
- **Purpose:** React to promotion / transfer / mid-year exception.
- **Trigger / when used:** Job change with Event=`Data Change`, exception approval.
- **Personas & roles:** Admin.
- **Workflow steps:**
  1. Check before/after snapshot via Benefits Overview effective-date picker
  2. Inspect Job Information history
  3. Set existing enrolment Inactive: Admin Centre → Manage Data → `Benefit Enrolment` → select EE+plan → Insert New Record → effective date = change date → `effectiveStatus = Inactive` → Save
  4. (If exception) Manage Data → Create New = `Benefits Exception` → Worker ID, Exception For=`Claim`, Benefit, Period, Adjustment Amount → Save (twice if borrow-forward).
- **Approval/routing:** none in system.
- **Required fields / inputs:** Effective date, effectiveStatus, Adjustment Amount, Period.
- **Documents/attachments needed:** approval email (off-system).
- **Limits / eligibility rules:** Annual plans auto-create year-end Inactive; admin can move that date instead of inserting new.
- **Calculations / amounts:** Adjustment Amount adds/subtracts from entitlement.
- **Notifications:** (not specified)
- **Edge cases:** Borrow-forward requires paired +/− records across two periods.
- **Source slides:** BE_04 slides 5, 8–17, 19–23.

### BE-05: Manage Benefit Off-boarding
- **Purpose:** Deactivate enrolments before/on termination so rehire doesn't auto-restore.
- **Trigger / when used:** Termination effective date.
- **Personas & roles:** Admin.
- **Workflow steps:**
  1. Verify Job Information history & Benefits snapshot at term date
  2. Single: Admin Centre → Manage Data → `Benefit Enrolment` → EE+plan → Insert New Record → effective=term date → `Inactive` → Save
  3. Bulk: Export Benefit Enrolment for selected EE/plan list → CSV: set `effectiveStatus = I` (Inactive) + effective date → Validate → Import → verify history.
- **Approval/routing:** none.
- **Required fields / inputs:** Effective Date (term date), `effectiveStatus = I`.
- **Documents/attachments needed:** none.
- **Limits / eligibility rules:** Required for plans Gasoline, Mobile Package (×4), Car Parking, Toll, Medical (Spouse), Medical (Child) to prevent rehire auto-reassignment.
- **Calculations / amounts:** none.
- **Notifications:** (not specified)
- **Edge cases:** Annual plan year-end Inactive may already exist — adjust its effective date instead.
- **Source slides:** BE_05 slides 5, 8–16, 18–27.

### BE-06: Medical Reimbursement (Self)
- **Purpose:** Employee claims own outpatient/inpatient medical expense.
- **Trigger / when used:** Employee submits receipt; admin can also bulk-import.
- **Personas & roles:** Employee (submit), Manager (approve), Admin (import/exception).
- **Workflow steps:**
  1. EE: My Employee File → Benefits → Go to Benefits → Reimbursements → `Start a Claim` under Medical Reimbursement
  2. Choose `OPD/IPD = ผู้ป่วยนอก / ผู้ป่วยใน`
  3. Fill: Receipt No, Receipt Date, Type of Hospital (not `คลินิก` for medical), Hospital Name, Disease (from list), `ค่ารักษาพยาบาลจากใบส่งตัว` Yes/No, Receipt Amount, Total Claim Amount (editable, defaults to Receipt). IPD adds Admitted Start/End Date.
  4. Remarks; attach up to 5 files; Save → confirmation popup → Show workflow participants → Confirm
  5. Manager: Approve Requests tile → review → Approve / Send Back / Update
  6. Admin path: bulk import same shape via `Benefit Employee Claim` Generic Object
  7. Exception: see BE-04 mechanism — adjust entitlement before keying
- **Approval/routing:** Employee → Manager (workflow participants). Send Back returns to requester.
- **Required fields / inputs:** as above; OPD/IPD flag; ใบส่งตัว flag; Disease code.
- **Documents/attachments needed:** receipt(s), max 5 attachments.
- **Limits / eligibility rules:** Total Claim ≤ Remaining Entitlement; clinic excluded.
- **Calculations / amounts:** Remaining Entitlement decreases by Total Claim Amount on submit.
- **Notifications:** workflow tasks to Manager and Send-Back to-do for requester.
- **Edge cases:** "ค่ารักษาพยาบาลจากใบส่งตัว = Yes" means company guarantee letter used → not paid to employee at payroll (BE_27 footnote).
- **Source slides:** BE_06 slides 5, 8–21, 23–33, 35–41.

### BE-07: Medical Reimbursement — Dependent (Spouse / Child)
- **Purpose:** Same medical claim for dependents.
- **Trigger / when used:** EE submits for spouse or child.
- **Personas & roles:** Employee, Manager, Admin.
- **Workflow steps:** identical to BE-06 but on plan `Medical Reimbursement (Spouse)` or `(Child)`. Step adds `Dependent Name` dropdown → system fills DOB and Relationship Type.
- **Approval/routing:** Employee → Manager.
- **Required fields / inputs:** + Dependent Name.
- **Documents/attachments needed:** receipt(s), 5 max.
- **Limits / eligibility rules:** Max 10 children per employee; **30 claims per year per dependent**; eligibility = PG 21+ Foreigner=Yes; manual enrolment required first.
- **Calculations / amounts:** Total Claim ≤ Remaining; per-dependent counter.
- **Notifications:** as BE-06.
- **Edge cases:** Spouse claim uses same flow; clinic excluded; OPD vs IPD branching.
- **Source slides:** BE_07 slides 5, 8–9, 11–20.

### BE-08: Dental Reimbursement (Part of Medical)
- **Purpose:** Dental claim shares Medical's entitlement pool.
- **Trigger / when used:** EE has dental receipt.
- **Personas & roles:** Employee, Manager, Admin.
- **Workflow steps:** standard claim — Receipt No/Date, Type of Hospital, Hospital Name, Dental Details (from list), ใบส่งตัว Yes/No, Receipt Amount, Total Claim Amount, Remarks, attachments → Save → workflow.
- **Approval/routing:** Employee → Manager.
- **Required fields / inputs:** as above (no OPD/IPD, no Admitted dates).
- **Documents/attachments needed:** receipt(s), 5 max.
- **Limits / eligibility rules:** Entitlement pool = Medical's pool; system checks final remaining at approval, not submission.
- **Calculations / amounts:** drains Medical pool.
- **Notifications:** standard.
- **Edge cases:** approval may fail if Medical pool already drained between submit and approve.
- **Source slides:** BE_08 slides 5, 7–14.

### BE-09: Funeral Assistance (Self / Records)
- **Purpose:** Record funeral assistance paid to employee for own death/funeral.
- **Trigger / when used:** Death-in-service event handled by Admin.
- **Personas & roles:** Admin only.
- **Workflow steps:** My Employee File → Benefits → Reimbursements → `Start a Claim` under `[Records] Funeral Assistant` → input Receipt No/Date, Receipt Amount, Remarks, attach files → Save.
- **Approval/routing:** Routes to Benefit Admin's Manager (per Main_EC_BE).
- **Required fields / inputs:** Receipt No/Date, Receipt Amount.
- **Documents/attachments needed:** up to 5.
- **Limits / eligibility rules:** All employees except CFR SKT.
- **Calculations / amounts:** Total Claim Amount reduces remaining (record-keeping).
- **Notifications:** (not specified)
- **Edge cases:** "Records" plans never pay through the BE_27 payroll path.
- **Source slides:** BE_09 slides 5, 7–10.

### BE-10: Funeral Assistance (Spouse)
- **Purpose:** Record funeral assistance for an employee's spouse.
- **Trigger / when used:** Spouse death notified to Admin.
- **Personas & roles:** Admin only.
- **Workflow steps:** as BE-09 plus `Dependent Name` (spouse) — system fills DOB and Relationship Type. Add receipt + amount + attachments → Save.
- **Approval/routing:** Admin's Manager.
- **Required fields / inputs:** + Dependent Name.
- **Documents/attachments needed:** up to 5.
- **Limits / eligibility rules:** Only spouse relationship.
- **Source slides:** BE_10 slides 5, 7–11.

### BE-11: Host of Funeral Ceremony (Self)
- **Purpose:** Record company hosting cost for employee's own funeral.
- **Trigger / when used:** Admin processes ceremony hosting.
- **Personas & roles:** Admin.
- **Workflow steps:** plan = `[Records] Host of Funeral Ceremony`; fields: Receipt No/Date, Receipt Amount, Remarks, attachments → Save.
- **Approval/routing:** Admin's Manager.
- **Limits / eligibility rules:** All except CFR SKT.
- **Source slides:** BE_11 slides 5, 7–9.

### BE-12: Host of Funeral Ceremony — Dependent
- **Purpose:** Record hosting cost for employee's spouse / parents / child funeral.
- **Trigger / when used:** Admin processes hosting for dependent.
- **Personas & roles:** Admin.
- **Workflow steps:** plan = `[Records] Host of Funeral Ceremony (Parents & Child)` or `(Spouse)`. Add `Dependent Name` (Father, Mother, Child) → fill receipt, amount, attachments → Save.
- **Approval/routing:** Admin's Manager.
- **Required fields / inputs:** Dependent Name.
- **Edge cases:** Same flow applies for Spouse plan variant.
- **Source slides:** BE_12 slides 5, 7–10.

### BE-13: Wreath (Self)
- **Purpose:** Record wreath sent on behalf of employee.
- **Trigger / when used:** Admin records wreath dispatch.
- **Personas & roles:** Admin.
- **Workflow steps:** plan `[Records] Wreath`; fields = Receipt No/Date, Receipt Amount, Remarks, attachments → Save.
- **Approval/routing:** Admin's Manager.
- **Source slides:** BE_13 slides 5, 7–9.

### BE-14: Wreath — Dependent
- **Purpose:** Record wreath for dependent's funeral.
- **Workflow steps:** plan `[Records] Wreath (Parents & Child)`; same as BE-13 plus Dependent Name (Father / Mother / Child).
- **Limits / eligibility rules:** 800 THB/person variant exists for Parents & Child.
- **Source slides:** BE_14 slides 5, 7–10.

### BE-15: Life / Accident — Self-Funded
- **Purpose:** Record self-funded life/accident payout to employee/family.
- **Trigger / when used:** Admin processes after death/accident.
- **Personas & roles:** Admin.
- **Workflow steps:** plan `[Records] Life/Accident-Self-funded (Depend on Condition)` → Receipt No/Date, **Cause of Death** (from list — affects calculation), **On Duty** Yes/No → Remarks → attachments → Save.
- **Approval/routing:** Admin's Manager.
- **Required fields / inputs:** Cause of Death, On Duty.
- **Calculations / amounts:** Total Claim Amount auto-calculated using employee's salary effective on the claim date (system).
- **Limits / eligibility rules:** PG 7–16 (exclude SKT); CFR Daily/Monthly/Hourly part-time variant TH_LIF_010.
- **Source slides:** BE_15 slides 5, 7–9.

### BE-16: Physical Check Up
- **Purpose:** Annual health check-up reimbursement.
- **Trigger / when used:** EE submits invoice from chosen hospital.
- **Personas & roles:** Employee, Manager, Admin.
- **Workflow steps:** Benefits → Start a Claim under Physical Check Up → fields: Receipt No/Date, Hospital Name, **Invoice from Hospital** Yes/No (= guarantee letter), Receipt Amount → Remarks → attachments → Save → workflow.
- **Approval/routing:** Employee → Manager. Approve / Send Back / Update.
- **Limits / eligibility rules:** PG 17+. Once per year (entitlement pool).
- **Calculations / amounts:** Total Claim drops Remaining.
- **Edge cases:** Only `Invoice from Hospital = No` is paid via payroll (BE_27).
- **Source slides:** BE_16 slides 5, 7–13.

### BE-17: Gift — Patient's Visit
- **Purpose:** Record 500 THB token gift for sick employee/colleague visit.
- **Trigger / when used:** Admin keys after gift dispatch.
- **Personas & roles:** Admin.
- **Workflow steps:** plan `[Records] Gift-Patient's Visit – 500 THB/time`; fields Receipt No/Date, Receipt Amount, Remarks, attachments → Save.
- **Approval/routing:** Admin's Manager.
- **Limits / eligibility rules:** All except SKT; flat 500 THB/time.
- **Source slides:** BE_17 slides 5, 7–9.

### BE-18: Gift — Ordination
- **Purpose:** Reimburse ordination expense for eligible male employee.
- **Trigger / when used:** EE plans ordination, gets enrolled, then claims.
- **Personas & roles:** Employee, Manager, Admin (enrol).
- **Workflow steps:**
  1. (Admin or EE) Benefits → Enrol Now under Gift-Ordination → Save (manual enrolment)
  2. EE: Reimbursements → Start a Claim → Receipt No/Date, Receipt Amount, Remarks, attachments → Save
  3. Confirmation popup → Confirm → workflow
  4. Manager: Approve / Send Back / Update
- **Approval/routing:** Employee → Manager.
- **Required fields / inputs:** Receipt No/Date/Amount.
- **Limits / eligibility rules:** CFR company only, all PG; manual enrol required.
- **Source slides:** BE_18 slides 5, 8–9, 11–17.

### BE-19: Gift — Wedding
- **Purpose:** Reimburse wedding gift for eligible employee.
- **Trigger / when used:** EE marries, gets enrolled, claims.
- **Personas & roles:** Employee, Manager, Admin.
- **Workflow steps:** identical to BE-18 with plan = `Gift-Wedding`.
- **Approval/routing:** Employee → Manager.
- **Limits / eligibility rules:** Years-of-service rule from Hire Date drives eligibility (BE_01 footnote on Hire Date use); manual enrol.
- **Source slides:** BE_19 slides 5, 8–9, 11–17.

### BE-20: Gift — Child Birth (Records)
- **Purpose:** Record-keeping copy of child-birth gift (500 THB).
- **Trigger / when used:** Admin records issuance.
- **Personas & roles:** Admin.
- **Workflow steps:** plan `[Records] Gift-Child Birth – 500 THB/time` → Receipt No/Date/Amount, Remarks, attachments → Save.
- **Approval/routing:** Admin's Manager.
- **Source slides:** BE_20 slides 5, 7–9.

### BE-21: Gift — Child Birth Claim
- **Purpose:** Employee-claimed child-birth gift (500 THB) — payable via payroll (BE_27).
- **Trigger / when used:** EE submits after childbirth.
- **Personas & roles:** Employee, Manager, Admin.
- **Workflow steps:** Benefits → Start a Claim under `Gift-Child Birth Claim – 500 THB/time` → Receipt No/Date/Amount, Remarks, attachments → Save → confirm → workflow → Manager Approve.
- **Approval/routing:** Employee → Manager.
- **Limits / eligibility rules:** All except SKT; 500 THB/time.
- **Source slides:** BE_21 slides 5, 7–13.

### BE-22: Gasoline Reimbursement
- **Purpose:** Monthly fuel reimbursement up to enrolled cap.
- **Trigger / when used:** Annual enrol; monthly claims.
- **Personas & roles:** Employee, Manager, Admin.
- **Workflow steps:**
  1. Annual enrol: Benefits → Enrol Now → input `Enrolment Amount` ≤ entitlement → Save
  2. EE: Reimbursements → Start a Claim under Gasoline Reimbursement → Receipt No/Date/Amount, Remarks, attachments → Save → workflow
  3. Manager: Approve / Send Back / Update
- **Approval/routing:** Employee → Manager.
- **Limits / eligibility rules:** PG 11+; annual enrolment required (re-enrol BE-02; deactivate BE-05).
- **Calculations / amounts:** Remaining drops by Total Claim.
- **Source slides:** BE_22 slides 5, 8–9, 11–17.

### BE-23: Toll Reimbursement
- **Purpose:** Monthly toll reimbursement.
- **Workflow steps:** Same shape as BE-22 with plan `Toll Reimbursement`. (No `Enrolment Amount` shown explicitly on enrol step in deck — Save is the only action.)
- **Limits / eligibility rules:** CFR company; PG 17–19 by Job Code; annual enrol.
- **Source slides:** BE_23 slides 5, 8–9, 11–17.

### BE-24: Car Parking Reimbursement
- **Purpose:** Monthly parking reimbursement.
- **Workflow steps:** Same as BE-22/BE-23 with plan `Car Parking Reimbursement`.
- **Limits / eligibility rules:** CFR company; PG 17–19 by Job Code; annual enrol.
- **Source slides:** BE_24 slides 5, 8–9, 11–17.

### BE-25: Manage Beneficiary Data
- **Purpose:** Store life-insurance and provident-fund beneficiary forms as attachments.
- **Trigger / when used:** New hire / annual review / change request.
- **Personas & roles:** Admin.
- **Workflow steps:**
  1. My Employee File → Profile → Related Document → Add
  2. Choose category: `Life Insurance Beneficiary (ผู้รับผลประโยชน์ประกันชีวิต)` or `Provident Fund Beneficiary (ผู้รับผลประโยชน์กองทุนสำรองเลี้ยงชีพ)`
  3. Add Attachment → Add → select file → Finished → Save
- **Approval/routing:** none (document storage).
- **Required fields / inputs:** Document category, file.
- **Documents/attachments needed:** signed beneficiary form.
- **Limits / eligibility rules:** (not specified)
- **Calculations / amounts:** none.
- **Notifications:** (not specified)
- **Edge cases:** Decks do not specify versioning, retention, or who can view (PII).
- **Source slides:** BE_25 slides 5, 8–10, 12–14.

### BE-26: Benefit Reporting
- **Purpose:** Run standard reports against EC-BE.
- **Trigger / when used:** Ad-hoc / scheduled.
- **Personas & roles:** HRBP, Admin.
- **Workflow steps:**
  1. Home → Reporting → search → select report
  2. Perform Actions → Run → Filter Summary popup (Date Range, Employee ID, …)
  3. Online run: paginate, View column/sort options, Export to Excel
  4. Offline run: tick `Run Offline`, choose file type, Done → View Schedules → My Jobs → Download when complete
- **Approval/routing:** none.
- **Reports available:**
  1. Benefits – Employee Claim
  2. Benefits – Cost Analysis (2 pages: Actual Costs, Predictive Costs)
  3. Benefits – Enrollment
  4. Benefit Enrollment Statistics (per Day; % within window)
  5. Benefits Insurance Enrollment
- **Required fields / inputs:** filters per report.
- **Source slides:** BE_26 slides 5, 7–11, 13–29.

### BE-27: Benefit Payment (SF → SAP)
- **Purpose:** Push approved BE claims to SAP EC Payroll for payout via Infotype 0015 / 0267.
- **Trigger / when used:** Cut-off dates by company segment:
  - Ex-CRC, CMG, CRG → 6th, 16th, 26th of each month
  - CPN → every Monday and Thursday
  - CHR → 13th of each month (reports only)
  - BE pay dates: 10, 20, 1
- **Personas & roles:** PY Admin (executes), Admin (config tables).
- **Workflow steps:**
  1. **Transfer claims** — TX `ZBER001` in SAP → personnel selectors (ID, Status, Area, Subarea, EE Group/Subgroup) + plan/claim date/modified date filters → Mode: `Copy Claim Data` or `Delete Claim Data`; `Test Run` toggle → Execute → output report
  2. **Verify transferred** — TX `ZBER003` → reporting period + selectors → Execute → review zBE Transaction Table
  3. **Create payment record** — TX `ZBER002` → reporting period & payment date → selectors → Additional Data: Infotype, Payment Date → `Test Run` → Execute → confirms IT0015/IT0267 entries
  4. **Verify Infotype** — TX `PA20` → display IT0267 → click Display Text to see Claim ID
  5. **Adjust payment date manually** — TX `ZBER003` → update or delete payment date in zBE Transaction Table when IT0015/0267 is changed manually
- **Approval/routing:** SAP-side admin only.
- **Eligible plans for payment:** Medical (all variants*), Dental (all variants*), Physical Check Up**, Gift-Wedding, Gift-Child Birth Claim, Gift-Ordination, Gasoline, Toll, Car Parking. (* paid only if `ใบส่งตัว = No`. ** paid only if `Invoice from Hospital = No`.)
- **Configuration tables:**
  - `ZBET001` Wage Type Mapping (per company × plan × Infotype × dates)
  - `ZBET002` Payment Period Name (Period ID / Name)
  - `ZBET003` Payment Period Detail (payment date, Infotype, claim cut-off)
  - `ZBET004` Payment Period Mapping (company × plan × period)
- **Notifications:** (not specified)
- **Edge cases:** Manual IT0015/0267 changes require sync back to zBE (delete payment date or update); RICEF 2 excludes ใบส่งตัว claims; deletion in SF must propagate via `Delete Claim Data` mode.
- **Source slides:** BE_27 slides 5, 7, 9–22, 24–28.

---

## 4. Feature Cluster Patterns

The 27 features collapse into **6 reusable workflow shapes**. Replacement UI can ship a small set of templates instead of 27 bespoke screens.

### Cluster A — "Claimable Reimbursement, simple" (one-step claim)
Members: BE-22 Gasoline, BE-23 Toll, BE-24 Car Parking, BE-21 Gift-Child Birth Claim, BE-18 Gift-Ordination, BE-19 Gift-Wedding, BE-16 Physical Check Up.
- Template: Receipt No, Receipt Date, Receipt Amount, Remarks, attachments(0..5), workflow popup, manager approval. Some require prior `Enrol Now` (Gas/Toll/Park/Ordination/Wedding).
- Variants: Physical Check Up adds `Invoice from Hospital`; Toll/Park add Job-Code-based eligibility.

### Cluster B — "Claimable Reimbursement, hospital" (medical-flavoured)
Members: BE-06 Medical (Self), BE-07 Medical (Spouse/Child), BE-08 Dental.
- Template adds: Type of Hospital, Hospital Name, Disease/Dental Details, ใบส่งตัว Yes/No.
- BE-06/07 add OPD/IPD switch with conditional Admitted Start/End Date (IPD only).
- BE-07 adds Dependent Name; BE-08 shares pool with BE-06.

### Cluster C — "[Records] flat" (admin-keyed, single line)
Members: BE-09 Funeral, BE-11 Host Funeral Self, BE-13 Wreath Self, BE-17 Patient's Visit, BE-20 Gift Child-Birth (Records).
- Template: Receipt No/Date/Amount, Remarks, attachments. Routes to Admin's Manager. No employee involvement.

### Cluster D — "[Records] dependent"
Members: BE-10 Funeral Spouse, BE-12 Host Funeral Dependent, BE-14 Wreath Dependent.
- Template: Cluster C + Dependent Name → DOB & Relationship Type displayed. Dependent set varies (Father, Mother, Spouse, Child).

### Cluster E — "[Records] computed"
Member: BE-15 Life/Accident Self-Funded.
- Template: Cluster C + Cause of Death (list), On Duty Yes/No → Total Claim Amount **system-calculated** from employee salary on claim date.

### Cluster F — "Lifecycle / admin-only data"
Members: BE-01 (foundation), BE-02 Annual Enrolment, BE-03 On-boarding, BE-04 Change, BE-05 Off-boarding, BE-25 Beneficiary, BE-26 Reporting, BE-27 Payment.
- Each is its own back-office screen. BE-02 and BE-05 share the same import wizard. BE-03/BE-04/BE-05 share the same effective-dating + history pattern. BE-25 is a document-attach pattern (could share with HR document store). BE-27 is a separate SAP back-office that the FE may only need to surface as status.

### UI implications
- **One canonical "Claim" form component** with conditional sections drives Clusters A, B, C, D — toggled by plan metadata (`requiresHospital`, `requiresOPDIPD`, `requiresDependent`, `submittableBy: employee|admin`, `hasWorkflow`).
- **One canonical "Records" form** is just the Claim form with workflow off and submitter=admin.
- **Annual lifecycle wizard** for BE-02 and BE-05 share an Excel/CSV bulk-import widget.
- **Effective-date snapshot panel** is reused by BE-03 / BE-04 / BE-05.
- **Approval Inbox** is one screen for all claim types.
- **Reporting hub** wraps all 5 BE_26 reports.
- **Payment dashboard** mostly visualises BE_27 SAP runs (own bounded context).

---

## 5. Questions for Deep Interview

### A. Persona ambiguities
1. **HRBP vs Admin distinction.** Decks only label "Benefit Administrator". CG persona model splits HRBP (people partner) and Admin. Which BE-03/04/05/27 actions belong to HRBP, which to dedicated Benefit Admin?
2. **SPD persona is absent in TTT.** Where does SPD fit — onboarding/offboarding only, or claim handling for branch employees too?
3. **Manager approval scope.** Is the approver always the line manager, or does it route to dotted-line / HRBP for some plans (e.g., Gift-Wedding, Ordination)? Decks show only one approver step.
4. **"Benefit Admin's Manager" approving Records-only plans.** Is this still desired in the replacement, or should `[Records]` plans be admin-keyed without approval?

### B. Stops mid-way / placeholder content
5. **No notification specs anywhere.** No deck describes email/in-app/SMS notifications, channels, or templates. What should the replacement send and to whom for: claim submitted, sent back, approved, paid, denied, escalation, near-deadline?
6. **Insurance plans (BE_01 slide 12).** Listed as "Display only" — is there any claim/lookup workflow we need to build for Health/Life/Accidental Insurance, or is it purely informational?
7. **Mobile Package `[Info]` plans.** Tier-based by PG/Job Code; decks say display-only. How is the actual reimbursement processed today (payroll, expense)? Should the replacement absorb that flow or keep it external?
8. **BE-25 Beneficiary.** No retention/version control / approval rules. Should beneficiary forms be e-signed in the replacement? Who can view (PII)?
9. **BE-04 Benefit Exception** has no approval gate in the deck — Admin can self-create. Replacement: should this require workflow / dual control?

### C. Cross-deck conflicts and gaps
10. **Send-Back vs Withdraw entitlement behaviour.** BE-06 slide 21 explicitly says: "If the requester doesn't withdraw the sent back request, the benefit plan's remaining entitlement will not be adjusted." This blocks new claims silently. Confirm: should the replacement automatically restore entitlement on Send-Back, or preserve legacy behaviour?
11. **Dental shares Medical pool — final check at approval, not submission (BE-08 slide 5).** Replacement: do we surface "tentative remaining" vs "actual remaining"? How to handle race conditions on approval?
12. **Medical (Spouse/Child) 30 claims/year per dependent (BE-07 slide 5).** Where is this counter enforced? Not visible elsewhere. Is the limit at submission, approval, or both?
13. **Years-of-service for Gift-Wedding** (BE_01 mentions Hire Date drives it) — exact rule not in deck. What's the YoS minimum?
14. **Gift-Ordination** is CFR-only — but slide 5 says "all PG". Is religion-/gender-restricted (ordination is a male Buddhist rite traditionally)? Decks don't say.
15. **CFR SKT exclusion (พนักงานสาขา format ซูเปอร์คุ้มตำบล JG 8-9, hire ≥ 1 ก.ค. 60).** Hard-coded across decks. Is this still policy in 2026, or has the SKT format changed? Replacement should externalise this rule.
16. **Part-time eligibility waiting periods (BE_01 slide 12).** D05H0400 = 8 months, all others = 6 months. Confirm still current; is 8 months a typo (single outlier)?
17. **Foreigner=Yes flag drives Spouse/Child medical eligibility (BE_01 slide 9).** Why does this gate dependents specifically? Confirm rule.
18. **Special Benefit Group privilege (BE-03).** Anyone with Special Benefit Group=Yes overrides plan eligibility. What's the governance / audit story for setting this flag in the replacement?
19. **Annual plans inactive auto-record (BE-04 slide 15).** "System will create a record to set Inactive status at year end automatically." Is this currently config-driven? Replacement: do we also auto-deactivate annually, or is enrollment continuous?

### D. Bulk import / integration
20. **CSV bulk import (BE-02, BE-05, BE-06).** Do users still need raw CSV in the replacement, or can we ship a data-table editor with paste-from-Excel?
21. **BE-27 SAP integration.** Replacement isn't SAP. What's the target payroll integration (which system, which API)? Cut-off dates 6/16/26, Mon/Thu (CPN), 13th (CHR) — still applicable?
22. **`ใบส่งตัว = Yes` excluded from payment.** Confirm: when guarantee letter used, hospital invoices the company directly. Replacement should still flag and exclude these from payroll postings — agree?
23. **`Invoice from Hospital` (Physical Check-up) is the same concept under a different field name as ใบส่งตัว.** Should we unify field naming?

### E. UI / UX expectations
24. **Effective-dating UI.** Today's system requires a date picker + page refresh. Acceptable in the replacement, or should the replacement support "as-of" view inline?
25. **Attachment cap of 5 files.** Is this still required? What about file size, MIME types, virus scan?
26. **Mobile experience.** SuccessFactors mobile is listed but barely covered. Which BE features must work on mobile (Claim submit? Approvals?)?
27. **Disease list / Dental list / Cause of Death list.** Centralised picklists in EC. Where do these live in the replacement — config table, master data service?

### F. Reporting & analytics
28. **BE-26 Predictive Costs report.** What model produces predictions? Replacement should keep parity or replace with new analytics?
29. **Custom reports.** Decks only show 5 standard. Are there business-critical custom reports in production we must port?

### G. TBD / placeholder content found
30. `Pre-requisite: -` on all course overviews — no real prerequisite captured.
31. `USERNAME : TBC` in test instance section (Main_EC_BE slide 16) — no live test user.
32. Several slides (e.g., BE_01 slides 17–21, BE_06 slides 12, 22, 34) have only the section header — actual screenshot content is image-only and not extractable as text. May need PPTX → image OCR for full screen layouts before pixel-perfect UI rebuild.
33. No SLA / TAT for approvals or payment. Decks describe steps but never timing expectations.
34. Workflow auto-escalation rules are absent. Any escalation if Manager doesn't approve in N days?

---

*Generated 2026-05-02 from 29 PowerPoint sources in `/Users/tachongrak/Downloads/02-BE/`. JSON extracts retained at `/tmp/be-pptx-extract/`.*
