# Deep Interview Spec: EC Field Mapper Skill

## Metadata
- Interview ID: ec-field-mapper-2026-05-29
- Type: brownfield
- Generated: 2026-05-29
- Status: PASSED (scope locked via 5 user decisions)

## Background / why this exists
STA-82 ("[EC]final Employee profile") mapped 52 EC fields from a BA spreadsheet onto the
hire wizard by hand: picklist registry, zod validation, FormField JSX, i18n keys, and a
field-coverage regression. The BA source (`EC- list of fields V0.2.xlsx`, attached to the
STA-82 Linear ticket) has **604 fields** total (219 Hiring + 380 maintain) plus a 78k-row
LOV sheet. More EC modules are coming. Doing this mapping by hand each time is the bottleneck.

This skill encodes that manual mapping as a repeatable tool.

## Goal
Given the latest BA EC field spreadsheet, produce (a) a field→UI mapping report, (b) a
coverage diff against what's already implemented, and (c) scaffold code for missing fields —
covering BOTH the hire wizard (process=Hiring) and the employee profile (process=maintain).

## Locked decisions (from interview)
| # | Question | Decision |
|---|----------|----------|
| 1 | Input source | The **latest BA file in STA-82 Linear** = `EC- list of fields V0.2.xlsx`. Parse `.xlsx` directly. |
| 2 | xlsx parsing without new JS dep | Parse via **python3 + openpyxl** (already available offline) — never add a JS xlsx dependency (honors no-new-deps + mockup rule). |
| 3 | Output depth | **Report + scaffold code** — gen picklist registry entry, zod schema stub, FormField/select JSX, and i18n key pairs for dev to review (NOT auto-applied to source). |
| 4 | Surface coverage | **EC full set** — hire wizard (Hiring) + employee profile (maintain). |
| 5 | req #2 (year/date pairing) | Already DONE on master (FieldCard `paired`, verified 2-col @1440px). Out of mapper scope. |

## BA source structure (canonical sheet `Employee file `, header row 4)
- col0 `process`: `Hiring` | `maintain`
- col1 `Section`, col2 `Sub-section`, col3 `UI Field`, col4 `UI Mandatory`
- col5 `employee group` (Permanent / Expat / Retirement / Temporary…)
- col11 `editable/fix value`, col12 `UI default`, col13 `UI Validation`
- col14 HR validation logic, col15 Require HR confirm, col17 Remark, col18 Edit type, col19 Allow to maintain by
- col27 Promotion, col29 Suspension, col31 Transfer, col34 Temporary assignment (movement flags)
- Sheet `LOV`: `Picklist ID | Status | Value Code | Non-Unique Code | Parent | Default Label | Label EN | Label TH`
- Sheet `summary of hiring maintain`: Process → Section → Sub-section map

## Target conventions (must match existing)
- Picklist: `src/lib/admin/hire/picklists/<id>.ts` exporting `XXX_OPTIONS: PicklistDefinition`
  = `readonly { id, labelTh, labelEn }[]`; re-exported from `picklistRegistry.ts` + keyed in `PICKLIST_REGISTRY`.
- Validation: zod refinements in `src/lib/admin/validation/hireSchema.ts`.
- i18n: parallel keys in `messages/en.json` + `messages/th.json` (TH/EN parity).
- Wizard steps: `Step*.tsx` (hand-written `<fieldset>` + `humi-input`/`<select>`); 2-col grids.
- Profile: `humi-mock-data.ts` `job`/`personal` arrays consumed by `FieldCard`.

## Acceptance Criteria
- [ ] Skill `ec-field-mapper` exists at `.claude/skills/ec-field-mapper/SKILL.md` with a working python parser.
- [ ] Parser reads the xlsx offline (openpyxl), emits normalized JSON: fields[] + lov[] (referenced IDs only).
- [ ] Each field routed to a surface: Hiring→wizard step, maintain→profile section, via the Section/Sub-section map.
- [ ] Coverage diff classifies every BA field as implemented / missing / extra vs current code.
- [ ] Scaffold emitted to a staging dir (`.omc/ec-mapper/`), NOT applied to `src/` — dev reviews then copies.
- [ ] Scaffold matches conventions above (picklist const shape, zod stub, FormField JSX, en+th key pairs).
- [ ] Markdown report written with mapping table + coverage summary + scaffold index.
- [ ] Smoke-tested against the real V0.2 xlsx (parses 604 fields, emits report without error).

## Non-Goals
- No auto-writing into `src/` (scaffold is staged for human review).
- No new JS/npm dependency (xlsx parsing is python-side).
- No backend wiring (mockup phase).
- req #2 year/date pairing (already shipped).

## Ontology (key entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| BAField | core | process, section, subSection, uiField, mandatory, employeeGroup, editable, default, validation, lovRef | routed to → Surface; references → Picklist |
| Picklist (LOV) | core | picklistId, valueCode, labelEn, labelTh, parent, status | referenced by → BAField |
| Surface | supporting | kind (wizard-step \| profile-section), name | target of → BAField |
| CoverageRow | derived | baField, status (implemented\|missing\|extra), targetFile | diff of BAField vs code |
| Scaffold | output | picklistTs, zodStub, jsx, i18nEn, i18nTh | generated for → missing BAField |
