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
//  - groups with zero visible leaves for the persona render `locked`
//    (disabled, count "—").
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

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Users,
  Network,
  IdCard,
  Settings,
  X,
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
type PersonaId = 'employee' | 'manager' | 'hradmin' | 'hris' | 'spd' | 'sysadmin';

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
      { id: 'time', label: 'Time & Attendance', labelTh: 'ลงเวลา', href: '/time', show: ALL6 },
      { id: 'leaves', label: 'Leaves', labelTh: 'ใบลา', href: '/timeoff', badge: '3', show: ALL6 },
      { id: 'payslips', label: 'Payslips', labelTh: 'สลิปเงินเดือน', href: '/payslip', show: ALL6 },
      { id: 'benefits', label: 'Benefits', labelTh: 'สวัสดิการ', href: '__BENEFITS__', show: ALL6 },
      { id: 'documents', label: 'Documents', labelTh: 'เอกสาร', href: '/me/documents', show: ALL6 },
      { id: 'requests', label: 'Requests', labelTh: 'ใบคำขอ', href: '/requests', show: ALL6 },
      { id: 'announce', label: 'Announcements', labelTh: 'ประกาศ', href: '/announcements', show: ALL6 },
    ],
  },
  {
    id: 'team',
    label: 'Team Management',
    labelTh: 'การจัดการทีม',
    icon: Network,
    leaves: [
      // PLACEHOLDER: inbox → unified /quick-approve inbox
      { id: 'inbox', label: 'Team Inbox', labelTh: 'กล่องงาน', href: '/quick-approve', badge: '12', show: ['manager', 'hradmin', 'hris', 'spd', 'sysadmin'] },
      // PLACEHOLDER: roster → manager-dashboard (no roster screen in this app)
      { id: 'roster', label: 'Roster & Shifts', labelTh: 'ตารางกะ', href: '/manager-dashboard', show: ['manager', 'hradmin', 'sysadmin'] },
      // PLACEHOLDER: swap → manager-dashboard
      { id: 'swap', label: 'Shift Swap', labelTh: 'สลับกะ', href: '/manager-dashboard', show: ['manager', 'hradmin', 'sysadmin'] },
      { id: 'approvals', label: 'Approvals', labelTh: 'อนุมัติ', href: '/quick-approve', show: ['manager', 'hradmin', 'hris', 'spd', 'sysadmin'] },
      { id: 'perf', label: 'Team Performance', labelTh: 'ผลงานทีม', href: '/performance-form', show: ['manager', 'hradmin', 'sysadmin'] },
      // PLACEHOLDER: probation → manager-dashboard
      { id: 'probation', label: 'Probation Reviews', labelTh: 'ทดลองงาน', href: '/manager-dashboard', show: ['manager', 'hradmin', 'sysadmin'] },
      { id: 'reports', label: 'Reports', labelTh: 'รายงาน', href: '/reports', show: ['manager', 'hradmin', 'hris', 'spd', 'sysadmin'] },
    ],
  },
  {
    id: 'hr',
    label: 'HR Administration',
    labelTh: 'งานบุคคล',
    icon: IdCard,
    leaves: [
      { id: 'employees', label: 'Employees', labelTh: 'ทะเบียนพนักงาน', href: '/admin/employees', show: ['hradmin', 'hris', 'spd', 'sysadmin'] },
      { id: 'orgchart', label: 'Org Chart', labelTh: 'ผังองค์กร', href: '/org-chart', show: ['hradmin', 'hris', 'spd', 'sysadmin'] },
      { id: 'hire', label: 'Hire & Onboard', labelTh: 'จ้างงาน', href: '/admin/hire', show: ['hradmin', 'sysadmin'] },
      // PLACEHOLDER: lifecycle/onboarding → admin/hire
      { id: 'lifecycle', label: 'Onboarding', labelTh: 'เริ่มงาน · 90 วันแรก', href: '/admin/hire', show: ['hradmin', 'sysadmin'] },
      // PLACEHOLDER: confirmation letter → admin/documents
      { id: 'confirm', label: 'Confirmation Letter', labelTh: 'หนังสือบรรจุ', href: '/admin/documents', show: ['hradmin', 'sysadmin'] },
      // PLACEHOLDER: transfer → admin/change-requests
      { id: 'transfer', label: 'Transfer', labelTh: 'โยกย้าย', href: '/admin/change-requests', show: ['hradmin', 'sysadmin'] },
      // PLACEHOLDER: offboarding → resignation
      { id: 'offboard', label: 'Offboarding', labelTh: 'ลาออก', href: '/resignation', show: ['hradmin', 'sysadmin'] },
      // PLACEHOLDER: compensation → payroll
      { id: 'comp', label: 'Compensation', labelTh: 'ค่าตอบแทน', href: '/payroll', show: ['hradmin', 'hris', 'spd', 'sysadmin'] },
      // PLACEHOLDER: welfare plans → admin/benefits
      { id: 'welfare', label: 'Welfare Plans', labelTh: 'แผนสวัสดิการ', href: '/admin/benefits', show: ['hradmin', 'hris', 'sysadmin'] },
      // PLACEHOLDER: benefit claims → admin/benefits
      { id: 'claims', label: 'Benefit Claims', labelTh: 'เบิกสวัสดิการ', href: '/admin/benefits', badge: '2', show: ['hradmin', 'spd', 'sysadmin'] },
      // PLACEHOLDER: assets → admin/foundation
      { id: 'assets', label: 'Assets', labelTh: 'ทรัพย์สิน', href: '/admin/foundation', show: ['hradmin', 'sysadmin'] },
      { id: 'recruit', label: 'Recruitment', labelTh: 'สรรหา', href: '/recruiting', show: ['hradmin', 'sysadmin'] },
      // PLACEHOLDER: attendance heatmap → reports
      { id: 'attendance', label: 'Attendance Heatmap', labelTh: 'ฮีตแมปการเข้างาน', href: '/reports', show: ['hradmin', 'hris', 'sysadmin'] },
      // PLACEHOLDER: audit log → admin/system
      { id: 'audit', label: 'Audit Log', labelTh: 'บันทึกตรวจสอบ', href: '/admin/system', show: ['hradmin', 'hris', 'spd', 'sysadmin'] },
    ],
  },
  {
    id: 'system',
    label: 'System Settings',
    labelTh: 'ตั้งค่าระบบ',
    icon: Settings,
    leaves: [
      // PLACEHOLDER: policy builder → integrations
      { id: 'policy', label: 'Policy Builder', labelTh: 'ตั้งค่านโยบาย', href: '/integrations', show: ['hris', 'sysadmin'] },
      // PLACEHOLDER: master catalog → admin/foundation
      { id: 'catalog', label: 'Master Catalog', labelTh: 'ฐานข้อมูลกลาง', href: '/admin/foundation', show: ['hris', 'sysadmin'] },
      // PLACEHOLDER: regularization queue → admin/change-requests
      { id: 'regular', label: 'Regularization Queue', labelTh: 'คิวตรวจเวลา', href: '/admin/change-requests', show: ['hradmin', 'hris', 'sysadmin'] },
      // PLACEHOLDER: document review → admin/documents
      { id: 'docreview', label: 'Document Review', labelTh: 'คิวตรวจเอกสาร', href: '/admin/documents', show: ['spd', 'sysadmin'] },
      // PLACEHOLDER: roles & permissions → permissions
      { id: 'roles', label: 'Roles & Permissions', labelTh: 'สิทธิ์ตามบทบาท', href: '/permissions', show: ['sysadmin'] },
      // PLACEHOLDER: approval workflows → integrations
      { id: 'workflows', label: 'Approval Workflows', labelTh: 'ขั้นตอนอนุมัติ', href: '/integrations', show: ['sysadmin'] },
      // PLACEHOLDER: notifications → integrations
      { id: 'notifs', label: 'Notifications', labelTh: 'แจ้งเตือน', href: '/integrations', show: ['sysadmin'] },
      { id: 'integrations', label: 'Integrations', labelTh: 'เชื่อมต่อระบบ', href: '/integrations', show: ['sysadmin'] },
      // PLACEHOLDER: branding → integrations
      { id: 'branding', label: 'Branding', labelTh: 'ธีม', href: '/integrations', show: ['sysadmin'] },
      // PLACEHOLDER: security & SSO → permissions
      { id: 'security', label: 'Security & SSO', labelTh: 'ความปลอดภัย', href: '/permissions', show: ['sysadmin'] },
      // PLACEHOLDER: impersonation log → admin/system
      { id: 'impers', label: 'Impersonation Log', labelTh: 'บันทึก impersonate', href: '/admin/system', show: ['sysadmin'] },
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
  hradmin: 'hr_admin',
  hris: 'hr_manager',
  spd: 'spd',
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
  const username = useAuthStore((s) => s.username);
  const barePath = stripLocale(pathname);
  const currentLocale = pathname.match(/^\/(th|en)/)?.[1] ?? 'th';
  const isTh = currentLocale === 'th';

  // Resolve the bare href for a leaf (benefits uses the locale-aware helper,
  // then we strip the locale back off for a uniform bare-path comparison).
  const leafBareHref = (leaf: Leaf): string =>
    leaf.href === '__BENEFITS__' ? stripLocale(benefitsHubRoute(currentLocale)) : leaf.href;

  const isActive = (bareHref: string): boolean =>
    barePath === bareHref || barePath.startsWith(bareHref + '/');

  // ── Master-detail rail + panel (wireframe 2026-05-25) ───────────────────────
  // The rail (col 1) selects which group's leaves render in the panel (col 2).
  // Default selection follows the active route's group; a rail click overrides
  // it for browsing, and the next navigation (pathname change) resets back to
  // following the route. Derived from pathname so SSR + first paint match.
  const visibleGroups = MODULES.map((m) => ({
    ...m,
    shownLeaves: m.leaves.filter((l) => leafVisible(l, userRoles)),
  }));
  const activeGroupId = visibleGroups.find((g) =>
    g.shownLeaves.some((l) => isActive(leafBareHref(l))),
  )?.id;
  const firstUnlockedId = visibleGroups.find((g) => g.shownLeaves.length > 0)?.id ?? null;
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  // Reset manual selection on navigation so the panel follows the active route.
  useEffect(() => {
    setSelectedGroup(null);
  }, [pathname]);
  const shownGroupId = selectedGroup ?? activeGroupId ?? firstUnlockedId;
  const shownGroup = visibleGroups.find((g) => g.id === shownGroupId) ?? null;

  // searchParams retained for parity with the app's other shell components.
  void searchParams;

  return (
    <aside className={cn('humi-sidebar bp-shellnav', className)} aria-label="เมนูหลัก">
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
        <div className="bp-rail-groups" role="tablist" aria-label="กลุ่มเมนู">
          {visibleGroups.map((m) => {
            const locked = m.shownLeaves.length === 0;
            const active = shownGroupId === m.id;
            const RailIcon = m.icon;
            const short = RAIL_SHORT[m.id] ?? { th: m.labelTh, en: m.label };
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn('bp-rail-item', active && 'is-active', locked && 'locked')}
                disabled={locked}
                onClick={() => !locked && setSelectedGroup(m.id)}
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
          <div className="bp-tenant">CENTRAL · BANGKOK 03</div>
          <div className="bp-panel-title">{shownGroup ? navLabel(shownGroup, isTh) : ''}</div>
        </div>
        <nav
          className="bp-panel-nav"
          aria-label={shownGroup ? navLabel(shownGroup, isTh) : 'เมนู'}
        >
          {shownGroup?.shownLeaves.map((l) => {
            const bareHref = leafBareHref(l);
            const href = `/${currentLocale}${bareHref}`;
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

        <Link
          href={`/${currentLocale}/login`}
          className="bp-sb-user"
          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
          aria-label="ออกจากระบบและกลับไปหน้าเข้าสู่ระบบ"
        >
          <div className="bp-av" aria-hidden="true">
            จท
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="bp-nm">{username || 'จงรักษ์ ทานากะ'}</div>
            <div className="bp-rl">EMP-04821</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Sidebar Coverage Annotations
// Routes that intentionally bypass the sidebar — entry point lives elsewhere
// or the feature is reached from a parent screen. Each line follows
// `// SIDEBAR_LEGACY: <route> <reason ≥ 20 chars>` for the design-gate parser.
//
// NOTE (2026-05-25 Blueprint port): the sidebar IA is now the Blueprint MODULES
// tree (4 groups, see MODULES above). The Blueprint leaves surface ESS, team,
// HR-admin and system destinations directly; routes below are reached from a
// parent page / are alt-paths and so stay URL-only.
//
// Auth (1)
// SIDEBAR_LEGACY: /login pre-auth gate — never shown to authenticated users in chrome
//
// Profile / ESS canonical alt-paths (4) — superseded by /profile/me sidebar entry
// SIDEBAR_LEGACY: /employees/me alt-path superseded by canonical /profile/me sidebar entry
// SIDEBAR_LEGACY: /employees/me/payslip deep-link from /profile/me Compensation tab
// SIDEBAR_LEGACY: /ess/profile/edit reachable from /profile/me Edit button (BRD #166)
// SIDEBAR_LEGACY: /profile alt-path superseded by canonical /profile/me sidebar entry
//
// ESS workflow family (3) — reached from "ใบคำขอ" + "ใบลา" sidebar entries
// SIDEBAR_LEGACY: /ess/workflows reachable from /requests "ใบคำขอ" sidebar entry
// SIDEBAR_LEGACY: /overtime reachable from /timeoff OT request flow (sub-feature of timeoff)
// SIDEBAR_LEGACY: /workflows alt-path superseded by /requests in the workspace group
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
// SIDEBAR_LEGACY: /resignation reached from /profile/me Resignation section + HR offboarding
// ════════════════════════════════════════════════════════════════════════════
