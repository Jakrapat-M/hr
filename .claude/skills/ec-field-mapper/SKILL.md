---
name: ec-field-mapper
description: Map the BA "EC list of fields" spreadsheet onto the HR app's UI surfaces. Parses the xlsx offline (python/openpyxl, no JS dep), routes each field to its hire-wizard step or employee-profile section, diffs coverage against what's already implemented in src/, and generates review-ready scaffold (picklist registry entry, FormField/select JSX, i18n key pairs). Use when onboarding a new EC field batch, checking field coverage, or scaffolding picklists from the SF LOV export. Triggers - "ec field mapper", "map BA fields", "field coverage", "scaffold picklist from LOV", "EC fields excel".
---

# EC Field Mapper

Turns the BA EC field spreadsheet into a mapping report + coverage diff + scaffold code,
covering both the **hire wizard** (process=Hiring) and the **employee profile** (process=maintain).

Origin: STA-82 mapped 52 EC fields by hand (picklist registry, zod validation, FormField JSX,
i18n, coverage regression). The source xlsx holds ~600 fields + a 78k-row LOV sheet, with more
EC modules to come. This skill encodes that manual mapping as a repeatable tool.

## Hard rules
- **No new JS/npm dependency.** xlsx is parsed with `python3` + `openpyxl` (offline). Never add a JS xlsx lib.
- **Never write into `src/`.** All output is staged under `.omc/ec-mapper/` for human review, then a dev copies what they want.
- **TH/EN parity.** Every scaffolded field emits both `en` and `th` i18n keys (TH may need a translator pass).
- **Mockup phase.** No backend wiring. Scaffold is UI-only (FormField/select + picklist + zod stub).

## Inputs
- BA source xlsx. Default / canonical: the latest attached to the STA-82 Linear ticket —
  `projects/hr-platform-replacement/ba-source/EC-list-of-fields-V0.2.xlsx`.
  If a newer version is attached to a Linear EC ticket, download it first (signed URLs expire ~5 min)
  and pass its path with `--xlsx`.

## How to run
The engine is `parse_ec_xlsx.py` (next to this file). Run from the repo root.

```bash
XLSX="projects/hr-platform-replacement/ba-source/EC-list-of-fields-V0.2.xlsx"
SKILL=".claude/skills/ec-field-mapper/parse_ec_xlsx.py"

# 1. Full report + normalized model (main entry)
python3 "$SKILL" report --xlsx "$XLSX" --repo . --out .omc/ec-mapper
#   -> .omc/ec-mapper/report.md       (coverage summary + missing-field table)
#   -> .omc/ec-mapper/normalized.json (all fields, routed, with implemented flag + lovRef)

# 2. Scaffold a picklist from the LOV sheet (matches src/lib/admin/hire/picklists/ convention)
python3 "$SKILL" scaffold --xlsx "$XLSX" --picklist <PICKLIST_ID> --out .omc/ec-mapper
#   -> .omc/ec-mapper/scaffold/<Id>.ts   (export const XXX_OPTIONS: PicklistDefinition = [...])

# 3. Scaffold a single field (JSX + i18n; auto-includes its picklist if the LOV ref is detected)
python3 "$SKILL" scaffold --xlsx "$XLSX" --field "DVT: Partner University" --process Hiring --out .omc/ec-mapper
#   -> .omc/ec-mapper/scaffold/<key>.scaffold.txt  (FormField JSX + en/th i18n keys)

# 4. Just the normalized JSON (no report/coverage)
python3 "$SKILL" parse --xlsx "$XLSX" --out .omc/ec-mapper
```

## What the engine does
- **Parse** sheet `Employee file ` (header row 4): `process, Section, Sub-section, UI Field,
  UI Mandatory, employee group, editable, UI default, UI Validation, Remark, Edit type`.
- **Parse** sheet `LOV`: `Picklist ID | Value Code | Label EN | Label TH | Parent | Status` →
  active values (`Status = A`) become picklist options `{ id, labelTh, labelEn }`.
- **Route** each field to a UI surface:
  - `process=Hiring` → a hire-wizard step (Section→Step map in `SECTION_TO_STEP`; fallback = Section name).
  - `process=maintain` → an employee-profile section (FieldCard group keyed by Section).
- **Coverage diff**: a field counts as *implemented* if its normalized label appears in the corpus
  (`Step*.tsx`, `humi-mock-data.ts`, `sta82-employee-profile-field-spec.ts`, the picklist dir).
- **Scaffold** matches existing conventions: picklist const shape, `humi-input`/`<select>` + `pickLabel`,
  camelCase field name + kebab id, parallel en/th i18n keys.

## Interpreting the report
- `report.md` → coverage % overall and per surface, plus a table of every missing field.
- Work the missing-field table: for each row, run subcommand 3 to scaffold it, review the output,
  then a dev copies the picklist `.ts` into `src/lib/admin/hire/picklists/` (and re-exports it in
  `picklistRegistry.ts`), pastes the JSX into the routed `Step*.tsx`, and adds the i18n keys to
  `messages/{en,th}.json`.

## Caveats (state these when reporting)
- **Coverage is a fuzzy substring match**, not a semantic one. The corpus includes
  `sta82-employee-profile-field-spec.ts` (which lists labels), so a label present in the spec but
  not actually rendered can read as "implemented". Treat coverage as a triage signal — confirm the
  real surface before claiming a field is done.
- **LOV-ref detection is heuristic**: a field links to a picklist only when an LOV Picklist ID token
  appears in its validation/editable/default text. Fields whose dropdown isn't named in those columns
  won't auto-link — scaffold the picklist explicitly with `--picklist`.
- **TH labels** in scaffold come straight from the LOV sheet when present; i18n field-label keys emit
  the EN label and a `<TH translation>` placeholder.
- The `Section→Step` map (`SECTION_TO_STEP` in the engine) is small and editable — extend it when a
  new BA Section should route to a specific wizard step.

## Verifying changes to this skill
After editing `parse_ec_xlsx.py`, smoke-test against the real xlsx:
```bash
python3 .claude/skills/ec-field-mapper/parse_ec_xlsx.py report \
  --xlsx projects/hr-platform-replacement/ba-source/EC-list-of-fields-V0.2.xlsx --repo .
```
Expect ~597 fields parsed (219 Hiring / 378 maintain), ~249 picklists, and a non-empty missing table.
