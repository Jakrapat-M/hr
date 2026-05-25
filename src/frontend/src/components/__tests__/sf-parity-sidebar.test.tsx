/**
 * sf-parity-sidebar.test.tsx — Blueprint sidebar IA structure + behaviour
 * Framework: Vitest + @testing-library/react + jsdom
 *
 * Rewritten 2026-05-25 (Blueprint port): the sidebar was re-ported 1:1 from the
 * HRMS Blueprint shell (MODULES tree + single-open accordion). The previous
 * "4 role-gated section" assertions no longer apply. The new IA is:
 *
 *   A. พื้นที่ทำงานของฉัน (workspace) — 9 ESS leaves, visible to everyone
 *   B. การจัดการทีม (team)            — manager/HR/SPD tools (role-gated)
 *   C. งานบุคคล (hr)                  — HR-admin destinations (role-gated)
 *   D. ตั้งค่าระบบ (system)            — HRIS / sysadmin settings (role-gated)
 *
 * KEY BEHAVIOURS asserted here:
 *  - All 4 group triggers ALWAYS render. A group with zero visible leaves for
 *    the persona is `locked` (disabled trigger, count "—").
 *  - Single-open accordion: ONE group open at a time; clicking a trigger opens
 *    it and closes the others; clicking the open one collapses it.
 *  - Leaves render as <Link>; active leaf derived from pathname (.is-active).
 *  - Persona→Role gating (PERSONA_ROLE in Sidebar.tsx):
 *      employee → workspace only.
 *      manager  → unlocks team (perf/roster/swap/probation + approvals/reports).
 *      hr_admin → unlocks team + hr + system (hradmin appears in several
 *                 system-group leaf `show` lists, e.g. Regularization Queue).
 *      hr_manager (HRIS tier) → unlocks all four groups.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';

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

import { Sidebar } from '../humi/shell/Sidebar';

/** Set the active user's roles for the next render. */
function asRoles(roles: string[]) {
  authMock.roles = roles;
}

/** Group trigger labels (TH, since default locale = th). */
const GROUP_WORKSPACE = 'พื้นที่ทำงานของฉัน';
const GROUP_TEAM = 'การจัดการทีม';
const GROUP_HR = 'งานบุคคล';
const GROUP_SYSTEM = 'ตั้งค่าระบบ';

/** Open a group by clicking its trigger button. */
function clickGroup(label: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
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

  it('always renders all 4 group triggers (workspace, team, hr, system)', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: new RegExp(GROUP_WORKSPACE) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(GROUP_TEAM) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(GROUP_HR) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(GROUP_SYSTEM) })).toBeInTheDocument();
  });

  it('renders the static tenant line CENTRAL · BANGKOK 03', () => {
    render(<Sidebar />);
    expect(screen.getByText('CENTRAL · BANGKOK 03')).toBeInTheDocument();
  });
});

// ─── Locked groups: zero visible leaves → disabled trigger + "—" count ────────

describe('Blueprint sidebar — locked groups for a plain employee', () => {
  it('workspace group is unlocked (enabled trigger)', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: new RegExp(GROUP_WORKSPACE) })).not.toBeDisabled();
  });

  it('team / hr / system groups are locked (disabled triggers) for an employee', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: new RegExp(GROUP_TEAM) })).toBeDisabled();
    expect(screen.getByRole('button', { name: new RegExp(GROUP_HR) })).toBeDisabled();
    expect(screen.getByRole('button', { name: new RegExp(GROUP_SYSTEM) })).toBeDisabled();
  });

  it('locked group triggers show the "—" count placeholder', () => {
    render(<Sidebar />);
    const teamTrigger = screen.getByRole('button', { name: new RegExp(GROUP_TEAM) });
    expect(within(teamTrigger).getByText('—')).toBeInTheDocument();
  });
});

// ─── Workspace leaves (visible to everyone) ───────────────────────────────────

describe('Blueprint sidebar — workspace leaves (ESS, all personas)', () => {
  beforeEach(() => {
    navigationMocks.pathname = '/th/home'; // active route lives in workspace → group open
  });

  it('surfaces all 9 ESS workspace leaves', () => {
    render(<Sidebar />);
    [
      'หน้าหลัก',
      'โปรไฟล์ของฉัน',
      'ลงเวลา',
      'ใบลา',
      'สลิปเงินเดือน',
      'สวัสดิการ',
      'เอกสาร',
      'ใบคำขอ',
      'ประกาศ',
    ].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it('maps leaves to the expected app routes', () => {
    render(<Sidebar />);
    expect(screen.getByText('หน้าหลัก').closest('a')).toHaveAttribute('href', '/th/home');
    expect(screen.getByText('โปรไฟล์ของฉัน').closest('a')).toHaveAttribute('href', '/th/profile/me');
    expect(screen.getByText('ใบลา').closest('a')).toHaveAttribute('href', '/th/timeoff');
    expect(screen.getByText('สลิปเงินเดือน').closest('a')).toHaveAttribute('href', '/th/payslip');
    expect(screen.getByText('เอกสาร').closest('a')).toHaveAttribute('href', '/th/me/documents');
    expect(screen.getByText('ประกาศ').closest('a')).toHaveAttribute('href', '/th/announcements');
  });

  it('benefits leaf points at the Benefits Hub', () => {
    render(<Sidebar />);
    expect(screen.getByText('สวัสดิการ').closest('a')).toHaveAttribute('href', '/th/benefits-hub');
  });

  it('renders the "ใบลา" badge (Blueprint badge=3)', () => {
    render(<Sidebar />);
    const leaveLink = screen.getByText('ใบลา').closest('a')!;
    expect(within(leaveLink).getByText('3')).toBeInTheDocument();
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
  it('manager unlocks the team group but not HR admin', () => {
    asRoles(['manager', 'employee']);
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: new RegExp(GROUP_TEAM) })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: new RegExp(GROUP_HR) })).toBeDisabled();
    // manager has no system-group leaf → system stays locked
    expect(screen.getByRole('button', { name: new RegExp(GROUP_SYSTEM) })).toBeDisabled();
  });

  it('manager team leaves include approvals + reports + perf with correct hrefs', () => {
    asRoles(['manager', 'employee']);
    navigationMocks.pathname = '/th/quick-approve'; // open team group
    render(<Sidebar />);
    expect(screen.getByText('อนุมัติ').closest('a')).toHaveAttribute('href', '/th/quick-approve');
    expect(screen.getByText('รายงาน').closest('a')).toHaveAttribute('href', '/th/reports');
    expect(screen.getByText('ผลงานทีม').closest('a')).toHaveAttribute('href', '/th/performance-form');
  });

  it('hr_admin unlocks workspace + team + hr + system', () => {
    asRoles(['hr_admin', 'employee']);
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: new RegExp(GROUP_WORKSPACE) })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: new RegExp(GROUP_TEAM) })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: new RegExp(GROUP_HR) })).not.toBeDisabled();
    // hr_admin (hradmin persona) appears in several system-group leaf show lists
    // (e.g. Regularization Queue) → system group is unlocked too.
    expect(screen.getByRole('button', { name: new RegExp(GROUP_SYSTEM) })).not.toBeDisabled();
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
    expect(screen.getByText('ค่าตอบแทน').closest('a')).toHaveAttribute('href', '/th/payroll');
  });

  it('hr_manager (HRIS tier) unlocks the system group', () => {
    asRoles(['hr_manager', 'employee']);
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: new RegExp(GROUP_SYSTEM) })).not.toBeDisabled();
  });
});

// ─── Single-open accordion behaviour ──────────────────────────────────────────

describe('Blueprint sidebar — single-open accordion', () => {
  beforeEach(() => {
    asRoles(['hr_manager', 'employee']); // unlock every group so they can open
    navigationMocks.pathname = '/th/home';
  });

  it('the active route group is open on first render', () => {
    render(<Sidebar />);
    // home lives in workspace → workspace trigger is expanded
    expect(screen.getByRole('button', { name: new RegExp(GROUP_WORKSPACE) })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('หน้าหลัก')).toBeInTheDocument();
  });

  it('opening a second group collapses the first (only one open at a time)', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: new RegExp(GROUP_WORKSPACE) })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    clickGroup(GROUP_HR);
    expect(screen.getByRole('button', { name: new RegExp(GROUP_HR) })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: new RegExp(GROUP_WORKSPACE) })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('clicking the open group again collapses it (toggle to null)', () => {
    render(<Sidebar />);
    const workspace = screen.getByRole('button', { name: new RegExp(GROUP_WORKSPACE) });
    expect(workspace).toHaveAttribute('aria-expanded', 'true');
    clickGroup(GROUP_WORKSPACE);
    expect(workspace).toHaveAttribute('aria-expanded', 'false');
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

  it('locale-agnostic: /en/home activates the home leaf with EN label', () => {
    navigationMocks.pathname = '/en/home';
    render(<Sidebar />);
    expect(screen.getByText('Home').closest('a')).toHaveClass('is-active');
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/en/home');
  });
});

// ─── Footer user card ─────────────────────────────────────────────────────────

describe('Blueprint sidebar — footer user card', () => {
  it('renders the avatar initials + emp id, linking to /login (logout affordance)', () => {
    render(<Sidebar />);
    const foot = screen.getByLabelText('ออกจากระบบและกลับไปหน้าเข้าสู่ระบบ');
    expect(foot).toHaveAttribute('href', '/th/login');
    expect(within(foot).getByText('จท')).toBeInTheDocument();
    expect(within(foot).getByText('EMP-04821')).toBeInTheDocument();
  });
});
