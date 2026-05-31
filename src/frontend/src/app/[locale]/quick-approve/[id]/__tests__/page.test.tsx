import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

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
}));

vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    canSee: (_entity: string) => true,
    canDo: (_action: string) => true,
  }),
}));

vi.mock('@/components/humi', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
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
    expect(screen.getByTestId('approval-chain')).toBeInTheDocument();
  });

  it('shows empty state for unknown ID', async () => {
    await renderPage('WF-UNKNOWN');
    expect(screen.getByText('quick_approve_detail.notFound')).toBeInTheDocument();
  });

  it('renders STA-79 claim approval details without removed claim actions', async () => {
    await renderPage('WF-2026-004');

    expect(screen.getByText('quick_approve_detail.employeeId')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.businessUnit')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.company')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.branch')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.payGrade')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.remainingAmount')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.receiptDate')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.receiptNo')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.receiptAmount')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.totalClaimAmount')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.remark')).toBeInTheDocument();
    expect(screen.getByText(/SPD.*Ben/)).toBeInTheDocument();
    expect(screen.getByText(/HRBP.*Peter/)).toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.waiting')).not.toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.reject')).not.toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.reroute')).not.toBeInTheDocument();
    expect(screen.queryByText('quick_approve_detail.override')).not.toBeInTheDocument();
  });

  it('renders STA-79 claim approval timeline latest-first', async () => {
    await renderPage('WF-2026-004');

    const latestStep = screen.getByText(/quick_approve_detail\.step 2: SPD.*Ben/);
    const previousStep = screen.getByText(/quick_approve_detail\.step 1: HRBP.*Peter/);

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
});
