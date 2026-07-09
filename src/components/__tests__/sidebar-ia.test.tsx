/**
 * sidebar-ia.test.tsx — Cnext sidebar IA structure + behaviour
 * Framework: Vitest + @testing-library/react + jsdom
 *
 * NOTE: this suite INTENTIONALLY DIVERGES from SF/Blueprint parity. The menu was
 * simplified 40 → 25 leaves per .omc/plans/sidebar-menu-simplify.md — placeholder /
 * deep-link leaves were CUT, not repointed. This file asserts the REDUCED IA (the
 * shipping contract), NOT the Blueprint's 40-leaf tree. Do not "fix" the menu back
 * toward Blueprint parity on the strength of this test. The shell remains the
 * master-detail rail+panel (col-1 macro-group rail of role="tab" buttons, col-2 the
 * selected group's leaves); the assertions below are IA intent, not just API shape.
 *
 * The 4 macro groups (reduced IA):
 *   A. พื้นที่ทำงานของฉัน (workspace) — 7 ESS leaves, visible to everyone (requests + Leave CUT; Leave folds under Time & Attendance per STA-190)
 *   B. การจัดการทีม (team)            — 5 manager/HR/SPD tools (role-gated; swap CUT)
 *   C. งานบุคคล (hr)                  — 8 HR-admin destinations (role-gated; comp/assets cut)
 *   D. ตั้งค่าระบบ (system)            — 4 settings: Roles, Master Catalog, Document Review, Audit & System
 *
 * KEY BEHAVIOURS asserted here:
 *  - All 4 group rail tabs ALWAYS render. A group with zero visible leaves for
 *    the persona is `locked` (disabled rail tab + .locked class — the rail has no
 *    accordion "—" count chrome; locked semantic carried by disabled/.locked).
 *  - Master-detail: exactly ONE group's leaves are visible at a time; the active
 *    route drives the default selection. (Replaces the old single-open accordion's
 *    toggle-to-collapse mechanic, which the rail/panel does not have by design.)
 *  - Leaves render as <Link>; active leaf derived from pathname (.is-active).
 *  - Persona→Role gating (PERSONA_ROLE in Sidebar.tsx):
 *      employee   → workspace only.
 *      manager    → unlocks team (roster/probation/perf + inbox·approvals/reports).
 *      hr_admin   → unlocks team + hr + system (the `audit` leaf lists hradmin).
 *      hr_manager → unlocks all four groups (hris persona maps to hr_manager).
 *  - Menu simplify (40→25): every pure-decoration ?section=/#tab placeholder leaf was
 *    cut. The system group is now Roles & Permissions + Master Catalog + Document
 *    Review + Audit & System; hr_admin unlocks it via the `audit` leaf.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const navigationMocks = vi.hoisted(() => ({
  pathname: '/th/home',
  searchParams: new URLSearchParams(),
}));

const authMock = vi.hoisted(() => ({ roles: [] as string[] }));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => navigationMocks.pathname),
  useSearchParams: vi.fn(() => navigationMocks.searchParams),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn((selector: (s: { roles: string[]; username: string | null }) => unknown) =>
    selector({ roles: authMock.roles, username: 'จงรักษ์ ทานากะ' }),
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
    priority: _p,
    ...props
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    [k: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} {...props} />
  ),
}));

import { Sidebar } from '../cnext/shell/Sidebar';

/** Set the active user's roles for the next render. */
function asRoles(roles: string[]) {
  authMock.roles = roles;
}

/** Group panel-title labels (TH, since default locale = th). */
const GROUP_WORKSPACE = 'พื้นที่ทำงานของฉัน';
const GROUP_TEAM = 'การจัดการทีม';
const GROUP_HR = 'งานบุคคล';
const GROUP_SYSTEM = 'ตั้งค่าระบบ';

/** The macro-group rail renders `role="tab"` buttons. Their accessible name is
 *  the SHORT rail label (RAIL_SHORT in Sidebar.tsx), since the full group label
 *  is only on `title`. Map full label → short rail label to find each tab. */
const RAIL_SHORT_TH: Record<string, string> = {
  [GROUP_WORKSPACE]: 'ฉัน',
  [GROUP_TEAM]: 'ทีม',
  [GROUP_HR]: 'บุคคล',
  [GROUP_SYSTEM]: 'ระบบ',
};

function railTab(fullLabel: string) {
  return screen.getByRole('tab', { name: new RegExp(RAIL_SHORT_TH[fullLabel]) });
}

/** Like railTab but returns null instead of throwing when the group is not
 *  rendered — inaccessible groups are now removed entirely (not shown locked). */
function queryRailTab(fullLabel: string) {
  return screen.queryByRole('tab', { name: new RegExp(RAIL_SHORT_TH[fullLabel]) });
}

/** Open/select a group by clicking its rail tab. */
function clickGroup(fullLabel: string) {
  fireEvent.click(railTab(fullLabel));
}

beforeEach(() => {
  navigationMocks.pathname = '/th/home';
  navigationMocks.searchParams = new URLSearchParams();
  authMock.roles = []; // default = plain employee (no extra roles)
  localStorage.clear();
});

// ─── Structure: all 4 group triggers always present ──────────────────────────

describe('Blueprint sidebar — group structure', () => {
  it('renders <aside> with aria-label เมนูหลัก', () => {
    render(<Sidebar />);
    expect(screen.getByRole('complementary', { name: 'เมนูหลัก' })).toBeInTheDocument();
  });

  it('renders only the groups the persona can access (plain employee → workspace only)', () => {
    render(<Sidebar />);
    expect(railTab(GROUP_WORKSPACE)).toBeInTheDocument();
    // team / hr / system have no employee-accessible leaves → removed entirely
    // (not shown locked) so the menu never implies access the role lacks.
    expect(queryRailTab(GROUP_TEAM)).not.toBeInTheDocument();
    expect(queryRailTab(GROUP_HR)).not.toBeInTheDocument();
    expect(queryRailTab(GROUP_SYSTEM)).not.toBeInTheDocument();
  });

  it('does not render the static tenant line (removed per design)', () => {
    render(<Sidebar />);
    expect(screen.queryByText('CENTRAL · BANGKOK 03')).not.toBeInTheDocument();
  });
});

// ─── Inaccessible groups: zero accessible leaves → removed entirely ───────────

describe('Blueprint sidebar — inaccessible groups are removed for a plain employee', () => {
  it('workspace group is rendered + enabled', () => {
    render(<Sidebar />);
    expect(railTab(GROUP_WORKSPACE)).toBeInTheDocument();
    expect(railTab(GROUP_WORKSPACE)).not.toBeDisabled();
  });

  it('team / hr / system groups are NOT rendered (removed, not locked) for an employee', () => {
    render(<Sidebar />);
    expect(queryRailTab(GROUP_TEAM)).not.toBeInTheDocument();
    expect(queryRailTab(GROUP_HR)).not.toBeInTheDocument();
    expect(queryRailTab(GROUP_SYSTEM)).not.toBeInTheDocument();
  });

  it('no rendered rail tab is in a locked/disabled state', () => {
    // Product rule: we never render a disabled/locked menu entry — every visible
    // group is fully enterable.
    render(<Sidebar />);
    screen.getAllByRole('tab').forEach((tab) => expect(tab).not.toBeDisabled());
  });
});

// ─── Workspace leaves (visible to everyone) ───────────────────────────────────

describe('Blueprint sidebar — workspace leaves (ESS, all personas)', () => {
  beforeEach(() => {
    navigationMocks.pathname = '/th/home'; // active route lives in workspace → group open
  });

  it('surfaces all 7 ESS workspace leaves', () => {
    render(<Sidebar />);
    [
      'หน้าหลัก',
      'โปรไฟล์ของฉัน',
      'เวลาและการเข้างาน',
      'สลิปเงินเดือน',
      'สวัสดิการ',
      'เอกสาร',
      'ประกาศ',
    ].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    // requests leaf was CUT (folds into Documents + Time & Attendance tiles); /requests stays URL-only
    expect(screen.queryByText('ใบคำขอ')).not.toBeInTheDocument();
    // STA-190: the standalone Leave (ใบลา) leaf was removed — Leave is reached via
    // Time & Attendance > Leave request, not a top-level sidebar entry.
    expect(screen.queryByText('ใบลา')).not.toBeInTheDocument();
  });

  it('maps leaves to the expected app routes', () => {
    render(<Sidebar />);
    expect(screen.getByText('หน้าหลัก').closest('a')).toHaveAttribute('href', '/th/home');
    expect(screen.getByText('โปรไฟล์ของฉัน').closest('a')).toHaveAttribute('href', '/th/profile/me');
    expect(screen.getByText('สลิปเงินเดือน').closest('a')).toHaveAttribute('href', '/th/payslip');
    expect(screen.getByText('เอกสาร').closest('a')).toHaveAttribute('href', '/th/me/documents');
    expect(screen.getByText('ประกาศ').closest('a')).toHaveAttribute('href', '/th/announcements');
  });

  it('benefits leaf points at the Benefits Hub', () => {
    render(<Sidebar />);
    expect(screen.getByText('สวัสดิการ').closest('a')).toHaveAttribute('href', '/th/benefits-hub');
  });

  it('plain employee cannot reach HR-admin leaves (employees register hidden)', () => {
    render(<Sidebar />);
    // hr group is locked → its leaves are never rendered
    expect(screen.queryByText('ทะเบียนพนักงาน')).not.toBeInTheDocument();
    expect(screen.queryByText('สรรหา')).not.toBeInTheDocument();
  });
});

// ─── Role gating: manager + HR-admin + HR-manager views ───────────────────────

describe('Blueprint sidebar — role-gated views', () => {
  it('manager sees the team group but not HR / system', () => {
    asRoles(['manager', 'employee']);
    render(<Sidebar />);
    expect(railTab(GROUP_TEAM)).toBeInTheDocument();
    // manager has no HR / system leaves → those groups are removed entirely
    expect(queryRailTab(GROUP_HR)).not.toBeInTheDocument();
    expect(queryRailTab(GROUP_SYSTEM)).not.toBeInTheDocument();
  });

  it('manager team leaves include the merged inbox·approvals + reports + perf with correct hrefs', () => {
    asRoles(['manager', 'employee']);
    navigationMocks.pathname = '/th/quick-approve'; // open team group
    render(<Sidebar />);
    // Req5 dedupe: the former standalone "อนุมัติ" leaf merged into the unified
    // "จัดการคำขอเวิร์กโฟลว์" inbox leaf, still resolving to /quick-approve.
    expect(screen.getByText('จัดการคำขอเวิร์กโฟลว์').closest('a')).toHaveAttribute(
      'href',
      '/th/quick-approve',
    );
    expect(screen.queryByText('อนุมัติ')).not.toBeInTheDocument();
    expect(screen.getByText('รายงาน').closest('a')).toHaveAttribute('href', '/th/reports');
    expect(screen.getByText('ผลงานทีม').closest('a')).toHaveAttribute('href', '/th/performance-form');
    // roster repointed to the real /roster page; probation → agreed /workflows/probation journey
    expect(screen.getByText('ตารางกะ').closest('a')).toHaveAttribute('href', '/th/roster');
    expect(screen.getByText('ทดลองงาน').closest('a')).toHaveAttribute(
      'href',
      '/th/workflows/probation',
    );
    // swap (สลับกะ) was CUT — it is a modal inside /roster, not a menu leaf
    expect(screen.queryByText('สลับกะ')).not.toBeInTheDocument();
  });

  it('hr_admin unlocks workspace + team + hr + system', () => {
    asRoles(['hr_admin', 'employee']);
    render(<Sidebar />);
    expect(railTab(GROUP_WORKSPACE)).not.toBeDisabled();
    expect(railTab(GROUP_TEAM)).not.toBeDisabled();
    expect(railTab(GROUP_HR)).not.toBeDisabled();
    // Menu simplify (40→25): the system group's `audit` leaf (Audit & System →
    // /admin/system) lists hradmin, so hr_admin unlocks the system group.
    expect(railTab(GROUP_SYSTEM)).not.toBeDisabled();
  });

  it('hr_admin hr-group leaves expose the previously URL-only clusters', () => {
    asRoles(['hr_admin', 'employee']);
    navigationMocks.pathname = '/th/admin/employees'; // open hr group
    render(<Sidebar />);
    expect(screen.getByText('ทะเบียนพนักงาน').closest('a')).toHaveAttribute(
      'href',
      '/th/admin/employees',
    );
    expect(screen.getByText('จ้างงาน').closest('a')).toHaveAttribute('href', '/th/admin/hire');
    expect(screen.getByText('สรรหา').closest('a')).toHaveAttribute('href', '/th/recruiting');
    // benefits-admin merges welfare+claims → single /admin/benefits leaf
    expect(screen.getByText('จัดการสวัสดิการ').closest('a')).toHaveAttribute(
      'href',
      '/th/admin/benefits',
    );
    // comp (ค่าตอบแทน), welfare (แผนสวัสดิการ), transfer (โยกย้าย) leaves were CUT
    expect(screen.queryByText('ค่าตอบแทน')).not.toBeInTheDocument();
    expect(screen.queryByText('แผนสวัสดิการ')).not.toBeInTheDocument();
    expect(screen.queryByText('โยกย้าย')).not.toBeInTheDocument();
  });

  it('hr_manager (HRIS tier) unlocks the system group', () => {
    asRoles(['hr_manager', 'employee']);
    render(<Sidebar />);
    expect(railTab(GROUP_SYSTEM)).not.toBeDisabled();
  });
});

// ─── Master-detail rail selection (single visible panel) ──────────────────────
// Replaces the former "single-open accordion" block. The SF-parity INTENT that
// block protected — exactly ONE group's leaves are visible at a time, and the
// active route drives which group is shown on first paint — is fully preserved
// below. What's dropped is the accordion-only "click the open group to collapse
// it to zero-open" mechanic: the rail/panel is master-detail (a panel is always
// shown for the selected group), so toggle-to-empty no longer exists by design.
// No real navigational behavior was removed, only obsolete accordion chrome.

describe('Blueprint sidebar — master-detail rail selection', () => {
  beforeEach(() => {
    asRoles(['hr_manager', 'employee']); // unlock every group so they can be selected
    navigationMocks.pathname = '/th/home';
  });

  it('the active route group is selected on first render (panel shows its leaves)', () => {
    render(<Sidebar />);
    // home lives in workspace → workspace rail tab is the selected one
    expect(railTab(GROUP_WORKSPACE)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('หน้าหลัก')).toBeInTheDocument();
  });

  it('selecting another group swaps the panel (only one group visible at a time)', () => {
    render(<Sidebar />);
    expect(railTab(GROUP_WORKSPACE)).toHaveAttribute('aria-selected', 'true');
    clickGroup(GROUP_HR);
    expect(railTab(GROUP_HR)).toHaveAttribute('aria-selected', 'true');
    expect(railTab(GROUP_WORKSPACE)).toHaveAttribute('aria-selected', 'false');
    // workspace leaves are no longer in the panel; hr leaves are
    expect(screen.queryByText('หน้าหลัก')).not.toBeInTheDocument();
    expect(screen.getByText('ทะเบียนพนักงาน')).toBeInTheDocument();
  });

  it('selecting the team group reveals the merged inbox·approvals leaf', () => {
    render(<Sidebar />);
    clickGroup(GROUP_TEAM);
    expect(railTab(GROUP_TEAM)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('จัดการคำขอเวิร์กโฟลว์')).toBeInTheDocument();
  });
});

// ─── Active-state highlight from pathname ─────────────────────────────────────

describe('Blueprint sidebar — active leaf highlight', () => {
  it('marks the profile leaf is-active on /profile/me', () => {
    navigationMocks.pathname = '/th/profile/me';
    render(<Sidebar />);
    expect(screen.getByText('โปรไฟล์ของฉัน').closest('a')).toHaveClass('is-active');
    expect(screen.getByText('หน้าหลัก').closest('a')).not.toHaveClass('is-active');
  });

  it('benefits leaf is-active on a Benefits Hub child route', () => {
    navigationMocks.pathname = '/th/benefits-hub/referral';
    render(<Sidebar />);
    expect(screen.getByText('สวัสดิการ').closest('a')).toHaveClass('is-active');
  });

  it('STA-190: /timeoff (Leave, no own leaf) highlights Time & Attendance via aliasPaths', () => {
    navigationMocks.pathname = '/th/timeoff';
    render(<Sidebar />);
    expect(screen.getByText('เวลาและการเข้างาน').closest('a')).toHaveClass('is-active');
  });

  it('STA-190: /overtime (OT, no own leaf) also highlights Time & Attendance', () => {
    navigationMocks.pathname = '/th/overtime';
    render(<Sidebar />);
    expect(screen.getByText('เวลาและการเข้างาน').closest('a')).toHaveClass('is-active');
  });

  it('locale-agnostic: /en/home activates the home leaf with EN label', () => {
    navigationMocks.pathname = '/en/home';
    render(<Sidebar />);
    expect(screen.getByText('Home').closest('a')).toHaveClass('is-active');
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/en/home');
  });
});

// ─── Footer user card — REMOVED 2026-05-28 ────────────────────────────────────
// Identity, sign out, and Take Action on Behalf of all live in the Topbar avatar
// dropdown now (SF parity). The sidebar bottom-left profile circle is gone.
// See .omc/specs/deep-interview-proxy-sf-realignment.md.

describe('Blueprint sidebar — footer user card (removed)', () => {
  it('does NOT render the legacy bottom-left profile/logout affordance', () => {
    render(<Sidebar />);
    expect(
      screen.queryByLabelText('ออกจากระบบและกลับไปหน้าเข้าสู่ระบบ')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('EMP-04821')).not.toBeInTheDocument();
  });
});
