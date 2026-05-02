# HR Platform Replacement — Handoff

**Date:** 2026-05-02
**Status:** Mockup ready for HR walkthrough approval. Production wiring deferred.
**Repo:** https://github.com/aeiouboy/hr (latest: `bd09180`)

This is the canonical entry point. Read this first, then dive into the linked docs as needed.

---

## 1. What this project is

A clickable Next.js mockup of a Central Group HR platform replacement (EC + Benefits modules), built so HR can review and approve the UI direction before backend implementation begins. The mockup runs against in-memory data and is **demo-only** — no real backend, no real PII.

**Goal:** HR walkthrough → redlines → production sprint kickoff.

---

## 2. Quick start

```bash
cd src/frontend
npm install
NEXT_PUBLIC_DEMO_MODE=true npm run dev
# http://localhost:3000/th/login
```

Then hit the LAN URL from any device on the same network: replace `localhost` with the host IP (e.g. `http://192.168.x.x:3000`).

**The `NEXT_PUBLIC_DEMO_MODE=true` flag is load-bearing** — without it, `switchPersona` is a no-op. `.env.development` already sets it; `.env.production` must NOT.

---

## 3. Demo logins

| Email | Password | Persona | Lands on |
|---|---|---|---|
| `admin@humi.test` | `admin2026` | super-user (proxies into all 5 personas) | `/th/admin` |
| `employee@humi.test` | `employee2026` | Employee | `/th/home` |
| `manager@humi.test` | `manager2026` | Manager (restricted Approver) | `/th/home` |
| `spd@humi.test` | `spd2026` | SPD (specialist Approver) | `/th/spd/inbox` |
| `hrbp@humi.test` | `hrbp2026` | HRBP (full Approver + Talent Search) | `/th/admin/employees` |
| `hris@humi.test` | `hris2026` | HRIS Admin (system config) | `/th/admin/system` |

Plus 4 SF-canonical names (`ken@humi.test`, `apinya@humi.test`, `worawee@humi.test`, `rungrote@humi.test`) mapped to the same role tiers.

After login, use the **PersonaSwitcher dropdown in the Topbar** to swap personas mid-session without logging out.

---

## 4. Walkthrough script for HR

Use `WALKTHROUGH-SCRIPT.md` in this directory. It's a 45-minute, 5-flow guide covering each persona variant, with redline-capture template at the end.

5 demo flows (≈8–10 min each):
1. **Employee** — `/home`, profile, benefits hub, claim submit, doc request, time off
2. **Manager** — restricted approver inbox, no BE visibility, probation evaluation
3. **HRBP** — full approver + Talent Search + reroute capability
4. **SPD** — specialty queue + override + audit
5. **HR Admin / HRIS Admin** — admin shell, lifecycle wizards, system config

---

## 5. Persona model (locked decision)

**3 UI shells × 5 capability variants** — locked after analyzing SF RBAC probe data:

| Shell | Capability variants | Routes |
|---|---|---|
| User | Employee | `/home`, `/me`, `/profile`, `/ess`, `/benefits-hub` |
| Approver | Manager · SPD · HRBP — same components, **field-level RBAC** + queue scope differ | `/manager-dashboard`, `/quick-approve`, `/spd/inbox`, `/spd-management`, `/hrbp/dashboard` |
| Admin | HR Admin · HRIS Admin — `/admin/system/*` extra for HRIS | `/admin/*` (47+ pages) |

Why hybrid (not pure 3): SF probe shows Manager has **0 fields** of `BenefitEmployeeClaim`, while HRBP has near-HR-Admin parity. Collapsing them hides the RBAC posture HR must validate. Capability bundles in `src/lib/capabilities.ts` encode this.

---

## 6. What's done (engineering)

### Foundation
- **Field-level RBAC**: `lib/capabilities.ts` (Manager hidden from BE claims per SF truth) + `useCapabilities()` hook + `<Capability>` gate component
- **Persona switcher** in Topbar with proxy mode (super-user can switch and return)
- **6 BE workflow templates** (`SimpleClaimForm`, `HospitalClaimForm`, `RecordsFlatForm`, `RecordsDependentForm`, `RecordsComputedView`, `LifecycleAdminForm`) — collapse 27 BE features into reusable shapes
- **Plan registry**: 28 plans on full v2 A3 schema fidelity (coverage / eligibility / claimRules / coverageType / notifications sub-objects); fields sourced from SF `Benefit` 80-field entity

### Approver shell (Sprint 1)
- `/quick-approve` unified workspace + filter chips + bulk approve + detail viewer
- Manager + HRBP landings
- SPD case management
- HRBP-only Talent Search (30-input filter)

### BE Admin (Sprint 3)
- `/admin/benefits/manage` (4 lifecycle tabs)
- `/admin/benefits/plans` (catalog of all 28 plans with edit modal)
- `/admin/benefits/records` + per-plan template renderer + beneficiary admin
- `/admin/benefits/rules` (read-only viewer of 76 SF business rules)
- User Reimbursement + Hospital Claim flows wired to F4 templates

### Workflow surface (latest round)
- `ApprovalChain` visualization on **7 lifecycle wizards** (transfer/probation/rehire/acting/contract-renewal/promotion/terminate) + **4 employee workflow surfaces** (timeoff, overtime, hospital-referral, personal-info change) + **3 workflow listing pages** (workflows, ess/workflows, workflows/probation)
- Resignation E2E (Employee → HRBP → SPD → HR Admin terminate)
- Probation Pass / Fail / Extend outcomes with chain restart
- Manager probation evaluation page (`/manager-dashboard/probations`)
- Document request flow (`/me/documents/request` → `/admin/documents`) + 8 doc templates

### Cross-cutting UI primitives
- `EmptyState`, `NotificationBell`, `ActingBadge`, `Textarea`, `RejectReturnDrawer`
- Topbar bell with mock notifications + acting-on-behalf badge
- `/admin/system/notifications` template config
- `/admin/system/security/audit` filterable audit log

### Production-readiness gates added
- `NEXT_PUBLIC_DEMO_MODE` flag gates `switchPersona` (Playwright-safe, vs NODE_ENV which would break `next start`)
- `assertDemoModeSafe()` boot guard throws if demo flag leaks into production NODE_ENV
- `_hasHydrated` documented as load-bearing for SSR safety

### RBAC defects fixed
- `getHighestRole` now includes `spd` and `hrbp` (were missing)
- `MODULE_ACCESS` audit closed gaps in `quick-approve`, `spd-management`, `hrbp-reports`

### Humi design conformance
- 460+ raw color violations swept to Humi tokens (no `border-border`, no raw `gray/blue/red-N`, no `bg-white`)
- Shadow utilities → `var(--shadow-*)`
- Token sweep: `rounded-[Xpx]` → `var(--radius-*)`
- All locale hrefs prefixed `/th/`

### Tests + verification
- **91+ tests green** on Sprint 0+1+3+ralplan+workflow deltas
- **5/5 Playwright persona walkthrough**, 36 screenshots in `e2e/screenshots/persona-walkthrough/`
- Production build green, ESLint clean on deltas

---

## 7. Project structure

```
projects/hr-platform-replacement/        ← THIS DIR — planning + docs + handoff
├── HANDOFF.md                           ← (you are here)
├── MOCKUP-MATRIX.md                     ← screen-by-screen plan, 91 rows
├── WALKTHROUGH-SCRIPT.md                ← HR demo script + redline template
├── VISUAL-VERIFICATION-2026-05-02.md    ← Playwright run log + screenshot inventory
├── AUTOPILOT-SUMMARY-2026-05-02.md      ← session summary
└── extracted-context-2026-05-02/        ← SF research + open-question backlog
    ├── 00-DEEP-INTERVIEW-INPUT.md       ← P0/P1/P2 question backlog for HR
    ├── 01-sf-system-baseline.md         ← SF crawl (75 entities × 4 personas RBAC probe)
    ├── 02-ba-requirements.md            ← BA scope, 207 BRDs, open decisions
    ├── 03-brd-flow-matrices.md          ← BRD↔TTT mapping, 11 flows × 16 manuals
    ├── 04-benefit-features.md           ← 27 BE feature workflow cards
    ├── 05-field-dictionary.md           ← 296 EC fields + BE entities
    ├── 06-benefit-schema-FULL.md        ← full Benefit field schema (96 entities, Benefit=80f)
    └── 07-benefit-rules-FULL.md         ← 76 SF business rules grouped by base object

src/frontend/                            ← the Next.js app
├── src/
│   ├── app/[locale]/                    ← all routes; locale-prefixed
│   ├── components/
│   │   ├── humi/                        ← design system primitives + shell
│   │   ├── benefits/templates/          ← 6 reusable BE workflow templates
│   │   ├── quick-approve/               ← unified Approver workspace + ApprovalChain
│   │   ├── manager/, spd/, talent/      ← persona-specific surfaces
│   │   └── admin/, profile/, workflow/
│   ├── data/                            ← mock data registries
│   │   ├── benefits/{plan-registry,rules-registry}.ts
│   │   ├── documents/templates.ts
│   │   ├── notifications/mock.ts
│   │   └── audit/mock.ts
│   ├── lib/
│   │   ├── rbac.ts                      ← Role + ROLE_HIERARCHY + MODULE_ACCESS
│   │   ├── capabilities.ts              ← field-level RBAC bundles per role
│   │   ├── demo-users.ts                ← 10 demo logins
│   │   ├── demo-mode-guard.ts           ← assertDemoModeSafe()
│   │   └── humi-mock-data*.ts           ← employee/profile mock data
│   ├── hooks/                           ← React hooks (use-capabilities, use-* per domain)
│   ├── stores/                          ← Zustand stores (auth-store, *-approvals)
│   └── messages/{th,en}.json            ← i18n
├── e2e/persona-walkthrough.spec.ts      ← Playwright spec (5 personas, slow-paced)
├── e2e/screenshots/persona-walkthrough/ ← 36 captured PNGs
├── playwright.config.ts                 ← env block sets NEXT_PUBLIC_DEMO_MODE
├── .env.development                     ← NEXT_PUBLIC_DEMO_MODE=true
└── .env.production                      ← MUST NOT contain NEXT_PUBLIC_DEMO_MODE

.omc/plans/
├── autopilot-impl.md                    ← Sprint 0+1+3 progress log
└── ralplan-sprint-defects-2026-05-02.md ← consensus plan after Architect+Critic loop
```

---

## 8. How the foundation hangs together

**Persona resolution chain:**
```
PersonaSwitcher.tsx → auth-store.switchPersona({roles}) → useAuthStore({roles})
  → useCapabilities() → resolveCapabilities(roles) → CapabilityBundle
  → <Capability entity="…" action="…">{children}</Capability>
```

**Per-claim chain visualization:**
```
plan-registry.ts BenefitPlan { approvalChain: ApproverStage[] }
  → SimpleClaimForm/HospitalClaimForm renders <ApprovalChain stages={plan.approvalChain} />
  → quick-approve detail page shows full timeline + history
```

**Lifecycle wizard chain:**
Each `/admin/employees/[id]/{transfer,probation,rehire,acting,contract-renewal,promotion,terminate}` page imports `ApprovalChain` from `@/components/quick-approve/ApprovalChain` and renders the chain near the top with `currentStage` highlighted.

---

## 9. Open decisions (HR must answer during walkthrough)

Full P0/P1/P2 backlog: `extracted-context-2026-05-02/00-DEEP-INTERVIEW-INPUT.md`. Defaults baked into the mockup, HR redirects during review:

**P0 (will affect production sprint planning):**
- Effective dating UX — SF posture (date-travel header) or simplified?
- Termination picklist — full SF 17 codes or current 5?
- BE template strategy confirmed (6 reusable shapes vs 27 bespoke screens)
- Approval chain shape per workflow type (mockup uses HRBP→SPD→HR Admin for BE, skipping Manager per SF truth)
- HRBP/SPD UI differentiation level (currently same shell + different capability bundle)
- Manager surface depth — what does Manager actually do beyond approvals?
- BE BRD parity — does a benefit-side BRD inventory exist (only EC has 207 BRDs)?
- Schema naming — adopt SF `Per*`/`Emp*` split or flatten?

**P1 (per-area, can be deferred to specific sprint):**
- Notifications channels (currently in-app + email mock; SMS off)
- T&A integration (BUILD vs INTEGRATE vs EMBED `cnext-time.centralgroup.com`)
- EC Document hub for ~50K letters/year
- Reporting model (28-sheet Excel vs hub of report widgets)
- Special Information framework (BRD #35–84 — currently 50/50 ❌, not built)
- Rehire `useNewCode` rules
- 12 sensitive-field re-auth list

---

## 10. What's deferred (out of scope for HR walkthrough)

| Item | Where to find tracking |
|---|---|
| Real backend wiring | All API calls are mock; switchPersona, claim submit, etc. log to console |
| BE-27 SAP IT0015/IT0267 payment posting | `manage` page has Payment Cycle section, not full posting UI |
| EC Special Information framework (BRD #35–84) | MOCKUP-MATRIX gap notes; entire subsystem absent |
| HRIS Picklist Centre UI (251 picklists / 47k LOVs) | Code-managed for now |
| Business Rules editor (551 rules; 76 BE rules have read-only viewer) | edit deferred |
| Workflow definitions config (53 FOEventReason workflows) | Sprint 4 candidate |
| Mass operations (bulk transfer/terminate/promote) | Sprint 3 follow-up |
| Salary advance / training assistance / educational reimbursement | Domain-specific |
| Annual increment letter cycle (~50K/year) | EC Document hub gap |
| Compliance: data retention + right to forget (PDPA Art 16/17) | Sprint 5 candidate |
| External integrations (T&A, Performance, Learning, Recruitment) | Per integration decisions |
| Real-volume mock (240K employees, 164 cos, 17K depts) | Mock has ~30 employees, would need virtualization |
| VN locale | Vietnam in dataset; no VI translations yet |

---

## 11. Production-readiness gates still to close

Per Phase-4 security review (in `AUTOPILOT-SUMMARY-2026-05-02.md`). Demo build is internal-safe; production deployment requires:

1. **Strip mock-auth path** — `switchPersona` no-ops without `NEXT_PUBLIC_DEMO_MODE=true` (already gated). Production env must NOT set the flag. Persisted `humi-auth` localStorage `roles` must be ignored when a real OIDC/Keycloak session exists.
2. **Backend RBAC parity** — Every action `<Capability>` gates (`approve`, `bulkApprove`, `editFoundation`, `systemConfig`, `talentSearch`, `override`) must be re-enforced server-side against the same SF probe matrix. The bundle here is presentation hint only.
3. **Persist allowlist tightening** — `auth-store` partialize currently writes `userId/email/roles` to localStorage. Prod prefers in-memory + httpOnly refresh-token cookie.
4. **Replace mocks** — `MOCK_DEPENDENTS`, `MOCK_SALARY_THB`, `Date.now()` workflow IDs must be backend-issued.
5. **JSDoc warnings** on `Capability.tsx` and `useCapabilities.ts` documenting "client-only, not enforcement" — already done; keep when refactoring.
6. **CI grep** that fails the build if `NEXT_PUBLIC_DEMO_MODE` appears in any `.env.production*` file.

---

## 12. How to extend (for the next dev/team)

### Adding a new persona
1. Add role to `Role` union in `src/lib/rbac.ts`
2. Add to `ROLE_HIERARCHY` and `MODULE_ACCESS` maps
3. Add capability bundle in `src/lib/capabilities.ts` `BUNDLES` map
4. Add demo user in `src/lib/demo-users.ts` (DEMO_USERS + PERSONA_ORDER + PERSONA_BADGE + ROLE_LANDING)
5. Add unit test in `src/lib/__tests__/capabilities.test.ts`

### Adding a new BE plan
1. Append to `src/data/benefits/plan-registry.ts` BENEFIT_PLAN_REGISTRY array
2. Use v2 A3 schema (set `schemaVersion: 'v2'` and fill all 5 sub-objects)
3. Reference rule from `src/data/benefits/rules-registry.ts` via `eligibility.eligibilityRuleId`
4. Pick a `template` — UI auto-routes via `pickTemplate(plan)` from `templates/index.ts`

### Adding a new workflow with chain
1. Pick approver chain (e.g. `['manager', 'hr_admin']`) — Manager skipped for BE per SF truth
2. Render `<ApprovalChain stages={…} currentStage={…} />` from `@/components/quick-approve/ApprovalChain`
3. Add the workflow surface to `/ess/workflows/page.tsx` mock list with status + days waiting
4. (Optional) Add to `/quick-approve` filter chip list if approver-actionable

### Running tests
```bash
cd src/frontend
npm test                                # full vitest run
npx vitest run src/lib/__tests__/capabilities.test.ts  # single file
npx playwright test e2e/persona-walkthrough.spec.ts --project=chromium --workers=1
```

### Re-running visual verification
```bash
npm run dev                                                 # terminal 1
npx playwright test e2e/persona-walkthrough.spec.ts \
  --project=chromium --workers=1 --reporter=list           # terminal 2
# Screenshots regenerate to e2e/screenshots/persona-walkthrough/
```

---

## 13. Known issues / debt

1. **22 aspirational tests in `quick-approve-workspace.test.tsx`** previously failed because they expected checkbox multi-select that the rendered component doesn't have. Fixed via C1a in ralplan execution. Verify by `npx vitest run src/components/quick-approve/__tests__/quick-approve-workspace.test.tsx`.
2. **709 raw `text-sm`** still in codebase — Tailwind `text-sm`=14px doesn't exactly match Humi `text-small`=13px or `text-body`=15px. Per-component judgment needed; mass-replace risks visual breakage.
3. **459 hire-wizard legacy `humi-input/select/label/btn` classes** — a separate CSS subsystem in `globals.css`. Could be migrated to Humi primitives but is sprint-sized.
4. **Pre-existing test failures** (10 of 1819 in main `npm test` run) all caused by recent `master` commits BEFORE this session — humi-responsive expects pre-redesign tokens, humi-reference-smoke expects pre-launcher tabs, profile resign link relocated, HirePage wizard mid-refactor. Not regressions from this work.

---

## 14. Vercel deployment

- Repo: `aeiouboy/hr` on GitHub
- Branch: `master` → auto-deploys
- Latest deploy: commit `bd09180`
- **CRITICAL**: Set `NEXT_PUBLIC_DEMO_MODE=true` in Vercel project → Environment Variables → **Preview** scope only (NOT Production). Otherwise `switchPersona` is a no-op on the deployed URL and HR can't demo persona variants.
- Dev runs locally with the env var auto-set via `.env.development`.

---

## 15. Contacts / lineage

- Built via Anthropic Claude Code (autopilot + ralplan + multi-agent team modes) over a single session 2026-05-02
- 12 commits in `aeiouboy/hr` history; this session's commit is `bd09180`
- Co-author tag in commit message: `Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

---

## 16. What to do next (recommendation)

1. **Run the HR walkthrough** using `WALKTHROUGH-SCRIPT.md` — capture redlines per the template at the end of that doc
2. **Triage redlines** — bucket into "fix in mockup before approval" vs "log for production sprint"
3. **Address Tier-1 P0 questions** (in `00-DEEP-INTERVIEW-INPUT.md`) with HR before sprint planning
4. **Production sprint planning** — convert P0/P1 answers into ticketed work; reference `MOCKUP-MATRIX.md` for screen ownership
5. **Backend integration sprint** — start from production-readiness gates in §11

End of handoff. Questions → check the linked docs first; they're indexed for the questions HR usually asks.
