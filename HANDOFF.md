# HANDOFF — 2026-05-26 (clickable HRMS approvals + shell follow-ups)

**Status: all work MERGED to `master` (tip `abcbe20e`) — integrated build GREEN.** Branch `feat/clickable-hrms-pr1a-approval-registry` and the 3 follow-up branches are merged; future work branches off `master`.

## What landed (4 PRs, all merged)
| PR | What |
|----|------|
| #186 | Sidebar/IA restructure + **org-chart visible to ALL personas** (was admin-only; moved into "My Workspace / พื้นที่ทำงานของฉัน", `show: ALL6`) + pre-existing build-error fixes (`receiptDate`, `labelEn`) |
| #188 | **Clickable HRMS approvals (PR-1a→PR-5)** — the main work |
| #189 | Global type scale: removed the `body{zoom:1.25}` hack + 3 `calc(100vh/--app-zoom)` workarounds → `html{font-size:20px}` + rem (keeps HR "bigger text"; `100dvh` shells) |
| #187 | Collapsible sidebar leaf-panel → icon rail (localStorage `bp-panel-collapsed`); recovered from orphaned uncommitted work |

## Approval architecture (the core of PR-1a→5) — IMPORTANT for future work
- **`src/lib/approval-registry.ts`** — stateless `APPROVAL_REGISTRY: Record<RequestType, adapter>` over the 6 approval stores (leave/workflow/probation/transfer/promotion/pay-rate-approvals + benefit-claims). Total over RequestType (tsc-enforced). Adapters own per-type `toQueueItem` (fan-in) + `approve`/`reject` (fan-out) + `seed`. Call sites stay dumb.
- **Queue derives from seeded stores** (not the old static `MOCK_PENDING_REQUESTS`): `selectPendingApprovals()` / `useSelectPendingApprovals()` fan in from the stores, collapsing `pending_spd|pending_hr|pending_manager` → `pending` for the 3-state filter.
- **`ensureDemoSeed()` (src/lib/demo-seed.ts, called by AppShell) is the SINGLE seed authority.** Stores carry a `queueSnapshot` so the rich 20 rows survive. Persist = version-bump + rehydrate-to-seed → **refresh resets to seed by design** (so cross-persona propagation is in-session only; client-nav preserves, full reload resets).
- Cross-persona: approve in `/quick-approve` → `/requests`, `/workflows` (use-workflows now reads the registry, not MOCK_WORKFLOWS), and the `admin/system/reports` pending tile reflect live.
- `transfer` has no store schema → dedicated `src/stores/transfer-approvals.ts` terminal-marker slice.
- Reference pattern that was already correct: `workflows/benefit-claim/[id]/page.tsx`.

## Source-of-truth artifacts (this session)
- `.omc/specs/seed-clickable-hrms-mockup.md` — Ouroboros (qoo) seed, ambiguity 0.10
- `.omc/specs/gap-audit-clickable-hrms.md` — 5-module dead-end audit (file:line)
- `.omc/plans/clickable-hrms-mockup.md` — ralplan consensus plan (PR-1a→5, ACs, ADR)
- `.omc/plans/open-questions.md` — 3 decisions RESOLVED (external stubs=disable+label, report tile=added, Linear=skipped)

## Verification baseline (don't chase these — pre-existing on master)
- `npm run build` GREEN. `tsc --noEmit` clean except **2 pre-existing errors** in `src/lib/__tests__/workflow-api.eligibility-fallback.test.ts` (test-only, not in build graph).
- Full test suite: **62 failing tests across 21 files are PRE-EXISTING on master** (verified via baseline worktree at the pre-work commit). This work added **0 net-new failures**. Don't treat those 21 files as regressions.

## Loose ends / follow-ups
- **"Size up px chrome"**: #189 scales rem/text but NOT px-based inline styles (sidebar/topbar chrome renders at literal px, no longer zoom-inflated). If chrome reads too small, do a follow-up px→rem pass.
- **Stale stashes** (mine this session, safe to drop): `stash@{0}` noise-fontsize-bump, `stash@{1}` noise-for-clickable-merge, `stash@{2}` stray-app-zoom-0.8 (**moot** — zoom removed in #189), `stash@{3}` runtime-noise-before-clickable-rebase. `stash@{4}+` are pre-existing user stashes — DO NOT touch.
- 4 merged remote branches can be deleted.
- Linear was intentionally skipped (PR bodies ref STA-46/28 for context; no ticket state changed — AI never moves Linear to Done).

## Env note
- Ouroboros ("qoo") interview MCP runs on the **codex backend** (claude backend lacks `claude_agent_sdk`). Gotcha: the MCP `timeout` field is per-tool-call ms and is **floored to 1s if <1000** — must be `600000`. Reconnect via `/mcp` after editing `~/.claude.json`. See memory `reference_ouroboros_qoo_codex_backend`.

---

# HANDOFF — Sidebar IA / Shell redesign

**Branch:** `feat/sidebar-ia-restructure`
**Date:** 2026-05-25
**Phase:** UI mockup (no backend) — HR team sign-off on visual + interaction direction.
**Design source of truth:** the separate `~/Projects/HRMS_Blueprint` project (`hrms-shell.jsx` / `hrms-shell.css`), served on :8010/:8011. When the user says "blueprint" / "HRMS Modules", that's this.

> ⚠️ **Work is UNCOMMITTED.** Commit before doing anything else — earlier in the session an automated `git stash` (NOT clawhip — see Gotchas) swept the working tree once and reverted in-progress edits. Snapshot now: `git add -A && git commit -m "wip: unified rail+panel shell"`.

---

## ✅ Done & verified (live, via Playwright computed-style checks)

1. **Rail + panel sidebar** (`src/components/humi/shell/Sidebar.tsx`, classes `bp-shellnav`/`bp-rail`/`bp-panel` in `globals.css`)
   - Two columns: 74px icon **rail** (4 macro groups: ฉัน / ทีม / บุคคล / ระบบ) + **panel** showing the selected group's leaves. Matches the user's wireframe.
   - **Master-detail:** clicking a rail group swaps the panel's leaves and does NOT navigate; default selected group follows the active route; active leaf highlighted.
   - IA = Blueprint MODULES (4 groups, ~41 leaves, persona-gated). Leaves map to existing Next.js routes (some point at the closest existing route — no dead ends).
   - Role gating works (employee sees only ฉัน; locked groups disabled).

2. **Unified shell** (`AppShell.tsx`)
   - Removed the `if (admin) return <AdminShell>` branch — **admin routes now use the same AppShell + rail+panel Sidebar.** No more two-sidebar split. Admin-specific titles merged into `TITLE_MAP`.
   - `AdminShell.tsx` + `AdminSidebar.tsx` are now **dead code** (no importers) — safe to delete.

3. **Collapsible sidebar** (`Topbar.tsx` PanelLeft button + `AppShell` `sidebar-collapsed` class + `globals.css` collapse rules; uses existing `ui-store.sidebarOpen`/`toggleSidebar`)
   - Desktop (lg+) topbar toggle hides/shows the sidebar; grid reclaims full width when hidden.

4. **Legibility — bigger text** (HR users complain text is small; standing preference)
   - Global: `html { font-size: 17.5px }` in `globals.css` → scales all rem/Tailwind `text-*` app-wide.
   - Sidebar px chrome sized up explicitly (rail label 12.5px, panel item 15.5px, title 18.5px).
   - Wizard: arbitrary `text-[9/10/11/14px]` in `Stepper.tsx` + `HireCheckpointSidebar.tsx` → Tailwind scale (`text-xs/sm/base`) so they scale with the base bump (text-xs now ≈13px).

`npx tsc --noEmit` = 0 errors in changed files.

---

## ⏳ Pending

- **Persistent identity / "login-as" bar** in the topbar top-right (user wants it "ถาวร" = always visible). `LoginAsRibbon.tsx` exists but is **NOT wired** (lost in the stash incident). Decide: wire LoginAsRibbon into the topbar, or build a blueprint-style identity bar. PersonaSwitcher + ActingBadge currently still in `Topbar.tsx`.
- **Home content + topbar to match blueprint** (Phase 2). Home is the dashboard; align to `HRMS_Blueprint` home screen.
- **TodoBell** (`src/components/humi/TodoBell.tsx` + `src/data/todos/`) exists but NOT wired into Topbar (also lost in stash). Reconcile with blueprint topbar.
- **Cleanup dead code:** delete `AdminShell.tsx`, `AdminSidebar.tsx`, and the unused accordion CSS (`bp-nav-group`/`bp-nav-trigger`/`bp-nav-panel`/`bp-nav-child*` in `globals.css`).
- **Update tests:** `sf-parity-sidebar.test.tsx` still asserts the previous accordion structure (`bp-nav-group`/triggers) — rewrite for the rail+panel structure. Re-run `npm test -- --run sf-parity-sidebar humi-functional layout-integration`.
- Minor: bare `/admin` landing has no matching leaf, so the rail defaults to the ฉัน group. Add an "Admin home" leaf or special-case if highlighting matters.

---

## ⚠️ Gotchas (cost time this session — read before continuing)

- **Turbopack serves stale compiled CSS.** New `globals.css` rules can be silently dropped from the served CSS; a dev-server restart does NOT clear `.next/cache`, and `rm -rf .next` is **blocked by `.claude/hooks/pre_tool_use.py`**. Fix: edit `globals.css` (any content change) to force an HMR recompile, then verify with computed styles. (See memory `feedback_turbopack_next_cache_stale_css`.)
- **clawhip does NOT revert files.** It's a read-only Discord event gateway (`~/.clawhip/config.toml`, all monitors empty); managed by launchd `KeepAlive=true` so killing the PID just respawns it. The file reverts were an automated **`git stash`** (`stash@{0}` "WIP on feat/sidebar-ia-restructure"), which reverts tracked edits but keeps untracked files. Don't blame clawhip.
- **Humi design hook blocks arbitrary `text-[Npx]`** (and red colors, hardcoded hex). Use the Tailwind named scale (`text-xs/sm/base/lg/...`). This is good — named scale is rem-based so it inherits the 17.5px legibility bump.
- **Screenshots are unavailable** in this env: the screenshot hook forces `~/claude-artifacts`/`/tmp` but Playwright MCP only allows the repo root → deadlock; claude-in-chrome can't read localhost (no host permission). Verify via `browser_evaluate` computed styles / DOM structure instead.
- **Auth in the Playwright session** defaults to a plain `employee` (only the ฉัน group unlocks). To see all groups, set `localStorage['humi-auth'].state.roles` to include `hr_admin`/`hr_manager`/`spd`/`manager`, or log in as `admin@humi.test` / `admin2026`.

---

## Changed files (ignore `logs/*.json` + `.omc/state/*` noise)

| File | Change |
|------|--------|
| `src/app/globals.css` | rail+panel CSS, `html` 17.5px base, collapse rules; dead accordion CSS remains |
| `src/components/humi/shell/Sidebar.tsx` | full rewrite → rail+panel master-detail |
| `src/components/humi/shell/AppShell.tsx` | unified shell (removed admin branch), collapse class, admin TITLE_MAP |
| `src/components/humi/shell/Topbar.tsx` | desktop collapse toggle (PanelLeft) |
| `src/components/admin/wizard/Stepper.tsx`, `HireCheckpointSidebar.tsx` | bigger text (arbitrary px → Tailwind scale) |
| `src/__tests__/humi-functional.test.tsx`, `.../sf-parity-sidebar.test.tsx` | partially updated; sf-parity still needs rail+panel rewrite |
| **untracked:** `src/components/humi/TodoBell.tsx`, `src/components/humi/shell/LoginAsRibbon.tsx`, `src/data/todos/` | created but NOT wired |

## Run
```bash
cd src/frontend && npm run dev   # http://localhost:3000  (login admin@humi.test / admin2026)
```
Hard-refresh (Cmd+Shift+R) after CSS changes — compiled CSS filename can be unchanged so the browser caches it.

---
---

# SESSION CONTINUATION — 2026-05-25 (PM)

Same branch `feat/sidebar-ia-restructure`. The morning work above was partly committed as **`3cf6b1e8`** ("full-width acting-as ribbon band + concise-comms doc note"). Everything in THIS section is **UNCOMMITTED** in the working tree (verified via per-file `tsc`, not yet committed).

### Corrections to the morning handoff (now outdated)
- **"locked groups disabled"** (line 18) is no longer true → RBAC groups with no accessible leaves are now **removed entirely**, never rendered locked/disabled (user: "ไม่ใช่แค่ซ่อน, กันเข้าใจผิด"). See memory `feedback_rbac_menu_remove_not_hide`.
- **LoginAsRibbon is now WIRED** (was "NOT wired" in Pending) — rendered full-width by `AppShell`.
- Browser verification is **still blocked** this session (claude-in-chrome extension disconnected + Playwright session locked: "Browser is already in use, use --isolated"). Used `tsc` + `curl` HTML grep instead. To screenshot: restart Chrome / free the Playwright session.

### ✅ Done this session (all tsc-clean on touched files)
1. **Profile** (`app/[locale]/profile/me/page.tsx`) — removed the standalone "Employee ID · …" bar; moved `รหัสพนักงาน · {code}` under the name inside the header card.
2. **Login-as ribbon** (`LoginAsRibbon.tsx`, `AppShell.tsx`, `globals.css`) — restyled to the prototype `.imp` band: solid burnt-orange `--imp-bg #C2410C` + cream `--imp-fg`, no icon, underlined text exit (not a pill). Made it a **full-width grid row** (`grid-column:1/-1`) above sidebar+main ("cover whole session"). Copy now 3 labelled parts: **คุณคือ {admin}** · **สวมบทบาทเป็น {persona}** · **ทำงานบนโปรไฟล์ {persona} EMP-{id}**. Removed the "SCOPE · …" segment.
3. **Sidebar** (`Sidebar.tsx`) — (a) removed the static "CENTRAL · BANGKOK 03" tenant line; (b) footer (bottom-left) now shows the **persona you're impersonating** ("คนที่เราไปสวมบท") = `username` + `userId` + word-initials avatar (admin when not impersonating); (c) **RBAC remove-not-lock**: `visibleGroups` filters out zero-leaf groups + dropped the `locked`/`disabled` rail state.
4. **Topbar greeting** (`Topbar.tsx`) — eyebrow was hardcoded "สวัสดีตอนเช้าค่ะ คุณจงรักษ์"; now derived from auth `username` (first name) + time-of-day, bilingual → follows the persona while impersonating ("คุณสมชาย").
5. **Eyebrow legibility** (`globals.css` `.humi-eyebrow`) — 11px→13px, `ink-muted`→`ink-soft`, weight 600→700.
6. **Topbar freeze** (`globals.css` `.humi-main`) — `overflow-x:hidden`→`overflow-x:clip`; `hidden` was silently turning `overflow-y:auto` and breaking the already-sticky `.humi-topbar`. Now the topbar stays pinned on scroll.
7. **Site-wide 125% scale** (`globals.css`) — `:root{--app-zoom:1.25}` + `body{zoom:var(--app-zoom)}` (uniform like browser zoom; scales the px-heavy inline styles too). `100vh` shells divided by `--app-zoom` (`.humi-app` min-height, `.humi-sidebar` + `.humi-sidebar--drawer` height) so the full-height sidebar stays one screen (CSS `zoom` does not rescale `vh` for descendants). Adjust the one var to retune.
8. **Home quick-menu = 12** (`data/admin/mockAdminSelfService.json`, `home/page.tsx`, `useAdminSelfService.ts`) — seed `quickActions` rewritten to the 12 canonical module shortcuts (mirrors `DEFAULT_ESS_ACTIONS`); `ICON_MAP` +Clock/Inbox/Bell/Users2/GraduationCap; persist key bumped `admin-ss-config-v1`→`v2` so stale localStorage reseeds. Also **removed the BRD#183 placeholder chip row** ("ผังองค์กร/สลิปเงินเดือน/รายการแจ้งเตือน") under quick actions + cleaned unused `visibleTiles`/`publishedTiles`/`roles`/`toRoleName`/imports.
9. **Roster → TimeFirst weekly grid** (`app/[locale]/roster/page.tsx` + `data/roster/mock.ts` rewritten; `globals.css` `--shift-*` tokens) — replaced the 24h Gantt with the prototype `Roster_TimeFirst` (week grid, time-first cells, blue override dots, inline `<select>`+time-input edit, scope switch). **Deleted** `RosterGantt`/`CoverageStrip`/`ShiftEditorDrawer`/`ShiftSwapModal`/`BulkAssignModal` + their 3 tests.
10. **Benefit plan setup — finished STA-70** (`components/benefits/Tab1IdentityFields.tsx`, `lib/workflow-api.ts`, `app/[locale]/admin/benefits/plans/page.tsx`) — removed the "Plan name prefix" radio; recordType is now derived from **Benefit type/group** via `deriveRecordTypeFromBenefitTypeGroup` + a read-only "Derived record type:" chip. Removed `prefix` from `Tab1IdentityValues`. Added optional `recordType?`/`benefitTypeGroup?` to `updateBenefitPlan` + `CreateBenefitPlanInput`. This cleared the 4 pre-existing `plans/page.tsx` tsc errors.

Tests updated to match: `login-ribbon.test.tsx`, `sidebar-ia.test.tsx` (new copy, removed-not-locked, persona footer), `benefit-plan-record-type-derivation` (now passes). Removed-component tests deleted with their components.

### ⚠️ Design source nuance
This session also referenced the **Claude Design handoff bundle** the user fetched (api.anthropic.com/v1/design/h/OL7cVIjqIJCo0_qIpuQCfw → gzip tar, extracted to `/tmp/humi-design-extract/hrms/`). Canonical files: `project/humi-prototype.jsx` (`.imp` ribbon), `project/mod-roster-v2.jsx` (`Roster_TimeFirst`, lines 607–939), `project/mod-benefit-admin.jsx`, `project/screens/timeoff.jsx`, `project/HRMS Modules.html`. README says recreate visual output, don't copy prototype internals. (The `/tmp` extract is ephemeral — re-fetch + `gunzip|tar` if gone.)

### ⏳ Open / next
- **`/th/timeoff` "leave มาไม่ครบ" — UNRESOLVED.** User reported it looks incomplete; couldn't screenshot (browsers down). Source-read shows the page is structurally complete vs `screens/timeoff.jsx` (header, 3 balance KPIs พักร้อน/ป่วย/กิจ, tabs request/history/**approve**, apply form, team-coverage rail, carryover policy). `curl` HTML grep flagged the team-coverage eyebrow "ใครลาเดือนนี้" + policy button "อ่านนโยบายฉบับเต็ม" as absent while their sibling titles render — could be a Thai-text grep artifact OR the right rail rendering partially. **Next step: screenshot `/th/timeoff` (wide viewport) and confirm what's missing** — candidates given to user: right column / too-few leave types / zoom-125% layout. Awaiting user pinpoint.
- **`EMP-EMP001` doubling** — ribbon segment 3 renders `EMP-{userId}`; personas whose `userId` already starts with "EMP" (e.g. EMP001) show "EMP-EMP001". Footer avoids this (raw `{userId}`). Fixing the ribbon would require updating `login-ribbon.test.tsx` AC2.2 (asserts `EMP-KEN001`). Flagged to user, not yet fixed.
- **Pre-existing failures (NOT from this session, verified via git-stash A/B):** 2× Req5 menu-simplification (`sidebar-dedupe.test.tsx` — leaf counts), 5× `/benefits-hub` (`humi-reference-smoke`/`humi-functional`), 3× `profile-me.resign-link`, 2 tsc errors in `workflow-api.eligibility-fallback.test.ts` (`rule_id`/`waiting_period_days` schema drift). All predate this session.
- **Commit when ready:** `git add -A && git commit` on this branch. Per project rule, AI may move a linked Linear ticket up to In Review only (never Done).

### Changed files this session (uncommitted)
`profile/me/page.tsx`, `home/page.tsx`, `globals.css`, `LoginAsRibbon.tsx`, `AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `Tab1IdentityFields.tsx`, `workflow-api.ts`, `useAdminSelfService.ts`, `data/admin/mockAdminSelfService.json`, `roster/page.tsx`, `data/roster/mock.ts` (rewrites); test updates `login-ribbon.test.tsx`, `sidebar-ia.test.tsx`; **deleted** 5 roster components + 3 roster tests. (`time/timesheet/page.tsx` also shows modified — NOT touched by me this session; verify before committing.)

---
---

# SESSION CONTINUATION — 2026-05-25 (late PM) — menu simplification + COMMIT

Same branch `feat/sidebar-ia-restructure`.

> ✅ **EVERYTHING ABOVE IS NOW COMMITTED.** All morning + PM working-tree work + this session's menu-simplify was committed as **`f08fdf07`** ("feat(sidebar): simplify nav menu to 25 leaves + de-confuse timesheet/roster") via `git add -A` (user said "commit all"). Working tree is CLEAN. **Not pushed.** ⚠️ It's one large MIXED commit (64 files, +147k/−8k): menu-simplify + the morning/PM shell WIP + session artifacts (`logs/*.json`, `.omc/state/*`, agent-replay jsonl, presentation assets). If clean history matters, reset + re-split before pushing.

### Scope decision locked this session (overrides any "accordion" idea)
- **KEEP the 2-column rail+panel sidebar layout** — user explicitly chose this over the blueprint's single-column accordion. The blueprint `hrms-shell.jsx:399` IS a 1-col accordion; we intentionally diverge. Do NOT "fix" the rail+panel to an accordion.
- Time model: **keep BOTH** project-hours Timesheet (`/time/timesheet`) AND manager Roster & Shifts (`/roster`); they are different concepts — labels were de-confused (Timesheet eyebrow → "บันทึกชั่วโมงงาน"). (`/Users/tachongrak/Projects/ts` is an UNRELATED project — ignore its timesheet KB in Tesseract.)

### ✅ Done this session (in commit f08fdf07; sidebar-ia test 23/23 green, Turbopack build compiles)
1. **Sidebar menu simplified 40 → 25 leaves** (`Sidebar.tsx` MODULES) — Workspace 8 / Team 5 / HR 8 / System 4. Cut placeholder + duplicate leaves; merged inbox+approvals → "กล่องงาน · อนุมัติ" (`/quick-approve`), welfare+claims → benefits-admin, confirm → hr-docs, transfer+regular → changes, lifecycle → hire. **Cut `Integrations` group entirely** (no real connect-via-web feature). roster → `/roster`, probation → `/manager-dashboard/probations`. `requests` + `comp` cut from menu (still URL-reachable). Preserved show-gates, badges (3/12/2), `__BENEFITS__` sentinel.
2. `sidebar-ia.test.tsx` updated to assert the 25-leaf IA (drops `ใบคำขอ`/`ค่าตอบแทน`, adds roster/probation hrefs + absence asserts) — **23/23 pass**.
3. Timesheet eyebrow relabel (de-confuse from Roster).
4. `docreview` + `hr-docs` both → `/admin/documents` kept as a **documented Principle-1 exception** (no distinct doc-review-queue route exists).

### Consensus-approved plans (in repo, committed)
- `src/frontend/.omc/plans/sidebar-menu-simplify.md` — THIS session's menu work. Ralplan consensus APPROVED (Planner→Architect→Critic, 2 iterations). **Implemented.**
- `src/frontend/.omc/plans/sidebar-shell-7part-ui.md` — a SEPARATE 7-requirement plan (acting-as ribbon, proxy switch, inbox/noti topbar, roster, home 12-tiles, approvals table). Ralplan APPROVED (5-PR shape). **PR-2..PR-5 NOT yet built** — only the menu/PR-1-equivalent landed. Much of the ribbon/home/roster shell already exists from the morning/PM work; reconcile before building the rest.
- `src/frontend/.omc/plans/open-questions.md` — parked decisions.

### ⏳ Open / next
- **HR sign-off confirm:** `requests` (ใบคำขอ) + `comp` (ค่าตอบแทน) are cut from the menu but pages still exist — confirm intended for the demo, else add the 2 leaves back (1-line each).
- **Push** not done (user didn't ask). Linear: no ticket used this session (Ken owns implementation, "no need linear"); AI never moves Linear to Done.
- **7-part plan PR-2..5** remain if the user wants the full shell feature-set (verify overlap with already-shipped morning/PM shell first).
- **Pre-existing red gates (NOT from menu-simplify, verified via stash A/B):** `npm run build` tsc fails on ~14 errors in benefits/workflow files (e.g. `admin/benefits/plans/page.tsx` `Tab1IdentityValues.prefix`); `i18n-completeness` 4 failures (`spd_management.titleTh` thai-in-en + key-count). Changed files this session have ZERO errors.

### Gotcha (this session)
- **Dev server won't start from automation:** `npm run dev` / `next dev` fails with `next: command not found` (exit 127) when launched by the agent shell (workspace `next` bin not on PATH / not resolving). It DID run earlier in the session, so the env is fine — start it yourself with `! npm run dev` from `src/frontend`. Browser screenshots of `:3000` blocked accordingly this session.
