'use client';

// ════════════════════════════════════════════════════════════
// Humi Sidebar — ported 1:1 from the HRMS Blueprint shell
// (/Users/tachongrak/Projects/HRMS_Blueprint/hrms-shell.jsx :
//  MODULES array + <Sidebar/> component + hrms-shell.css nav rules).
//
// This REPLACES the previous role-gated accordion IA with the Blueprint's
// 4-group / single-open accordion IA verbatim. User directive 2026-05-25:
// "port ตาม blueprint เป๊ะ".
//
// Structure (per Blueprint):
//   <aside class="bp-sidebar">
//     <div class="bp-brand"> wordmark img + <div class="bp-tenant">CENTRAL · BANGKOK 03</div>
//     per group:
//       <div class="bp-nav-group [open] [locked]">
//         <button class="bp-nav-trigger" aria-expanded disabled={locked}>
//           <span icon/><span label/><span count/><span chev/>
//         <div class="bp-nav-panel"><div><div class="bp-nav-children">
//           per leaf <Link class="bp-nav-child [is-active]"> label + optional badge
//     footer <div class="bp-sb-user"> avatar + name + empId
//
// Behaviours ported:
//  - single-open accordion: ONE openGroup id; clicking the open one closes it.
//  - .bp-nav-panel grid-template-rows 0fr→1fr collapse transition (CSS).
//  - groups with zero accessible leaves for the persona are NOT rendered
//    (removed entirely — never shown as locked/disabled).
//  - active leaf highlighted via .is-active derived from pathname.
//
// Adaptations for Next.js:
//  - leaves render as <Link href> mapped to existing app routes (see href map).
//  - persona `show:[...]` ids mapped to the app Role union (PERSONA_ROLE).
//  - lucide-react icons replace the Blueprint's inline `I` glyph set.
//  - footer keeps the existing logout-to-/login affordance with .bp-sb-user look.
//  - class names prefixed `bp-` so the new CSS block in globals.css is additive
//    and does not collide with the legacy `.humi-*` sidebar rules.
// ════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Users,
  Network,
  IdCard,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { benefitsHubRoute } from '@/lib/benefit-routes';
import type { Role } from '@/lib/rbac';

export interface SidebarProps {
  /** Called when any nav item is clicked — used by AppShell to close the
   *  mobile drawer after navigation. */
  onNavigate?: () => void;
  /** Called when the explicit close (X) button is clicked. Renders the close
   *  button only when this prop is provided — typically only in drawer mode. */
  onClose?: () => void;
  /** Extra className merged onto <aside> — e.g. "humi-sidebar--drawer". */
  className?: string;
}

/** Blueprint persona ids. */
type PersonaId = 'employee' | 'manager' | 'hrbp' | 'spd' | 'hradmin' | 'hris' | 'sysadmin';

type Leaf = {
  id: string;
  label: string; // EN
  labelTh: string; // TH
  /** Mapped Next.js route (bare, no locale prefix). Some leaves with no
   *  dedicated screen point at the closest existing route (no dead ends). */
  href: string;
  badge?: string;
  /** Visible only to these personas. Omit → visible to everyone. */
  show?: PersonaId[];
};

type ModuleGroup = {
  id: string;
  label: string; // EN
  labelTh: string; // TH
  icon: LucideIcon;
  leaves: Leaf[];
};

const ALL6: PersonaId[] = ['employee', 'manager', 'hradmin', 'hris', 'spd', 'sysadmin'];

// ── Blueprint MODULES IA, ported verbatim (labels + badges + show gates).
//    `href` is the Next.js route each leaf navigates to. Leaves whose blueprint
//    concept has no dedicated screen point at the closest existing route so the
//    mockup never dead-ends (annotated PLACEHOLDER).
const MODULES: ModuleGroup[] = [
  {
    id: 'workspace',
    label: 'My Workspace',
    labelTh: 'พื้นที่ทำงานของฉัน',
    icon: Users,
    leaves: [
      { id: 'home', label: 'Home', labelTh: 'หน้าหลัก', href: '/home', show: ALL6 },
      { id: 'profile', label: 'My Profile', labelTh: 'โปรไฟล์ของฉัน', href: '/profile/me', show: ALL6 },
      { id: 'orgchart', label: 'Org Chart', labelTh: 'ผังองค์กร', href: '/org-chart', show: ALL6 }, // self-service: every persona can view org structure / their reporting line
      { id: 'time', label: 'Time & Attendance', labelTh: 'เวลาและการเข้างาน', href: '/time', show: ALL6 }, // labelTh changed ลงเวลา → เวลาและการเข้างาน (distinguish from Team "ตารางกะ")
      { id: 'leaves', label: 'Leaves', labelTh: 'ใบลา', href: '/timeoff', badge: '3', show: ALL6 },
      { id: 'payslips', label: 'Payslips', labelTh: 'สลิปเงินเดือน', href: '/payslip', show: ALL6 },
      { id: 'benefits', label: 'Benefits', labelTh: 'สวัสดิการ', href: '__BENEFITS__', show: ALL6 },
      { id: 'documents', label: 'Documents', labelTh: 'เอกสาร', href: '/me/documents', show: ALL6 },
      { id: 'announce', label: 'Announcements', labelTh: 'ประกาศ', href: '/announcements', show: ALL6 },
      { id: 'resign', label: 'Resign', labelTh: 'ลาออก', href: '/resignation', show: ALL6 }, // employee SELF-SERVICE (BRD #172) — lives in "ฉัน", not HR group (user 2026-05-27)
      // CUT: requests (/requests) — folds into leaves/documents. Page stays URL-only.
    ],
  },
  {
    id: 'team',
    label: 'Team Management',
    labelTh: 'การจัดการทีม',
    icon: Network,
    leaves: [
      { id: 'approvals', label: 'Team Inbox · Approvals', labelTh: 'กล่องงาน · อนุมัติ', href: '/quick-approve', badge: '12', show: ['manager', 'hrbp', 'hradmin', 'hris', 'spd', 'sysadmin'] }, // merged inbox+approvals; HRBP added 2026-05-28 (People Partner approval surface)
      { id: 'roster', label: 'Roster & Shifts', labelTh: 'ตารางกะ', href: '/roster', show: ['manager', 'hradmin', 'sysadmin'] }, // repointed → real /roster page
      { id: 'perf', label: 'Team Performance', labelTh: 'ผลงานทีม', href: '/performance-form', show: ['manager', 'hrbp', 'hradmin', 'sysadmin'] },
      { id: 'probation', label: 'Probation Reviews', labelTh: 'ทดลองงาน', href: '/manager-dashboard/probations', show: ['manager', 'hrbp', 'hradmin', 'sysadmin'] },
      { id: 'reports', label: 'Reports', labelTh: 'รายงาน', href: '/reports', show: ['manager', 'hrbp', 'hradmin', 'hris', 'spd', 'sysadmin'] },
      // CUT: swap (Shift Swap) — it is a modal inside /roster (?panel=swap), not a menu item.
    ],
  },
  {
    id: 'hr',
    label: 'HR Administration',
    labelTh: 'งานบุคคล',
    icon: IdCard,
    leaves: [
      { id: 'employees', label: 'Employees', labelTh: 'ทะเบียนพนักงาน', href: '/admin/employees', show: ['hradmin', 'hris', 'sysadmin'] }, // P1 Item 2: dropped hrbp+spd — admin/layout admits neither; People-Partner BU view is P2
      { id: 'hire', label: 'Hire & Onboard', labelTh: 'จ้างงาน', href: '/admin/hire', show: ['hradmin', 'sysadmin'] }, // merges lifecycle/onboarding
      { id: 'recruit', label: 'Recruitment', labelTh: 'สรรหา', href: '/recruiting', show: ['hradmin', 'sysadmin'] },
      { id: 'benefits-admin', label: 'Benefits Admin', labelTh: 'จัดการสวัสดิการ', href: '/admin/benefits', badge: '2', show: ['hrbp', 'hradmin', 'hris', 'spd', 'sysadmin'] }, // merges welfare+claims
      { id: 'hr-docs', label: 'HR Documents', labelTh: 'เอกสารบุคคล', href: '/admin/documents', show: ['hrbp', 'hradmin', 'sysadmin'] }, // merges confirm
      { id: 'changes', label: 'Change Requests', labelTh: 'คำขอเปลี่ยนแปลง', href: '/admin/change-requests', show: ['hradmin', 'hris', 'sysadmin'] }, // merges transfer+regular; P1 Item 2: dropped hrbp (change-requests approver roles exclude hrbp → barrier)
      // REMOVED 2026-05-27 (user: "ลาออกไม่ควรอยู่ใน บุคคล"): /resignation is an
      // employee SELF-SERVICE submission ("ยื่นคำขอลาออก … SPD รับทราบและดำเนินการต่อ"),
      // not an HR-admin console — it belongs to the "ฉัน" journey (entered from the
      // profile Employment tab). HR/SPD pick up the submitted request via /quick-approve.
      // CUT/fold: comp→(Payroll, reached elsewhere), assets→Catalog (System), attendance→Reports, audit→System.
    ],
  },
  {
    id: 'system',
    label: 'System Settings',
    labelTh: 'ตั้งค่าระบบ',
    icon: Settings,
    leaves: [
      { id: 'roles', label: 'Roles & Permissions', labelTh: 'สิทธิ์ตามบทบาท', href: '/permissions', show: ['sysadmin'] },
      { id: 'catalog', label: 'Master Catalog', labelTh: 'ฐานข้อมูลกลาง', href: '/admin/foundation', show: ['hris', 'sysadmin'] }, // merges assets
      // docreview shares /admin/documents with hr-docs (HR group) — documented Principle-1
      // exception: no distinct doc-review-queue route exists; same screen, two persona contexts.
      { id: 'docreview', label: 'Document Review', labelTh: 'คิวตรวจเอกสาร', href: '/admin/documents', show: ['spd', 'sysadmin'] },
      { id: 'audit', label: 'Audit & System', labelTh: 'บันทึก · ระบบ', href: '/admin/system', show: ['hrbp', 'hradmin', 'hris', 'spd', 'sysadmin'] }, // merges impers
      // CUT ENTIRELY: Integrations, Policy Builder, Approval Workflows, Branding, Notifications-as-integration.
      // Notifications has a real page (/admin/system/notifications) but is left reachable via /admin/system.
    ],
  },
];

// Blueprint nav-child rows carry no icon — only the group trigger has one —
// so leaf-level icons are intentionally omitted to stay faithful to the layout.

/** Blueprint persona id → app Role. sysadmin maps to the top role so it sees
 *  every group; hris → hr_manager (master-data tier), hradmin → hr_admin. */
const PERSONA_ROLE: Record<PersonaId, Role> = {
  employee: 'employee',
  manager: 'manager',
  hrbp: 'hrbp',
  spd: 'spd',
  hradmin: 'hr_admin',
  hris: 'hr_manager',
  sysadmin: 'hr_manager',
};

/** A persona is "granted" for the current user when the user owns the mapped
 *  Role directly. (Role hierarchy is handled by listing personas explicitly in
 *  each leaf's `show`, mirroring the Blueprint.) */
function personaGranted(persona: PersonaId, userRoles: Role[]): boolean {
  // employee persona = baseline, always granted for any authenticated user.
  if (persona === 'employee') return true;
  return userRoles.includes(PERSONA_ROLE[persona]);
}

const leafVisible = (leaf: Leaf, userRoles: Role[]): boolean =>
  !leaf.show || leaf.show.some((p) => personaGranted(p, userRoles));

/** Strip locale prefix (/th/ or /en/) to get bare path e.g. /home */
function stripLocale(path: string): string {
  return path.replace(/^\/(th|en)/, '') || '/';
}

const navLabel = (item: { label: string; labelTh: string }, isTh: boolean): string =>
  isTh ? item.labelTh || item.label : item.label;

/** Short rail labels (the narrow col-1 icon rail can't fit the full group name). */
const RAIL_SHORT: Record<string, { th: string; en: string }> = {
  workspace: { th: 'ฉัน', en: 'Me' },
  team: { th: 'ทีม', en: 'Team' },
  hr: { th: 'บุคคล', en: 'HR' },
  system: { th: 'ระบบ', en: 'Setup' },
};

export function Sidebar({ onNavigate, onClose, className }: SidebarProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userRoles = useAuthStore((s) => s.roles);
  const barePath = stripLocale(pathname);
  const currentLocale = pathname.match(/^\/(th|en)/)?.[1] ?? 'th';
  const isTh = currentLocale === 'th';

  // Resolve the bare path for a leaf — locale stripped AND query/hash stripped so
  // active-state matching and the dedupe gate compare clean pathnames. Several
  // leaves carry ?section= / #tab deep-links (Req5 dedupe) that must not leak into
  // the bare-path comparison. The full href (with query/hash) is built in render.
  const leafBareHref = (leaf: Leaf): string => {
    const raw =
      leaf.href === '__BENEFITS__' ? stripLocale(benefitsHubRoute(currentLocale)) : leaf.href;
    return raw.replace(/[?#].*$/, '');
  };

  // The ?section= / #tab deep-link suffix (if any) preserved for the actual <Link>.
  const leafSuffix = (leaf: Leaf): string => {
    if (leaf.href === '__BENEFITS__') return '';
    const m = leaf.href.match(/[?#].*$/);
    return m ? m[0] : '';
  };

  const isActive = (bareHref: string): boolean =>
    barePath === bareHref || barePath.startsWith(bareHref + '/');

  // ── Master-detail rail + panel (wireframe 2026-05-25) ───────────────────────
  // The rail (col 1) selects which group's leaves render in the panel (col 2).
  // Default selection follows the active route's group; a rail click overrides
  // it for browsing, and the next navigation (pathname change) resets back to
  // following the route. Derived from pathname so SSR + first paint match.
  // A group with zero accessible leaves for this persona is NOT rendered at all.
  // Product rule: don't show locked/disabled menu items — remove them entirely so
  // we never imply access a role doesn't have ("ไม่ใช่แค่ซ่อน, กันเข้าใจผิด").
  const visibleGroups = MODULES.map((m) => ({
    ...m,
    shownLeaves: m.leaves.filter((l) => leafVisible(l, userRoles)),
  })).filter((g) => g.shownLeaves.length > 0);
  const activeGroupId = visibleGroups.find((g) =>
    g.shownLeaves.some((l) => isActive(leafBareHref(l))),
  )?.id;
  const firstUnlockedId = visibleGroups.find((g) => g.shownLeaves.length > 0)?.id ?? null;
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  // Reset manual selection on navigation so the panel follows the active route.
  useEffect(() => {
    setSelectedGroup(null);
  }, [pathname]);

  // ── Collapse the leaf panel (col2) down to the icon rail (col1) ─────────────
  // Persisted so the choice survives reloads. Read in an effect (not initial
  // state) to keep SSR markup === first client render and avoid a hydration
  // mismatch. Collapse only applies to the desktop static sidebar — the mobile
  // drawer (className carries `--drawer`) always shows the full panel.
  const isDrawer = (className ?? '').includes('humi-sidebar--drawer');
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('bp-panel-collapsed') === '1') setCollapsed(true);
    } catch {
      /* localStorage unavailable (SSR / privacy mode) — keep default expanded. */
    }
  }, []);
  const setCollapsedPersist = (next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem('bp-panel-collapsed', next ? '1' : '0');
    } catch {
      /* ignore — collapse still works for this session. */
    }
  };
  const collapsedDesktop = collapsed && !isDrawer;

  // ── Drag-to-resize the sidebar width (rail + leaf panel together) ───────────
  // Persisted like the collapse flag. The chosen width is applied to :root as
  // --humi-sidebar-w, which the .humi-app grid in globals.css consumes. Clamped
  // so neither the page nor the panel ever gets squeezed to an unusable size.
  // Only the desktop static sidebar resizes — the drawer is a fixed overlay.
  const SIDEBAR_W_MIN = 200;
  const SIDEBAR_W_MAX = 420;
  const SIDEBAR_W_DEFAULT = 256;
  const clampW = (w: number) =>
    Math.min(SIDEBAR_W_MAX, Math.max(SIDEBAR_W_MIN, Math.round(w)));
  const [width, setWidth] = useState(SIDEBAR_W_DEFAULT);
  const [dragging, setDragging] = useState(false);
  const widthRef = useRef(SIDEBAR_W_DEFAULT);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  // Read persisted width in an effect (not initial state) so SSR markup ===
  // first client render — same hydration-safety reason as the collapse flag.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('bp-sidebar-w');
      if (raw) {
        const w = clampW(Number(raw));
        if (Number.isFinite(w)) {
          setWidth(w);
          widthRef.current = w;
        }
      }
    } catch {
      /* localStorage unavailable — keep default width. */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply width to the grid via a :root custom property. The collapsed/drawer
  // CSS rules override the grid by specificity, so setting this unconditionally
  // (when not the drawer) is safe.
  useEffect(() => {
    if (isDrawer) return;
    try {
      document.documentElement.style.setProperty('--humi-sidebar-w', `${width}px`);
    } catch {
      /* non-DOM env — ignore. */
    }
  }, [width, isDrawer]);

  const persistWidth = (w: number) => {
    try {
      localStorage.setItem('bp-sidebar-w', String(w));
    } catch {
      /* ignore — resize still works for this session. */
    }
  };
  const onResizeDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (collapsedDesktop) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: widthRef.current };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };
  const onResizeMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const next = clampW(d.startW + (e.clientX - d.startX));
    widthRef.current = next;
    setWidth(next);
  };
  const endResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released. */
    }
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    persistWidth(widthRef.current);
  };
  const onResizeKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const STEP = 16;
    let next = widthRef.current;
    if (e.key === 'ArrowLeft') next = clampW(widthRef.current - STEP);
    else if (e.key === 'ArrowRight') next = clampW(widthRef.current + STEP);
    else if (e.key === 'Home') next = SIDEBAR_W_MIN;
    else if (e.key === 'End') next = SIDEBAR_W_MAX;
    else return;
    e.preventDefault();
    widthRef.current = next;
    setWidth(next);
    persistWidth(next);
  };
  const resetWidth = () => {
    widthRef.current = SIDEBAR_W_DEFAULT;
    setWidth(SIDEBAR_W_DEFAULT);
    persistWidth(SIDEBAR_W_DEFAULT);
  };

  const shownGroupId = selectedGroup ?? activeGroupId ?? firstUnlockedId;
  const shownGroup = visibleGroups.find((g) => g.id === shownGroupId) ?? null;

  // searchParams retained for parity with the app's other shell components.
  void searchParams;

  return (
    <aside
      className={cn('humi-sidebar bp-shellnav', collapsedDesktop && 'bp-collapsed', className)}
      aria-label="เมนูหลัก"
    >
      {/* ── Col 1: macro-group icon rail ── */}
      <div className="bp-rail">
        <div className="bp-rail-brand">
          <Image
            src="/humi-logo-final-2.png"
            alt="Humi"
            width={40}
            height={44}
            priority
            style={{ height: 34, width: 'auto', objectFit: 'contain' }}
          />
        </div>
        {!isDrawer && (
          <button
            type="button"
            className="bp-rail-toggle"
            aria-label={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
            aria-expanded={!collapsed}
            title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
            onClick={() => setCollapsedPersist(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </button>
        )}
        <div className="bp-rail-groups" role="tablist" aria-label="กลุ่มเมนู">
          {visibleGroups.map((m) => {
            const active = shownGroupId === m.id;
            const RailIcon = m.icon;
            const short = RAIL_SHORT[m.id] ?? { th: m.labelTh, en: m.label };
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn('bp-rail-item', active && 'is-active')}
                onClick={() => {
                  setSelectedGroup(m.id);
                  // Clicking a group icon while folded re-opens the leaf panel.
                  if (collapsedDesktop) setCollapsedPersist(false);
                }}
                title={navLabel(m, isTh)}
              >
                <span className="bp-rail-icon" aria-hidden="true">
                  <RailIcon size={20} />
                </span>
                <span className="bp-rail-label">{isTh ? short.th : short.en}</span>
              </button>
            );
          })}
        </div>
        {onClose && (
          <button
            type="button"
            className="humi-icon-btn bp-rail-close"
            aria-label="ปิดเมนู"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Col 2: leaves of the selected group ── */}
      <div className="bp-panel">
        <div className="bp-panel-head">
          <div className="bp-panel-title">{shownGroup ? navLabel(shownGroup, isTh) : ''}</div>
        </div>
        <nav
          className="bp-panel-nav"
          aria-label={shownGroup ? navLabel(shownGroup, isTh) : 'เมนู'}
        >
          {shownGroup?.shownLeaves.map((l) => {
            const bareHref = leafBareHref(l);
            const href = `/${currentLocale}${bareHref}${leafSuffix(l)}`;
            const active = isActive(bareHref);
            return (
              <Link
                key={l.id}
                href={href}
                className={cn('bp-panel-item', active && 'is-active')}
                aria-current={active ? 'page' : undefined}
                title={navLabel(l, !isTh)}
                onClick={onNavigate}
              >
                <span className="bp-child-label">{navLabel(l, isTh)}</span>
                {l.badge && (
                  <span className="bp-badge" aria-label={`${l.badge} รายการใหม่`}>
                    {l.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {/* Sidebar footer profile/logout removed (2026-05-28) — identity, sign out,
            and Take Action on Behalf of all live in the Topbar avatar dropdown now
            (SF parity). See .omc/specs/deep-interview-proxy-sf-realignment.md. */}
      </div>

      {/* Drag-to-resize handle — desktop static sidebar only, and only while the
          leaf panel is expanded (resizing a 74px icon rail is meaningless).
          ARIA window-splitter pattern: role=separator + valuenow/min/max +
          arrow-key support. Double-click resets to the default width. */}
      {!isDrawer && !collapsedDesktop && (
        <button
          type="button"
          className="bp-resize-handle"
          data-dragging={dragging ? 'true' : undefined}
          role="separator"
          aria-orientation="vertical"
          aria-label="ปรับความกว้างเมนูด้านข้าง"
          aria-valuenow={width}
          aria-valuemin={SIDEBAR_W_MIN}
          aria-valuemax={SIDEBAR_W_MAX}
          tabIndex={0}
          title="ลากเพื่อปรับความกว้าง · ดับเบิลคลิกเพื่อรีเซ็ต"
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onKeyDown={onResizeKey}
          onDoubleClick={resetWidth}
        />
      )}
    </aside>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Sidebar Coverage Annotations
// Routes that intentionally bypass the sidebar — entry point lives elsewhere
// or the feature is reached from a parent screen. Each line follows
// `// SIDEBAR_LEGACY: <route> <reason ≥ 20 chars>` for the design-gate parser.
//
// NOTE (2026-05-25 menu simplify): the sidebar IA is the simplified 25-leaf MODULES
// tree (4 groups, see MODULES above; per .omc/plans/sidebar-menu-simplify.md). The
// menu was cut 40 → 25 — placeholder/deep-link leaves were REMOVED, not repointed.
// Routes below are reached from a parent page, are alt-paths, or had their menu leaf
// CUT, and so stay URL-only.
//
// Auth (1)
// SIDEBAR_LEGACY: /login pre-auth gate — never shown to authenticated users in chrome
//
// Menu-simplify CUT leaves (3) — real pages whose sidebar leaf was removed 40→25
// SIDEBAR_LEGACY: /requests folded into Leaves + Documents workspace entries; page stays URL-reachable
// SIDEBAR_LEGACY: /integrations connect-via-web feature cut from System group; no real connect surface in mockup scope
// SIDEBAR_LEGACY: /payroll compensation reached from the Payroll module, not a top-level HR-admin leaf
//
// Profile / ESS canonical alt-paths (4) — superseded by /profile/me sidebar entry
// SIDEBAR_LEGACY: /employees/me alt-path superseded by canonical /profile/me sidebar entry
// SIDEBAR_LEGACY: /employees/me/payslip deep-link from /profile/me Compensation tab
// SIDEBAR_LEGACY: /ess/profile/edit reachable from /profile/me Edit button (BRD #166)
// SIDEBAR_LEGACY: /profile alt-path superseded by canonical /profile/me sidebar entry
//
// ESS workflow family (3) — reached from "ใบลา" + Documents sidebar entries
// SIDEBAR_LEGACY: /ess/workflows reachable from the workspace Leaves + Documents entries (requests funnel)
// SIDEBAR_LEGACY: /overtime reachable from /timeoff OT request flow (sub-feature of timeoff)
// SIDEBAR_LEGACY: /workflows alt-path superseded by the workspace Leaves + Documents entries
//
// People / performance alternates (5) — reached from team-performance + profile
// SIDEBAR_LEGACY: /goals reached from /performance-form goals shortcut (performance suite)
// SIDEBAR_LEGACY: /performance alt-path superseded by /performance-form team-performance entry
// SIDEBAR_LEGACY: /learning-directory reached from /home learning tile (external L&D system)
// SIDEBAR_LEGACY: /learning alt-path superseded by /learning-directory deep-link
// SIDEBAR_LEGACY: /idp individual-development-plan reached from performance-form action
//
// Talent / succession (5) — admin-tier, reached from HR-admin screens
// SIDEBAR_LEGACY: /development reached from /performance-form development plan section
// SIDEBAR_LEGACY: /succession admin-tier scaffold reached from /admin organization tools
// SIDEBAR_LEGACY: /talent-management admin-tier scaffold reached from /admin landing page
// SIDEBAR_LEGACY: /training-records surfaced via /learning-directory deep-link
// SIDEBAR_LEGACY: /careers internal-mobility board reached from /profile/me careers tile
//
// Benefits family (4) — reached from "สวัสดิการ" hub + admin benefits screens
// SIDEBAR_LEGACY: /benefits admin-tier scaffold (Benefit module deferred per #46 audit)
// SIDEBAR_LEGACY: /hospital-referral surfaced via /benefits-hub action tile (BRD #20 dep)
// SIDEBAR_LEGACY: /profile/benefits alt-path superseded by /profile/me Benefits tab entry
// SIDEBAR_LEGACY: /manager/benefits/team reached from /manager-dashboard benefits shortcut
//
// Persona landing alt-paths (4) — reached from each persona's group entries
// SIDEBAR_LEGACY: /hrbp/dashboard reached from team-management group for HRBP persona
// SIDEBAR_LEGACY: /hrbp/talent-search reached from /hrbp/dashboard talent-search shortcut
// SIDEBAR_LEGACY: /spd/benefits/branch-view reached from /spd-management branch shortcut
// SIDEBAR_LEGACY: /spd-management superseded by unified /quick-approve inbox per unified-inbox rule
//
// Admin-tier scaffolds (3)
// SIDEBAR_LEGACY: /locations admin-tier scaffold from /admin landing — geographic master data
// SIDEBAR_LEGACY: /screening admin-tier scaffold from /recruiting workflow — pre-hire checks
//
// PRUNED 2026-05-25 (Req5 #8): /resignation is now surfaced directly as the HR-group
// "Offboarding · ลาออก" leaf, so its URL-only annotation is stale and removed.
// ════════════════════════════════════════════════════════════════════════════
