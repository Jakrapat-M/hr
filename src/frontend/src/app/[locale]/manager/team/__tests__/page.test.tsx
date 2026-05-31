import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Next.js mocks ──────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  usePathname: vi.fn().mockReturnValue('/th/manager/team'),
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

// next-intl: useLocale → 'th'; useTranslations → key passthrough that
// interpolates {count} so the scope line reflects the real cohort size.
vi.mock('next-intl', () => ({
  useLocale: () => 'th',
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars && 'count' in vars ? `${key}:${vars.count}` : key,
}));

// ── Auth store mock — injectable per test ──────────────────
import type { Role } from '@/lib/rbac';

let mockRoles: Role[] = ['manager'];
let mockEmail: string | null = 'manager@humi.test';
let mockHydrated = true;
let mockAuthed = true;

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector?: (s: {
      roles: Role[];
      email: string | null;
      isAuthenticated: boolean;
      _hasHydrated: boolean;
    }) => unknown,
  ) => {
    const state = {
      roles: mockRoles,
      email: mockEmail,
      isAuthenticated: mockAuthed,
      _hasHydrated: mockHydrated,
    };
    return selector ? selector(state) : state;
  },
}));

// ── Component imports (after mocks) ───────────────────────
import ManagerTeamPage from '../page';
import ManagerTeamLayout from '../layout';
import { ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';

// emp-002 is the Manager persona (manager@humi.test) and the BU-FINANCE head,
// so it has direct reports seeded in the pool.
const EMP_002_REPORTS = ALL_PORTED_EMPLOYEES.filter(
  (e) => e.managerId === 'emp-002' && (e.status === 'active' || e.status === 'leave'),
);

// ══════════════════════════════════════════════════════════
describe('ManagerTeamPage — direct-reports scoped table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoles = ['manager'];
    mockEmail = 'manager@humi.test';
  });

  it('manager sees a scoped direct-reports table (non-empty, excludes self)', () => {
    render(<ManagerTeamPage />);

    // Scope line shows the report count via interpolated {count}.
    const scopeLine = screen.getByTestId('manager-team-scope-line');
    expect(scopeLine).toHaveTextContent(`scope:${EMP_002_REPORTS.length}`);
    expect(EMP_002_REPORTS.length).toBeGreaterThan(0);

    // The DataTable renders (not the EmptyState) — caption present.
    expect(screen.getByText('caption')).toBeInTheDocument();

    // Self (emp-002) must NOT appear among the rows.
    const me = ALL_PORTED_EMPLOYEES.find((e) => e.id === 'emp-002')!;
    expect(
      screen.queryByText(`${me.firstNameTh} ${me.lastNameTh}`),
    ).not.toBeInTheDocument();

    // A known direct report DOES appear.
    const someReport = EMP_002_REPORTS[0];
    expect(
      screen.getAllByText(`${someReport.firstNameTh} ${someReport.lastNameTh}`)[0],
    ).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════
describe('ManagerTeamLayout — route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHydrated = true;
    mockAuthed = true;
  });

  it('renders children for the manager persona', () => {
    mockRoles = ['manager'];
    render(
      <ManagerTeamLayout>
        <div data-testid="team-child">team</div>
      </ManagerTeamLayout>,
    );
    expect(screen.getByTestId('team-child')).toBeInTheDocument();
    expect(screen.queryByText(/Access Denied/i)).not.toBeInTheDocument();
  });

  it('denies an employee persona IN PLACE (AccessDenied, no children)', () => {
    mockRoles = ['employee'];
    render(
      <ManagerTeamLayout>
        <div data-testid="team-child">team</div>
      </ManagerTeamLayout>,
    );
    // AccessDenied surface renders; the guarded child does NOT.
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    expect(screen.queryByTestId('team-child')).not.toBeInTheDocument();
  });

  it('also admits People-Partner (hrbp) and HR Admin personas', () => {
    for (const role of ['hrbp', 'spd', 'hr_admin', 'hr_manager'] as Role[]) {
      mockRoles = [role];
      const { unmount } = render(
        <ManagerTeamLayout>
          <div data-testid="team-child">team</div>
        </ManagerTeamLayout>,
      );
      expect(screen.getByTestId('team-child')).toBeInTheDocument();
      unmount();
    }
  });
});
