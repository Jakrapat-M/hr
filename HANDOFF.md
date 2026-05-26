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
