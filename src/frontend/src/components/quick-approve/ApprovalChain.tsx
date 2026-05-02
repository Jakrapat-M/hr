'use client';

// ApprovalChain — extracted from SimpleClaimForm / HospitalClaimForm / LifecycleAdminForm
// (code-reviewer flagged the duplication; Sprint 1 refactor per MOCKUP-MATRIX.md)
//
// Displays approval stages as a horizontal pill chain separated by →.
// Used both in benefit templates (plan.approvalChain: ApproverStage[]) and in
// the quick-approve workspace (PendingRequest.approvalTimeline: ApprovalStep[]).

import { cn } from '@/lib/utils';
import type { ApproverStage } from '@/data/benefits/plan-registry';
import type { ApprovalStep } from '@/lib/quick-approve-api';

// ── Stage labels ─────────────────────────────────────────────────────────────

export const STAGE_LABEL_TH: Record<ApproverStage, string> = {
  manager: 'หัวหน้าทีม',
  hrbp: 'HRBP',
  spd: 'SPD',
  hr_admin: 'HR Admin',
};

export const STAGE_LABEL_EN: Record<ApproverStage, string> = {
  manager: 'Manager',
  hrbp: 'HRBP',
  spd: 'SPD',
  hr_admin: 'HR Admin',
};

// ── Variant 1: plan-level chain (ApproverStage[]) ────────────────────────────

interface ApprovalChainProps {
  chain: ApproverStage[];
  locale: string;
  /** Highlight the stage that is currently awaiting action. */
  activeStage?: ApproverStage;
  /** Compact size for inline use (inbox rows). Default: normal. */
  size?: 'sm' | 'md';
}

export function ApprovalChain({ chain, locale, activeStage, size = 'md' }: ApprovalChainProps) {
  if (chain.length === 0) {
    return (
      <p className="text-small text-ink-muted">
        {locale === 'en' ? 'Recorded by HR' : 'บันทึกโดย HR'}
      </p>
    );
  }

  const labels = locale === 'en' ? STAGE_LABEL_EN : STAGE_LABEL_TH;
  const pillBase =
    size === 'sm'
      ? 'inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium'
      : 'inline-flex items-center rounded-[var(--radius-md)] px-3 py-1 text-small font-medium';

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label={locale === 'en' ? 'Approval chain' : 'ขั้นตอนอนุมัติ'}
    >
      {chain.map((stage, index) => (
        <div key={stage} className="flex items-center gap-2">
          <span
            className={cn(
              pillBase,
              stage === activeStage
                ? 'bg-brand text-white'
                : 'bg-accent-soft text-accent',
            )}
          >
            {labels[stage]}
          </span>
          {index < chain.length - 1 && (
            <span aria-hidden className="text-ink-muted">
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Variant 2: timeline-level chain (ApprovalStep[]) ─────────────────────────
// Used in the quick-approve workspace inline row visualizer.

interface ApprovalTimelineChainProps {
  steps: ApprovalStep[];
  /** If provided, highlights the matching step index (0-based). */
  activeStep?: number;
  size?: 'sm' | 'md';
}

const STEP_STATUS_STYLES: Record<ApprovalStep['status'], string> = {
  approved: 'bg-success-tint text-success',
  pending: 'bg-warning-tint text-warning',
  rejected: 'bg-danger-tint text-danger',
};

export function ApprovalTimelineChain({ steps, activeStep, size = 'sm' }: ApprovalTimelineChainProps) {
  if (steps.length === 0) return null;

  const pillBase =
    size === 'sm'
      ? 'inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium'
      : 'inline-flex items-center rounded-[var(--radius-md)] px-3 py-1 text-small font-medium';

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Approval chain"
    >
      {steps.map((step, index) => (
        <div key={step.step} className="flex items-center gap-1.5">
          <span
            className={cn(
              pillBase,
              index === activeStep
                ? 'ring-2 ring-brand ring-offset-1'
                : '',
              STEP_STATUS_STYLES[step.status],
            )}
          >
            {step.approver}
          </span>
          {index < steps.length - 1 && (
            <span aria-hidden className="text-ink-muted text-xs">
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
