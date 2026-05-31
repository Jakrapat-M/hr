/**
 * p3-team-time-dashboard.test.tsx — manager team-time dashboard on /time/review
 * Framework: Vitest + jsdom + React Testing Library
 *
 * P3: /time/review gains a read-only "Team time" section (late / absence / OT
 * trend) scoped to the manager's direct reports via filterEmployeesByPersona.
 *  - manager sees a scoped team-time summary (headcount = their direct reports)
 *  - employee is denied in place (no dashboard, no-access copy)
 *  - hrbp+ may also view (BU/all scope)
 *
 * Also covers the pure metric helper (buildTeamTimeSummary) directly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { HumiEmployee } from '@/lib/humi-mock-data';
import { buildTeamTimeSummary, LATE_ALERT_THRESHOLD } from '@/lib/team-time-metrics';

let mockRoles: string[] = [];
let mockEmail: string | null = null;

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
}));

// translate → key so assertions are locale-independent.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars && 'count' in vars ? `${key}:${vars.count}` : key,
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[]; email: string | null }) => unknown) =>
    selector({ roles: mockRoles, email: mockEmail }),
}));

vi.mock('@/stores/timesheet-submissions', () => ({
  useTimesheetSubmissions: (selector: (s: { submissions: unknown[] }) => unknown) =>
    selector({ submissions: [] }),
  selectSubmittedTimesheets: () => [],
}));

// A small deterministic pool: manager@ → emp-002 (per EMP_BY_LOGIN_FULL),
// with two direct reports + one unrelated employee.
// Defined via vi.hoisted so the vi.mock factory (hoisted to top) can read it.
const { POOL } = vi.hoisted(() => {
  const POOL: HumiEmployee[] = [
    { id: 'emp-002', employeeCode: 'M', firstNameTh: 'หัว', lastNameTh: 'หน้า', initials: 'MM',
      position: 'Manager', department: 'Finance', status: 'active', avatarTone: 'teal' },
    { id: 'emp-003', employeeCode: 'E1', firstNameTh: 'ลูก', lastNameTh: 'ทีมหนึ่ง', initials: 'E1',
      position: 'Eng', department: 'IT', status: 'active', avatarTone: 'sage', managerId: 'emp-002' },
    { id: 'emp-006', employeeCode: 'E2', firstNameTh: 'ลูก', lastNameTh: 'ทีมสอง', initials: 'E2',
      position: 'Analyst', department: 'Finance', status: 'active', avatarTone: 'indigo', managerId: 'emp-002' },
    { id: 'emp-999', employeeCode: 'X', firstNameTh: 'คน', lastNameTh: 'อื่น', initials: 'XX',
      position: 'Other', department: 'Sales', status: 'active', avatarTone: 'ink', managerId: 'emp-500' },
  ];
  return { POOL };
});

vi.mock('@/lib/all-ported-employees', () => ({
  ALL_PORTED_EMPLOYEES: POOL,
}));

import TimesheetReviewPage from '@/app/[locale]/time/review/page';

beforeEach(() => {
  mockRoles = [];
  mockEmail = null;
});
afterEach(() => cleanup());

describe('P3 — buildTeamTimeSummary helper', () => {
  it('scopes headcount to the passed employees and is deterministic', () => {
    const reports = POOL.filter((e) => e.managerId === 'emp-002');
    const a = buildTeamTimeSummary(reports);
    const b = buildTeamTimeSummary(reports);
    expect(a.headcount).toBe(2);
    expect(a).toEqual(b); // stable across calls (no random/date)
    expect(a.otTrend).toHaveLength(4);
    expect(a.rows.every((r) => r.lateCount >= 0 && r.absenceCount >= 0 && r.otHours >= 0)).toBe(true);
  });

  it('flags rows that breach the late threshold', () => {
    const { rows } = buildTeamTimeSummary(POOL);
    rows.forEach((r) => {
      if (r.lateCount >= LATE_ALERT_THRESHOLD || r.absenceCount >= 1) {
        expect(r.hasAlert).toBe(true);
      }
    });
  });

  it('returns an empty summary for an empty team', () => {
    const s = buildTeamTimeSummary([]);
    expect(s.headcount).toBe(0);
    expect(s.totalOtHours).toBe(0);
  });
});

describe('P3 — /time/review team-time dashboard RBAC + scope', () => {
  it('manager sees a scoped team-time summary (2 direct reports)', () => {
    mockRoles = ['manager', 'employee'];
    mockEmail = 'manager@humi.test'; // resolves to emp-002
    render(<TimesheetReviewPage />);
    expect(screen.getByTestId('team-time-dashboard')).toBeInTheDocument();
    // ttScope receives count=2 (direct reports, self dropped)
    expect(screen.getByText('ttScope:2')).toBeInTheDocument();
  });

  it('employee is denied in place — no team-time dashboard', () => {
    mockRoles = ['employee'];
    mockEmail = 'employee@humi.test';
    render(<TimesheetReviewPage />);
    expect(screen.queryByTestId('team-time-dashboard')).toBeNull();
    expect(screen.getByText('noAccessTitle')).toBeInTheDocument();
  });

  it('hrbp may also view the dashboard (BU/all scope)', () => {
    mockRoles = ['hrbp', 'employee'];
    mockEmail = 'hrbp@humi.test';
    render(<TimesheetReviewPage />);
    expect(screen.getByTestId('team-time-dashboard')).toBeInTheDocument();
  });
});
