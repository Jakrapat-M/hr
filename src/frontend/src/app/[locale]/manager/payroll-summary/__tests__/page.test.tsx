import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Next.js mocks ──────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  usePathname: vi.fn().mockReturnValue('/th/manager/payroll-summary'),
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
import ManagerPayrollSummaryPage from '../page';
import ManagerPayrollSummaryLayout from '../layout';
import { ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';

// emp-002 is the Manager persona (manager@humi.test) with direct reports seeded.
const EMP_002_REPORTS = ALL_PORTED_EMPLOYEES.filter(
  (e) => e.managerId === 'emp-002' && (e.status === 'active' || e.status === 'leave'),
);

// ══════════════════════════════════════════════════════════
describe('ManagerPayrollSummaryPage — read-only team comp rollup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoles = ['manager'];
    mockEmail = 'manager@humi.test';
  });

  it('manager sees a scoped, read-only comp summary (no write controls, excludes self)', () => {
    render(<ManagerPayrollSummaryPage />);

    // Scope line reflects the direct-report count via interpolated {count}.
    const scopeLine = screen.getByTestId('payroll-summary-scope-line');
    expect(scopeLine).toHaveTextContent(`scope:${EMP_002_REPORTS.length}`);
    expect(EMP_002_REPORTS.length).toBeGreaterThan(0);

    // The table + team total render.
    expect(screen.getByText('caption')).toBeInTheDocument();
    expect(screen.getByTestId('payroll-summary-team-total')).toBeInTheDocument();

    // A known direct report appears.
    const someReport = EMP_002_REPORTS[0];
    expect(
      screen.getAllByText(`${someReport.firstNameTh} ${someReport.lastNameTh}`)[0],
    ).toBeInTheDocument();

    // Self (emp-002) must NOT appear among the rows.
    const me = ALL_PORTED_EMPLOYEES.find((e) => e.id === 'emp-002')!;
    expect(
      screen.queryByText(`${me.firstNameTh} ${me.lastNameTh}`),
    ).not.toBeInTheDocument();

    // READ-ONLY: no edit / approve / save / write affordances anywhere.
    expect(screen.queryByRole('button', { name: /edit|approve|save|reject|แก้ไข|อนุมัติ|บันทึก/i }))
      .not.toBeInTheDocument();
  });

  it('figures are masked by default and reveal toggles them', () => {
    render(<ManagerPayrollSummaryPage />);

    // Masked figures present before reveal: every digit is replaced by a
    // bullet while the currency shape (฿ , .) is kept, e.g. "฿••,•••.••".
    // So no digits should be visible and bullet-masked cells must exist.
    const maskedCells = screen.getAllByText(/•/);
    expect(maskedCells.length).toBeGreaterThan(0);
    maskedCells.forEach((el) => expect(el.textContent ?? '').not.toMatch(/[0-9]/));

    const toggle = screen.getByTestId('payroll-summary-reveal-toggle');
    fireEvent.click(toggle);

    // After reveal the mask tokens are gone (full figures shown).
    expect(screen.queryByText(/•/)).not.toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════
describe('ManagerPayrollSummaryLayout — route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHydrated = true;
    mockAuthed = true;
  });

  it('renders children for the manager persona (read-only access)', () => {
    mockRoles = ['manager'];
    render(
      <ManagerPayrollSummaryLayout>
        <div data-testid="payroll-child">payroll</div>
      </ManagerPayrollSummaryLayout>,
    );
    expect(screen.getByTestId('payroll-child')).toBeInTheDocument();
    expect(screen.queryByText(/Access Denied/i)).not.toBeInTheDocument();
  });

  it('denies an employee persona IN PLACE (AccessDenied, no children)', () => {
    mockRoles = ['employee'];
    render(
      <ManagerPayrollSummaryLayout>
        <div data-testid="payroll-child">payroll</div>
      </ManagerPayrollSummaryLayout>,
    );
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payroll-child')).not.toBeInTheDocument();
  });

  it('also admits HR Admin / HR Manager personas', () => {
    for (const role of ['hr_admin', 'hr_manager'] as Role[]) {
      mockRoles = [role];
      const { unmount } = render(
        <ManagerPayrollSummaryLayout>
          <div data-testid="payroll-child">payroll</div>
        </ManagerPayrollSummaryLayout>,
      );
      expect(screen.getByTestId('payroll-child')).toBeInTheDocument();
      unmount();
    }
  });
});
