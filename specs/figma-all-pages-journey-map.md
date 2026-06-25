# Figma Port — All Pages, Journey-Mapped, Persona-Labelled

> Code → Design via the **official Figma MCP server**. Capture every route of the Next.js
> frontend into one Figma file, laid out left→right by user journey, with each artboard
> cluster clearly labelled by the persona(s) who use it.

## 1. Problem & Objective

We have a clickable Next.js mockup (~160 routes under `src/frontend/src/app/[locale]/`).
HR/BA stakeholders review direction faster on a **single flat Figma canvas** than by clicking
the running app. We want a "wall map":

- **Every page** captured as a pixel-faithful Figma frame (not just the 12 priority routes
  already done in `specs/figma-live-capture.md`).
- **Journeys flow left → right** in vertical lanes (columns), one lane per journey stage, so a
  reviewer reads the product like a storyboard.
- **Personas labelled** on every cluster (A System/HR Admin · B People Partners · C Manager ·
  D Employee) so it's obvious *who* each screen is for.

This is **additive** to the existing "Humi HR — Live Capture" file (`fileKey
S3lmjnZpoIawSEz2Ov3nkB`), which already holds 12 captured routes + a componentized Home. We
extend that file rather than start fresh.

### Out of scope
- No backend, no re-componentization of every screen (raw captures are acceptable for the wall
  map; componentization stays a separate track per `figma-live-capture.md`).
- EN canonical only (`/en/...`). TH parity is verified in-app, not double-captured.

## 2. Technical Approach

Reuse the **proven capture recipe** (see `memory/reference_figma_mcp_code_to_design.md` and
`specs/figma-live-capture.md`). The only reliable path; do not improvise.

### 2.1 Prereqs (one-time)
1. **Paid Figma plan** active on `kenstudio.io@gmail.com` (Starter free dies after ~12 MCP
   calls — this job is ~160 captures, so paid is mandatory).
2. `capture.js` present **at parse time** in `src/frontend/src/app/layout.tsx` `<head>`:
   ```html
   <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />
   ```
   Dynamic injection does NOT fire. Remove this line when the whole job is done.
3. Dev server running: `cd src/frontend && npm run dev` (port 3000).
4. Auth seeded in the **real Chrome profile** localStorage so every gated route renders:
   `humi-auth = {state:{userId:'ADM001',username:'admin',email:'admin@humi.test',
   roles:[<ALL roles>],isAuthenticated:true},version:0}`. Super-user sees every menu/route.
5. **Lifecycle/gated forms** (terminate, pay-rate, contract-renewal, probation,
   change-type, rehire, acting, special-privilege, reallocate-budget) sit behind
   `EffectiveDateGate` — the form body doesn't render until a date is entered + "ยืนยันวันที่มีผล"
   clicked, and several only accept PARTIME ids (EMP-0009/10/21/25). For these, either
   (a) pre-fill the gate via a seeded query/localStorage helper before capture, or (b) accept a
   gated-state capture and annotate it. Decide per route in Phase 0.

### 2.2 Per-page capture loop (batch ~4)
For each route:
1. `generate_figma_design(fileKey)` → mint a `captureId`.
2. macOS **real browser** open (capture.js needs the Figma handshake the CDP tab lacks):
   ```
   open "http://localhost:3000/en/<route>#figmacapture=<id>&figmaendpoint=https%3A%2F%2Fmcp.figma.com%2Fmcp%2Fcapture%2F<id>%2Fsubmit&figmadelay=1500"
   ```
3. Poll `generate_figma_design(fileKey, captureId)` every ~8–12s until "added to your existing
   file".
4. Stagger 4 at a time (mint 4 → open 4 → poll 4). Dynamic-segment routes need a real id in the
   path (`/profile/me`, `/quick-approve/<seed-id>`, `/admin/employees/EMP-0009`,
   `/workflows/leave/<seed-id>`, etc.) — resolve a valid seed id per dynamic route in Phase 0.

### 2.3 Layout: journey lanes (left → right)
After capture, frames land stacked. Arrange them into **vertical lanes**, one lane per journey
column, ordered left→right by the journey order in §3. Inside a lane, stack screens top→bottom
in the order a user hits them. Do this with the Figma plugin scripting API (positioning frames
by `x`/`y`), not by hand:
- Lane width = max frame width in lane + gutter (≈ 80px). Lane pitch ≈ 1600px.
- Vertical pitch inside a lane ≈ frame height + 120px (room for the per-frame caption).

### 2.4 Labels & persona chips
- **Lane header** (top of each column): big text title = journey name + a persona band
  (colored chips A/B/C/D). Use the brand tokens: teal `--color-accent #1FA8A0` = primary,
  indigo `#5B6CE0` = alt; keep NO-RED (danger = pumpkin `#FB923C`).
- **Per-frame caption** (above each frame): route path (`/en/<route>`) + screen name + the
  persona chip(s) that can reach it (RBAC-derived, see §4).
- Build a small **legend frame** at far left: the 4 persona tiers with colors + one-line role
  mapping (A=hr_admin/hr_manager, B=hrbp/spd, C=manager, D=employee).

## 3. Journey Lanes (left → right order)

Persona key: **A**=System/HR Admin · **B**=People Partners · **C**=Manager · **D**=Employee.

| # | Lane (journey) | Persona band | Representative routes |
|---|----------------|--------------|-----------------------|
| 0 | **Entry / Auth** | all | `/` , `/login`, `/home` |
| 1 | **Employee Self-Service** | D | `/profile/me`, `/profile/[tab]`, `/employees/me`, `/employees/me/payslip`, `/employees/me/benefits`, `/payslip`, `/me/documents`, `/me/documents/request`, `/ess/profile/edit`, `/ess/workflows`, `/requests`, `/announcements`, `/careers` |
| 2 | **Time & Leave (ESS)** | D · C | `/timeoff`, `/overtime`, `/time/clock`, `/resignation` |
| 3 | **Benefits (employee)** | D | `/benefits-hub` + `/beneficiary` `/history` `/hospital-claim` `/life-accident` `/physical-checkup` `/referral` `/reimbursement`; `/benefits`, `/hospital-referral`, `/profile/benefits`, `/profile/[tab]/benefits` |
| 4 | **Approvals hub** | C · B · A | `/quick-approve`, `/quick-approve/[id]`, `/quick-approve/bulk`, `/workflows`, `/workflows/{leave,ot,probation,pay-rate,resignation,tax-planning,time-correction,benefit-claim}/[id]`, `/workflows/probation` |
| 5 | **Manager** | C | `/manager-dashboard`, `/manager-dashboard/probations`, `/manager/team`, `/manager/benefits/team`, `/manager/benefits/reports` |
| 6 | **People Partners (HRBP/SPD)** | B | `/hrbp/dashboard`, `/hrbp/employees`, `/hrbp/doc-review`, `/hrbp/talent-search`, `/hrbp/benefits/{exceptions,reports}`, `/spd/benefits/{branch-view,reports}`, `/spd-management` |
| 7 | **Time & Attendance (admin)** | A · C | `/time`, `/time/timesheet`, `/time/corrections`, `/time/review`, `/time/shift-schedule`, `/time/import`, `/roster` |
| 8 | **HR Admin — Employee Lifecycle** | A | `/admin/employees`, `/admin/employees/[id]`, `/admin/employees/[id]/{edit,terminate,transfer,probation,pay-rate-change,change-type,contract-renewal,rehire,acting,special-privilege,reallocate-budget}`, `/admin/hire`, `/admin/employees/import`, `/admin/change-requests`, `/admin/documents` |
| 9 | **HR Admin — Benefits Admin** | A | `/admin/benefits` + `/plans` `/records` `/records/[planId]` `/rules` `/exception` `/beneficiaries` `/import` `/lifecycle` `/payment` `/reports` |
| 10 | **HR Admin — Foundation / Org** | A | `/admin/foundation`, `/admin/foundation/divisions`, `/admin/jobs`, `/admin/positions`, `/admin/organization`, `/locations`, `/org-chart` |
| 11 | **HR Admin — Self-Service Config** | A | `/admin/self-service` + `/field-config` `/mandatory` `/quick-actions` `/readonly` `/tiles` `/visibility` |
| 12 | **HR Admin — System & Users** | A | `/admin/system` + `/security/*` `/integration` `/notifications` `/payroll-rules` `/time-policy` `/benefit-catalog` `/system-features/*` `/reports/*`; `/admin/users/*`, `/permissions`, `/integrations`, `/admin/import` |
| 13 | **Payroll** *(other team — capture for completeness)* | A | `/payroll`, `/payroll/{processing,setup,import,reports,tax-planning,tax-review}` |
| 14 | **Reports & Analytics** | A · B | `/reports`, `/reports/builder`, `/admin/reports`, `/admin/system/reports/{builder,schedule,automation,favourites}` |
| 15 | **Talent / Perf / Learning** *(external placeholders)* | A · C · D | `/goals`, `/idp`, `/development`, `/performance`, `/performance-form`, `/succession`, `/talent-management`, `/learning`, `/learning-directory`, `/training-records`, `/recruiting`, `/screening` |

> The authoritative route list is the `find . -name page.tsx` output (160 files). Lanes above
> cover all of them; Phase 0 freezes the exact membership + a valid seed id for every dynamic
> segment.

## 4. Persona → route mapping (for the chips)

Derive each frame's persona chip(s) from the menu/RBAC source, not by eyeballing:
- `src/lib/rbac.ts` — role hierarchy (`employee < manager < hrbp < spd < hr_admin < hr_manager`,
  implicit inheritance).
- `src/lib/persona-tiers.ts` — `ROLE_TIER` maps roles → tiers A/B/C/D.
- The shell nav config (Sidebar) — which menu group each route sits under, and which roles see
  that group (menu RBAC = remove-not-hide, so the menu config *is* the access map).

Produce a `route → tiers[]` table once (small script reading the nav config), then stamp the
chips during the labelling pass. Routes reachable by multiple tiers (e.g. `/quick-approve`) get
multiple chips.

## 5. Step-by-step

**Phase 0 — Inventory freeze (no Figma calls)**
1. Snapshot the 160 routes; assign each to a lane (§3) and resolve a valid seed id for every
   dynamic segment (`[id]`, `[tab]`, `[planId]`).
2. Build the `route → tiers[]` map from nav/RBAC.
3. List the EffectiveDateGate / PARTIME-only routes and decide pre-fill vs gated-capture per
   route.
4. Output a single `figma-capture-manifest.json`: `[{route, lane, x_lane, persona:[...],
   seedId?, gateNote?}]`. This drives every later phase deterministically.

**Phase 1 — Prereqs**
5. Confirm paid Figma plan; add `capture.js` to `layout.tsx`; start dev server; seed super-user
   auth in the real Chrome profile.

**Phase 2 — Capture (batches of 4)**
6. Walk the manifest, minting + opening + polling 4 routes at a time. Record each returned node
   id back into the manifest (`route → nodeId`). ~40 batches.
7. Re-capture any frame that comes back blank/gated incorrectly.

**Phase 3 — Layout**
8. Plugin script: for each lane, set frame `x` to the lane's column origin and `y` to a running
   top→bottom cursor; gutters per §2.3.

**Phase 4 — Labels**
9. Plugin script: lane headers (title + persona band), per-frame captions (path + name + chips),
   and the legend frame at far left. Use token colors; honor NO-RED.

**Phase 5 — Verify & clean up**
10. Screenshot the full canvas; confirm every manifest route has a frame + caption + correct
    chip, lanes read left→right, no overlaps.
11. Remove `capture.js` from `layout.tsx`. Commit the manifest + this spec.

## 6. Challenges & mitigations

| Risk | Mitigation |
|------|------------|
| Free-plan ~12-call cap | Require paid plan before Phase 2 (hard gate). |
| capture.js hangs in CDP/automation tab | Use macOS `open` into the **real** browser only. |
| Dynamic routes 404 / empty | Resolve real seed ids in Phase 0; verify each renders before capture. |
| Gated lifecycle forms render empty | Pre-fill EffectiveDateGate or annotate the gated capture; PARTIME ids only. |
| Captures are raw frames, not components | Acceptable for the wall map; componentization is the separate `figma-live-capture.md` track. |
| Black fills on labels | Bind paints with full `VariableID:` prefix / inline `boundVariables` (see memory gotchas). |
| 160 frames = slow/expensive | Batch 4; allow resume from manifest `nodeId` state; rate-limit aware. |
| TH/EN drift | Capture EN canonical; verify TH parity in-app, don't double-capture. |

## 7. Success criteria
- One Figma file where **all 160 routes** appear as labelled frames.
- Frames grouped into the 16 journey lanes, reading **left → right** in journey order.
- Every frame carries its **route path + screen name + persona chip(s)**; every lane has a
  persona band header; a legend explains A/B/C/D.
- `figma-capture-manifest.json` committed (route → lane → persona → nodeId), so the map is
  reproducible/extensible.
- `capture.js` removed from `layout.tsx` after the run.

## 8. References
- `specs/figma-live-capture.md` — full prior capture map (12 routes) + componentization recipe.
- `memory/reference_figma_mcp_code_to_design.md` — working recipe + binding gotchas.
- `src/lib/persona-tiers.ts`, `src/lib/rbac.ts` — persona/RBAC source of truth.
- Figma file `S3lmjnZpoIawSEz2Ov3nkB` ("Humi HR — Live Capture").
</content>
</invoke>
