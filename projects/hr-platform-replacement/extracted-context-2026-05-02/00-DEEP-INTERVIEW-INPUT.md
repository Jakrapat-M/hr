# Deep Interview Input — HR Platform Replacement (EC + Benefits)

**Compiled:** 2026-05-02
**Audience:** `/oh-my-claudecode:deep-interview` (and the BA/PM answering it)
**Purpose:** Crystallize requirements before the build starts. This master file summarizes 5 parallel extractions; drill-downs cite the detail files in the same directory.

## How to read this file

- §1–4 = **shared frame** the interviewer needs before asking anything.
- §5 = **prioritized question backlog** (P0/P1/P2). The interview should walk these top-down.
- §6 = **detail file map** — when an answer needs evidence, point at the file:section.

## Detail files (siblings in this directory)

| # | File | Words | Covers |
|---|------|-------|--------|
| 01 | `01-sf-system-baseline.md` | 3,979 | Existing SF system: 16 modules, 443 entities / 7,213 fields, 6 personas, 251 picklists, 551 business rules, RBAC tiers, SF quirks |
| 02 | `02-ba-requirements.md` | 5,786 | BA-confirmed scope, 207 BRDs (74✅/38🟡/93❌/7🔇), 25 open decisions, persona gaps, RIS walkthrough signals |
| 03 | `03-brd-flow-matrices.md` | 4,447 | BRD-207 flow matrix, manual workflow matrix, BRD↔TTT mapping, 11 flows, 16 manuals, 10 cross-cutting patterns |
| 04 | `04-benefit-features.md` | 6,387 | 27 BE feature workflows, 40 plan IDs, 6 reusable workflow templates, SAP payment integration, eligibility model |
| 05 | `05-field-dictionary.md` | 4,879 | EC + BE data dictionary, 16 EC entities, 296 EC field rows, 78k picklist LOVs, persona/ACL scaffolding gaps |

---

## §1. Scope (working assumption — confirm in interview)

**In scope:**
- Employee Center (EC) — employee data, lifecycle (hire / transfer / terminate / rehire / promotion / acting / probation / contract-renewal), foundation (org / job / position), employee self-service, manager self-service, reporting tooling.
- Benefits (BE) — 27 features in 6 reusable workflow shapes: enrollment, on/off-boarding, change, claim (medical/dental/gas/toll/parking/checkup), gift (wedding/ordination/child-birth/patient-visit), funeral assistance + wreath + host (self/spouse/dependent), life/accident self-funded, beneficiary, reporting, payment.

**External / out of scope** (placeholder pages may exist but functionality lives elsewhere):
- Performance Management — external system.
- Learning / e-Learning — external system.
- Time & Attendance — lives at `cnext-time.centralgroup.com` (BUILD vs INTEGRATE vs EMBED — open question P0-Q15).

**Personas (6 confirmed in SF baseline; BA docs mention 5):**
Employee, Manager, HRBP, SPD, HR Admin, HRIS Admin. **Conflict:** TTT decks recognize only Employee + Manager + "Benefit Administrator" — HRBP and SPD differentiation is **undefined in the BE source** (P0-Q1).

**Dataset scale targets (RIS walkthrough):** 240K+ employees, 164 companies, 17K departments. UI must paginate / virtualize / search-empty-by-default.

**Localization:** Thai-first dual labels (TH/EN); Vietnam in dataset → VN locale TBD.

---

## §2. Source-of-truth map

When the interviewer needs evidence:

| Question topic | Authoritative source | File |
|---|---|---|
| What does SF do today? | SF crawl + qas-fields-* metadata | 01 §2, §4 |
| What did BA sign off? | BA-EC-SUMMARY, BRD-COVERAGE-MATRIX | 02 §1, §2 |
| What flows exist & who acts? | BRD-207 flow matrix + manual workflow matrix | 03 §2, §3 |
| What does the existing benefit feature do? | TTT BE_01–BE_27 PPTX | 04 §3 (per-feature cards) |
| What fields/entities exist? | EC-list-of-fields CSV (S3) + BE Reimbursement xlsx | 05 §3, §4 |
| Picklist values? | qas-fields-2026-04-25 (251 picklists, 47k options) + EC Picklist sheet (78k LOVs) | 01 §4 + 05 §4 |
| Business rules to port? | qas-fields metadata.xml DSL bodies (551 rules) | 01 §5 |

**Conflicts already detected (must resolve in interview):**
- BA EC field list (S3, 296 rows) **supersedes** older xlsx (S4, 53 rows) — drift.
- `lifecycleSchema.ts` defines Zod for Rehire/Transfer/Terminate but **no page imports it** — schema is aspirational (02 §4 → schema drift).
- BRD coverage counts disagree: flow-matrix xlsx says 92/44/34/37, summary md says 108/58/41 — neither can be cited until reconciled (03 §4).
- Country LOV: 67 entries (`country`) vs 246 (`ISOCountryList`) — which wins?
- Terminate picklist: UI 5 codes vs SF 17 `TERM_*` codes — full set or simplified?

---

## §3. Coverage at a glance

### EC (BRD-207 inventory)
- **74 ✅ shipped / 38 🟡 partial / 93 ❌ not started / 7 🔇 deferred** = ~45% of BRDs not yet ready.
- **Critical gap:** Flow 07 Special Information = **50/50 ❌** (BRD #35–84). Entire framework absent.
- ~32% of BRDs (66 items) have **no AS-IS manual** — fresh design needed (mostly Admin Self-Service, User Mgmt, integration plumbing).
- TTT-03 Maintain Master Data is the **backbone**: 70 BRDs (33.8%) directly depend on it; 96 if indirect.
- TTT-07 Manage Suspension has **0 BRDs** — confirm before deprecating.
- The 207-BRD inventory **excludes BE entirely** — no parallel BE BRD matrix exists. That is itself a P0 question.

### BE (TTT decks)
- 27 feature decks parsed cleanly. 40 plan IDs across Reimbursement + Insurance categories.
- Plan name prefix encodes workflow: `[Records]` = admin-only logging, `[Info]` = display-only, no prefix = claimable.
- 6 workflow templates collapse the 27 features (simple claim ×7, hospital claim ×3, records-flat ×5, records-dependent ×3, records-computed ×1, lifecycle/admin ×8). **Replacement UI does not need 27 bespoke screens** — one Claim form with conditional sections covers most.

---

## §4. Cross-cutting patterns the UI must accommodate

From 03 §6 + 04 §4 + 01 §5 — patterns that recur across modules and must be designed once:

1. **Multi-level approval routing** — Employee → Manager → HRBP → SPD → Admin (chain length varies per flow).
2. **Effective dating** — every employee data change is time-sliced; UI must show "as of date" + future-dated changes (SF UI-enforces this).
3. **Sensitive-field re-auth** — 12 fields require step-up auth (national ID, salary, bank account, etc.).
4. **Document upload + e-signature** — claim forms, hire packets, ~50K letters/year (EC Document hub, P1 question).
5. **Notifications** — entirely missing from BE TTT decks (P1-Q11). Email + in-app + SMS?
6. **Audit trail** — every change logged with who/when/why.
7. **Field-level RBAC** — persona × entity × field matrix; SF baseline has 4-persona × 75-entity probe results.
8. **Mass operations** — bulk import, bulk update, bulk approve.
9. **Concurrent positions / multiple roles** — employee can hold N positions (`Per*`/`Emp*` split in SF).
10. **Consent gates** — PDPA / data-handling consents at form entry.
11. **Bilingual TH+EN labels** — every form, every report.
12. **External integrations** — SAP IT0015/IT0267 payment posting (3 Z-transactions, segment-specific cut-offs), T&A external, Performance external, Learning external.

---

## §5. Question backlog for the deep interview

**Notation:**
- **P0** = blocks UI scaffolding. Must answer before sprint planning.
- **P1** = blocks specific feature/screen. Answer before that screen starts.
- **P2** = nice-to-clarify; can be deferred with a flag.

### P0 — Blockers (8)

| ID | Question | Why it blocks | Source |
|---|---|---|---|
| P0-Q1 | **Persona scope:** Are HRBP and SPD distinct from "Benefit Administrator" in BE flows? Is HRIS Admin a 6th persona? | Approval routing and RBAC matrix can't be built without this. | 04 §5; 01 §3 |
| P0-Q2 | **Schema naming:** Adopt SF's `Per*` (person) / `Emp*` (employment) split, or flatten? | Affects every entity. Late change is expensive. | 01 §5 quirk #2; 05 §3 |
| P0-Q3 | **Effective-dating UX:** SF enforces in UI (history view + future-dated edits). Replicate that posture or simplify? | Foundational. Touches every data-edit form. | 01 §6 Q1; 03 §6 pattern #2 |
| P0-Q4 | **Lifecycle picklist canonicality:** UI 5 termination codes vs SF 17 `TERM_*`. Which is the source of truth? | Lifecycle pages already shipped with the smaller set. | 02 §3 BA-OPEN-9 |
| P0-Q5 | **Field master:** Confirm S3 (EC- list of fields CSV) supersedes S4 (older xlsx). Lock the master. | Forms can't be scaffolded against drifting field set. | 05 §2 |
| P0-Q6 | **Workflow template strategy for BE:** Build the 6 reusable shapes (claim/records/lifecycle) and configure per-feature, OR build 27 bespoke screens? | Determines BE engineering shape and scope. | 04 §4 |
| P0-Q7 | **BE BRD parity:** Why does the 207-BRD inventory cover EC only? Is there a parallel BE-BRD matrix, or is BE governed only by TTT decks? | Cannot estimate or verify BE coverage without this. | 03 §7 |
| P0-Q8 | **Approval chain shape:** Confirm canonical chain (Employee→Manager→HRBP→SPD→Admin) — depth, escalation rules, delegation, timeout. | Every workflow uses this. | 03 §6 pattern #1 |

### P1 — Per-area (15)

| ID | Question | Area | Source |
|---|---|---|---|
| P1-Q9 | Manager surface: `/manager-dashboard` and `/hrbp-reports` are 12-line wrappers. What does Manager actually do? (BRD #174–177 not shipped.) | Manager IA | 02 §7 |
| P1-Q10 | Special Information framework (BRD #35–84) — 50/50 gap. Define entities, fields, RBAC. | EC | 02 §3; 03 §7 |
| P1-Q11 | Notifications spec for BE — channels, triggers, templates, persona routing. Decks are silent. | BE | 04 §5 |
| P1-Q12 | EC Document hub — ~50K letters/year. Generate + sign + store + retrieve flow. | EC | 02 §6 RIS; 03 §7 |
| P1-Q13 | Reporting: 28-sheet Excel pattern vs hub of report widgets? | EC + BE | 02 §3; 03 §6 |
| P1-Q14 | Rehire `useNewCode` rules unknown for 10+ companies. | EC Rehire | 02 §3 BA-OPEN-7 |
| P1-Q15 | T&A integration approach: BUILD ourselves, INTEGRATE via API, or EMBED iframe to `cnext-time`? | Integration | 01 §6 Q15 |
| P1-Q16 | SAP payment integration target: keep ZBER001/002/003 + IT0015/IT0267, or re-platform to a different payroll? | BE Payment | 04 §3 BE-27 |
| P1-Q17 | "ใบส่งตัว = Yes" claim handling — legacy excludes from payment because hospital bills company. Replicate, or change? | BE Claim | 04 §3 |
| P1-Q18 | Send-back semantics in BE — legacy silently blocks employees on entitlement restoration. Match or expose? | BE Claim | 04 §5 |
| P1-Q19 | 30-claim/year-per-dependent enforcement point — DB constraint, server validator, or UI gate? | BE Claim | 04 §5 |
| P1-Q20 | 12 sensitive-field re-auth list — confirm fields, define UX (modal? inline?). | RBAC | 03 §6 pattern #3 |
| P1-Q21 | Country LOV: `country` 67 vs `ISOCountryList` 246. Pick one. | Picklists | 05 §3 |
| P1-Q22 | 3 distinct start dates in SF (Original Hire, Service Start, Current Position Start). Surface all three? | EC | 01 §6 Q4 |
| P1-Q23 | Suspension flow: TTT-07 has 0 BRDs. Deprecate, or write fresh BRDs? | EC | 03 §7 |

### P2 — Nice-to-clarify (8)

| ID | Question | Notes |
|---|---|---|
| P2-Q24 | Bilingual handling: are all picklist `.option_label_th` filled, or fallback to EN? | 01 §6 |
| P2-Q25 | Vietnam locale: VN appears in dataset; does VI translation set exist? | 02 §6 RIS |
| P2-Q26 | Quick Action panel pattern (SF Home tile grid 14 quick actions) — replicate or replace? | 01 §2 |
| P2-Q27 | Benefits navigation placement: SF puts Benefits as tab inside Employee File. Top-level module instead? | 01 §6 Q4 |
| P2-Q28 | Picklist canonicality: 30/33 HR picklists synonym-mapped; 3 are HR-only (DynamicRole, PayComponent, PayComponentGroup) — confirm. | 01 §6 |
| P2-Q29 | Point-in-time reporting: SF supports as-of-date queries. Required in v1? | 01 §6 |
| P2-Q30 | 551 SF business rules — which to port verbatim, which to redesign? | 01 §5 |
| P2-Q31 | Persona ACL columns in S3 are ~95% blank. Define before form-scaffolding sprints, or per-form as we go? | 05 §6 |

---

## §6. Suggested interview structure

The deep-interview skill works best with one mission. For this corpus, run it **twice**:

**Pass 1 — Frame & Scope (P0 questions):**
> "Lock scope and persona/data-model frame for the HR EC+BE replacement. Resolve P0-Q1 through P0-Q8 in `extracted-context-2026-05-02/00-DEEP-INTERVIEW-INPUT.md`. Cite source files for every answer."

**Pass 2 — Per-area depth (P1 questions, optionally one pass per area):**
> "For the Manager IA + Special Info + EC Document hub areas, resolve P1-Q9 through P1-Q14. Reference detail files 01–05 in the same directory."

P2 questions can be parked as a backlog.

---

## §7. What the build team can already start

Even before the interview runs, these are safe to scaffold (no P0 dependency):

1. **6 BE workflow templates** — claim form, records-flat, records-dependent, records-computed, hospital-claim, lifecycle-admin. Configure via plan metadata, not 27 bespoke screens. (04 §4)
2. **Bilingual TH+EN scaffolding** — every form/component dual-label by default. (Pattern #11)
3. **Effective-date "as of" component** — even before P0-Q3 resolves, the component is needed; only its strictness varies. (Pattern #2)
4. **Field-level audit-log infrastructure** — required regardless of which fields, which roles. (Pattern #6)
5. **Picklist service backed by qas-fields-2026-04-25 dump** — 251 picklists / 47k options ready to load. (01 §4)
6. **Approval-chain primitive** — generic chain engine; specific chain depths configured later. (Pattern #1)

Everything else should wait for P0 answers.

---

## Provenance

| Facet | Subagent | Tokens | Duration |
|---|---|---|---|
| 01 SF baseline | general-purpose | 116,732 | 5m 14s |
| 02 BA requirements | general-purpose | 113,424 | 5m 31s |
| 03 BRD flow matrices | general-purpose | 78,586 | 4m 42s |
| 04 BE feature catalog | general-purpose | 146,244 | 6m 02s |
| 05 Field dictionary | general-purpose | 95,477 | 5m 31s |

Raw extraction artifacts retained at `/tmp/be-pptx-extract/` (BE PPTX → JSON dumps).
