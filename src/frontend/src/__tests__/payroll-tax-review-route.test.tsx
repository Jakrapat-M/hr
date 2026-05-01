import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const payrollMocks = vi.hoisted(() => ({
  pathname: '/th/payroll/tax-review',
  roles: ['hr_admin'] as string[],
  username: 'Payroll Admin',
  rows: [
    {
      id: 'TAX-PLAN-0001',
      workflowId: 'REQ-TAX-0001',
      employeeId: 'EMP001',
      employeeName: 'จงรักษ์ ทานากะ',
      maskedTaxId: '***-***-1001',
      taxYear: 2026,
      status: 'submitted_payroll',
      statusLabel: 'ส่งให้ Payroll แล้ว',
      submittedAt: '30 เม.ย. 2569',
      estimateSummary: 'Remaining due ฿12,400',
    },
  ],
  selector: vi.fn(),
  start: vi.fn(),
  sendBack: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => payrollMocks.pathname,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      'payroll.title': 'Payroll',
      'payroll.subtitle': 'Payroll workspace',
      'payroll.lastRun': 'Last run',
      'payroll.nextRun': 'Next run',
      'payroll.employeesOnPayroll': 'Employees on payroll',
      'payrollSetup.title': 'Payroll setup',
      'payrollSetup.description': 'Set up payroll',
      'payrollProcessing.title': 'Payroll processing',
      'payrollProcessing.description': 'Process payroll',
      'govReports.title': 'Government reports',
      'govReports.description': 'Generate reports',
      'common.noData': 'No access',
    };
    return map[key] ?? key;
  },
}));

vi.mock('@/stores/auth-store', () => {
  const useAuthStore = Object.assign(
    (selector?: (state: { roles: string[]; username: string }) => unknown) => {
      const state = { roles: payrollMocks.roles, username: payrollMocks.username };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ roles: payrollMocks.roles, username: payrollMocks.username }), setState: vi.fn(), subscribe: vi.fn() },
  );
  return { useAuthStore };
});

vi.mock('@/stores/benefit-tax-planning', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/benefit-tax-planning')>();
  const mockDraft = {
    id: 'TAX-PLAN-0001',
    workflowRequestId: 'REQ-TAX-0001',
    employeeId: 'EMP001',
    employeeName: 'จงรักษ์ ทานากะ',
    maskedTaxId: 'X-XXXX-XXXXX-01-X',
    taxYear: 2026,
    status: 'estimated',
    expectedAdditionalIncome: 0,
    allowances: actual.EMPTY_TAX_ALLOWANCES,
    updatedAt: '2026-05-01T00:00:00.000Z',
    audit: [],
  };
  const mockState = {
    profile: {
      employeeId: 'EMP001',
      employeeName: 'จงรักษ์ ทานากะ',
      maskedTaxId: 'X-XXXX-XXXXX-01-X',
      taxYear: 2026,
      ytdIncome: 840000,
      ytdWithholding: 56000,
      socialSecurityYtd: 9000,
    },
    drafts: [mockDraft],
    saveDraft: vi.fn(),
    estimateDraft: vi.fn(),
    submitTaxPlanningForPayrollReview: vi.fn(),
    resubmitTaxPlanningForPayrollReview: vi.fn(),
    cancelTaxPlanningReview: vi.fn(),
  };
  return {
    ...actual,
    useBenefitTaxPlanningStore: Object.assign(
    (selector: (state: typeof mockState) => unknown) => selector(mockState),
    {
      getState: () => ({
        drafts: [mockDraft],
        startPayrollTaxPlanningReview: (...args: unknown[]) => payrollMocks.start(...args),
        sendBackPayrollTaxPlanningReview: (...args: unknown[]) => payrollMocks.sendBack(...args),
        approvePayrollTaxPlanningReview: (...args: unknown[]) => payrollMocks.approve(...args),
        rejectPayrollTaxPlanningReview: (...args: unknown[]) => payrollMocks.reject(...args),
        cancelTaxPlanningReview: (...args: unknown[]) => payrollMocks.cancel(...args),
      }),
    },
  ),
  selectPayrollTaxPlanningInboxRows: (drafts: unknown[]) => payrollMocks.selector(drafts),
  };
});

describe('payroll tax review route', () => {
  beforeEach(() => {
    payrollMocks.pathname = '/th/payroll/tax-review';
    payrollMocks.roles = ['hr_admin'];
    payrollMocks.username = 'Payroll Admin';
    payrollMocks.selector.mockReset();
    payrollMocks.selector.mockReturnValue(payrollMocks.rows);
    payrollMocks.start.mockReset();
    payrollMocks.sendBack.mockReset();
    payrollMocks.approve.mockReset();
    payrollMocks.reject.mockReset();
    payrollMocks.cancel.mockReset();
  });

  it('adds a fourth Payroll landing card for tax review', async () => {
    payrollMocks.pathname = '/th/payroll';
    const { default: PayrollLandingPage } = await import('@/app/[locale]/payroll/page');

    render(<PayrollLandingPage />);

    expect(screen.getByRole('link', { name: /ตรวจแผนภาษี/ })).toHaveAttribute('href', '/th/payroll/tax-review');
  });

  it('reuses payroll-processing access until a payroll-specific role exists', async () => {
    payrollMocks.roles = ['employee'];
    const { default: PayrollTaxReviewPage } = await import('@/app/[locale]/payroll/tax-review/page');

    render(<PayrollTaxReviewPage />);

    expect(screen.getByText('ไม่สามารถเข้าถึงการตรวจแผนภาษี')).toBeInTheDocument();
    expect(screen.getByText(/payroll-processing/)).toBeInTheDocument();
  });

  it('renders rows from selectPayrollTaxPlanningInboxRows and never exposes raw tax identifiers', async () => {
    const { default: PayrollTaxReviewPage } = await import('@/app/[locale]/payroll/tax-review/page');

    render(<PayrollTaxReviewPage />);

    expect(payrollMocks.selector).toHaveBeenCalledWith([expect.objectContaining({ id: 'TAX-PLAN-0001' })]);
    expect(screen.getByRole('heading', { name: 'ตรวจแผนภาษี' })).toBeInTheDocument();
    expect(screen.getByText('จงรักษ์ ทานากะ')).toBeInTheDocument();
    expect(screen.getByText('***-***-1001')).toBeInTheDocument();
    expect(screen.queryByText('1100100001001')).not.toBeInTheDocument();
  });

  it('renders the employee tax planning route under Payroll/Tax context', async () => {
    const { default: PayrollTaxPlanningPage } = await import('@/app/[locale]/payroll/tax-planning/page');

    render(<PayrollTaxPlanningPage />);

    expect(screen.getByRole('heading', { name: 'วางแผนภาษี' })).toBeInTheDocument();
    expect(screen.getByText('Payroll/Tax context')).toBeInTheDocument();
    expect(screen.getByLabelText('รายได้เพิ่มเติมคาดการณ์ทั้งปี')).toBeInTheDocument();
    expect(screen.getByText(/ไม่ใช่การยื่นภาษีหรือแก้ไข payroll snapshot/)).toBeInTheDocument();
  });

  it('starts review, requires reasons for send-back/reject, and calls payroll tax actions', async () => {
    const user = userEvent.setup();
    const { default: PayrollTaxReviewPage } = await import('@/app/[locale]/payroll/tax-review/page');

    render(<PayrollTaxReviewPage />);

    await user.click(screen.getByRole('button', { name: /เริ่มตรวจ/ }));
    expect(payrollMocks.start).toHaveBeenCalledWith('TAX-PLAN-0001', { role: 'payroll', name: 'Payroll Admin' }, undefined);

    await user.click(screen.getByRole('button', { name: /ส่งกลับ/ }));
    expect(payrollMocks.sendBack).not.toHaveBeenCalled();
    expect(screen.getByText('กรุณาระบุเหตุผลก่อนส่งกลับหรือไม่อนุมัติ')).toBeInTheDocument();

    await user.type(screen.getByLabelText('เหตุผลหรือหมายเหตุ Payroll'), 'ขอเอกสารลดหย่อนเพิ่มเติม');
    await user.click(screen.getByRole('button', { name: /ส่งกลับ/ }));
    expect(payrollMocks.sendBack).toHaveBeenCalledWith('TAX-PLAN-0001', { role: 'payroll', name: 'Payroll Admin' }, 'ขอเอกสารลดหย่อนเพิ่มเติม');

    await user.click(screen.getByRole('button', { name: /^อนุมัติ$/ }));
    expect(payrollMocks.approve).toHaveBeenCalledWith('TAX-PLAN-0001', { role: 'payroll', name: 'Payroll Admin' }, 'ขอเอกสารลดหย่อนเพิ่มเติม');

    await user.click(screen.getByRole('button', { name: /ไม่อนุมัติ/ }));
    expect(payrollMocks.reject).toHaveBeenCalledWith('TAX-PLAN-0001', { role: 'payroll', name: 'Payroll Admin' }, 'ขอเอกสารลดหย่อนเพิ่มเติม');

    await user.click(screen.getByRole('button', { name: /ยกเลิกรีวิว/ }));
    expect(payrollMocks.cancel).toHaveBeenCalledWith('TAX-PLAN-0001', { role: 'payroll', name: 'Payroll Admin' }, 'ขอเอกสารลดหย่อนเพิ่มเติม');
  });

  it('documents route boundaries without importing PayrollProcessing', () => {
    const source = readFileSync(path.join(process.cwd(), 'src/app/[locale]/payroll/tax-review/page.tsx'), 'utf8');

    expect(source).toMatch(/canAccessModule\(roles, 'payroll-processing'\)/);
    expect(source).toMatch(/selectPayrollTaxPlanningInboxRows/);
    expect(source).not.toMatch(/PayrollProcessing|payroll-processing\.tsx/);
  });
});
