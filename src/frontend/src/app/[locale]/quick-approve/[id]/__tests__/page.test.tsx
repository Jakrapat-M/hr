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
}));

vi.mock('@/components/quick-approve/UrgencyBadge', () => ({
  UrgencyBadge: ({ urgency }: { urgency: string }) => <span data-testid="urgency">{urgency}</span>,
}));

// ── Seed stores (PR-1b/1c: detail page resolves ids from seeded stores first) ─

import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { useTransferApprovals } from '@/stores/transfer-approvals';
import { ensureDemoSeed, resetEnsureDemoSeedForTests } from '@/lib/demo-seed';

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

  it('renders action buttons (approve gate allowed in mock)', async () => {
    await renderPage('WF-002');
    expect(screen.getByText('quick_approve_detail.approve')).toBeInTheDocument();
    expect(screen.getByText('quick_approve_detail.reject')).toBeInTheDocument();
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
