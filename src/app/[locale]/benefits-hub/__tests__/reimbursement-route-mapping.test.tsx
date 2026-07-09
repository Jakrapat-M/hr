import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { BENEFIT_PLAN_REGISTRY } from '@/data/benefits/plan-registry';

const planNameTh = (planId: string) =>
  BENEFIT_PLAN_REGISTRY.find((p) => p.id === planId)?.nameTh ?? '';

const submitClaim = vi.fn();
const navigationMocks = vi.hoisted(() => ({
  useSearchParams: vi.fn(),
  usePathname: vi.fn().mockReturnValue('/th/benefits-hub/reimbursement'),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/navigation', () => navigationMocks);

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'th',
}));

vi.mock('@/components/cnext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/cnext')>();

  return {
    ...actual,
    Capability: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/stores/benefit-claims', () => ({
  useBenefitClaimsStore: (selector: (state: unknown) => unknown) => selector({ submitClaim }),
}));

describe('benefits-hub reimbursement route mapping', () => {
  beforeEach(() => {
    cleanup();
    submitClaim.mockClear();
    submitClaim.mockReturnValue({ id: 'claim-test-1', workflowRequestId: 'workflow-test-1' });
    navigationMocks.useSearchParams.mockReturnValue(new URLSearchParams());
    // Fresh router each test so push assertions don't leak across cases (STA-184).
    navigationMocks.useRouter.mockReturnValue({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() });
  });

  it('maps ca-medical allowance to BE-MED-001 and preselects medical plan', async () => {
    navigationMocks.useSearchParams.mockReturnValue(new URLSearchParams('allowance=ca-medical'));
    const { default: ReimbursementPage } = await import('@/app/[locale]/benefits-hub/reimbursement/page');

    render(<ReimbursementPage />);

    // STA-148 req-4 — BE-MED-001 renamed "Medical Reimbursement" (dropped OPD suffix).
    expect(screen.getByLabelText(/สวัสดิการที่เลือก/)).toHaveValue('ค่ารักษาพยาบาล');
  });

  it('maps ca-phone allowance to canonical BE-MOB-001 and submits with mobile benefitType', async () => {
    navigationMocks.useSearchParams.mockReturnValue(new URLSearchParams('allowance=ca-phone'));
    const user = userEvent.setup();
    const { default: ReimbursementPage } = await import('@/app/[locale]/benefits-hub/reimbursement/page');

    render(<ReimbursementPage />);

    expect(screen.getByLabelText(/สวัสดิการที่เลือก/)).toHaveValue('ค่าโทรศัพท์');
    await user.type(await screen.findByLabelText(/เลขที่ใบเสร็จ/), 'RC-0002');
    await user.type(screen.getByLabelText(/วันที่ใบเสร็จ/), '2026-05-19');
    // STA-120: typing Receipt amount auto-mirrors into Total Claim Amount (no separate type).
    await user.type(screen.getByLabelText(/จำนวนเงินตามใบเสร็จ/), '1000');
    // STA-145: BE-MOB-001 now resolves to category 'mobile' → the MOBILE bucket
    // renders the Usage-month LOV (Jan–Dec), NOT the gasoline Claim Type.
    expect(screen.queryByLabelText(/ประเภทการเบิก/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/เดือนที่ขอเบิก/), 'may');
    // STA-184 — Submit now opens a preview; confirm to dispatch the claim.
    await user.click(screen.getByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' }));
    await user.click(await screen.findByRole('button', { name: 'ยืนยันส่งคำขอ' }));

    expect(submitClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        benefitCode: 'BE-MOB-001',
        benefitType: 'mobile',
        remainingAmount: 4800,
        receiptNo: 'RC-0002',
        receiptAmount: 1000,
        totalClaimAmount: 1000,
        claimDate: expect.any(String),
        dynamicFields: expect.objectContaining({ realMonthDate: 'may' }),
      }),
    );
  });

  it('STA-184 — Submit opens a preview and only dispatches + redirects on Confirm', async () => {
    navigationMocks.useSearchParams.mockReturnValue(new URLSearchParams('allowance=ca-phone'));
    const user = userEvent.setup();
    const { default: ReimbursementPage } = await import('@/app/[locale]/benefits-hub/reimbursement/page');

    render(<ReimbursementPage />);

    await user.type(await screen.findByLabelText(/เลขที่ใบเสร็จ/), 'RC-0184');
    await user.type(screen.getByLabelText(/จำนวนเงินตามใบเสร็จ/), '500');
    await user.selectOptions(screen.getByLabelText(/เดือนที่ขอเบิก/), 'may');

    await user.click(screen.getByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' }));
    // Preview is shown; nothing submitted yet.
    expect(screen.getByText('ตรวจสอบก่อนส่งคำขอ')).toBeInTheDocument();
    expect(submitClaim).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'ยืนยันส่งคำขอ' }));
    expect(submitClaim).toHaveBeenCalledTimes(1);
    expect(navigationMocks.useRouter().push).toHaveBeenCalledWith('/th/benefits-hub');
  });

  it.each([
    ['ca-tollway', 'BE-TOL-001'],
    ['ca-parking', 'BE-PAR-001'],
    ['ca-checkup', 'BE-PHY-001'],
    ['ca-checkup-b', 'BE-PHY-002'],
  ])('STA-196 — maps new allowance %s to plan %s', async (allowanceId, planId) => {
    navigationMocks.useSearchParams.mockReturnValue(new URLSearchParams(`allowance=${allowanceId}`));
    const { default: ReimbursementPage } = await import('@/app/[locale]/benefits-hub/reimbursement/page');

    render(<ReimbursementPage />);

    expect(screen.getByLabelText(/สวัสดิการที่เลือก/)).toHaveValue(planNameTh(planId));
  });

  it('renders required reimbursement-visible fields', async () => {
    const { default: ReimbursementPage } = await import('@/app/[locale]/benefits-hub/reimbursement/page');
    render(<ReimbursementPage />);

    expect(await screen.findByLabelText(/วันที่เคลม/)).toBeInTheDocument();
    expect(screen.getByLabelText(/วงเงินคงเหลือ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/จำนวนเงินตามใบเสร็จ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ยอดเบิกสุทธิ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/หมายเหตุ/)).toBeInTheDocument();
  });
});
