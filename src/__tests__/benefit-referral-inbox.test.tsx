import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BenefitReferralInbox } from '@/components/workflow/BenefitReferralInbox';
import { BenefitClaimsInbox } from '@/components/workflow/BenefitClaimsInbox';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';

vi.mock('@/stores/auth-store', () => {
  const state = { username: 'SPD Benefits' };
  const useAuthStore = Object.assign((selector?: (s: typeof state) => unknown) => selector ? selector(state) : state, { getState: () => state, setState: vi.fn(), subscribe: vi.fn() });
  return { useAuthStore };
});

function submitReferral() {
  const referral = useBenefitReferralsStore.getState().createReferral({
    employeeId: 'EMP001',
    employeeName: 'จงรักษ์ ทานากะ',
    coveredPersonId: 'EMP001',
    hospitalId: 'HOSP-BDMS',
    serviceReason: 'พบแพทย์เฉพาะทาง',
    preferredVisitDate: '2026-05-10',
  });
  useBenefitReferralsStore.getState().submitReferral(referral.id);
  return referral.id;
}

describe('benefit referral inbox lane', () => {
  beforeEach(() => {
    localStorage.clear();
    useBenefitClaimsStore.getState().clear();
    useBenefitReferralsStore.getState().clear();
  });

  it('renders and processes referral requests separately from reimbursement claims', async () => {
    const user = userEvent.setup();
    const referralId = submitReferral();

    render(<BenefitReferralInbox />);

    expect(screen.getByText('Hospital Referral — SPD')).toBeInTheDocument();
    expect(screen.getAllByText(/โรงพยาบาลกรุงเทพ/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'อนุมัติ' }));
    expect(useBenefitReferralsStore.getState().referrals.find((item) => item.id === referralId)?.status).toBe('approved');
    await user.click(screen.getByRole('button', { name: 'ออกใบส่งตัว' }));
    const issued = useBenefitReferralsStore.getState().referrals.find((item) => item.id === referralId);
    expect(issued?.status).toBe('letter_issued');
    expect(issued?.letter?.referralNumber).toMatch(/^EP-/);
  });

  it('BenefitClaimsInbox remains reimbursement-only', () => {
    submitReferral();

    render(<BenefitClaimsInbox />);

    expect(screen.getByText('Benefit Reimbursement — SPD')).toBeInTheDocument();
    expect(screen.queryByText(/โรงพยาบาลกรุงเทพ/)).not.toBeInTheDocument();
  });

  it('uses Humi primitives rather than legacy card classes or inline styles', () => {
    const source = readFileSync(path.join(process.cwd(), 'src/components/workflow/BenefitReferralInbox.tsx'), 'utf8');

    expect(source).toMatch(/<Card/);
    expect(source).toMatch(/<FormField/);
    expect(source).not.toMatch(/style=|humi-card|humi-row|humi-col|#[0-9a-f]{3,8}/i);
  });
});
