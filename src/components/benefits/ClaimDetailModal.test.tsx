import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ClaimDetailModal } from '@/components/benefits/ClaimDetailModal';
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/rbac';
import type { BenefitClaimRequest } from '@/stores/benefit-claims';

// ── next-intl mock: keys pass through; default locale 'en' ────────────────────
// HiddenFieldPlaceholder renders t('claimHidden') → the literal key 'claimHidden',
// so its absence/presence is assertable through the passthrough.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

function loginAs(roles: Role[]) {
  useAuthStore.getState().setUser({
    id: `T-${roles.join('-')}`,
    name: roles.join('+'),
    email: `${roles[0]}@test.local`,
    roles,
  });
}

const OWN_CLAIM: BenefitClaimRequest = {
  id: 'CLM-9',
  workflowRequestId: 'REQ-BEN-009',
  employeeId: 'EMP001',
  employeeName: 'จงรักษ์ ทานากะ',
  company: 'Central Group',
  businessUnit: 'People Operations',
  employeeGroup: 'Monthly Staff',
  personalGrade: 'PG4',
  benefitType: 'medical',
  benefitCode: 'MED-OPD',
  benefitName: 'Medical reimbursement',
  remainingAmount: 24000,
  currency: 'THB',
  receiptNo: 'RX-7788',
  receiptDate: '2026-04-20',
  claimDate: '2026-04-21',
  receiptAmount: 1200,
  totalClaimAmount: 1200,
  remark: 'Migraine',
  status: 'pending_spd',
  submittedAt: '2026-04-21T09:20:00.000Z',
  updatedAt: '2026-04-21T09:20:00.000Z',
  hospitalName: 'BNH Hospital',
  attachments: [{ id: 'a1', filename: 'receipt.pdf', sizeMb: 1, mimeType: 'application/pdf' }],
  audit: [
    { at: '2026-04-21T09:20:00.000Z', actorRole: 'employee', actorName: 'จงรักษ์', action: 'submit' },
  ],
  version: 1,
  previousVersions: [],
};

const APPROVE_CONTROL = /^(approve|reject|send.?back|ปฏิเสธ|อนุมัติ|ส่งกลับ)$/i;

describe('<ClaimDetailModal> — read-only, capability-bypassed', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
  });
  afterEach(() => cleanup());

  it('renders claim rows for an employee viewing their OWN claim (no HiddenFieldPlaceholder)', () => {
    loginAs(['employee']);
    render(<ClaimDetailModal claim={OWN_CLAIM} open onClose={() => {}} />);

    // The claim's data renders (receipt no. + remark are ClaimPayload rows) ...
    expect(screen.getByText('RX-7788')).toBeInTheDocument();
    expect(screen.getByText('Migraine')).toBeInTheDocument();
    // ... and the capability fallback never appears.
    expect(screen.queryByText('claimHidden')).toBeNull();
  });

  it('renders claim rows for hr_admin', () => {
    loginAs(['hr_admin']);
    render(<ClaimDetailModal claim={OWN_CLAIM} open onClose={() => {}} />);
    expect(screen.getByText('RX-7788')).toBeInTheDocument();
    expect(screen.queryByText('claimHidden')).toBeNull();
  });

  it('exposes NO Approve/Reject/Send-back control on either persona', () => {
    for (const role of ['employee', 'hr_admin'] as Role[]) {
      loginAs([role]);
      const { unmount } = render(<ClaimDetailModal claim={OWN_CLAIM} open onClose={() => {}} />);
      expect(screen.queryByRole('button', { name: APPROVE_CONTROL })).toBeNull();
      unmount();
    }
  });

  it('renders nothing actionable when closed', () => {
    loginAs(['employee']);
    render(<ClaimDetailModal claim={OWN_CLAIM} open={false} onClose={() => {}} />);
    expect(screen.queryByText('RX-7788')).toBeNull();
  });
});

// STA-234 — opt-in Cancel/Edit action footer. Labels pass through the next-intl
// mock, so the buttons render as the literal keys 'cancelClaim' / 'editClaim'.
describe('<ClaimDetailModal> — STA-234 action footer (opt-in)', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    loginAs(['employee']);
  });
  afterEach(() => cleanup());

  const cancelBtn = () => screen.queryByRole('button', { name: 'cancelClaim' });
  const editBtn = () => screen.queryByRole('button', { name: 'editClaim' });

  it('renders NEITHER button when both callbacks are omitted (regression guard for /history + admin)', () => {
    render(<ClaimDetailModal claim={OWN_CLAIM} open onClose={() => {}} />);
    expect(cancelBtn()).toBeNull();
    expect(editBtn()).toBeNull();
  });

  it('renders Cancel only when onCancel is supplied', () => {
    render(<ClaimDetailModal claim={OWN_CLAIM} open onClose={() => {}} onCancel={() => {}} />);
    expect(cancelBtn()).toBeInTheDocument();
    expect(editBtn()).toBeNull();
  });

  it('renders Edit only when onEdit is supplied', () => {
    render(<ClaimDetailModal claim={OWN_CLAIM} open onClose={() => {}} onEdit={() => {}} />);
    expect(editBtn()).toBeInTheDocument();
    expect(cancelBtn()).toBeNull();
  });

  it('fires the callbacks on click', () => {
    const onCancel = vi.fn();
    const onEdit = vi.fn();
    render(
      <ClaimDetailModal claim={OWN_CLAIM} open onClose={() => {}} onCancel={onCancel} onEdit={onEdit} />,
    );
    fireEvent.click(editBtn()!);
    fireEvent.click(cancelBtn()!);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('styles Cancel with the pumpkin --color-danger token (NO-RED)', () => {
    render(<ClaimDetailModal claim={OWN_CLAIM} open onClose={() => {}} onCancel={() => {}} />);
    const btn = cancelBtn()!;
    expect(btn.className).toContain('var(--color-danger)');
    expect(btn.className).not.toMatch(/red|crimson|coral/i);
  });
});
