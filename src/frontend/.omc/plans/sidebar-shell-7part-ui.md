# Plan — 7-Part Shell/IA UI Feature Set (Humi Next.js Mockup)

> **Mode:** ralplan consensus, iteration 2 (revised after Architect REQUEST CHANGES + Critic ITERATE; all 7 MUST-FIX addressed). SHORT mode.
> **Branch context:** `feat/sidebar-ia-restructure` (34 uncommitted shell files in flight).
> **Phase guardrail:** UI Mockup for HR sign-off. Backend OUT OF SCOPE. Clickable flows, mock/registry data, Humi tokens, TH/EN parity only.
> **Frontend root:** `/Users/tachongrak/Projects/hr/src/frontend`
> **i18n:** `messages/th.json` + `messages/en.json` (frontend root, NOT `src/messages`). `useTranslations('ns')`. `src/lib/__tests__/i18n-completeness.test.ts` enforces TH↔EN key parity — every new key MUST exist in both files.

---

## Context (verified current state)

| Area | File (verified) | Current state |
|---|---|---|
| Shell composition | `src/components/humi/shell/AppShell.tsx` | Renders `<Sidebar/>` + `humi-main` (`<Topbar/>` + page). NO ribbon slot. |
| Topbar | `src/components/humi/shell/Topbar.tsx` | Renders `<NotificationBell/>` (L185) + `<ActingBadge/>` (L186, deprecated) + `<PersonaSwitcher/>` (L187). TodoBell NOT rendered. |
| Inbox bell | `src/components/humi/TodoBell.tsx` | EXISTS, complete (`ListTodo` icon, footer→`/ess/workflows`, `MOCK_TODOS`). Imported NOWHERE. |
| Noti bell | `src/components/humi/NotificationBell.tsx` | Rendered. `Bell` icon, footer→`/admin/system/notifications`, `MOCK_IN_APP_NOTIFICATIONS`. |
| Acting ribbon | `src/components/humi/shell/LoginAsRibbon.tsx` | EXISTS (82 lines), dead code. Reads `username/email/originalUser/exitPersona`, `PERSONA_BADGE`. NOT amber, NOT showing EMP id/SCOPE. |
| Acting badge (dup) | `src/components/humi/ActingBadge.tsx` | 39 lines, rendered in Topbar. Duplicate of LoginAsRibbon's role. |
| Proxy switch | `src/components/humi/shell/PersonaSwitcher.tsx` | Dropdown (not modal). Renders always; `switchPersona` demo-gated (`NEXT_PUBLIC_DEMO_MODE`, auth-store L68). Uses `DEMO_USERS`/`PERSONA_ORDER`/`PERSONA_BADGE`. No RBAC tier chips, no empId, no modal eyebrow. |
| Home | `src/app/[locale]/home/page.tsx` (662 lines) | Row 1.5 `<QuickActionsTile>`; Row 3 (L501-585) has calendar grid + `HUMI_CAL_EVENTS`. Calendar i18n keys `humiHero.calendar*`, `prevMonth`, `nextMonth`. |
| Quick actions | `src/components/humi/QuickActionsTile.tsx` | `DEFAULT_ESS_ACTIONS` = 5 tiles, 4-col grid, single accent badge color, TH-only labels. `MANAGER_ACTIONS` = 5 tiles. |
| Sidebar | `src/components/humi/shell/Sidebar.tsx` | Blueprint rail+panel. `MODULES` array. Dup destinations: `inbox`+`approvals`→`/quick-approve`; `roster`+`swap`+`probation`→`/manager-dashboard`; multiple HR leaves→`/admin/benefits`,`/admin/hire`. `SIDEBAR_LEGACY` block L383-438. |
| Approvals | `src/app/[locale]/quick-approve/page.tsx` → `src/components/manager/quick-approve-page.tsx` (861 lines) | Heavy workspace: 2 info cards, SmartTabs, filter strip, DataTable w/ select+chain+urgency cols, bulk toolbar, delegation modal. Detail at `/quick-approve/[id]`. |
| Roster | (none) | NO roster page. Ref `mod-roster-v2` in `/tmp/hrms_app_ref.html`. `.shift` absolute cells; `.s-mgr`=accent-alt-soft, `.s-pt`=#FEF3C7 (HARDCODED amber), `.s-night`=#1d2b48 navy; `.cov-strip` 24-col grid; `.cov-cell` 18px. `src/lib/admin/store/hrbpRoster.ts` = HRBP people list (NOT shift data — reusable only for employee-row labels). |

### Linear search results (cite per requirement)

Searched via `mcp__linear__list_issues` (team Stark-xix / project HR). The MCP `/sse` transport intermittently rejects (deprecation) — results below are from the queries that succeeded; remaining gaps flagged for Architect to confirm against `https://mcp.linear.app/mcp`.

| Req | Matching ticket(s) | Notes |
|---|---|---|
| 1 Roster & Shifts | **NONE FOUND** | No roster/shift/Gantt ticket. New surface — create a ticket before PR, or confirm scope is covered by an existing UI-mockup umbrella. |
| 2 Acting ribbon | **STA-55** "[Audit][EC] Surface Acting assignment in employee lifecycle actions" (Backlog) | STA-55 is about the `acting` *assignment* action card on Employee Detail — adjacent, not the shell ribbon. Ribbon wiring has NO dedicated ticket. Flag. |
| 3 Home 12 tiles / no calendar | **NONE FOUND** | No home-tile/calendar ticket. New scope. |
| 4 Proxy switch | **NONE FOUND** directly; STA-68 (persona ownership scope, Done) adjacent | PersonaSwitcher blueprint-align has no ticket. Flag. |
| 5 Dedupe audit | **NONE FOUND** directly; STA-58/STA-66 are sidebar-route audits (Backlog) | STA-58 (payroll nav), STA-66 (time nav) touch the same `Sidebar.tsx` MODULES. Coordinate to avoid collisions. |
| 6 Inbox+Noti topbar | **NONE FOUND** | New scope. |
| 7 Simplify approve box | **STA-51** (unified inbox, **Duplicate/Canceled**), **STA-46** (approval taxonomy, In Review), **STA-78** "[BE] Claim Approve" (Done), **STA-79** "[BE] Claim Approval Details" (Done) | STA-78/79 already touched `/quick-approve` + `/quick-approve/WF-2026-004` detail with Linear screenshots. Image #4 simplification likely a follow-up to STA-78. STA-51's directive ("กล่องอนุมัติควรมีแค่กล่องเดียว") = the "unified approval inbox" memory rule. Cite STA-78/STA-51 in PR. |

**Action for executor:** before opening each PR, re-run the Linear search against the live endpoint, cite the IDs above, and for Reqs 1/3/4/6 create UI-mockup tickets (or attach to an umbrella) since none exist. State explicitly in the PR body when no ticket exists.

---

## Guardrails

**Must have**
- All new surfaces use Humi primitives (`Card`, `Button`, `DataTable`, `Modal`, `FormField`, `EmptyState`) from `@/components/humi` and token utilities (`bg-canvas`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-hairline`, `rounded-[var(--radius-md)]`).
- Danger = `--color-danger` (pumpkin) / `bg-danger` / `text-danger`. NEVER Tailwind `red-*`.
- TH + EN parity for every user-facing string; keys added to BOTH `messages/th.json` and `messages/en.json` (i18n-completeness test will fail otherwise).
- Text a notch larger than default (HR readability rule) — prefer existing `text-sm`→`text-base` bumps on body copy, no sub-13px chrome.
- Co-located Vitest tests in `__tests__/` beside each touched component; Playwright smoke at `:3000` with screenshots posted to the linked ticket/PR.

**Must NOT have**
- No real API/persistence/auth wiring. No POST/PUT handlers. Local state + mock registries only.
- No hardcoded hex (the ref's `#FEF3C7`, `#1d2b48`, `#B5BBF1` MUST map to tokens: see Req 1 token table).
- No Tailwind red. No new global CSS unless reusing/extending the existing `bp-*` / `humi-*` blocks in `src/app/globals.css`.
- No architecture redesign of the auth store or routing. Wire existing pieces.

**Token guardrail (executor — READ FIRST, MF-1):**
- The amber soft-fill token is **`--color-warning-soft`** (globals.css:58 = `#FEF3C7`). Use **`bg-warning-soft`**. **`bg-warning-tint` does NOT exist** in this Tailwind v4 `@theme` block — it compiles to nothing (0 occurrences in compiled CSS) and silently renders no background. Every place this plan needs amber soft-fill uses `bg-warning-soft`.
- `text-warning` and `border-warning` DO resolve (`--color-warning: #F59E0B`, globals.css:57) — keep those.
- **`-tint` is not a token family here.** The only `*-tint` that resolves is the legacy `--color-danger-tint` alias (globals.css:61, itself slated for removal). **Verify any token with `grep <token> src/app/globals.css` before using it in code.**
- Verified-present tokens this plan relies on (confirmed in globals.css): `--color-accent-alt: #5B6CE0` + `--color-accent-alt-soft: #E1E4FB` (45-46); `--color-warning: #F59E0B` (57); `--color-warning-soft: #FEF3C7` (58); `--color-danger: #FB923C` pumpkin (59); `--color-danger-soft: #FFEDD5` (60); `--color-ink` / `--color-canvas-soft` (shell). `--color-warning-tint` is **absent** — never use.
- **Do NOT cite the `DelegationBanner` (`quick-approve-page.tsx:267`) as working amber prior-art** — it uses the dead `bg-warning-tint` and is itself silently broken.
- **Out-of-scope follow-up cleanup ticket:** ~24 files in `src/` already use the dead `bg-warning-tint` class (incl. that DelegationBanner). File a separate cleanup ticket to refactor them to `bg-warning-soft`, mirroring the existing `danger-tint`→`danger-soft` refactor TODO at globals.css:61. NOT part of these 5 PRs.

---

## Sequencing & dependencies (5-PR shape, MF-6)

```
PR-1  Req5         Sidebar dedupe audit (MINUS roster/swap repoint)   ── foundation; dedupes everything except roster/swap
       │
PR-2  Req2+4+6     Shell chrome (acting ribbon + proxy modal + topbar  ── ONE PR: all three edit Topbar.tsx / AppShell.tsx,
                   inbox+noti bells)                                      so they land atomically — serves Decision Driver #1
       │
PR-3  Req1         Roster & Shifts page + roster/swap sidebar repoint  ── repoint lives HERE so the link goes live the moment
                   (the MF-2 repoint moves out of PR-1 into here)         /roster page exists — no dead-link window
PR-4  Req3         Home 12 tiles + remove calendar                     ── independent; parallel-safe with PR-3
PR-5  Req7         Simplify approvals table                            ── independent; respects unified-inbox rule (STA-51)
```

Rationale (revised per MF-6 + MF-2):
- **Req5 dedupe lands first**, but it **does NOT touch `roster`/`swap`** — those leaves keep pointing at the existing `/manager-dashboard` placeholder until PR-3 builds `/roster`. This removes the dead-link window the prior 7-PR plan created (MF-2).
- **Reqs 2/4/6 collapse into ONE `feat/shell-chrome` PR (PR-2).** All three edit `Topbar.tsx` and/or `AppShell.tsx`; landing them together is the direct implementation of Decision Driver #1 (merge-conflict minimization) and removes the unresolved "Architect may collapse" fork. Internal ordering within the PR: bells → ribbon → proxy modal (ribbon copy + proxy exit-route must agree, see MF-4).
- **Req1 (PR-3) carries the `roster`/`swap` sidebar repoint itself** — the leaf is repointed to `/roster` / `/roster?panel=swap` in the same commit that adds `src/app/[locale]/roster/page.tsx`, so the sidebar link never resolves to a non-existent route.
- Reqs 3/7 are leaf surfaces, independent, run after the chrome settles.

---

## Per-requirement plan

### Req 5 — Sidebar dedupe audit  (PR-1, FIRST — MINUS roster/swap repoint)

**Files**
- Modify `src/components/humi/shell/Sidebar.tsx` (`MODULES` array L96-194; `SIDEBAR_LEGACY` block L383-438).
- Add `src/components/humi/shell/__tests__/sidebar-dedupe.test.tsx`.

**Scope boundary (MF-2):** This PR dedupes everything EXCEPT `roster`/`swap`. Those two leaves stay pointed at the existing `/manager-dashboard` placeholder (a real route) until **PR-3 (Req1)** builds `/roster` and repoints them in the SAME commit. This eliminates the dead-link window — at no point does a sidebar leaf resolve to a route that has no `page.tsx`.

**Dedupe decision table** (executor produces final; this is the recommendation):

| # | Leaf(s) | Current href | Decision | Target after | PR |
|---|---|---|---|---|---|
| 1 | `inbox` (badge 12) + `approvals` | both `/quick-approve` | **Merge** — remove `inbox`, keep `approvals` (relabel "Team Inbox · Approvals" / "กล่องงาน · อนุมัติ"), carry badge 12 onto it | one `/quick-approve` leaf (honors unified-inbox rule + STA-51) | PR-1 |
| 2 | `roster` | `/manager-dashboard` (placeholder) | **DEFERRED to PR-3** — repoint → `/roster` happens in the roster PR, same commit as the page. Stays on `/manager-dashboard` here. | `/manager-dashboard` (unchanged in PR-1) → `/roster` (PR-3) | PR-3 |
| 3 | `swap` | `/manager-dashboard` (placeholder) | **DEFERRED to PR-3** — repoint → `/roster?panel=swap` in the roster PR. Stays on `/manager-dashboard` here. | `/manager-dashboard` (unchanged in PR-1) → `/roster?panel=swap` (PR-3) | PR-3 |
| 4 | `probation` | `/manager-dashboard` (placeholder) | **Keep placeholder** but relabel to make the stub honest, OR repoint to existing `/workflows/probation` family if a list route exists (executor to verify route file exists first). Out of this PR's hard scope — flag in open-questions. | unchanged / verified | PR-1 |
| 5 | `welfare` + `claims` | both `/admin/benefits` | **Keep both** (distinct concepts) but add `#plans` / `#claims` hash so they land on different tabs (no dead-feeling dup) | `/admin/benefits#plans`, `/admin/benefits#claims` | PR-1 |
| 6 | `lifecycle` + `hire` | both `/admin/hire` | **Keep both**, `lifecycle`→`/admin/hire?view=onboarding` | differentiated | PR-1 |
| 7 | `policy`/`workflows`/`notifs`/`branding` | all `/integrations` | **Collapse rail clutter**: keep `integrations` as the real one; relabel the 3 placeholders with `?section=` deep-links so each is distinguishable | `/integrations?section=...` | PR-1 |
| 8 | `SIDEBAR_LEGACY` L383-438 | comment block | **Audit + prune** entries that the Blueprint MODULES now surface directly (the block's own note says it's stale). Remove dead lines; keep genuine URL-only alt-paths. | trimmed block | PR-1 |

**Mock data:** none (pure IA edit).
**TH/EN keys:** relabels stay inline in `MODULES` (`label`/`labelTh`) — no message-file keys needed.

**Acceptance criteria (Vitest)** — `sidebar-dedupe.test.tsx`:
- AC5.1: No two visible leaves share an identical resolved `href` (ignoring query/hash) for any single persona (build the leaf set for each of the 6 personas, check for duplicate bare paths). *Exception list* allowed only for documented hash/query-differentiated pairs (`#plans` vs `#claims`; `?view=` / `?section=` variants).
- AC5.2 (**route-existence gate, MF-2**): Enumerate every leaf's resolved bare path across all 6 personas; for each, assert a corresponding route file exists under `src/app/[locale]/<path>/page.tsx` (or a documented dynamic segment). In PR-1 this means `roster`/`swap` still map to `/manager-dashboard` (which HAS a page) — they are NOT yet `/roster`. Test reads the filesystem (e.g. `fs.existsSync`) so it fails loudly if any leaf points at a missing route. This is the anti-dead-link guard, not a mask.
- AC5.3: exactly one leaf resolves to `/quick-approve` (the merged approvals entry) and it carries badge `12`.
- AC5.4: manager persona still unlocks the team group (regression vs existing `sf-parity-sidebar.test.tsx`).

**Verification:** `npm test -- --run sidebar-dedupe` and `npm test -- --run sf-parity-sidebar` (no regression). `npm run build`. (`/roster` does NOT exist yet in PR-1 — AC5.2 confirms no leaf points at it yet.)

---

### Req 2 — Acting-as login ribbon  (PR-2, shell-chrome)

**Files**
- Modify `src/components/humi/shell/LoginAsRibbon.tsx` — re-skin to amber blueprint ribbon; show `EMP-{id}` + SCOPE/access tiers; bilingual copy; exit → `/${locale}/home` (canonical, MF-4).
- Modify `src/components/humi/shell/AppShell.tsx` — render `<LoginAsRibbon/>` ABOVE `<Topbar/>` inside `humi-main` (new top slot, before L284 `<Topbar.../>`).
- Modify `src/components/humi/shell/Topbar.tsx` — REMOVE `<ActingBadge/>` (L186) + its import (L31).
- **Modify `src/components/humi/index.ts` (MF-3)** — REMOVE the barrel re-export `export { ActingBadge } from './ActingBadge';` (verified at index.ts:42). Deleting the component file without this line breaks the build.
- Delete `src/components/humi/ActingBadge.tsx` once the Topbar import (L31) AND the barrel export (index.ts:42) are removed — the only two live references (verified via `grep -rn ActingBadge src/`; the third hit is a comment in LoginAsRibbon.tsx:9).
- Add `src/components/humi/shell/__tests__/login-ribbon.test.tsx`.

**What changes:** Ribbon currently only shows when authenticated with a subtle cream/accent strip. Blueprint wants: amber/orange band, copy `Acting as {Name} · EMP-{id} · {SCOPE} · Switch back to admin`. Pull `EMP-{id}` from the active persona (auth-store `userId`; map via `DEMO_USERS[email].id`). SCOPE/access tiers from `PERSONA_BADGE` (label) — and a tier string (A/B/C/D) computed from roles (helper, see Req4 shared tier map). Only the *impersonating* state (`originalUser !== null`) shows the amber emphasis + "Switch back" button; otherwise keep a quiet non-amber identity strip (or render nothing when not in proxy — executor to confirm with Architect; blueprint shows the amber band specifically during impersonation).

**Color tokens (MF-1):** amber band = **`bg-warning-soft`** (`--color-warning-soft: #FEF3C7`, globals.css:58) + `text-warning` (`#F59E0B`) + `border-warning`. **Do NOT use `bg-warning-tint`** — it is a dead class (renders no background). Do NOT copy the `DelegationBanner` pattern at `quick-approve-page.tsx:267`; it uses the dead token and is itself silently broken. NO new hex.

**Mock data:** uses live `DEMO_USERS`. No new mock.

**TH/EN keys (`shell.ribbon.*`):**
- `actingAs` — EN "Acting as" / TH "กำลังดูในชื่อ"
- `switchBack` — EN "Switch back to admin" / TH "กลับสู่ผู้ดูแลระบบ"
- `scope` — EN "Scope" / TH "สิทธิ์"
(empId + name interpolated.)

**Clickable mockup + canonical exit route (MF-4):** "Switch back" calls existing `exitPersona()` then routes to **`/${locale}/home`** — the LOCALE-PREFIXED canonical exit destination. LoginAsRibbon.tsx:39 already does this (`router.push(\`/${locale}/home\`)`); keep it. **PersonaSwitcher.tsx:52 currently exits to `/${locale}/admin` — that is the inconsistency. Req4 changes PersonaSwitcher to also exit to `/${locale}/home`** so all three exit controls (ribbon, persona-modal, the deleted ActingBadge's former behavior) agree on one destination.

**Acceptance criteria (Vitest)** — `login-ribbon.test.tsx`:
- AC2.1 (MF-1): When `originalUser` set, ribbon renders the amber band with className containing **`bg-warning-soft`** and `border-warning` (assert exactly these; assert `bg-warning-tint` is ABSENT), with text matching `Acting as {name}` (EN) and `กำลังดูในชื่อ {name}` (TH).
- AC2.2: Ribbon shows `EMP-{id}` derived from the active persona (`DEMO_USERS[email].id`).
- AC2.3 (MF-4): "Switch back" button calls `exitPersona` (mock store) and navigates to the locale-prefixed **`/${locale}/home`** (assert `router.push` called with `/th/home` when locale=th, `/en/home` when locale=en — NOT bare `/home`).
- AC2.4: When NOT impersonating, ribbon does not render the amber "Switch back" button (see open-question on whether a quiet non-amber strip shows or nothing renders — Architect to confirm; default: render nothing when not in proxy).
- AC2.5: AppShell renders the ribbon above the Topbar (DOM order assertion: ribbon node precedes topbar node).
- AC2.6 (MF-3): No live `ActingBadge` reference remains. Assert (a) Topbar does not render an ActingBadge (queryByTestId/text absent), and (b) a filesystem/grep check that `ActingBadge` appears zero times across `src/` EXCEPT the comment in `LoginAsRibbon.tsx` — specifically the barrel export `src/components/humi/index.ts` no longer contains `ActingBadge`.

**Verification:** `npm test -- --run login-ribbon`; `grep -rn ActingBadge src/` returns only the LoginAsRibbon.tsx comment (zero imports, zero barrel export, zero JSX usage); `npm run build` (would fail on a dangling barrel export — proves MF-3 is handled); Playwright smoke: login as admin → switch persona → assert amber ribbon visible → click Switch back → land on `/th/home` → screenshot.

---

### Req 6 — Inbox + Notification bells in topbar  (PR-2, shell-chrome)

**Files**
- Modify `src/components/humi/shell/Topbar.tsx` — import `TodoBell`; render `<TodoBell/>` then `<NotificationBell/>` (inbox-then-bell order, matching the reference image which shows envelope+dot then bell). Insert before L185.
- Add `src/components/humi/shell/__tests__/topbar-bells.test.tsx` (or extend an existing Topbar test if present).
- Modify `src/components/humi/TodoBell.tsx` — **DECIDED (no further confirmation): switch the trigger icon from `ListTodo` to lucide `Mail` (envelope)** per the user's reference image, which shows an envelope-with-dot for the inbox (not a checklist). Keep the popover content as-is. Empty-state glyph also switches to `Mail` for consistency. Update the trigger `aria-label` to inbox copy (TH "กล่องข้อความเข้า" / EN "Inbox").

**Badge counts:** TodoBell already computes `pendingCount` from `MOCK_TODOS`; NotificationBell computes `unreadCount` from `MOCK_IN_APP_NOTIFICATIONS`. Both use `bg-danger` badge (correct — pumpkin, not red). No change needed to counts.

**Mock data:** existing `src/data/todos/mock.ts` + `src/data/notifications/mock.ts`. Ensure both have ≥1 unread so badges show in the demo.

**TH/EN keys:** TodoBell + NotificationBell are self-localizing via `useParams` locale + inline strings (no message-file keys). If switching to envelope, update `aria-label` strings inline (TH "กล่องข้อความเข้า" / EN "Inbox") — keep inline pattern.

**Acceptance criteria (Vitest)** — `topbar-bells.test.tsx`:
- AC6.1: Topbar renders BOTH a TodoBell trigger (aria-label inbox/to-do) and a NotificationBell trigger (aria-label notifications).
- AC6.2 (decided): TodoBell trigger renders the lucide **`Mail`** (envelope) icon — assert the `Mail` SVG is present and `ListTodo` is absent from the trigger.
- AC6.3: TodoBell badge shows pending count from `MOCK_TODOS`; NotificationBell badge shows unread count from `MOCK_IN_APP_NOTIFICATIONS`; both badges use `bg-danger`.
- AC6.4: DOM order is TodoBell before NotificationBell.
- AC6.5: TodoBell footer link → `/{locale}/ess/workflows`; NotificationBell footer → `/{locale}/admin/system/notifications`.

**Verification:** `npm test -- --run topbar-bells`; `npm run build`; Playwright smoke: open both popovers, screenshot the two badges.

---

### Req 4 — Proxy switch per blueprint  (PR-2, shell-chrome)

**Files**
- Modify `src/components/humi/shell/PersonaSwitcher.tsx` — convert dropdown → `Modal` (use `@/components/humi` `Modal`). Add eyebrow "RBAC · 4 tiers", title "Switch persona", per-row avatar + name + `{role} · {empId}` + access-tier chips A/B/C/D, footer "RBAC enforced…". **Change the exit route at PersonaSwitcher.tsx:52 from `/${locale}/admin` → `/${locale}/home`** so the proxy-exit destination matches the ribbon (MF-4).
- Add `src/lib/persona-tiers.ts` (shared) — map `Role[]` → access-tier set (A/B/C/D) + a `tierChips(roles)` helper. Reused by Req2 ribbon.
- Modify `src/lib/demo-users.ts` — optionally add a `tier` field per persona OR derive in `persona-tiers.ts` (prefer derive — no schema churn).
- Add `src/components/humi/shell/__tests__/persona-switcher.test.tsx`.

**What changes:** keep store wiring intact (`switchPersona`/`exitPersona`/`landingForDemoUser`, `PERSONA_ORDER`, `DEMO_USERS`, `PERSONA_BADGE`). Only restructure the presentation from dropdown menu to modal with the blueprint anatomy. Trigger button stays in Topbar (unchanged position). The single behavior change beyond presentation is the **exit-route fix (MF-4)**: `handleExit` routes to `/${locale}/home` (was `/${locale}/admin`) so all proxy-exit controls converge on one destination. `switchPersona` remains `NEXT_PUBLIC_DEMO_MODE`-gated by the store — the modal still renders rows; in non-demo the switch is a no-op guarded by the store (document this; the mockup runs with demo mode on).

**Tier mapping (recommendation, executor to confirm with Architect):**
- A = full admin (`hr_admin`/`hr_manager`), B = HR partner scope (`hrbp`/`spd`), C = manager scope (`manager`), D = self scope (`employee`). A persona shows the chips for the tiers its roles cover.

**Mock data:** uses `DEMO_USERS` (has `id` for empId, `roles` for tiers).

**TH/EN keys (`shell.persona.*`):**
- `eyebrow` — EN "RBAC · 4 tiers" / TH "RBAC · 4 ระดับ"
- `title` — EN "Switch persona" / TH "สลับบทบาท"
- `footer` — EN "RBAC enforced — you only see what each persona may access." / TH "บังคับใช้ RBAC — เห็นเฉพาะสิทธิ์ของแต่ละบทบาท"
- `active` — EN "Active" / TH "ใช้อยู่"

**Acceptance criteria (Vitest)** — `persona-switcher.test.tsx`:
- AC4.1: Clicking the trigger opens a `Modal` (role="dialog") with eyebrow "RBAC · 4 tiers" and title "Switch persona".
- AC4.2: Each persona row shows name, `{role} · {empId}` (empId from `DEMO_USERS[*].id`), and tier chips A–D matching `tierChips(roles)`.
- AC4.3: Footer "RBAC enforced…" present (both locales).
- AC4.4: Selecting a non-active persona calls `switchPersona` with the right identity and routes to `landingForDemoUser(email, locale)` (assert the returned path is locale-prefixed, e.g. starts with `/th` or `/en`).
- AC4.5: Active persona row is disabled/marked "Active"/"ใช้อยู่".
- AC4.6 (`persona-tiers.test.ts`): `tierChips(['hr_admin'])` → includes A; `tierChips(['employee'])` → only D; etc.
- AC4.7 (MF-4, exit-route convergence): when impersonating, the modal's exit/"back" control calls `exitPersona` then `router.push` with **`/${locale}/home`** (assert `/th/home` for th) — the SAME destination as the Req2 ribbon's Switch-back (AC2.3). A cross-component assertion or a shared-constant check proves both controls use one canonical path; specifically assert PersonaSwitcher no longer routes to `/${locale}/admin` on exit.

**Verification:** `npm test -- --run persona-switcher persona-tiers`; `npm run build`; Playwright smoke: open modal, screenshot tier chips, switch persona, confirm ribbon (Req2) updates; exit proxy → land on `/th/home` (not `/th/admin`).

---

### Req 1 — Roster & Shifts page + roster/swap sidebar repoint  (PR-3, carries the MF-2 repoint)

**Files (new + the deferred sidebar repoint)**
- **Modify `src/components/humi/shell/Sidebar.tsx` (MF-2 repoint, lands HERE not in PR-1):** repoint `roster` leaf → `/roster` and `swap` leaf → `/roster?panel=swap`, in the SAME commit that adds the roster page below. The link goes live exactly when the route exists.
- `src/app/[locale]/roster/page.tsx` — route + page shell.
- `src/components/roster/RosterGantt.tsx` — employee rows × 24-hour columns, absolute-positioned shift cells.
- `src/components/roster/CoverageStrip.tsx` — 24-col coverage row (ok/gap/over/off).
- `src/components/roster/ShiftEditorDrawer.tsx` — side-drawer (open on shift click).
- `src/components/roster/ShiftSwapModal.tsx` — opens via `?panel=swap` (Req5 swap entry) or a row action.
- `src/components/roster/BulkAssignModal.tsx` — bulk assign.
- `src/data/roster/mock.ts` — mock employees × shifts × coverage (NEW; `hrbpRoster.ts` only supplies HRBP people, reuse its names for row labels).
- `src/components/roster/__tests__/RosterGantt.test.tsx`, `CoverageStrip.test.tsx`, `ShiftEditorDrawer.test.tsx`.
- Modify `src/components/humi/shell/AppShell.tsx` `TITLE_MAP` — add `/th/roster` + `/en/roster` titles ("ตารางกะ" / "Roster & Shifts").

**Token mapping (CRITICAL — ref uses hardcoded hex, must tokenize):**

| Ref class | Ref value | Humi token to use |
|---|---|---|
| `.s-mgr` (Manager) | `var(--color-accent-alt-soft)` indigo, border `#B5BBF1` | `bg-[var(--color-accent-alt-soft)]` + `border-[var(--color-accent-alt)]` — **both VERIFIED present** (globals.css:45-46) |
| `.s-pt` (Part-time) | `#FEF3C7` amber, border `#EBD58A` | **`bg-warning-soft`** + `border-warning` (MF-1: `bg-warning-tint` is dead — do not use; `warning-soft`=`#FEF3C7` is the exact ref color) |
| `.s-night` (Night) | `#1d2b48` navy, text `#c9d7f0` | `bg-[var(--color-ink)]` (navy) + **`text-[var(--color-canvas-soft)]`** (light text — see contrast AC1.8: light ink on navy, NOT navy-on-navy) |
| `.shift` (Regular default) | teal accent-soft | `bg-accent-soft` + `text-accent` + `border-accent` |
| `.cov-cell` ok/gap/over/off | colored cells | ok=`bg-accent-soft`, gap=**`bg-warning-soft`** (MF-1), over=`bg-[var(--color-accent-alt-soft)]`, off=`bg-canvas-soft` |

All tokens above are **verified present** in `src/app/globals.css` (accent-alt 45-46, warning-soft 58, ink/canvas-soft in the shell block). Executor still re-runs `grep <token> src/app/globals.css` per the token guardrail before use; if `--color-accent-alt-soft` were ever absent, fall back to the `humi-tag--accent-alt` family used by the `hris` `PERSONA_BADGE` tone.

**Layout:** grid `[240px employee-col][repeat(24,1fr) hour-cols]`. Shift cells absolutely positioned within the row track (left = start hour %, width = duration %). CoverageStrip is a sibling row reusing the same 24-col grid. This mirrors ref `.cov-strip` `grid-template-columns: repeat(24,1fr)`.

**Clickable mockup behaviors:**
- Click a shift cell → opens `ShiftEditorDrawer` (local state, prefilled mock shift). Save = close drawer + toast (no persistence).
- "Swap" row action or `?panel=swap` → `ShiftSwapModal`.
- "Bulk assign" toolbar button → `BulkAssignModal` (select rows + shift type, Apply = close + toast).
- Coverage cells render static ok/gap/over/off from mock.

**Mock data (`src/data/roster/mock.ts`):** ~8 employees (reuse `HRBP_ROSTER` Thai names + a few `HUMI_EMPLOYEES`), each with 0-3 shifts of type mgr/pt/night/regular across the 24h; coverage array of 24 statuses. Bilingual shift-type labels.

**TH/EN keys (`roster.*`):** `title`, `coverage`, `shiftEditor.title`, `swap.title`, `bulkAssign.title`, shift types `type.manager|partTime|night|regular`, coverage `cov.ok|gap|over|off`, actions `save|cancel|apply|swap|bulkAssign`.

**Acceptance criteria (Vitest):**
- AC1.1: `/roster` page renders employee rows × 24 hour columns; ≥1 shift cell per seeded employee.
- AC1.2 (MF-5, falsifiable scan): render `RosterGantt`, query ALL descendant elements; assert **no `className` matches `/(^|\s)(bg|text|border)-(red|rose|pink)-\d/`** AND **no inline `style` string matches `/#([0-9a-fA-F]{3,8})\b/`**. Scope the scan to this component's rendered output only (so legitimate `var(--color-x, #fff)` fallbacks elsewhere in the global CSS don't trip it). Also assert each shift type carries its mapped token class (`bg-warning-soft` for part-time, `bg-[var(--color-ink)]` for night, etc.).
- AC1.3 (MF-1): CoverageStrip renders 24 cells; gap cells use **`bg-warning-soft`** (assert), ok=`bg-accent-soft`, over=`bg-[var(--color-accent-alt-soft)]`, off=`bg-canvas-soft`. Same falsifiable hex/red scan as AC1.2.
- AC1.4: Clicking a shift opens `ShiftEditorDrawer` (dialog appears); Cancel closes it.
- AC1.5: `?panel=swap` mounts `ShiftSwapModal` open on load.
- AC1.6: Bulk Assign button opens `BulkAssignModal`.
- AC1.7: All labels resolve in both `th`/`en`.
- AC1.8 (contrast, smaller-item): the night-shift cell renders LIGHT text on the navy background — assert the cell uses `text-[var(--color-canvas-soft)]` (or another light ink token) AND does NOT use `text-ink`/`text-[var(--color-ink)]` (which would be navy-on-navy and unreadable).
- AC1.9 (MF-2 link-live): with the PR-3 sidebar repoint applied, the `roster` leaf resolves to `/roster` and `/roster` has a `page.tsx` — re-run the AC5.2 route-existence gate and confirm it now passes WITH `/roster` present (the link is live in the same PR that creates the page).

**Verification:** `npm test -- --run RosterGantt CoverageStrip ShiftEditorDrawer`; `npm test -- --run sidebar-dedupe` (AC5.2 route-existence now includes `/roster`); `npm run build`; Playwright smoke at `:3000/th/roster` → screenshot Gantt + open drawer + open swap modal; click sidebar Roster leaf → lands on `/roster` (no 404).

---

### Req 3 — Home: 12 quick tiles, remove calendar  (PR-4)

**Files**
- Modify `src/components/humi/QuickActionsTile.tsx` — extend `DEFAULT_ESS_ACTIONS` to **12** tiles, add per-tile icon-badge color (teal/indigo/amber/coral soft, role-gated), add bilingual labels (currently `labelTh` only → add `labelEn`). Switch grid to responsive (e.g. `repeat(auto-fill, minmax(...))` or 4×3 / 6×2). Blueprint `.quick-grid`/`.quick-tile`/`.quick-ico`.
- Modify `src/app/[locale]/home/page.tsx` — remove the calendar block (L501-585, the `humi-cal` grid + `HUMI_CAL_EVENTS` list) from Row 3; reflow Row 3 so the right column isn't a hole (promote Week Recognition card up, or restructure Row 3 to single/2-col). Keep announcements feed.
- Modify `src/components/humi/__tests__/QuickActionsTile.test.tsx` (exists) + add/extend home test.
- Possibly prune now-unused `HUMI_CAL_EVENTS` import + `CAL_DAYS_TH` const + calendar i18n keys (`humiHero.calendar*`, `prevMonth`, `nextMonth`) — remove from BOTH message files to keep parity test green, OR leave keys (unused keys don't fail completeness, but dead code cleanup preferred). Flag in open-questions.

**12-tile source decision (recommendation):** extend `DEFAULT_ESS_ACTIONS` to 12 ESS actions (leave, payslip, profile, benefits claim, doc request, time clock, requests, announcements, org chart, directory, performance, learning) — each `show?: RoleName[]` role-gated; non-permitted tiles hidden, but baseline employee set always ≥ enough to fill the grid. Keep the admin-config-bus override path (`makeAdminQuickActions`) intact.

**Color-badge tokens (MF-1):** teal=`bg-accent-soft`/`text-accent`, indigo=`bg-[var(--color-accent-alt-soft)]`/`text-[var(--color-accent-alt)]`, amber=**`bg-warning-soft`**/`text-warning` (NOT `warning-tint` — dead), coral=`humi-tag--coral` family. Assign per-tile via a `tone` field; map to tokens. NO hardcoded hex.

**TH/EN keys (`humiHome.tiles.*` or extend `QuickAction` with `labelEn`):** prefer adding `labelEn` to each `QuickAction` (component-local, like the existing `labelTh`) to avoid a message-file explosion; ensure EN strings present for all 12.

**Acceptance criteria (Vitest):**
- AC3.1: Home renders exactly 12 quick-access tiles for an admin/full persona (role-gated count for employee asserted separately).
- AC3.2: No calendar grid on Home (`queryByRole('grid')` for the calendar / absence of `humi-cal` class).
- AC3.3 (objective, smaller-item): after calendar removal, assert the **Week Recognition card renders in the Row 3 right column** (query by its eyebrow/title text or testid) — i.e. the right column is filled by the recognition card, not left empty.
- AC3.4 (MF-5, falsifiable scan): render `QuickActionsTile` with the 12-tile set; query ALL tile icon-badge elements; assert each badge `className` includes one of the 4 tone tokens (`bg-accent-soft` | `bg-[var(--color-accent-alt-soft)]` | `bg-warning-soft` | coral-family) AND assert **no `className` matches `/(^|\s)(bg|text|border)-(red|rose|pink)-\d/`** AND **no inline `style` matches `/#([0-9a-fA-F]{3,8})\b/`**. Scoped to the rendered tile output only.
- AC3.5: Tile labels resolve in both locales.
- AC3.6: i18n-completeness test stays green (no orphaned-but-referenced calendar keys).

**Verification:** `npm test -- --run QuickActionsTile`, `npm test -- --run i18n-completeness`; `npm run build`; Playwright smoke at `:3000/th/home` → screenshot 12 tiles, confirm no calendar.

---

### Req 7 — Simplify the Approvals "approve box"  (PR-5)

**Files**
- Add `src/components/manager/quick-approve-simple.tsx` — NEW simplified table component (breadcrumb, title, subtitle "7 items pending your decision", segmented filter All/Pending/Approved/Rejected, DataTable: REF · EMPLOYEE(avatar+name) · TYPE · FILED(date·time) · DETAIL · STATUS badge, inline Approve/Reject/View per row).
- Modify `src/app/[locale]/quick-approve/page.tsx` — swap `<QuickApprovePage/>` → `<QuickApproveSimple/>` (the heavy 861-line `quick-approve-page.tsx` is preserved in repo but no longer the default; OR feature-flag. Architect to decide: replace vs flag. Recommendation: **replace the page default** with the simple table, keep the old component file for the detail-rich flows it still powers, to match Image #4's clean intent and STA-51's "one box" directive).
- Keep `src/app/[locale]/quick-approve/[id]/page.tsx` (detail) untouched — "View" links there.
- Add `src/components/manager/__tests__/quick-approve-simple.test.tsx`.

**Reuse:** mock rows from existing `src/components/quick-approve/mock-requests.ts` (`MOCK_PENDING_REQUESTS`) — map to the simple columns (REF=id, EMPLOYEE=requester, TYPE, FILED=submittedAt, DETAIL=description, STATUS). Seed REF-style ids if needed (e.g. REQ-0204 Leave swap, REQ-0203 Late clock-in) — Image #4 shows REQ-#### refs; adapt existing ids or add display-only ref mapping. Inline actions are local-state mock (Approve → row → Approved tab, toast; no persistence).

**Segmented filter:** All · {n} / Pending · {n} / Approved · {n} / Rejected · {n}. Counts from mock status. Default All.

**Humi conformance:** use `DataTable` from `@/components/humi`, `Card` wrapper, breadcrumb as `humi-eyebrow` styled ("HUMI · TEAM MANAGEMENT · APPROVALS"). STATUS badge uses `Badge variant="info"` (Review) / pending tone — NOT red for reject (use `--color-danger` for the Reject action button only).

**Unified-inbox rule:** this stays the single `/quick-approve` umbrella surface; do NOT create per-feature approval pages. Detail remains `/quick-approve/[id]`.

**TH/EN keys (`quickApprove.simple.*`):** `breadcrumb`, `title` ("Approvals queue"/"คิวอนุมัติ"), `subtitlePending` (`{n} items pending your decision`), filter `all|pending|approved|rejected`, columns `ref|employee|type|filed|detail|status`, actions `approve|reject|view`, status `pending|review|approved|rejected`.

**Acceptance criteria (Vitest):**
- AC7.1: Renders breadcrumb "HUMI · TEAM MANAGEMENT · APPROVALS", title "Approvals queue", subtitle with pending count.
- AC7.2: Segmented filter with 4 segments + counts; clicking Pending filters rows to pending only.
- AC7.3: Table columns exactly REF, EMPLOYEE (avatar+name), TYPE, FILED (date·time), DETAIL, STATUS.
- AC7.4: Each row has inline Approve / Reject / View; View → `/quick-approve/{id}`.
- AC7.5: Approve on a row (mock) moves it out of Pending into Approved count (local state).
- AC7.6 (MF-5, falsifiable scan): the Reject action uses `--color-danger` (assert `bg-danger`/`text-danger` class on the reject control). Render the whole simple-table component, query ALL elements; assert **no `className` matches `/(^|\s)(bg|text|border)-(red|rose|pink)-\d/`** AND **no inline `style` matches `/#([0-9a-fA-F]{3,8})\b/`**. Scoped to this component's rendered output only.
- AC7.7: Labels resolve both locales.

**Verification:** `npm test -- --run quick-approve-simple`; `npm test -- --run quick-approve-workspace` (ensure old tests either still pass or are intentionally migrated); `npm run build`; Playwright smoke at `:3000/th/quick-approve` → screenshot table matching Image #4, click a filter, click View.

---

## Cross-cutting verification (run before each PR closes)

```bash
# from src/frontend
npm test -- --run <pattern>     # the AC tests for the PR
npm test -- --run i18n-completeness   # TH/EN parity gate (any new keys)
npm run build                   # typecheck + Next build
# Playwright canonical smoke @ :3000 (per project memory rule), capture screenshots,
# post to the linked Linear ticket (or PR if no ticket).
```

Recall project rules: Playwright smoke + screenshots BEFORE moving any Linear ticket forward; AI may move at most to In Review (never Done); validate the Linear ticket before each PR and cite its ID (or state none exists).

---

## Multi-PR breakdown — 5 PRs (MF-6, FINAL — count is locked, no fork)

| PR | Req(s) | Branch (off master, after in-flight shell branch merges — per branch-isolation rule) | Files touched | Ticket |
|---|---|---|---|---|
| PR-1 | Req5 sidebar dedupe (MINUS roster/swap) | `feat/sidebar-dedupe-audit` | `Sidebar.tsx` + test | new or STA-58/66 coordinate |
| PR-2 | **Req2 + Req4 + Req6 (shell-chrome, collapsed)** | `feat/shell-chrome` | `Topbar.tsx`, `AppShell.tsx`, `LoginAsRibbon.tsx`, `PersonaSwitcher.tsx`, `TodoBell.tsx`, `humi/index.ts`, delete `ActingBadge.tsx`, new `persona-tiers.ts` + tests | new (STA-55 adjacent for ribbon) |
| PR-3 | Req1 roster + roster/swap repoint | `feat/roster-shifts` | new `roster/*` + `Sidebar.tsx` repoint + `AppShell.tsx` TITLE_MAP + tests | **create new ticket** (none found) |
| PR-4 | Req3 home 12 tiles + remove calendar | `feat/home-quick-tiles` | `QuickActionsTile.tsx`, `home/page.tsx` + tests | new (none found) |
| PR-5 | Req7 simplify approvals | `feat/approvals-simple-table` | new `quick-approve-simple.tsx`, `quick-approve/page.tsx` + test | STA-78 follow-up / STA-51 |

**Why 5 and not 7 (MF-6):** the prior plan's "shell trio" (Reqs 2/4/6) all edit `Topbar.tsx` and/or `AppShell.tsx`. Shipping them as three sequential PRs guarantees two rebases on the same files. Collapsing them into one `feat/shell-chrome` PR is the direct implementation of Decision Driver #1 (merge-conflict minimization) and removes the unresolved "Architect may collapse" fork. PR-2 is reviewable: it is three small, related shell edits (two dead-code activations + one dropdown→modal + one icon swap + one delete), not a sprawling feature.

Per per-PR loop: executor → Playwright smoke + screenshots → PR + Linear comment → user merge → next branch. Within PR-2, internal commit order: bells (Req6) → ribbon (Req2) → proxy modal (Req4), so the ribbon copy and the proxy exit-route (both → `/${locale}/home`, MF-4) are settled together.

---

## RALPLAN-DR Summary (for Architect → Critic)

### Principles (5)
1. **Mockup-first**: every behavior is clickable + local-state; zero backend wiring.
2. **Humi tokens are law**: no hardcoded hex, no Tailwind red; danger = pumpkin `--color-danger`.
3. **Wire what exists before building new**: LoginAsRibbon, TodoBell, PersonaSwitcher are dead/partial code to activate, not rebuild.
4. **Dedupe before extend**: the sidebar IA is cleaned (Req5) before new entries (Req1) are wired in.
5. **TH/EN parity is a build gate**: i18n-completeness test must stay green.

### Decision Drivers (top 3)
1. **Merge-conflict minimization** — Reqs 2/4/6 all edit `Topbar.tsx`/`AppShell.tsx`; collapse them into one `feat/shell-chrome` PR (PR-2) so the shared files change atomically, avoiding repeated rebases.
2. **Entry-point dependency** — Req1 roster needs the Req5 sidebar repoint to be reachable; Req5 must land first.
3. **Honoring the "unified approval inbox" rule + STA-51** — Req7 must simplify *within* the single `/quick-approve` umbrella, not spawn new approval surfaces.

### Viable Options

**Option A (CHOSEN — MF-6): 5 PRs, dedupe-first, shell-chrome collapsed.**
- Shape: PR-1 dedupe (minus roster/swap) · PR-2 shell-chrome [Req2+4+6] · PR-3 roster + roster/swap repoint · PR-4 home · PR-5 approvals.
- Pros: shell edits (the only files with real cross-req coupling) land atomically in ONE PR — zero inter-PR Topbar/AppShell rebases; still per-feature-demoable for the 3 leaf surfaces; no dead-link window (roster repoint travels with the roster page).
- Cons: PR-2 reviews 3 related shell changes at once (mitigated: each is small, internal commit order is fixed).

**Option B: 7 PRs (one per Req), dedupe-first, shell reqs sequential.**
- Pros: smallest single-PR diff; one Req per review.
- Cons: Reqs 2/4/6 share `Topbar.tsx`/`AppShell.tsx` → two guaranteed rebases on the same files; directly fights Decision Driver #1. **Invalidated.**

**Option C: Single PR (all 7).**
- Cons: violates the team's per-PR cadence + branch-isolation rule; huge review surface; high revert risk. **Invalidated.**

**Decision:** Option A (5 PRs). Option B invalidated because it re-introduces the exact merge-conflict cost Decision Driver #1 exists to avoid (the three shell reqs touch the same two files). Option C invalidated by the team's established multi-PR workflow (memory: STA-26 cadence) and branch-isolation rule. **The PR count is now fixed at 5 — there is no remaining "Architect may collapse" fork.**

### Open questions (to persist)
- Req2: does the ribbon render a quiet identity strip when NOT impersonating, or nothing? (Blueprint shows amber only during impersonation. Plan default: render nothing when not in proxy.)
- Req5: `probation` placeholder — repoint to a real `/workflows/probation` list or keep stub? (Verify route file exists first.)
- Req7: replace the heavy `quick-approve-page.tsx` as the default vs feature-flag the simple table?
- Req3: physically remove calendar i18n keys + `HUMI_CAL_EVENTS` or leave as dead?
- All: Linear has no tickets for Reqs 1/3/4/6 — create UI-mockup tickets vs attach to an umbrella?

---

## Pre-mortem (MF-7) — failure scenarios + mitigations

Proportional pre-mortem: assume the work shipped and something broke. Each scenario maps to a concrete mitigation already in the revised plan.

| # | Failure scenario (imagined post-ship) | Root cause | Mitigation in this plan | Owning AC |
|---|---|---|---|---|
| 1 | Amber acting-ribbon renders with NO background during the HR demo — looks like an unstyled grey strip. | Used `bg-warning-tint`, a class that does not exist in the Tailwind v4 `@theme` and compiles to nothing. | MF-1: plan mandates `bg-warning-soft`; token guardrail forbids `-tint`; AC2.1 asserts `bg-warning-soft` present AND `bg-warning-tint` absent. | AC2.1 |
| 2 | HR clicks "Roster" in the sidebar mid-demo and hits a 404 because the link was repointed before the page existed. | Sidebar `roster`→`/roster` repoint landed in an earlier PR than the page. | MF-2: repoint moved OUT of PR-1 INTO PR-3 (same commit as the page); AC5.2 route-existence gate fails loudly if any leaf points at a missing `page.tsx`; AC1.9 confirms the link is live in the page's own PR. | AC5.2, AC1.9 |
| 3 | A new string ships in EN but not TH (or vice-versa); the build/i18n gate fails or the demo shows a raw key. | A key added to only one of `messages/{en,th}.json`. | Keys added to BOTH files for every new namespace (Reqs 1/2/4/7); `npm test -- --run i18n-completeness` is in the per-PR cross-cutting verification and is its own AC for Req3 (AC3.6). | AC3.6 + cross-cutting i18n gate |
| 4 | Deleting `ActingBadge.tsx` red-builds CI because a barrel export still references it. | `src/components/humi/index.ts:42` re-exports the deleted component. | MF-3: `index.ts` added to Req2 file list; AC2.6 asserts zero `ActingBadge` references incl. the barrel; `npm run build` would fail otherwise (the AC's own proof). | AC2.6 |
| 5 | Two "exit impersonation" controls send the user to different pages (`/home` vs `/admin`), confusing the demo. | LoginAsRibbon exits to `/home`, PersonaSwitcher exits to `/admin`. | MF-4: PersonaSwitcher exit changed to `/${locale}/home`; AC2.3 + AC4.7 both assert the locale-prefixed `/${locale}/home` and that PersonaSwitcher no longer routes to `/admin`. | AC2.3, AC4.7 |
| 6 | Night-shift cells are unreadable (navy text on navy background). | `.s-night` mapped to navy bg without flipping the text token. | Contrast smaller-item: token table specifies `text-[var(--color-canvas-soft)]`; AC1.8 asserts light text token present and navy ink token absent on the night cell. | AC1.8 |

All six scenarios are mitigated by an explicit, falsifiable AC in the revised plan.

---

## ADR — Architecture Decision Record

**Title:** Sequence the 7-part Humi shell/IA mockup as 5 PRs, dedupe-first, with the shell-chrome reqs collapsed into one PR.

**Status:** Accepted (ralplan consensus, iteration 2).

**Decision:** Deliver the 7 requirements as **5 sequential PRs**: (1) sidebar dedupe minus roster/swap, (2) shell-chrome = acting ribbon + proxy modal + topbar inbox/noti bells [Reqs 2+4+6], (3) roster page + roster/swap sidebar repoint [Req1], (4) home 12 tiles + remove calendar [Req3], (5) simplified approvals table [Req7]. Build on Humi tokens only (amber = `bg-warning-soft`, danger = pumpkin `--color-danger`), with one canonical proxy-exit destination (`/${locale}/home`), and a route-existence gate that forbids any sidebar leaf pointing at a missing page.

**Drivers (top 3):**
1. Merge-conflict minimization — Reqs 2/4/6 share `Topbar.tsx`/`AppShell.tsx`.
2. Entry-point dependency + no-dead-link — the roster sidebar link must not precede the roster page.
3. Honor the "unified approval inbox" rule + STA-51 — Req7 simplifies within the single `/quick-approve` umbrella.

**Alternatives considered:**
- **7 PRs (one per Req).** Rejected: re-introduces two guaranteed rebases on the shared shell files, fighting Driver #1.
- **Single PR (all 7).** Rejected: violates the team's per-PR cadence + branch-isolation rule; high review/revert risk.
- **Repoint roster in PR-1 (original plan).** Rejected: creates a dead-link window between the repoint PR and the roster-page PR (pre-mortem scenario #2).

**Why chosen:** 5 PRs is the smallest count that keeps the only cross-req-coupled files (the shell) in a single atomic change while preserving per-feature demoability for the three independent leaf surfaces (roster, home, approvals) — and it eliminates the dead-link window by co-locating the roster repoint with the roster page.

**Consequences:**
- Positive: zero inter-PR shell rebases; no dead sidebar links at any commit; each PR independently demoable to HR; falsifiable token/route/locale ACs make the mechanical failure modes test-caught, not demo-caught.
- Negative / accepted cost: PR-2 bundles three shell changes (larger single review); a regression isolated to one shell req is reverted at the granularity of the whole shell-chrome PR. Mitigated by fixed internal commit order (bells → ribbon → proxy) and small per-change diffs.

**Follow-ups (out of scope of these 5 PRs):**
- Cleanup ticket: refactor the ~24 files using the dead `bg-warning-tint` → `bg-warning-soft` (mirrors the `danger-tint`→`danger-soft` TODO at globals.css:61).
- Create Linear UI-mockup tickets for Reqs 1/3/4/6 (none exist); re-run the Linear search against the live `https://mcp.linear.app/mcp` endpoint and cite IDs in each PR.
- Resolve the 5 open questions above (ribbon non-proxy state; probation repoint; approvals replace-vs-flag; calendar key removal; ticket strategy).
