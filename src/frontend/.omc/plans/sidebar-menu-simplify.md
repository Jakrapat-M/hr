# Plan — Sidebar MENU Simplification (40 → 25 leaves)

> **Mode:** ralplan consensus, iteration 2 (Architect APPROVED iter-1; Critic ITERATE → MF-1 roster-commit precondition + MF-2 docreview duplicate both addressed). SHORT mode.
> **Supersedes:** PR-1 ("Req5 sidebar dedupe") of `.omc/plans/sidebar-shell-7part-ui.md`. This plan REPLACES the lighter pointer-dedupe with a full menu reduction — placeholder leaves are CUT, not repointed.
> **Branch context:** `feat/sidebar-ia-restructure`.
> **Phase guardrail:** UI Mockup for HR sign-off. Backend OUT OF SCOPE. Clickable flows, mock/registry data, Humi tokens, TH/EN parity only. DoD = "no dead ends".
> **Frontend root:** `/Users/tachongrak/Projects/hr/src/frontend`
> **i18n:** `messages/th.json` + `messages/en.json` (frontend root). `src/lib/__tests__/i18n-completeness.test.ts` enforces EN==TH key parity (exact count equality + identical namespace set).

---

## Context (verified against the live tree, 2026-05-25)

| Fact | Verified value |
|---|---|
| Sidebar source | `src/components/humi/shell/Sidebar.tsx`. `MODULES: ModuleGroup[]` at **L96–205** (4 groups, **40 leaves** — verified `grep -c '{ id:'` = 40, not 41; the earlier "41" was an estimate). `SIDEBAR_LEGACY` comment block at **L406–463**. |
| Test asserting structure | `src/components/__tests__/sf-parity-sidebar.test.tsx` (350 lines). Asserts workspace = **9** leaves incl. `ใบคำขอ` (L189), hr leaf `ค่าตอบแทน → /th/payroll` (L271), merged `กล่องงาน · อนุมัติ` (L241), `อนุมัติ` absent (L245). |
| `__BENEFITS__` sentinel | Resolved in `Sidebar.tsx` `leafBareHref` via `benefitsHubRoute(locale)` → `/benefits-hub` (verified `src/lib/benefit-routes.ts`). |
| **`/roster` page** | EXISTS **in the working tree only (git-UNTRACKED)** — `src/app/[locale]/roster/page.tsx` (190 lines: RosterGantt + CoverageStrip + ShiftEditorDrawer + ShiftSwapModal + BulkAssignModal, tokenized, no hex). **CAUTION (MF-1, verified):** `git status` shows `?? src/.../roster/` and `git ls-tree master … roster/` is EMPTY — the files are **NOT committed and NOT on `master`**. So "exists" holds for THIS dirty branch but would VANISH on a clean branch off master. The `roster → /roster` repoint therefore has a hard precondition — see the **Precondition** section below. |
| Probation page | `src/app/[locale]/manager-dashboard/probations/page.tsx` EXISTS (current leaf points at `/workflows/probation`, which also exists — target uses `/manager-dashboard/probations`). |
| Timesheet page | `src/app/[locale]/time/timesheet/page.tsx` — h1 already = `บันทึกเวลางาน`/`Timesheet`, desc = "weekly hours per project". Eyebrow = `เวลางาน`/`Time & Attendance`. Inline strings, NO message-file keys. `/time` landing eyebrow = `เวลาและการเข้างาน`/`Time & Attendance`. |
| All 25 target routes | **EXIST** (verified `find … page.tsx`): home, profile/me, time, timeoff, payslip, me/documents, announcements, quick-approve, roster, performance-form, manager-dashboard/probations, reports, admin/employees, org-chart, admin/hire, recruiting, admin/benefits, admin/documents, admin/change-requests, resignation, permissions, admin/foundation, admin/system, admin/system/notifications. |
| `/requests` route | EXISTS but its menu leaf is being CUT (folds into leaves/documents). Page stays reachable by URL; add a SIDEBAR_LEGACY annotation. |
| `/integrations` route | EXISTS (`src/app/[locale]/integrations/page.tsx`). Its menu leaves are CUT; page stays URL-only (annotate). |

**Net delta vs the 7-part PR-1:** that PR *kept* every placeholder and gave each a `?section=`/`#tab` deep-link to look distinct. This plan *deletes* them. Outcome: 40 → 25 leaves, every leaf maps to a real, distinct `page.tsx`, no deep-link-only "honest stubs."

---

## Precondition — Roster page MUST be on this branch before the `roster → /roster` repoint (MF-1)

The `roster` leaf repoint (`/manager-dashboard` → `/roster`) is the ONLY edit in this plan that depends on a file that is **not yet committed and not on `master`** (`src/app/[locale]/roster/**`, currently `?? untracked`). If this PR is cut as a clean branch off `master` (per the branch-isolation-off-master rule), those files are absent, AC-ROUTE's `fs.existsSync('/roster/page.tsx')` FAILS, and the live `roster → /roster` link 404s in the HR demo — the exact failure this plan exists to prevent.

**Hard rule (executor MUST satisfy ONE of these before/with the repoint commit):**
1. **Include the roster files in this PR** — stage and commit `src/app/[locale]/roster/**` and its deps (`src/components/roster/**`, `src/data/roster/mock.ts`) in the SAME branch/PR as the `MODULES` edit, so the leaf and its target page land atomically. (Preferred when the roster work is otherwise unowned.) OR
2. **Sequence after the roster page lands** — if a separate roster PR is in flight (7-part PR-3), branch this work on top of (or merge after) that PR so `/roster` is already committed; do NOT branch off bare `master` where roster is absent. OR
3. **Defer the roster leaf** — if neither (1) nor (2) is possible at PR time, keep `roster → /manager-dashboard` (a real, committed route) in this PR and repoint to `/roster` in the roster PR's own commit (the original 7-part deferral). This keeps the menu-simplify shippable with zero dead links even on a clean tree.

Executor: pick (1) by default for this branch context (`feat/sidebar-ia-restructure` already carries the untracked roster files); confirm with the user/Architect if a clean master branch is required. Whichever path, AC-ROUTE must run against the **committed** tree (see AC-ROUTE note), not the dirty working tree, so the gate reflects what actually ships.

**User-confirm item (NON-blocking, no code change):** the `requests` and `comp` cuts hide REAL, existing funnels — `/requests` and `/payroll` both have live pages. For a *scope-confirmation* mockup, HR may expect to see those entries. Per the user's "CLEANEST" directive the default is **keep them cut + SIDEBAR_LEGACY-annotated**, but surface this to the user once at sign-off: "Requests and Compensation pages still exist and are URL-reachable; they were removed from the menu by the cleanest-cut decision — confirm that is intended for the demo."

---

## Guardrails

**Must have**
- Every remaining leaf `href` resolves to an existing `page.tsx` (or the documented `__BENEFITS__` sentinel). Verified above; locked by AC-ROUTE.
- Preserve in every kept leaf: `show: PersonaId[]` gates (`employee|manager|hradmin|hris|spd|sysadmin`, `ALL6`), badges (`leaves`=3, `approvals`=12, `benefits-admin`=2), and the `__BENEFITS__` sentinel on benefits.
- 4-group structure + locked-group + master-detail single-open rail + persona-gating + active-state + footer behaviours UNCHANGED (only the leaf set shrinks).
- TH/EN parity: menu labels are inline `label`/`labelTh` (no message keys) — confirmed no `messages/*.json` change for the menu. Timesheet relabel also inline. i18n-completeness must stay green.
- Humi tokens only (no new CSS needed — leaf rendering is unchanged).

**Must NOT have**
- No new routes, no backend, no API wiring.
- No `?section=`/`#tab` deep-link-only leaves (that was the rejected approach).
- No leaf left pointing at a non-existent page (no dead ends — DoD).
- No change to `Role`/`PersonaId`/`PERSONA_ROLE`/`personaGranted`/`leafVisible` logic — only the `MODULES` data and the dead `SIDEBAR_LEGACY` block.

---

## Target MODULES (the exact agreed shape, 25 leaves)

Reproduced for the executor. Comments annotate every CUT/MERGE. `ALL6` and the `__BENEFITS__` sentinel are unchanged.

```ts
const MODULES: ModuleGroup[] = [
  {
    id: 'workspace', label: 'My Workspace', labelTh: 'พื้นที่ทำงานของฉัน', icon: Users,
    leaves: [
      { id: 'home',      label: 'Home',              labelTh: 'หน้าหลัก',          href: '/home',          show: ALL6 },
      { id: 'profile',   label: 'My Profile',        labelTh: 'โปรไฟล์ของฉัน',     href: '/profile/me',    show: ALL6 },
      { id: 'time',      label: 'Time & Attendance', labelTh: 'เวลาและการเข้างาน', href: '/time',          show: ALL6 }, // labelTh changed ลงเวลา → เวลาและการเข้างาน
      { id: 'leaves',    label: 'Leaves',            labelTh: 'ใบลา',              href: '/timeoff',       badge: '3', show: ALL6 },
      { id: 'payslips',  label: 'Payslips',          labelTh: 'สลิปเงินเดือน',     href: '/payslip',       show: ALL6 },
      { id: 'benefits',  label: 'Benefits',          labelTh: 'สวัสดิการ',         href: '__BENEFITS__',   show: ALL6 },
      { id: 'documents', label: 'Documents',         labelTh: 'เอกสาร',            href: '/me/documents',  show: ALL6 },
      { id: 'announce',  label: 'Announcements',     labelTh: 'ประกาศ',            href: '/announcements', show: ALL6 },
      // CUT: requests (/requests) — folds into leaves/documents. Page stays URL-only.
    ],
  },
  {
    id: 'team', label: 'Team Management', labelTh: 'การจัดการทีม', icon: Network,
    leaves: [
      { id: 'approvals', label: 'Team Inbox · Approvals', labelTh: 'กล่องงาน · อนุมัติ', href: '/quick-approve',              badge: '12', show: ['manager','hradmin','hris','spd','sysadmin'] }, // merged inbox+approvals (unchanged)
      { id: 'roster',    label: 'Roster & Shifts',        labelTh: 'ตารางกะ',           href: '/roster',                     show: ['manager','hradmin','sysadmin'] }, // repointed → real /roster page
      { id: 'perf',      label: 'Team Performance',       labelTh: 'ผลงานทีม',          href: '/performance-form',           show: ['manager','hradmin','sysadmin'] },
      { id: 'probation', label: 'Probation Reviews',      labelTh: 'ทดลองงาน',          href: '/manager-dashboard/probations', show: ['manager','hradmin','sysadmin'] },
      { id: 'reports',   label: 'Reports',                labelTh: 'รายงาน',            href: '/reports',                    show: ['manager','hradmin','hris','spd','sysadmin'] },
      // CUT: swap (Shift Swap) — it is a modal inside /roster (?panel=swap), not a menu item.
    ],
  },
  {
    id: 'hr', label: 'HR Administration', labelTh: 'งานบุคคล', icon: IdCard,
    leaves: [
      { id: 'employees',      label: 'Employees',        labelTh: 'ทะเบียนพนักงาน', href: '/admin/employees',       show: ['hradmin','hris','spd','sysadmin'] },
      { id: 'orgchart',       label: 'Org Chart',        labelTh: 'ผังองค์กร',       href: '/org-chart',             show: ['hradmin','hris','spd','sysadmin'] },
      { id: 'hire',           label: 'Hire & Onboard',   labelTh: 'จ้างงาน',         href: '/admin/hire',            show: ['hradmin','sysadmin'] }, // merges lifecycle/onboarding
      { id: 'recruit',        label: 'Recruitment',      labelTh: 'สรรหา',           href: '/recruiting',            show: ['hradmin','sysadmin'] },
      { id: 'benefits-admin', label: 'Benefits Admin',   labelTh: 'จัดการสวัสดิการ', href: '/admin/benefits',        badge: '2', show: ['hradmin','hris','spd','sysadmin'] }, // merges welfare+claims
      { id: 'hr-docs',        label: 'HR Documents',     labelTh: 'เอกสารบุคคล',     href: '/admin/documents',       show: ['hradmin','sysadmin'] }, // merges confirm
      { id: 'changes',        label: 'Change Requests',  labelTh: 'คำขอเปลี่ยนแปลง', href: '/admin/change-requests', show: ['hradmin','hris','sysadmin'] }, // merges transfer+regular
      { id: 'offboard',       label: 'Offboarding',      labelTh: 'ลาออก',           href: '/resignation',           show: ['hradmin','sysadmin'] },
      // CUT/fold: comp→(Payroll, reached elsewhere), assets→Catalog (System), attendance→Reports, audit→System.
    ],
  },
  {
    id: 'system', label: 'System Settings', labelTh: 'ตั้งค่าระบบ', icon: Settings,
    leaves: [
      { id: 'roles',    label: 'Roles & Permissions', labelTh: 'สิทธิ์ตามบทบาท', href: '/permissions',     show: ['sysadmin'] },
      { id: 'catalog',  label: 'Master Catalog',      labelTh: 'ฐานข้อมูลกลาง',   href: '/admin/foundation', show: ['hris','sysadmin'] }, // merges assets
      { id: 'docreview',label: 'Document Review',     labelTh: 'คิวตรวจเอกสาร',   href: '/admin/documents',  show: ['spd','sysadmin'] },
      { id: 'audit',    label: 'Audit & System',      labelTh: 'บันทึก · ระบบ',   href: '/admin/system',     show: ['hradmin','hris','spd','sysadmin'] }, // merges impers
      // CUT ENTIRELY: Integrations, Policy Builder, Approval Workflows, Branding, Notifications-as-integration.
      // Notifications has a real page (/admin/system/notifications) but is left reachable via /admin/system (default = cut). See Open Question.
    ],
  },
];
```

**Group counts:** Workspace 9→8, Team 7→5, HR 14→8, System 11→4 (the per-group "before" figures sum to 41 by the original estimate; the verified source `grep` is **40** leaf entries — one group's count is off by one in the estimate, immaterial to the target). Total **40 → 25**.

> **DECIDED (MF-2) — `docreview` / `hr-docs` cross-group same-route is an intentional, documented Principle-1 exception (NOT an open question).** Both `hr-docs` (HR group, `hradmin/sysadmin`) and `docreview` (System group, `spd/sysadmin`) point at the real `/admin/documents`. **Verified there is NO genuinely distinct doc-review-queue route** (`find … page.tsx | grep review|consent|doc`: the only candidates are `/admin/system/security/consent` = consent management and `/admin/system/system-features/edocuments` = an e-docs feature toggle — neither is a document-review queue). So pointing `docreview` elsewhere would itself create a misleading link. **Decision: keep `docreview → /admin/documents` and document the exception.** Rationale: they are the SAME screen entered from two different persona contexts — HR's document *management* entry vs SPD's review-*queue* entry — which is acceptable for a sign-off mockup. A `sysadmin` (the only persona holding both gates) could see both leaves, but in DIFFERENT groups, and the master-detail rail shows one group's panel at a time, so never two identical-href leaves in a single panel. This is the one allowed Principle-1 deviation; see **AC-DEDUPE** which encodes it. Removed from Open Questions.

---

## Per-area plan — exact file edits

### Edit 1 — `src/components/humi/shell/Sidebar.tsx` MODULES array (L96–205)

Replace the entire `MODULES` array with the 25-leaf shape above. Mechanical notes for the executor:
- Keep imports (`Users, Network, IdCard, Settings`) — all four group icons still used.
- Keep `ALL6`, `PERSONA_ROLE`, `personaGranted`, `leafVisible`, `leafBareHref`, `leafSuffix`, `RAIL_SHORT`, render JSX — UNCHANGED.
- `time` leaf `labelTh` changes `ลงเวลา` → `เวลาและการเข้างาน` (CONTEXT directive; distinguishes from Team "ตารางกะ").
- `roster` leaf `href` changes `/manager-dashboard` → `/roster` (page now exists).
- `probation` leaf `href` changes `/workflows/probation` → `/manager-dashboard/probations` (per target; both exist, target chosen for the manager-dashboard grouping).
- DROP leaves: `requests`, `swap`, `lifecycle`, `confirm`, `transfer`, `comp`, `welfare`+`claims` (replaced by single `benefits-admin`), `assets`, `attendance`, `policy`, `regular`, `workflows`, `notifs`, `integrations`, `branding`, `security`, `impers`. Where a merge replaces two leaves, the surviving leaf id is the new one in the table (e.g. `benefits-admin`, `changes`, `audit`, `catalog`, `hr-docs`, `docreview`).

### Edit 2 — `src/components/humi/shell/Sidebar.tsx` SIDEBAR_LEGACY block (L406–463)

The CUT routes need URL-only annotations so the design-gate parser knows they are intentionally menu-less. Add/keep `// SIDEBAR_LEGACY: <route> <reason ≥20 chars>` lines for the newly-orphaned routes:
- `/requests` — folded into Leaves + Documents workspace entries (≥20 chars reason).
- `/integrations` — Integrations feature cut; no real connect-via-web surface in mockup scope.
- `/payroll` — compensation reached from Payroll module, not a top-level HR leaf.
- Remove now-inaccurate lines (the block's own note says it is stale post-port). Keep genuine alt-paths (`/login`, `/employees/me`, `/ess/workflows`, `/overtime`, learning/talent family) that were never menu items.
- The block remains a comment block (dead code in the sense of "no runtime effect") — but it is the **design-gate coverage ledger**, so it is curated, not deleted wholesale.

### Edit 3 — Timesheet relabel — `src/app/[locale]/time/timesheet/page.tsx` (L28–37)

The user's confusion fix. Current eyebrow `เวลางาน`/`Time & Attendance` is too close to the `/time` landing AND to the new Team "Roster & Shifts." Make the timesheet read unambiguously as project-hours logging:
- Eyebrow TH `เวลางาน` → `บันทึกชั่วโมงงาน` ; EN `Time & Attendance` → `Hours Logging`.
- h1 stays `บันทึกเวลางาน`/`Timesheet` (already clear) OR optionally TH → `บันทึกชั่วโมงงานรายโครงการ` for max clarity (Architect to pick; default keep h1, change eyebrow only — minimal diff).
- These are inline strings — NO `messages/*.json` change, so i18n-completeness is untouched.
- Menu labels are already distinct (Workspace `เวลาและการเข้างาน` vs Team `ตารางกะ`) after Edit 1.

### Edit 4 — `src/components/__tests__/sf-parity-sidebar.test.tsx` (test-assertion diff)

The test currently encodes the OLD ~40-leaf structure. Exact changes:

| Test (line) | Current assertion | Change to |
|---|---|---|
| `surfaces all 9 ESS workspace leaves` (L179–192) | array of 9 incl. `'ใบคำขอ'` | Rename to `surfaces all 8 ESS workspace leaves`; DROP `'ใบคำขอ'` from the array → 8 labels. Add assertion `expect(screen.queryByText('ใบคำขอ')).not.toBeInTheDocument();`. |
| `maps leaves to the expected app routes` (L194–202) | unchanged hrefs | KEEP (home/profile/timeoff/payslip/me-documents/announcements still valid). No change. |
| `benefits leaf points at the Benefits Hub` (L204–207) | `/th/benefits-hub` | KEEP. |
| `renders the "ใบลา" badge` (L209–213) | badge 3 | KEEP. |
| `manager team leaves include the merged inbox·approvals…` (L235–248) | asserts `กล่องงาน · อนุมัติ → /th/quick-approve`, `อนุมัติ` absent, `รายงาน → /reports`, `ผลงานทีม → /performance-form` | KEEP all. ADD: `expect(screen.getByText('ตารางกะ').closest('a')).toHaveAttribute('href','/th/roster');` and `expect(screen.getByText('ทดลองงาน').closest('a')).toHaveAttribute('href','/th/manager-dashboard/probations');` ADD: `expect(screen.queryByText('สลับกะ')).not.toBeInTheDocument();` (swap cut). |
| `hr_admin hr-group leaves expose…clusters` (L261–272) | asserts `ทะเบียนพนักงาน → /admin/employees`, `จ้างงาน → /admin/hire`, `สรรหา → /recruiting`, **`ค่าตอบแทน → /th/payroll`** | DROP the `ค่าตอบแทน → /payroll` assertion (comp leaf cut). KEEP the other three. ADD: `expect(screen.queryByText('ค่าตอบแทน')).not.toBeInTheDocument();` ADD: `expect(screen.getByText('จัดการสวัสดิการ').closest('a')).toHaveAttribute('href','/th/admin/benefits');` ADD: `expect(screen.queryByText('แผนสวัสดิการ')).not.toBeInTheDocument();` (welfare cut) and `expect(screen.queryByText('โยกย้าย')).not.toBeInTheDocument();` (transfer cut). |
| `manager unlocks the team group but not HR admin` (L226–233) | manager system locked | KEEP — still true (no manager-gated system leaf). |
| `hr_admin unlocks workspace + team + hr + system` (L250–259) | system unlocked because hradmin in a system leaf | KEEP — `audit` leaf now lists `hradmin`, so System stays unlocked for hr_admin. Verify the comment (was "Regularization Queue" — now it is "Audit & System"). Update the inline comment to cite `audit`. |
| `hr_manager (HRIS tier) unlocks the system group` (L274–278) | system unlocked | KEEP — `catalog`/`audit` list `hris`. |
| master-detail rail tests (L283–313) | select hr → `ทะเบียนพนักงาน` visible; team → `กล่องงาน · อนุมัติ` | KEEP. |
| active-leaf + footer tests (L317–349) | profile/benefits/home active, footer card | KEEP. |
| Top comment block (L1–26) | describes "9 ESS leaves" | UPDATE prose: workspace now 8 leaves; note placeholders cut; list new system leaves. (Doc-only.) |

**Executor note (non-blocking) — the test now asserts a deliberately NON-parity IA.** The file is named `sf-parity-sidebar.test.tsx` and its header prose claims SF/Blueprint parity, but after this edit it asserts an INTENTIONALLY reduced IA that diverges from the Blueprint's 40-leaf tree. To avoid misleading future readers: EITHER rename the file to `sidebar-ia.test.tsx` (update the import-by-path nowhere — it's a leaf test, safe to rename) OR keep the name and add a prominent header comment: "NOTE: this suite intentionally diverges from SF/Blueprint parity — the menu was simplified 40→25 per .omc/plans/sidebar-menu-simplify.md; it asserts the reduced IA, not Blueprint parity." Executor discretion; rename preferred for honesty.

Also: the test's persona-unlock expectations for SYSTEM must still hold. With the new System leaves (`roles` sysadmin-only; `catalog` hris+sysadmin; `docreview` spd+sysadmin; `audit` hradmin+hris+spd+sysadmin), the group is unlocked for hradmin/hris/spd/sysadmin and locked for plain employee + manager — matching the existing assertions (manager system locked at L232; employee system locked at L163). Confirm no test expected a manager to see a system leaf (none does).

---

## Acceptance Criteria (testable)

**AC-WS8 (workspace count):** Updated `sf-parity-sidebar` test "surfaces all 8 ESS workspace leaves" passes; `queryByText('ใบคำขอ')` is null. (Vitest)

**AC-TEAM (team leaves):** Team group for a manager shows exactly `กล่องงาน · อนุมัติ`(→/quick-approve,badge 12), `ตารางกะ`(→/roster), `ผลงานทีม`(→/performance-form), `ทดลองงาน`(→/manager-dashboard/probations), `รายงาน`(→/reports); `สลับกะ` absent. (Vitest)

**AC-HR (hr leaves):** hr_admin HR group shows the 8 leaves; `ค่าตอบแทน`, `แผนสวัสดิการ`, `โยกย้าย`, `ทรัพย์สิน` all absent; `จัดการสวัสดิการ → /admin/benefits` carries badge 2. (Vitest)

**AC-SYS (system leaves):** System group for sysadmin shows exactly `สิทธิ์ตามบทบาท`,`ฐานข้อมูลกลาง`,`คิวตรวจเอกสาร`,`บันทึก · ระบบ`; `เชื่อมต่อระบบ`(Integrations), `ตั้งค่านโยบาย`,`ขั้นตอนอนุมัติ`,`ธีม`,`ความปลอดภัย` all absent. (Vitest)

**AC-ROUTE (no dead ends — the key DoD gate):** A test enumerates every leaf's resolved bare path across all 6 personas and asserts a matching `src/app/[locale]/<path>/page.tsx` exists, with `__BENEFITS__ → /benefits-hub` resolved through `benefitsHubRoute`. Fails loudly if any leaf points at a missing route. (Add as a new `describe` block in `sf-parity-sidebar.test.tsx` or a sibling `sidebar-routes.test.tsx`.) **MF-1b — assert against the COMMITTED tree, not the dirty working tree:** a plain `fs.existsSync` would pass on the current branch (where `/roster` is untracked-but-present) and give a false-green that 404s once the PR is cut clean. The gate MUST reflect what actually ships. Implement via `git ls-files --error-unmatch src/app/[locale]/<path>/page.tsx` (or `git cat-file -e HEAD:<path>`) per leaf — i.e. the page must be TRACKED/committed, not merely on disk. Concretely the `/roster` page must be `git add`-ed in this PR (Precondition path 1) or already committed upstream (path 2) for AC-ROUTE to pass; if it is neither, the test fails and forces the Precondition-path-3 fallback (`roster → /manager-dashboard`). **All 25 target paths exist on disk at plan time; `/roster` is the one currently untracked — the committed-tree check is what makes the Precondition enforceable rather than advisory.**

**AC-DEDUPE (MF-2, documented Principle-1 exception):** Build the visible-leaf set for each of the 6 personas; assert that within ANY SINGLE rendered group panel no two leaves share an identical resolved bare path. The cross-group pair (`hr-docs` and `docreview`, both `/admin/documents`) is the ONE allowed exception and is explicitly whitelisted in the test with a comment citing this decision — assert they live in different groups (`hr` vs `system`) and never co-occur in one panel. Any OTHER duplicate bare-path within or across a persona's visible groups fails the test. (Vitest)

**AC-LABEL-DISTINCT (confusion fix):** (a) The Workspace `time` leaf TH label is `เวลาและการเข้างาน` and the Team `roster` leaf TH label is `ตารางกะ` — assert they are different strings and both present for an hradmin (who sees both groups). (b) The `/time/timesheet` page eyebrow no longer contains `Time & Attendance`/`เวลางาน` ambiguity — assert eyebrow text is `บันทึกชั่วโมงงาน`/`Hours Logging`. (Vitest — a small `timesheet-page.test.tsx` or extend existing.)

**AC-COUNT (reduction):** Source currently has **40** leaf entries (verified `grep -c '{ id:' Sidebar.tsx` = 40). After this edit the union of distinct leaves across all personas = **25** (or assert ≤ 26 and ≥ 24 to tolerate the Notifications open-question — keeping the optional 5th System "Notifications" leaf would make it 26). (Vitest)

**AC-BEHAVIOUR (regression):** All UNCHANGED behaviour assertions in `sf-parity-sidebar.test.tsx` still pass: 4 group tabs always render; locked groups disabled for employee; single-open master-detail rail; active-state highlight; footer logout card. (Vitest)

**AC-I18N (parity gate):** `i18n-completeness` stays green (no message keys added/removed; menu + timesheet relabels are inline). (Vitest)

### Verification commands
```bash
# from src/frontend
npm test -- --run sf-parity-sidebar     # AC-WS8 / AC-TEAM / AC-HR / AC-SYS / AC-ROUTE / AC-DEDUPE / AC-COUNT / AC-BEHAVIOUR
                                         #   (or sidebar-ia if renamed per the executor note)
npm test -- --run i18n-completeness      # AC-I18N
npm test -- --run timesheet              # AC-LABEL-DISTINCT (if a timesheet test is added)
npm run build                            # typecheck + Next build
# Playwright smoke @ :3000 (per project memory rule):
#  - login, open sidebar, assert each group shows only the reduced leaf set
#  - click EVERY leaf, assert no 404 / no dead end (DoD)
#  - assert Workspace "เวลาและการเข้างาน" and Team "ตารางกะ" both render distinctly for an HR persona
#  - open /th/time/timesheet, screenshot the de-confused eyebrow
#  - capture screenshots, post to the linked Linear ticket (or PR if none)
```

---

## How this slots in as the PR-1 replacement (vs the 7-part plan)

- **Replaces** `.omc/plans/sidebar-shell-7part-ui.md` → "Req 5 — Sidebar dedupe audit (PR-1)". That PR *kept* placeholders with deep-links; this plan *cuts* them. Update the 7-part plan's PR-1 row + Req5 section to reference this plan (or mark Req5 superseded).
- **Branch:** `feat/sidebar-menu-simplify` (off the current shell branch context per branch-isolation rule; coordinate with in-flight `feat/sidebar-ia-restructure`).
- **Dependency reconciliation with PR-3 (roster):**
  - The 7-part PR-3 deferred the `roster → /roster` repoint to "the commit that creates `/roster`." `/roster` now exists ON THIS BRANCH (untracked). This menu-simplify PR can repoint `roster → /roster` immediately **only if the Precondition (MF-1) is satisfied** — i.e. the untracked roster files are committed in this PR (path 1) or already upstream (path 2); otherwise fall back to keeping `roster → /manager-dashboard` here and repoint in the roster PR (path 3). With the Precondition honored there is zero dead-link window; AC-ROUTE's committed-tree check enforces it. Note in PR-3 that the sidebar repoint is done here once roster is committed.
  - The merged `inbox+approvals → /quick-approve` leaf is preserved exactly as the 7-part PR-1 left it (unified-inbox rule + STA-51). No change.
  - `swap` is CUT here (it is a `/roster?panel=swap` modal). The 7-part PR-3 said "swap → /roster?panel=swap"; that swap *entry* is now the in-page modal only, not a menu item — consistent, just no sidebar leaf.
- **No collision with PR-2 (shell-chrome):** PR-2 edits `Topbar.tsx`/`AppShell.tsx`/`LoginAsRibbon.tsx`/`PersonaSwitcher.tsx`/`TodoBell.tsx`. This PR edits `Sidebar.tsx` + `sf-parity-sidebar.test.tsx` + `time/timesheet/page.tsx` only. Disjoint file sets → parallel-safe.

---

## RALPLAN-DR Summary (for Architect → Critic)

### Principles
1. **One leaf, one real screen.** Every menu item maps to an existing, distinct `page.tsx` — no deep-link-only "honest stubs," no dead ends (mockup DoD).
2. **Cut beats hide.** For a sign-off mockup, a smaller honest menu reads better than a long menu padded with disabled/"coming-soon" rows.
3. **Preserve the IA scaffolding.** Only the leaf *data* shrinks; group structure, persona gates, badges, sentinel, and all behaviours are untouched and regression-locked.
4. **Tests encode the IA.** The structural test is updated in lockstep so the reduced menu is the asserted contract, not an accident.
5. **TH/EN parity is a build gate.** Inline relabels only — i18n-completeness stays green.

### Decision Drivers (top 3)
1. **No dead ends (DoD).** The dominant constraint; drives the committed-tree AC-ROUTE check and the MF-1 roster-commit Precondition (a leaf may only point at a route that actually ships, not one that merely sits untracked on the dev branch).
2. **Label clarity (the user's confusion).** Workspace "Time & Attendance" (hour/attendance) vs Team "Roster & Shifts" (manager shift grid) must be unmistakable — drives the menu relabel + timesheet-eyebrow fix (AC-LABEL-DISTINCT).
3. **Consistency with in-flight shell work.** Must keep the merged inbox/approvals leaf and the now-real `/roster` repoint aligned with the 7-part plan's PR-2/PR-3 without file collisions.

### Viable Options
**Option A (CHOSEN): Cut placeholder leaves outright (40 → 25).**
- Pros: cleanest menu; every item is real; no maintenance of fake deep-links; smallest cognitive load for HR sign-off; matches the explicit user directive ("CLEANEST").
- Cons: some Blueprint IA breadth is lost from the visible menu (mitigated: routes remain URL-reachable + SIDEBAR_LEGACY-annotated); the structural test needs the largest assertion rewrite.

**Option B: Keep all leaves as disabled / "coming soon."**
- Pros: preserves the full Blueprint IA on screen; signals roadmap to HR.
- Cons: 16 disabled rows is visual clutter; "coming soon" reads as unfinished in a sign-off demo; still needs gating/labeling churn; directly contradicts the user's "cut outright" choice. **Invalidated by the explicit user decision + Principle 2.**

**Option C: Merge placeholders into parent screens via deep-links (the 7-part PR-1 approach).**
- Pros: every Blueprint concept stays reachable from the menu; smaller per-leaf diff.
- Cons: deep-link-only leaves look distinct but land on the same screen → feels like dead/duplicate entries (the exact problem this simplification fixes); keeps the menu long; the `bare-path-exempt` dedupe gate is harder to reason about. **Invalidated: it is the status quo this work supersedes; fails Principle 1 (a `?section=` leaf is not "one real distinct screen").**

**Decision:** Option A. Option B rejected by the user's explicit "cleanest cut" directive and the sign-off readability principle. Option C rejected because it is precisely the lighter pointer-dedupe being replaced — deep-link-only leaves violate "one leaf, one real screen."

---

## Pre-mortem — failure scenarios + mitigations

Assume this shipped and something broke. Each scenario maps to a concrete mitigation now in the plan.

| # | Failure scenario (imagined post-ship) | Root cause | Mitigation | Owning gate |
|---|---|---|---|---|
| 1 | HR clicks "Roster & Shifts" mid-demo and hits a 404. | The `roster → /roster` leaf shipped but the `/roster` page files were git-untracked and got left behind when the PR branched off clean `master`. | MF-1: Precondition section forces the roster files to be committed in this PR (path 1), sequenced after the roster PR (path 2), or the leaf deferred to `/manager-dashboard` (path 3). AC-ROUTE checks the COMMITTED tree (`git ls-files`/`git cat-file -e HEAD:`), not the dirty disk, so a false-green is impossible. | AC-ROUTE + Precondition |
| 2 | A future reader trusts `sf-parity-sidebar.test.tsx` as proof the menu matches the Blueprint, and "fixes" the simplified menu back toward parity. | The test name + header still claim SF/Blueprint parity while the suite now asserts a deliberately reduced (non-parity) IA. | Executor note in Edit 4: rename to `sidebar-ia.test.tsx` OR add a prominent "intentionally diverges from parity — see this plan" header comment. | Edit 4 executor note |
| 3 | A `sysadmin` sees two "documents" entries and reports a duplicate/dead menu item. | `hr-docs` and `docreview` both resolve to `/admin/documents` across two groups. | MF-2: documented Principle-1 exception (no distinct review route exists; same screen, two persona contexts); AC-DEDUPE whitelists exactly this one cross-group pair and fails on any other duplicate; the master-detail rail shows one group's panel at a time so the two never co-occur in a single panel. | AC-DEDUPE |
| 4 | A new menu string ships in TH but not EN (or the build red-fails). | A relabel accidentally introduced a `messages/*.json` key on only one side. | Menu + timesheet relabels are INLINE `label`/`labelTh` / inline JSX strings — zero message-file keys touched; AC-I18N (`i18n-completeness`) is in the per-PR verification. | AC-I18N |
| 5 | HR expects to find "Requests" / "Compensation" in the menu for scope confirmation and thinks the feature was dropped. | The `requests` and `comp` leaves were cut though `/requests` and `/payroll` pages still exist. | User-confirm item (NON-blocking) in the Precondition section: surface the cut to the user at sign-off; pages stay URL-reachable + SIDEBAR_LEGACY-annotated. | User-confirm note |

---

## ADR — Architecture Decision Record

**Title:** Simplify the Humi sidebar menu from 40 to 25 leaves by cutting placeholder leaves outright (supersedes the deep-link dedupe of 7-part PR-1).

**Status:** Proposed (ralplan consensus, iteration 2 — Architect APPROVED iter-1; Critic MF-1/MF-2 addressed).

**Decision:** Replace the `MODULES` array in `Sidebar.tsx` with a 25-leaf, 4-group set where every leaf maps to an existing, distinct `page.tsx`; cut Integrations and all `?section=`/`#tab` placeholder leaves; repoint `roster → /roster` (page now exists) and `probation → /manager-dashboard/probations`; relabel the Workspace time leaf and the `/time/timesheet` eyebrow to disambiguate hour-logging from the Roster shift grid. Update `sf-parity-sidebar.test.tsx` to assert the reduced IA, and add a filesystem route-existence AC.

**Drivers (top 3):** (1) no dead ends (DoD); (2) Time-vs-Roster label clarity; (3) consistency with in-flight shell PRs (merged inbox, real /roster).

**Alternatives considered:**
- Keep all leaves disabled / "coming soon" — rejected (clutter; contradicts user's cut directive).
- Deep-link placeholders into parents (7-part PR-1) — rejected (the status quo being superseded; deep-link-only leaves are not distinct screens).

**Why chosen:** A cut-outright menu is the smallest honest IA for HR sign-off, eliminates the duplicate-feeling deep-link leaves, and — because all 25 target routes exist on disk (with the roster precondition enforced by AC-ROUTE) — carries zero dead-link risk while needing no new pages.

**Consequences:**
- Positive: ~38% fewer leaves (40→25); every leaf demoable to a real screen; the label fix removes the Time/Roster confusion; disjoint file set from PR-2 (parallel-safe); the committed-tree route-existence AC makes dead links test-caught, not demo-caught.
- Negative / accepted: some Blueprint IA breadth no longer surfaced in the menu (routes stay URL-reachable + annotated); largest single rewrite of the structural test; one DOCUMENTED cross-group `/admin/documents` reuse (`hr-docs` vs `docreview`) is an intentional Principle-1 exception, encoded in AC-DEDUPE (no distinct doc-review route exists to point at); the `roster` leaf carries a commit precondition (MF-1).

**Follow-ups (out of scope):**
- Resolve the Notifications open question (keep `/admin/system/notifications` as a 5th System leaf vs leave it under `/admin/system`; default = cut).
- Update `.omc/plans/sidebar-shell-7part-ui.md` PR-1/Req5 to mark it superseded by this plan and note the roster repoint moved here.
- (RESOLVED in iter-2, no longer a follow-up: the `docreview` route question — decided as a documented same-route exception since no distinct review surface exists.)
