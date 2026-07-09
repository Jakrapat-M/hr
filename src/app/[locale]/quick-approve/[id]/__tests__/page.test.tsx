import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

const capabilityMock = vi.hoisted(() => ({
  canSeeBenefitEmployeeClaim: true,
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useParams: () => ({ locale: 'th' }),
}));

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => 'th',
}));

vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    canSee: (_entity: string) => true,
    canDo: (_action: string) => true,
  }),
}));

vi.mock('@/components/cnext', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Avatar: ({ fallback }: { fallback: string }) => <span data-testid="avatar">{fallback}</span>,
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title: string }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
  FormField: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  FormInput: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  Capability: ({
    children,
    fallback,
    entity,
  }: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    entity?: string;
    action?: string;
  }) => {
    if (entity === 'BenefitEmployeeClaim' && !capabilityMock.canSeeBenefitEmployeeClaim) {
      return <>{fallback ?? null}</>;
    }
    return <>{children}</>;
  },
}));

vi.mock('@/components/quick-approve/ApprovalChain', () => ({
  ApprovalTimelineChain: () => <div data-testid="approval-chain" />,
  ApprovalChain: () => <div data-testid="routing-chain" />,
}));

vi.mock('@/components/quick-approve/UrgencyBadge', () => ({
  UrgencyBadge: ({ urgency }: { urgency: string }) => <span data-testid="urgency">{urgency}</span>,
}));

// ── Seed stores (PR-1b/1c: detail page resolves ids from seeded stores first) ─

import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { useTransferApprovals } from '@/stores/transfer-approvals';
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/rbac';
import { ensureDemoSeed, resetEnsureDemoSeedForTests } from '@/lib/demo-seed';
import { APPROVAL_REGISTRY } from '@/lib/approval-registry';

// P2: the detail ActionPanel gates approve/reject via canActOn(row, roles). Tests
// must seed the acting persona's roles into the real auth-store. A senior approver
// (hr_admin) can act on every pending row; a plain employee gets view-only.
function setRoles(roles: Role[]) {
  useAuthStore.getState().setUser({ id: 'TEST', name: 'Test', email: 't@x.io', roles });
}

// ── Subject ───────────────────────────────────────────────────────────────────

import QuickApproveDetailPage from '../page';

// ── Helpers ───────────────────────────────────────────────────────────────────

// CONTRACT: QuickApproveDetailPage uses React.use(params) — Next.js 15+ async
// params API. Tests must wrap params in Promise.resolve() and render inside
// act() + Suspense so React can resolve the Promise before assertions run.
function makeParams(id: string, locale = 'th') {
  return Promise.resolve({ id, locale });
}

async function renderPage(id: string) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={null}>
        <QuickApproveDetailPage params={makeParams(id)} />
      </Suspense>,
    );
  });
  return result;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuickApproveDetailPage', () => {
  beforeEach(() => {
    // Seed the canonical 20 rows so the store-derived queue can resolve WF-2026-*
    // ids (e.g. WF-2026-016). Legacy WF-001..015 ids still resolve via the
    // LEGACY_DETAIL_FALLBACK inside the page component without seeding.
    useLeaveApprovals.getState().clear();
    useWorkflowApprovals.getState().clear();
    useBenefitClaimsStore.getState().clear();
    useTransferApprovals.getState().clear();
    resetEnsureDemoSeedForTests();
    ensureDemoSeed();
    capabilityMock.canSeeBenefitEmployeeClaim = true;
    // Default acting persona = senior approver (hr_admin) so existing assertions
    // about action controls still hold; per-test overrides exercise the gate.
    setRoles(['hr_admin']);
  });

  it('renders request summary for a known ID', async () => {
    await renderPage('WF-001');
    expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument();
    // STA-147 req-4: the HRBP→SPD header chip (ApprovalTimelineChain) is removed —
    // the detail page no longer mounts it.
    expect(screen.queryByTestId('approval-chain')).not.toBeInTheDocument();
  });

  it('does not render the Approval-route block (routing chain) any more', async () => {
    await renderPage('WF-2026-004');
    // STA-122 #1: the per-type approver-routing chain + its heading/next-approver
    // line are removed. The ApprovalChain stage-pill row no longer mounts.
    expect(screen.queryByTestId('routing-chain')).not.toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.routingChain')).not.toBeInTheDocument();
  });

  it('shows empty state for unknown ID', async () => {
    await renderPage('WF-UNKNOWN');
    expect(screen.getByText('quick_approve_detail.notFound')).toBeInTheDocument();
  });

  it('renders STA-79 claim approval details without removed claim actions', async () => {
    await renderPage('WF-2026-004');

    // STA-122 #2: Employee ID now renders inline under the name, not as a grid label.
    expect(screen.getByText(/quick_approve_detail\.employeeId:\s*EMP-009/)).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.businessUnit')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.company')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.branch')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.payGrade')).toBeInTheDocument();
    // STA-122 #3: Hire date + Terminate date are appended to the grid after PG.
    expect(screen.getByText('quick_approve_detail.hireDate')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.terminateDate')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.remainingAmount')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.receiptDate')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.receiptNo')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.receiptAmount')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.totalClaimAmount')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.remark')).toBeInTheDocument();
    // STA-185: WF-2026-004 history now has 4 demo steps; "HR send back" appears
    // twice (step 2 & 4) so queries MUST be step-scoped to avoid a multi-match throw.
    expect(screen.getByText(/step 1: employee request claim/)).toBeInTheDocument();
    expect(screen.getByText(/step 2: HR send back/)).toBeInTheDocument();
    expect(screen.getByText(/step 3: employee edited claim/)).toBeInTheDocument();
    expect(screen.getByText(/step 4: HR send back/)).toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.waiting')).not.toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.reject')).not.toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.reroute')).not.toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.override')).not.toBeInTheDocument();
    // STA-147 FU-2: the Merchant row is removed (Hospital Name supersedes it).
    expect(screen.queryByText('quick_approve_detail.merchant')).not.toBeInTheDocument();
  });

  it('renders STA-79 claim approval timeline latest-first', async () => {
    await renderPage('WF-2026-004');

    const latestStep = screen.getByText(/quick_approve_detail\.step 4: HR send back/);
    const previousStep = screen.getByText(/quick_approve_detail\.step 1: employee request claim/);

    expect(latestStep.compareDocumentPosition(previousStep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides claim employee facts and payload when BenefitEmployeeClaim access is denied', async () => {
    capabilityMock.canSeeBenefitEmployeeClaim = false;

    await renderPage('WF-2026-004');

    expect(screen.queryByText('quick_approve_detail.employeeId')).not.toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.remainingAmount')).not.toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.claimHidden')).toBeInTheDocument();
  });

  it('renders action buttons for an entitled approver persona', async () => {
    setRoles(['hr_admin']);
    await renderPage('WF-002');
    expect(screen.getByText('quick_approve_detail.approve')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.reject')).toBeInTheDocument();
    expect(screen.queryByTestId('action-panel-view-only')).not.toBeInTheDocument();
  });

  it('shows action buttons for a manager who is this row’s first-line approver', async () => {
    // WF-002 (overtime) first step approver = Manager, still pending → a plain
    // manager is the routed first-line approver and CAN act (canActOn = true).
    setRoles(['manager']);
    await renderPage('WF-002');
    expect(screen.getByText('quick_approve_detail.approve')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.reject')).toBeInTheDocument();
    expect(screen.queryByTestId('action-panel-view-only')).not.toBeInTheDocument();
  });

  it('renders VIEW-ONLY (no action controls) for a non-approver persona', async () => {
    // A plain employee is not an approver-capable role → canActOn = false. The row
    // stays fully visible (transparency) but the action controls are withheld.
    setRoles(['employee']);
    await renderPage('WF-002');
    expect(screen.getByText('quick_approve_detail.viewOnly')).toBeInTheDocument();
    expect(screen.getByTestId('action-panel-view-only')).toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.approve')).not.toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.reject')).not.toBeInTheDocument();
    // Request facts still render — view-only does not hide the row.
    expect(screen.getByText('มณี สุขใจ')).toBeInTheDocument();
  });

  it('renders VIEW-ONLY for a manager on a row already past the manager step', async () => {
    // WF-001 (leave): step 1 Manager APPROVED, step 2 HRBP pending → awaitingNext.
    // A plain manager is no longer the routed approver → view-only on detail too.
    setRoles(['manager']);
    await renderPage('WF-001');
    expect(screen.getByTestId('action-panel-view-only')).toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.approve')).not.toBeInTheDocument();
  });

  it('renders leave details for a leave request', async () => {
    await renderPage('WF-001');
    expect(screen.getByText('quick_approve_detail.requestDetails')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.leaveType')).toBeInTheDocument();
  });

  it('renders overtime details for an overtime request', async () => {
    await renderPage('WF-002');
    expect(screen.getByText('quick_approve_detail.hours')).toBeInTheDocument();
  });

  it('renders approval history timeline', async () => {
    await renderPage('WF-004');
    expect(screen.getByText('quick_approve_detail.approvalHistory')).toBeInTheDocument();
  });

  it('renders STA-41 masked field diff for change requests', async () => {
    await renderPage('WF-2026-016');
    expect(screen.getByText(/Manager view shows only what is needed/)).toBeInTheDocument();
    expect(screen.getAllByText(/ก่อน/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/masked/).length).toBeGreaterThan(0);
  });

  // ── STA-185: 3-col layout + shared comment + confirm popups ───────────────────

  it('renders the 3-col layout (Detail | Attachment | History) for WF-2026-004', async () => {
    const { container } = await renderPage('WF-2026-004');
    expect(screen.getByText('quick_approve_detail.requestDetails')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.attachmentsTitle')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.approvalHistory')).toBeInTheDocument();
    // The grid wrapper carries the 3-track template (Attachment column = 1.5fr).
    expect(container.querySelector('[class*="1.5fr"]')).toBeTruthy();
  });

  it('renders the History scroll region', async () => {
    await renderPage('WF-2026-004');
    expect(screen.getByTestId('history-scroll')).toBeInTheDocument();
  });

  it('renders the renamed single Approve/Send Back Comment field (no read-only box)', async () => {
    await renderPage('WF-2026-004');
    expect(screen.getByText('quick_approve_detail.approveSendBackCommentTitle')).toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.sendBackCommentTitle')).not.toBeInTheDocument();
  });

  it('Approve → confirm popup → dispatches registry approve + toast', async () => {
    const approveSpy = vi
      .spyOn(APPROVAL_REGISTRY.claim, 'approve')
      .mockImplementation(() => {});
    await renderPage('WF-2026-004');

    await act(async () => {
      screen.getByText('quick_approve_detail.approve').click();
    });
    expect(screen.getByRole('dialog', { name: 'quick_approve_detail.confirmApprove' })).toBeInTheDocument();

    await act(async () => {
      screen.getByText('quick_approve_detail.confirm').click();
    });
    expect(approveSpy).toHaveBeenCalledWith('WF-2026-004', expect.anything());
    expect(screen.getByText('quick_approve_detail.toastApproved')).toBeInTheDocument();
    approveSpy.mockRestore();
  });

  it('Send Back → typed comment flows through confirm popup as the reject reason + toast', async () => {
    const rejectSpy = vi
      .spyOn(APPROVAL_REGISTRY.claim, 'reject')
      .mockImplementation(() => {});
    await renderPage('WF-2026-004');

    const field = screen.getByPlaceholderText(
      'quick_approve_detail.approveSendBackCommentPlaceholder',
    );
    fireEvent.change(field, { target: { value: 'ยอดเงินไม่ตรงกับใบเสร็จ' } });

    await act(async () => {
      screen.getByText('quick_approve_detail.return').click();
    });
    expect(screen.getByRole('dialog', { name: 'quick_approve_detail.confirmReturn' })).toBeInTheDocument();

    await act(async () => {
      screen.getByText('quick_approve_detail.confirm').click();
    });
    expect(rejectSpy).toHaveBeenCalledWith(
      'WF-2026-004',
      expect.anything(),
      'ยอดเงินไม่ตรงกับใบเสร็จ',
    );
    expect(screen.getByText('quick_approve_detail.toastReturned')).toBeInTheDocument();
    rejectSpy.mockRestore();
  });

  it('Send Back confirm is disabled while the shared comment is empty', async () => {
    await renderPage('WF-2026-004');
    await act(async () => {
      screen.getByText('quick_approve_detail.return').click();
    });
    const confirmBtn = screen.getByText('quick_approve_detail.confirm') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });
});
