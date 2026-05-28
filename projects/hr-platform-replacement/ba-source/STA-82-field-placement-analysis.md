# STA-82 req#1 — Field Placement Analysis ("fields ยึดตาม excel")

**Source:** `EC- list of fields V 0.2.xlsx`, sheet `Employee file ` (582 distinct section×subsection×field rows).
**Goal:** for every field in the spec — (1) where it belongs (**Hire page** vs **Profile tab**), (2) whether it already exists in the current implementation, (3) flag implemented fields that are NOT in the spec (→ remove candidates).

Companion data: **`STA-82-field-placement-analysis.csv`** (all 582 rows, sortable/filterable).

---

## How placement was decided (data-driven)

The spec's own **`process`** column is the placement signal:

| process value | count | → placement |
|---|--:|---|
| `Hiring` | 216 | **Hire page** (captured at onboarding — STA-81 wizard) |
| `maintain` | 275 | **Profile tab** (maintained after hire — STA-82) |
| `maintain` + External subsection | 91 | **EXCLUDED** (Performance/Talent/Learning = external systems) |

Total = 582.

---

## Summary

| Placement | Spec fields | Already implemented | Missing |
|---|--:|--:|--:|
| **Hire page** | 216 | **164** | **52** |
| **Profile tab** | 275 | **71** | **204** |
| **External (cut)** | 91 | — | n/a (out of scope) |

(Counts confirmed via an alias-aware, unicode-normalized matcher; only 3 borderline cases were resolved by hand — see `hire_match`/`profile_match` columns in the CSV for the matched implementation label.)

- **Hire page** is largely built (3-step wizard Who/Job/Review). The 52 gaps are mostly extended Job attributes (DVT scholarship, movement/transfer, PF service, band) + a few Address/Dependents/Social sub-fields.
- **Profile tab** currently shows only ~71 curated fields; the bulk of the 275 "maintain" fields (education, certs, salary history, loans, assets, language skills, disciplinary, etc.) are not yet surfaced — this is the larger remaining effort.

## Implemented fields NOT in spec (→ ควรตัดออก?)

- **Hire page:** none of substance. (`soi` flagged is a false positive — it maps to spec `Lane / Soi`.)
- **Profile tab:** none.

➡️ The current implementation does **not** carry junk fields outside the spec — so the "ตัดออก" list is effectively empty. The real work is **adding missing fields**, not removing.

## EXCLUDED — External systems (91 fields, do NOT build here)

Profile subsections that belong to external Performance Management / Learning systems (per project scope):
Learning History, Learning Activities, Key Successes, Assessment Program, Coaching Feedback, Development Goals,
Development Opportunities, Overall Competency/KPI/Performance Rating (UA), Business Driver Assessment, MT/MA Reference,
Top Strengths, Talent Reference, Personal Assessment Summary, Career Aspirations, Promotability, Performance Group.

---

## How to read the CSV

Columns: `section, subsection, field, type, mandatory, process, placement, in_hire, hire_match, in_profile, profile_match`

- `placement` = authoritative (from `process` + External rule).
- `in_hire` / `in_profile` = `Y` (exists) or blank (missing), from an alias-aware, unicode-normalized, token-set matcher (handles `(EN)/(Local)` suffixes, `Firstname↔First Name`, `Cost Centre↔Cost Center`, `Zip↔Postal Code`, soft-hyphen, etc.).
- `hire_match` / `profile_match` = the actual implementation label each spec field matched to — use this to audit/confirm a `Y` at a glance.
- 3 borderline cases were hand-resolved: `90 days report (VISA)`→Y (= hire `90-day Report`); `Extended Probation Date`→missing (≠ `Probation End Date`); `Current Years in Store Branch`→missing (≠ `Current Years in Job`).

## Next-step options (not yet actioned)

1. Fill the **Hire page** gaps (~76 fields, mostly Job/DVT/movement) — extends STA-81 wizard.
2. Build the **Profile tab** maintain set (~209 fields across EC + Profile-section subsections) — the larger STA-82 effort.
3. Confirm the heuristic `in_hire`/`in_profile` columns by hand for the sections you care about first.

_Generated 2026-05-27 from the V0.2 spec + live code inventory of `admin/hire/*` and `profile/me`._
