export const meta = {
  name: 'ec-fields-build',
  description: 'Build the real-gap EC fields per the approved spine/leaf plan (mockup phase)',
  phases: [
    { title: 'Spine' },
    { title: 'Hiring leaves' },
    { title: 'Maintain leaves' },
    { title: 'Verify' },
  ],
}

// Shared context every build agent must honor. Mockup phase: UI + registry/static only,
// NO backend. Branch `feat/ec-fields-buildout` is already checked out — every agent COMMITS
// atomically to it (one commit per batch). Do NOT create new branches or PRs; the user merges.
const CTX = `
REPO: /Users/tachongrak/Projects/hr   APP: src/frontend (run npm from there)
Read first: .omc/plans/ec-fields-buildout-plan.md AND .omc/plans/ec-batch-manifest.md (the executable batch list — source of truth).
Conventions (from STA-82, MUST follow):
- Picklist: src/frontend/src/lib/admin/hire/picklists/<id>.ts exports XXX_OPTIONS: PicklistDefinition = readonly {id,labelTh,labelEn}[]; re-export + key in picklistRegistry.ts; locale via pickLabel(o, locale).
- country = REUSE PICKLIST_COUNTRY_ISO from @hrms/shared/picklists. NEVER create a frontend country picklist.
- Validation: zod in src/frontend/src/lib/admin/validation/hireSchema.ts (new fields OPTIONAL).
- Wizard steps: hand-written <fieldset> + humi-input / <select> in src/frontend/src/app/[locale]/admin/hire/steps/Step*.tsx (2-col grids).
- Profile (maintain): HUMI_MY_PROFILE in src/frontend/src/lib/humi-mock-data.ts:1065 (single object literal; label/value tuple arrays consumed by FieldCard).
- i18n: add parallel keys to src/frontend/messages/en.json AND th.json — TH/EN parity mandatory. Use namespaced key blocks to avoid cross-batch JSON conflicts.
- Humi tokens only. NO-RED: danger = pumpkin --color-danger, never red. Prefer larger-than-normal text.
- Coverage regression: src/frontend/src/app/[locale]/admin/hire/steps/__tests__/StepBAFieldCoverage.regression.test.ts. CURRENTLY_UNCOVERED_BA_ROWS is one Map (filters process==='Hiring'). RULE: only remove a BA row in the SAME atomic commit that lands the field token in src/frontend (else the test goes RED). Coverage corpus excludes src/services/shared + is substring-match — coverage-green is necessary NOT sufficient; READ the actual JSX to confirm the field renders.
Per-batch gate: cd src/frontend && npm run build && npm test -- --run <touched tests>. Then commit: git add -A && git commit (cite STA-82, mention the batch). Verify build+test PASS before committing; if red, fix before commit.
The mapper can scaffold a starting point (review-only, never auto-written): python3 .claude/skills/ec-field-mapper/parse_ec_xlsx.py scaffold --xlsx projects/hr-platform-replacement/ba-source/EC-list-of-fields-V0.2.xlsx --picklist <ID> --out .omc/ec-mapper
`

// ── Phase: Spine (serialized, first) ─────────────────────────────────────────
phase('Spine')
const spine = await agent(`${CTX}

BATCH = SPINE. Land all shared scaffolding in ONE commit so leaves stay conflict-free:
1. hireSchema.ts: add OPTIONAL zod fields: countryRegion, dvtPartnerUniversity, dvtDegreeLevel, gpa (string|number, hire); add moo + soi (optional) to the DependentEntry sub-schema.
2. Create 2 new picklist files + re-export + register: partnerUniversity (Picklist ID DVT_PARTNER_UNIVERSITY) and degreeLevel (DVT_DEGREE_LEVEL). Scaffold them from the LOV via the mapper, review, then adapt to the {id,labelTh,labelEn} convention. Do NOT create a country picklist.
3. Pre-create 9 EMPTY HUMI_MY_PROFILE maintain sub-arrays (named per the manifest's maintain batches: e.g. workExperienceCompany, previousEmployment, certifications, assessments, memberships, specialProjects, documents, advancedPersonal, compensationExtra) so maintain leaves only append rows.
GATE: cd src/frontend && npm run build (typecheck) + npm test -- --run StepBAFieldCoverage  — the coverage test MUST stay GREEN with ZERO rows removed (empty arrays + optional zod add no field tokens). Commit "feat(hire): SPINE — shared zod/picklists/profile-arrays for EC fields buildout (STA-82)".
Return: what landed + confirm build+coverage green.`, { label: 'spine', model: 'opus', agentType: 'oh-my-claudecode:executor' })

// ── Phase: Hiring leaves (serialized — share hireSchema/coverage map) ─────────
phase('Hiring leaves')
const h_country = await agent(`${CTX}

BATCH = HIRING LEAF "Country/Region" (BA row 49, Global Information). Add a Country/Region <select> reusing PICKLIST_COUNTRY_ISO in the Global Information section of the hire wizard (StepGlobalInfo.tsx or the step the manifest routes it to — read the manifest). Bind to zod countryRegion (already in spine). Add en+th i18n keys (namespaced). Atomically remove BA row 49 from CURRENTLY_UNCOVERED_BA_ROWS in the same commit. GATE: build + npm test -- --run StepBAFieldCoverage + a Playwright smoke (field renders + selectable). Commit "feat(hire): add Country/Region LOV field (STA-82)". Return result + screenshot path.`, { label: 'leaf:country-region', model: 'sonnet', agentType: 'oh-my-claudecode:executor' })

const h_dep = await agent(`${CTX}

BATCH = HIRING LEAF "Dependent Moo + Lane/Soi" (BA rows 130-131). Add Moo + Lane/Soi text inputs to the Dependents address fieldset (StepDependents.tsx), bound to DependentEntry.moo/soi (already in spine zod). en+th i18n. Atomically remove rows 130,131 from the coverage map. GATE: build + StepBAFieldCoverage test + Playwright smoke. Commit "feat(hire): add Dependent Moo/Lane-Soi address fields (STA-82)". Return result + screenshot.`, { label: 'leaf:dependent-addr', model: 'sonnet', agentType: 'oh-my-claudecode:executor' })

const h_dvt = await agent(`${CTX}

BATCH = HIRING LEAF "DVT Partner University + Degree Level" (BA rows 210, 212, Job Information DVT cluster). Add two <select>s using the spine picklists DVT_PARTNER_UNIVERSITY + DVT_DEGREE_LEVEL, inside the existing DVT section in StepJob.tsx (gated by shouldShowDvtSection — place beside the existing DVT fields). Bind to zod dvtPartnerUniversity/dvtDegreeLevel. en+th i18n. Atomically remove rows 210,212 from coverage map. GATE: build + StepBAFieldCoverage + Playwright smoke (reveal DVT section, fields present). Commit "feat(hire): add DVT Partner University + Degree Level (STA-82)". Return result + screenshot.`, { label: 'leaf:dvt-edu', model: 'sonnet', agentType: 'oh-my-claudecode:executor' })

const h_gpa = await agent(`${CTX}

BATCH = HIRING LEAF "GPA" (BA: process=Hiring, Section=Formal Education). USER DECISION: GPA follows the BA excel section/process → it is a HIRE field. Add a GPA input in the Formal Education area of the hire wizard (read the manifest/plan for the exact step; likely StepBiographical or a Formal Education fieldset). Bind to zod gpa (spine). en+th i18n. If GPA has a BA row in CURRENTLY_UNCOVERED_BA_ROWS, remove it atomically. GATE: build + StepBAFieldCoverage + Playwright smoke. Commit "feat(hire): add GPA (Formal Education) field (STA-82)". Return result + screenshot.`, { label: 'leaf:gpa', model: 'sonnet', agentType: 'oh-my-claudecode:executor' })

// ── Phase: Maintain leaves (serialized — share HUMI_MY_PROFILE literal) ───────
phase('Maintain leaves')
const m_exp = await agent(`${CTX}

BATCH = MAINTAIN LEAF 7 (profile). Fill the spine-created sub-arrays workExperienceCompany / previousEmployment / certifications with realistic tuple rows for the maintain fields the manifest lists (Work Experience Within Company start/end/event/company + history; Previous Employment start/end/company; Certification/License + number + name + country). Wire each array into a FieldCard group in profile/me/page.tsx (position & comp or a suitable tab) following the existing FieldCard usage. en+th i18n for any new labels. NOTE: maintain rows are process=maintain so they do NOT touch CURRENTLY_UNCOVERED_BA_ROWS (test filters Hiring). GATE: build + npm test -- --run (touched profile tests) + render assertion (no Playwright per plan). Commit "feat(profile): add EC work-experience/certification fields (STA-82)". Return result.`, { label: 'leaf:profile-experience', model: 'sonnet', agentType: 'oh-my-claudecode:executor' })

const m_assess = await agent(`${CTX}

BATCH = MAINTAIN LEAF 8 (profile). Fill sub-arrays assessments / memberships / specialProjects (Personal Assessment Summary 6 rows, Business Driver Assessment, Coaching Feedback, Professional Memberships Position/Role, Special Assignments/Projects, Community/Volunteer Org). Wire into FieldCard group(s). en+th i18n. GATE: build + touched tests + render assertion. Commit "feat(profile): add EC assessment/membership/project fields (STA-82)". Return result.`, { label: 'leaf:profile-assessments', model: 'sonnet', agentType: 'oh-my-claudecode:executor' })

const m_docs = await agent(`${CTX}

BATCH = MAINTAIN LEAF 9 (profile, FINAL). Fill sub-arrays documents / advancedPersonal / compensationExtra (OHS Document Name/URL, E-Letter Password, EBO หมายเหตุ, Additional Information Name/URL, Compa-Ratio, E-Letter). Wire into FieldCard group(s). en+th i18n. GATE: build + full npm test (whole suite) + ONE integration Playwright smoke across the profile + hire wizard confirming all new fields render and TH/EN parity holds. Commit "feat(profile): add EC document/advanced/comp fields + integration smoke (STA-82)". Return result + integration screenshot.`, { label: 'leaf:profile-docs', model: 'sonnet', agentType: 'oh-my-claudecode:executor' })

// ── Phase: Verify (final consolidated check) ─────────────────────────────────
phase('Verify')
const verify = await agent(`${CTX}

FINAL VERIFY (read-only-ish — fix only if red). On branch feat/ec-fields-buildout run from src/frontend: npm run build, npm test (full), and the EC coverage regression. Confirm: build exit 0; all tests pass; coverage regression green; i18n TH/EN key parity (en.json count == th.json count); no NO-RED violations introduced (grep new diffs for red/crimson/#ef/#f87171 etc). Summarize per-batch commit list (git log --oneline master..feat/ec-fields-buildout), final coverage numbers (re-run the mapper report), and any residual gaps. Do NOT push or open a PR — the user merges. Return a crisp completion report.`, { label: 'verify', model: 'opus', agentType: 'oh-my-claudecode:executor' })

return {
  spine,
  hiring: { country: h_country, dependents: h_dep, dvt: h_dvt, gpa: h_gpa },
  maintain: { experience: m_exp, assessments: m_assess, documents: m_docs },
  verify,
}
