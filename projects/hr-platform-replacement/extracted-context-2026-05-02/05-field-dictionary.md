# Field Dictionary — EC + BE

> Scope: Employee Center (EC) + Benefits (BE) modules for the Central Group HR platform replacement.
> Personas: Employee, Manager (supervisor), HRBP, SPD, HRIS Admin.
> Sources extracted 2026-05-02 from BA-supplied spreadsheets and CSVs.

---

## 1. Source Inventory

| # | Source file | Sheet / section | Rows (data) | Header columns | Purpose |
|---|---|---|---|---|---|
| S1 | `BE - List of Field.xlsx` | `Reimbursement` | 20 field rows (R3–R22) | Group, Section, UI Field, UI Mandatory, UI Validation, UI Condition, Type, LOV | Benefit reimbursement form fields |
| S1 | `BE - List of Field.xlsx` | `Transfer` | 0 | (empty) | Placeholder — Benefit transfer flow not yet specified |
| S2 | `HRM BRD - Benefit- v1.csv` | (single) | 6 sample claim rows + 51 header columns | Business Unit … COVID-19 Claim Detail | Production claim export sample (real data shape, includes Thai disease names, costs, workflow IDs) |
| S3 | `EC- list of fields(Employee file).csv` | (single, cp1252-encoded) | 296 field rows | Section, Sub-section, UI Field, UI Mandatory, UI Conditional Required, UI Default, UI Validation, HR validation, HR confirm, HR confirm detail, Remark, Allow-to-maintain (HRIS/HRBP/SPD/Supervisor/Employee), Employee group rules (Permanent/Expat/Retirement/Temp/DVT), DB Table, DB Field, Type, Length, LOV | **Primary EC field master** — most complete |
| S4 | `EC-list-of-fields-2026-04-23.xlsx` | `Employee file` | 48 field rows (truncated) | Same shape as S3 but missing many columns + rows | Earlier draft — superseded by S3 |
| S4 | `EC-list-of-fields-2026-04-23.xlsx` | `EC Picklist` | **78,386 picklist value rows** | Picklist ID, Status, Picklist Value Code, Non-Unique Code, Parent Picklist Value, Default Label, Label EN, Label TH, Label VN, Value Status | Picklist / LOV master (countries, districts, job codes, postal codes, etc.) |
| S4 | `EC-list-of-fields-2026-04-23.xlsx` | `Sheet2` | 2 entries | Country, National ID Type, Description, Display Format, Regex | National ID format definitions (TH + VN) |
| S4 | `EC-list-of-fields-2026-04-23.xlsx` | `Sheet4` | 1 note (Thai) | — | BA working note: "How many pages / Sessions, what fields exist, mapping at session level" |

**Picklist heavy-hitters (S4 EC Picklist):** `zVNSubDistrict` (31,902), `sysJobCodes` (11,115), `zVNDistrict` (9,460), `zSubDistrict` (7,442), `zPointOfSales` (2,175), `zPostalCode` (1,170), `zDistrict` (928), `zUniversity` (827), `zTerminateReason` (698), `permitDocType` (352), `zVNProvince` (320), `csfCountry` (249), `ISOCountryList` (246).

---

## 2. Reconciliation Across Sources

### EC: S3 (CSV, 2026-04-28) vs S4 (XLSX, 2026-04-23)

- **S3 (newer) wins.** It has 296 field rows vs S4's 48; S3 added persona-level access (HRIS/HRBP/SPD/Supervisor/Employee) and employee-group-conditional required flags (Permanent/Expat/Retirement/Temp/DVT).
- **Sections preserved across both:** Identity, Personal Information, Job Information, Compensation Information.
- **New in S3 (not in S4 Employee file sheet):** full `Job Information` block (135 rows incl. Position/Org/Time/Employment/Job Relationships/Work Permit), `Compensation Information` (24 rows incl. Payment Info, Pay Component Recurring, Recurring Payments), most of `Personal Information` (Addresses, Email, Phone, Social, Emergency Contact, Dependents).
- **Encoding hazard:** S3 is `cp1252` (read with `encoding='cp1252'`). Many Thai labels appear as `?` placeholders — Thai text is preserved correctly only in S2 BRD CSV.
- **DB metadata kept consistent:** Both files use the same DB tables: `Personal Info`, `Biographical Info`, `Employment`, `Emp Job Info`, `National ID`, `Email Info`, `Phone Info`, `Addresses`, `Dependens` (sic — typo in source), `Emergency Contact`, `Global Information`, `Work Permit`, `Job Relationships`, `Payment Info.`, `Pay Component Recurring`.
- **Conflict:** S4 marks `Marital Status` and `Blood Type` as `Required`; S3 marks them `Not Required`. Use S3.
- **Conflict:** S4 marks `Salutation (EN)` mandatory but `Required`; S3 confirms `Required` with `UI Conditional required = Not Required` (i.e. always required, no conditional rule). Use S3.

### BE: S1 (`BE - List of Field.xlsx`) vs S2 (`HRM BRD - Benefit- v1.csv`)

- These are **complementary**, not competing.
  - S1 = the **UI form spec** for the reimbursement claim flow (20 fields, conditional groups).
  - S2 = the **claim record / export shape** (51 columns including audit, workflow, employee snapshot fields).
- S1 has a `Transfer` sheet that is empty — **the benefit transfer/exchange UI is not yet specified**. Flag for interview.
- S2 contains real production-shaped sample rows: COVID-19 column exists, `Benefit Schedule Period ID` like `TH_CLAIM_CALENDAR_2025`, dental detail and CPN-only fields (`Education Level for Children Tuition (CPN Only)`, `Dependent ID for Children Tuition (CPN Only)`, `Medical/Dental (CPN Only)`).

---

## 3. EC Entities & Fields

DB table names below come from S3 column 21 (verbatim, including the `Dependens` typo in source). Required flag is the **default rule for Permanent employees**; conditional/persona variants are noted separately.

### 3.1 Employee (Identity / Hire)

| Field | Type | Required | Example / LOV | Source | Notes |
|---|---|---|---|---|---|
| HIRE_DATE | LOV (date) | Required | future or past allowed | Employment | Default = today; editable; drives Probationary Period End Date = HIRE_DATE+119d |
| COMPANY_CODE | LOV | Required | from `legalentity` picklist (85 vals) | Emp Job Info | |
| EVENT_REASON | LOV | Required | event-driven | Emp Job Info | |
| EMPLOYEE_ID | system-gen Text | Required | 8 digits, starts with `2`, unique running number | (auto) | Auto-generated on submit |
| SALUTATION_EN | LOV | Required | `salutation` picklist | Personal Info | Drives Gender derivation |
| FIRSTNAME_EN / MIDDLENAME_EN / LASTNAME_EN | Text | Req / Opt / Req | | Personal Info | |
| SALUTATION_TH / FIRSTNAME_TH / MIDDLENAME_TH / LASTNAME_TH | Text + LOV | Req | Local-language pair | Personal Info | EN/TH split per row in S3 |
| TITLE_TH (Other Title) | LOV | Optional | `zOtherTitle` (92 vals) | Personal Info | |
| NICKNAME | Text | Optional | EN or TH | Personal Info | |

### 3.2 Biographical Info (table: `Biographical Info`)

| Field | Type | Required | LOV / Validation | Notes |
|---|---|---|---|---|
| EMPLOYEE_ID | FK | sys | | |
| DATE_OF_BIRTH | Date (LOV-style picker) | Required | Recruit Date > Date of Birth | |
| COUNTRY_OF_BIRTH | LOV | Optional | `ISOCountryList` (246 vals) | |
| Region of Birth | Text | Optional | | |
| Age | Text (calculated) | Required | `(Today − DOB + 1) / 365.25` shown as `Year.Month`; Generation auto-derived | System-calculated |
| EFFECTIVE_START_DATE / EFFECTIVE_END_DATE | Date | sys | | Effective-dating |

### 3.3 National ID (table: `National ID`) — multi-row per employee

| Field | Type | Required | LOV / Format | Notes |
|---|---|---|---|---|
| NATIONAL ID CARD TYPE | Text | Required | `idType_ID_Card` | TH = `tni` (Thai National ID), VN = `VNID` |
| COUNTRY | LOV | Required | | |
| NATIONAL_ID | Text | Required | TH `N-NNNN-NNNNN-NN-N`, VN `NNNNNNNNN` (regex from S4 Sheet2) | Auto-insert hyphens; uniqueness validation |
| ISSUE_DATE | Date | Optional | | |
| EXPIRY_DATE | Date | Optional | | |
| ISPRIMARY | LOV | Required | Yes/No, default Yes | |
| Attachment | File | Conditional Required | .pdf .jpg .jpeg .png .pptx .xlsx, ≤ 10 MB | |
| `[VN] Issue Place` | Text | (VN only) | | Country-conditional field |
| EFFECTIVE_START_DATE / EFFECTIVE_END_DATE | Date | sys | | |

### 3.4 Personal Information (table: `Personal Info` + `Global Information`)

| Field | Type | Required | LOV | Notes |
|---|---|---|---|---|
| GENDER | Text | Required | Auto-derived from Salutation: Mrs/Miss/นาง/นางสาว→F; Mr/นาย→M | |
| NATIONALITY | LOV | Required | `Nationality` (128 vals) | |
| FOREIGNER | LOV | Optional | Yes/No | |
| BLOODTYPE | LOV | Optional | `BLOODGROUP` (A, AB, B, O) | |
| MARITAL_STATUS | LOV | Optional | | |
| Marital Status Since | LOV (date) | Optional | | |
| CHILDEN_NUMBER (sic) | Text | Optional | | Source typo |
| MILITARY_STATUS | LOV | Required | | (S4 only — confirm) |
| Country/Region | LOV | Required | Default Thailand | Drives Global Info section |
| Religion | LOV | Optional | | |
| Disability Status | LOV | Optional | | |
| Disability Certificate Start Date / End Date | LOV (date) | Optional | | |
| Type of Disability | LOV | Optional | | |
| Certificate ID | Text | Optional | | |
| Spouse's Father ID Number | Text | Optional | | TH-specific |
| Spouse's Mother ID Number | Text | Optional | | TH-specific |
| Additional Information | Text | Optional | | Free text |
| Attachment (Personal Info) | File | Required | .pdf .jpg .jpeg .png .pptx .xlsx, ≤ 10 MB | |

### 3.5 Email Information (table: `Email Info`)

| Field | Type | Required | LOV |
|---|---|---|---|
| EMAIL TYPE | LOV | Required | `ecEmailType` |
| EMAIL | Text | Conditional Required | |
| ISPRIMARY | LOV | Required | Yes/No |
| EFFECTIVE_START_DATE / EFFECTIVE_END_DATE | Date | sys | |

### 3.6 Phone Information (table: `Phone Info`)

| Field | Type | Required | LOV |
|---|---|---|---|
| PHONE TYPE | LOV | Required | `ecPhoneType` |
| COUNTRY_CODE | Text | Conditional Required | |
| PHONE_NUMBER | Text | Conditional Required | |
| Extension | Text | Optional | |
| ISPRIMARY | LOV | Required | Yes/No |

### 3.7 Social Accounts Information

| Field | Type | Required | LOV |
|---|---|---|---|
| Domain | LOV | Conditional Required | `imdomain` |
| Instant Messaging ID | Text | Conditional Required | |
| URL | Text | Optional | |

### 3.8 Addresses (table: `Addresses`) — multi-row per employee

| Field | Type | Required | LOV | Notes |
|---|---|---|---|---|
| ADDRESS_TYPE | LOV | Required | `addressType` | |
| FLOOR / ROOM NO / VILLAGE / BUILDING / STREET / MOO / SOI | Text | Optional | | |
| HOUSE_NUMBER | Text | Required | | |
| DISTRICT | LOV | Required | `zDistrict` (928) | TH-specific |
| SUB_DISTRICT | LOV | Required | `zSubDistrict` (7,442) | |
| PROVINCE | LOV | Required | `zProvince` (77) | |
| POSTAL_CODE | LOV | Required | `zPostalCode` (1,170) | |
| COUNTRY | LOV | Required | `country` (67) | |
| Attachment | File | Conditional Required | | |
| sys_EC-PY_ProvinceCode / ProvinceText / District / SubDistrict / PostalCode | sys | sys | | Sync-to-payroll calculated mirrors |

### 3.9 Primary Emergency Contact (table: `Emergency Contact`)

NAME, RELATIONSHIP (LOV `relation`), PRIMARY (Yes/No), PHONE, ADDRESS, **`Copy Address from Employee`** (Yes/No flag), EFFECTIVE_START_DATE, EFFECTIVE_END_DATE.

### 3.10 Dependents (table: `Dependens` — sic) — multi-row, ~30 fields

Categories: Identity (RELATIONSHIP via `personRelationshipType`, SALUTATION (EN+LOCAL), FIRSTNAME/LASTNAME EN+LOCAL, NATIONALITY, DATE OF BIRTH, COUNTRY, NATIONAL ID TYPE, NATIONAL ID, IS PRIMARY, ATTACHMENT, COPY ADDRESS FROM EMPLOYEE, REFER TO ADDRESS Yes/No, Phone) + a full Address sub-block (House Number, Building, Floor, Village, Moo, Lane/Soi, Street, Province, District, Sub-District, Postal Code).
All are `Not Required` at base but become `Required` when conditional logic triggers (e.g., when adding a dependent). Used heavily by BE benefit plans (medical for parent/child/spouse, child tuition).

### 3.11 Job Information (table: `Emp Job Info`) — 135 rows, **biggest entity**

Top 20 fields with persona/group conditional rules:

| Field | Type | Permanent | Expat | Retirement | Temp/Intern/CW | DVT | Notes |
|---|---|---|---|---|---|---|---|
| HIRE_DATE | Date | Req | Req | Req | Req | Req | |
| COMPANY_CODE | LOV | Req | Req | Req | Req | Req | |
| EVENT_CODE / EVENT_NAME / EVENT_REASON | LOV / Text | Req | Req | Req | Req | Req | Workflow event metadata |
| TERMINATE_REASON / TERMINATE_REMARK / TERMINATE_VOLUNTARY_FLAG | LOV/Text/bool | Req on term | Req on term | sys | sys | sys | `zTerminateReason` (698) |
| OK_TO_REHIRE | LOV (Y/N) | Not req | Not req | Not req | Not req | Not req | |
| BU_CODE / BU_NAME | LOV/Text | sys-derived | | | | | from Company |
| COSTCENTER | LOV | Req | Req | Req | Req | Req | |
| POINT_OF_SALE | LOV | Req if applicable | | | | | `zPointOfSales` (2,175) |
| POLICY_PROFILE | LOV | Req | Req | Req | Req | Req | |
| GROUP_ | LOV | Req | Req | Req | Req | Req | |
| EMPLOYEE_GROUP | LOV (driver) | **Driver** | **Driver** | Req | Req | Req | FO masterdata; drives many other fields |
| EMPLOYEE_SUBGROUP | LOV | Req (filtered by group) | Req | Req | Req | Req | FO masterdata |
| JOB_CODE / JOB_NAME / JOB_FAMILY / JOB_FAMILY_NAME / JOBTYPE | LOV/Text | Req (linked to Position) | Req | Req | Req | Req | `sysJobCodes` (11,115) |
| POSITION_CODE / POSITION_NAME / POSITION_DESC | LOV/Text | Req | Req | Req | Req | Req | Drives JOB_*, BAND, GRADE auto-fill |
| BRANCH_CODE / BRANCH_NAME / STORE_FORMAT_CODE / STORE_TYPE / BRAND_CODE / ZONE | LOV/Text | Req if store-based | | | | | |
| WORK_LOCATION_CODE / SSO_LOCATION | LOV | Req | Req | Req | Req | Req | `cust_WorkLocation` (1,146) |
| SUPERVISOR_ID | Text/lookup | Not Req (linked to Position) | | | | | |
| CORPORATE_TITLE_CODE / NAME / INFO_CODE / INFO_NAME | LOV/Text | Req (editable) | Req (editable) | Not req (editable) | Not req (editable) | Req (editable) | |
| PG (Personnel Grade) | LOV | Req (linked to subgroup) | Req | Req (linked to Position) | Req | Req | |
| JG (Job Grade) | LOV | Req (linked to Position) | Req | Req | Req | Req | |
| TIME_MANANGEMT_STATUS / FTE / FULL_TIME_FLAG | LOV/Number | Req | Req | Req | Req | Req | |
| STANDARD_WEEKLY_HR / DAILY_WORKING_HR / WORKING_DAY_PER_WEEK / WORK_SCHEDULE / OT_FLAG / TIMEZONE / HOLIDAY_TYPE_CONDITION | mixed | Req | Req | Req | Req | Req | |
| CONTRACT_TYPE | LOV | Req default `regular` | | Req | Req | Req editable | |
| CONTRACT_ENDDATE | Date | Hidden | Hidden | Hidden | Hidden | Hidden | Used by Temp/Contract employee groups |
| Probationary Period End Date | Date | Req; auto = HIRE_DATE+119d | Req auto | Hidden | Hidden | Hidden | |
| Extended Retirement Date / Extended Probation Date | Date | Optional | Optional | | Hidden | Hidden | |
| Band Matching / Band | LOV | Req (linked to position) | Req | Req | Req | Req | |
| Special Benefit Group | LOV | Optional | Optional | Optional | Optional | Optional | |
| Is Concurrent Employment | bool | sys | | | | | |
| Attachment | File | Optional | | | | | |
| `sys_EC_Current*EffectiveDate` (Position, Job, CorporateTitle, JG, PG, StoreBranch) | sys date | sys | sys | sys | sys | sys | Calculated effective-date snapshots |

**DVT-only fields (Dual Vocational Training scholars):** `DVT: Project name`, `DVT: Partner University` (`zPartnerUniversity` 509), `DVT: Type`, `DVT: Degree Level`, `DVT: Course`, `DVT: Course of Time`, `DVT: Academic Year`, `DVT: Graduation Date`, `DVT: Bonding End date`, `Scholarship`. All Hidden for non-DVT, Required for DVT.

(Job Information has ~135 source rows — full set in S3 rows 161–272; the table above covers the load-bearing 35.)

### 3.12 Employment Details (table: `Employment`)

EMPLOYEE_ID, USER_ID, PREVIOUS_ID (CG previous Employee ID), HIRE_DATE, PASS_PROBATION_DATE, RESIGN_DATE, LAST_WORKING_DATE, RETIREMENT_DATE, ORIGINAL_STARTDATE (Required), SENIORITY_STARTDATE (Required), CURRENT_JOB_EFFDATE, CURRENT_CORPORATE_TITLE_EFFDATE, CURRENT_JG_EFFDATE, CURRENT_PG_EFFDATE, CURRENT_POSITION_EFFDATE, Current Store Branch Effective Date, DVT previous ID, PF service Date, YOS (Years of Service — calculated), Employee age (Y/M/D — calculated).

### 3.13 Job Relationships (table: `Job Relationships`) — multi-row

EFFECTIVE_START_DATE, RELATIONSHIP TYPE (e.g., dotted-line manager), NAME.

### 3.14 Work Permit (table: `Work Permit`) — Expat-only

DOCUMENT TYPE (`permitdoctype` 352 vals), EMPLOYEE_ID, COUNTRY, DOCUMENT_NUMBER, ISSUE_DATE, EXPIRY_DATE, `Arrival date (VISA)`, `90 days report (VISA)`, ATTACHMENT, EFFECTIVE_START_DATE, EFFECTIVE_END_DATE.

### 3.15 Compensation — Payment Information (table: `Payment Info.`)

EMPLOYEE_ID, BANK_CODE, BANK_NAME, ACCOUNT_NUMBER, BANK_COUNTRY (Required), CURRENCY (Required, `currency` 158 vals), PAYMENT_METHOD (Required), Pay Type (Required), Attachment, EFFECTIVE_START_DATE, EFFECTIVE_END_DATE.

### 3.16 Compensation — Pay Component Recurring (table: `Pay Component Recurring`)

EMPLOYEE_ID, PAY_COMPONENT_CODE (Required), SEQUENCE_NO, FREQUENCY_PAY (Required), AMOUNT (Required), CURRRENCY (sic — Required), PAYGROUP (Required), EFFECTIVE_START_DATE, EFFECTIVE_END_DATE.

A separate `Recurring Payments` UI sub-section (Pay Component, Amount, Currency, Frequency) appears to be a duplicate / display variant — flag for interview.

---

## 4. BE Entities & Fields

### 4.1 Reimbursement Claim — UI Form (S1 `Reimbursement` sheet)

20 UI fields in 5 conditional groups.

| Group | Field | Required | Type | LOV / Validation | Notes |
|---|---|---|---|---|---|
| General | Selected Benefit | Required | LOV | Default = benefit plan tied to claim | Drives the conditional groups below |
| General | Claim Date | Required | Date | | |
| General | Remaining Amount | Required (read-only) | Number | | Calculated from entitlement minus prior claims |
| General | Currency | Required | LOV | | |
| General | Receipt no./ Document No. | Required | String | | |
| General | Receipt Date / Document Date | Required | Date | dd/mm/yyyy | |
| General | Receipt Amount | Required | Integer | | Whole-baht expected |
| General | Total Claim Amount | Required | Number | Default = Receipt Amount | Editable |
| General | Remark | Optional | String | Free text | |
| General | Attachment | Required | File | .pdf .jpg .jpeg .png .pptx .xlsx, ≤ 10 MB; up to 5 files | Medical: #1 required, #2-5 optional |
| Medical | OPD/IPD | Required | LOV | OPD / IPD | |
| Medical | Type of Hospital | Required | LOV | Clinic / Public / Private | |
| Medical | Hospital Name | Required | String | Free text | Also reused for Physical Check-up |
| Medical | Do you use the patient transfer document | Required | LOV | Y / N | Triggers extra approval path |
| Medical | Disease Details | Required | (LOV?) | | LOV not specified — see Q&A |
| Gasoline | Claim Type | Required | LOV | Gasoline, Expressway Toll, Car Parking Fee, BTS/MRT/BRT, Taxi/Grab, EV Charging Fee, Fleet Card Shell (info), Fleet Card Bangchak (info), Fleet Card CPN (info) | "Info only" types do not deduct entitlement |
| Physical Check up | Invoice from hospital | Required | (file?) | | Type unspecified |
| Dependent (Parents/Child/Spouse) > Benefit Dependent Detail | Dependent Name | Required | text | | Should pull from EC Dependents |
| Dependent | Date of Birth | Optional | Date | | |
| Dependent | Relationship Type | Optional | LOV | | |

### 4.2 Reimbursement Claim — Record / Export Shape (S2)

51 columns observed on production claim export. Treat this as the **Benefit Claim** entity for back-end modeling.

**Identity / employee snapshot:** Business Unit, Company, Store/Branch Code (with Branch Name), Employee Status (Label), Hire Date, Resigned Date, Personnel Grade, Employee Group, CG Employee ID, Firstname, Lastname, two `Corporate Title` columns (denormalized — likely Title + TitleInfo), Cost Center.

**Benefit metadata:** Benefit Type (e.g. `REIMBURSEMENT`), Benefit Name (e.g. `Medical Reimbursement`, `Mobile Reimbursement`), Gasoline Claim Type, Medical/Dental (CPN Only), Education Level for Children Tuition (CPN Only), Dependent ID for Children Tuition (CPN Only).

**Claim core:** Benefit Claim ID (32-char hex GUID), claimDate, Type of Hospital, Hospital Name, Dental Details, Disease Details, OPD/IPD, Paid to Vendor, Total Claim Amount, Benefit Enrollment Amount, Benefit Status (`A`=Active), remarks, recordStatus (`P`), Receipt Date, Receipt No., Upload Attachment File (Y/N).

**Workflow / audit:** Created For Employee ID + EN names, Created By + EN names, Created Date, Last Modified By + EN names, Last Modified Date, Status (e.g. `SENTBACK`), Wf Request Id (e.g. `1041687`), Benefit Schedule Period ID (e.g. `TH_CLAIM_CALENDAR_2025`), Benefit Schedule Period Name (`Claim - Calendar Year 2025`).

**Special:** COVID-19 Claim Detail (legacy column, sometimes blank).

### 4.3 Inferred BE entities (not yet specified in source — flag for interview)

| Entity | Evidence | Status |
|---|---|---|
| **Benefit Plan** | "Selected Benefit", "Benefit Type", "Benefit Name" | Master not provided |
| **Benefit Enrollment** | "Benefit Enrollment Amount" — implies per-employee enrollment | Master not provided |
| **Benefit Schedule Period** | `TH_CLAIM_CALENDAR_2025` and `_2026` | Calendar definition needed |
| **Benefit Entitlement / Allocation** | "Remaining Amount" derives from one | Definition needed |
| **Benefit Transfer** | S1 sheet `Transfer` is empty | Not specified |
| **Workflow Request** | `Wf Request Id` field | Belongs to a separate workflow engine — interface contract needed |
| **Beneficiary / Dependent Linkage** | Dependent Name + DOB + Relationship in claim | Should reuse EC `Dependens` table, not duplicate |

---

## 5. Common / Shared Fields

These appear across multiple entities and should be modeled as shared schemas / mixins:

| Shared field | Appears in | Treatment |
|---|---|---|
| EMPLOYEE_ID | Every EC table; every BE record | FK; primary tenant key |
| EFFECTIVE_START_DATE / EFFECTIVE_END_DATE | Personal Info, National ID, Email, Phone, Address, Dependents, Emergency Contact, Job Info, Employment, Pay Component Recurring | Effective-dating mixin — all EC entities are bitemporal |
| ISPRIMARY (Yes/No) | National ID, Email, Phone, Address, Emergency Contact, Dependents | Boolean flag with at-most-one-primary constraint |
| Attachment | National ID, Personal Info, Address, Dependent, Job Info, Work Permit, Payment Info, Reimbursement Claim | Common file rules: .pdf .jpg .jpeg .png .pptx .xlsx, max 10 MB |
| COUNTRY | National ID, Address, Work Permit, Payment Info, BE claims | LOV `country` (67); some forms use `ISOCountryList` (246) — **conflict, see Q&A** |
| CURRENCY | Payment Info, Pay Component Recurring, Reimbursement Claim | LOV `currency` (158) |
| Salutation, Firstname, Middlename, Lastname (EN/LOCAL pairs) | Employee, Dependent | Bilingual person-name mixin |
| Address block (House Number, Building, Floor, Village, Moo, Soi, Street, District, Sub-District, Province, Postal Code, Country) | Employee Address, Dependent Address, Emergency Contact Address (via `Copy Address from Employee`) | Shared TH-style address mixin |
| Workflow audit (Created By/Date, Last Modified By/Date, Wf Request Id, Status) | All EC effective-dated records (implied), all BE claims | Common audit envelope |

---

## 6. Persona Visibility

S3 has explicit **"Allow to maintain by"** flags for HRIS, HRBP, SPD, Supervisor, Employee — but the columns are **almost entirely blank in the CSV** (the structure was added but not yet populated). What we have:

| Persona | What we know from sources | Decisions still needed |
|---|---|---|
| **Employee (Self-service)** | Should see/maintain Personal Info (Local names, Nickname, Phone, Email, Address, Emergency Contact, Dependents, Social Accounts), Bank/Payment Info, view-only Job + Compensation, submit BE claims. Edit DVT-related fields when DVT employee group. | (needs decision) full edit list per field |
| **Manager / Supervisor** | View direct-report Job Info, Probation/Retirement dates, can be source of `SUPERVISOR_ID`. Approve/return BE claims via workflow. | (needs decision) approval thresholds |
| **HRBP** | Maintain Job Info changes (transfers, promotions, corporate title). Probation/extension dates. View Personal/Compensation. | Confirm whether HRBP can edit Compensation (Pay Component Recurring) directly |
| **SPD (Salary/Personnel Data team)** | Maintain Compensation (Pay Component Recurring, Payment Info), Pay Group, Pay Type. Maintain Employment dates (Original Start, Seniority, Retirement). | Confirm Compensation edit boundary |
| **HRIS / Admin** | Maintain LOV / picklists (78,388 values), Position master, Job Code master, Org Structure, Picklist statuses (A/I), Effective-date corrections. | (needs decision) |

Per-field ACL is **not in the source** beyond the column scaffold — this must come from interview.

The S3 column row also has **employee-group conditional required** (Permanent / Expat / Retirement / Temp/Intern/CW / DVT) which we *do* have for ~30 Job Info fields. Those are reflected in section 3.11.

---

## 7. Data Quality Observations

1. **Source typos baked in:** DB table `Dependens` (should be `Dependents`), field `CHILDEN_NUMBER` (should be `CHILDREN_NUMBER`), field `CURRRENCY` on Pay Component Recurring (triple R), field `TIME_MANANGEMT_STATUS` (Manangemt). Carry forward as-is or fix in mapping layer? — interview question.
2. **TBD / unknown types:** "Disease Details" (Medical Reimbursement) — type column blank but listed as Required; should be LOV but no LOV name given. Same for "Invoice from hospital" (Physical Check-up) — likely File but unspecified. "Dental Details" appears only on the export (S2), not the form spec (S1).
3. **`Foreigner` field semantics unclear** — boolean derivable from Nationality? Or independent flag for special tax handling?
4. **Two `Corporate Title` columns** in S2 export are both labelled "Corporate Title" but contain different values (`Department Manager` vs `Team Leader 1`). Likely Title + TitleInfo — column header in CSV is ambiguous.
5. **Country LOV inconsistency:** Some fields use `country` (67 vals); others use `ISOCountryList` (246 vals); Birth uses `ISOCountryList`, Address uses `country`. Decide on one canonical list.
6. **`Recurring Payments` vs `Pay Component Recurring`** — two UI sub-sections with identical fields (Pay Component, Amount, Currency, Frequency). Are they two flows or one section duplicated in the spec?
7. **Marital Status / Blood Type required-ness conflict** between S3 (Optional) and S4 (Required) — using S3.
8. **`EFFECTIVE_START_DATE` and `EFFECTIVE_END_DATE` appear on every entity but are never marked as `UI Field`** — confirm whether HRIS sees/edits them or they are system-only.
9. **DVT fields** are listed as both `Hidden` and `Required` for DVT employee group simultaneously — i.e., required when present, hidden otherwise. Ensure UI engine supports `visibility-and-required` joint conditional.
10. **COVID-19 Claim Detail column** in S2 — legacy. Sunset for the new platform?
11. **Picklist data freshness:** 78,388 picklist values bundled (incl. 31,902 VN sub-districts and 11,115 job codes). Not clear which of these are stable masters vs. organizational data that changes. HR Admin self-service vs. backend-maintained.
12. **CSV S3 encoding (`cp1252`)** mangles all Thai labels into `?`. Source-of-truth Thai labels for picklist values must come from S4 `EC Picklist` (which is intact).
13. **`OK_TO_REHIRE`** is `Not require` for every employee group — check whether this is intentional or whether the column is unmaintained.

---

## 8. Questions for Deep Interview

### Cross-source conflicts
1. **Country LOV** — `country` (67) vs `ISOCountryList` (246): pick one for all entities or keep field-by-field?
2. **Marital Status / Blood Type** required? S3 says Optional, S4 says Required.
3. **`Recurring Payments` UI section** — duplicate of `Pay Component Recurring`, or two distinct concepts (e.g., one-time vs. recurring vs. ad-hoc)?

### Missing field types / value lists
4. What is the LOV behind "Disease Details" on the medical reimbursement claim?
5. "Invoice from hospital" on Physical Check-up — file upload or lookup?
6. The two **Corporate Title** columns — confirm names: `CORPORATE_TITLE` + `CORPORATE_TITLEINFO`?
7. What populates **"Total Claim Amount"** when it differs from Receipt Amount? (Co-pay, partial claim?)

### Missing entities (BE)
8. **Benefit Plan** master — fields, eligibility rules, entitlement calculation?
9. **Benefit Enrollment** — open enrollment flow, change events, dependent linkage?
10. **Benefit Schedule Period** — calendar year vs. fiscal year vs. employee anniversary? CPN uses calendar year per the data.
11. **Benefit Transfer** sheet is empty — is benefit transfer between dependents/employees in scope?
12. **Workflow integration** — Wf Request Id field — is the workflow engine in scope or external? What's the contract?

### Persona / access control
13. The "Allow to maintain by" columns (HRIS/HRBP/SPD/Supervisor/Employee) are blank for ~95% of fields. **Which persona owns each field?**
14. What can Manager (Supervisor) view/edit on the team's profiles?
15. SPD's edit boundary on Compensation — do they own Pay Component Recurring + Payment Info exclusively, or shared with HRBP?
16. Self-service Employee — confirm the editable list (especially Bank/Payment Info, Marital Status, Dependents — these have payroll/tax implications).
17. Are the conditional employee-group rules (Permanent/Expat/Retirement/Temp/DVT) **enforcement-level** (form blocks submit) or **validation-level** (warn but allow)?

### Data lifecycle / system behavior
18. **Effective-dating UX** — does HRIS edit current vs. future effective records, and how do supervisors propose vs. approve future-dated changes?
19. Probation extension — how many extensions allowed? What workflow?
20. **Auto-derivations** to confirm: Age (year.month, no rounding), Generation (rule?), Gender from Salutation, Probationary End = HIRE_DATE+119d, EMPLOYEE_ID format `2NNNNNNN`. Are there others (FTE, Years of Service, Pass Probation Date)?
21. **`sys_EC-PY_*` fields on Address** — are these frozen snapshots for payroll, or live mirrors that re-sync?

### Master data / picklists
22. Of the 78,388 picklist values, which are HR-Admin-maintainable in-app vs. ETL-loaded from upstream systems (FO masterdata, sysJobCodes, etc.)?
23. CPN-only fields ("Medical/Dental (CPN Only)", Children Tuition fields) — is the platform intended to serve CPN exclusively, or are there other BUs with their own conditional fields?

### Carry-forward decisions
24. Source typos (`Dependens`, `CHILDEN_NUMBER`, `CURRRENCY`, `TIME_MANANGEMT_STATUS`) — fix in the new system or preserve for ETL compatibility?
25. COVID-19 Claim Detail column on S2 — sunset or migrate?

---

*End of field dictionary. Source raw data dump in `/tmp/ec_csv_full.txt` (preserved by extraction agent for cross-reference).*
