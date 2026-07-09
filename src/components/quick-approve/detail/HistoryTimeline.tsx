'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalStep } from '@/lib/quick-approve-api';

interface HistoryTimelineProps {
  steps: ApprovalStep[];
}

const STATUS_ICON: Record<ApprovalStep['status'], React.ReactNode> = {
  approved: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />,
  pending: <Clock className="h-4 w-4 text-warning" aria-hidden />,
  rejected: <XCircle className="h-4 w-4 text-danger" aria-hidden />,
};

const STATUS_LINE: Record<ApprovalStep['status'], string> = {
  approved: 'bg-success',
  pending: 'bg-warning/40',
  rejected: 'bg-danger',
};

/**
 * STA-147 req-3: render the approval-step date in Thai BE, appending the HH:mm
 * time only when the stored value carries a time component (an ISO string with a
 * `T`, e.g. `2026-04-26T15:00`). Date-only seeds (`2026-04-26`) keep rendering the
 * date alone, so existing rows are unaffected.
 */
export function formatStepDate(value: string): string {
  const hasTime = value.includes('T');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function HistoryTimeline({ steps }: HistoryTimelineProps) {
  const t = useTranslations('quick_approve_detail');
  const latestFirst = [...steps].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    if (dateA !== dateB) return dateB - dateA;
    return b.step - a.step;
  });

  if (latestFirst.length === 0) return null;

  return (
    <div
      className="flex flex-col gap-0 rounded-[var(--radius-lg)] border border-hairline bg-surface p-5 lg:max-h-[640px] lg:overflow-y-auto"
      data-testid="history-scroll"
    >
      <h3 className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 bg-surface px-5 pt-5 pb-2 text-base font-semibold text-ink">
        {t('approvalHistory')}
      </h3>
      <ol className="space-y-0">
        {latestFirst.map((step, index) => (
          <li key={step.step} className="flex gap-3">
            {/* Connector column */}
            <div className="flex flex-col items-center">
              {STATUS_ICON[step.status]}
              {index < latestFirst.length - 1 && (
                <div className={cn('mt-1 h-full w-0.5 min-h-[24px]', STATUS_LINE[step.status])} />
              )}
            </div>
            {/* Content */}
            <div className="pb-5 min-w-0">
              <p className="font-medium text-ink leading-none mb-0.5">
                {t('step')} {step.step}: {step.approver}
              </p>
              <p className="text-xs text-ink-muted capitalize">{t(`status_${step.status}`)}</p>
              {step.date && (
                <p className="text-xs text-ink-muted mt-0.5">
                  {formatStepDate(step.date)}
                </p>
              )}
              {step.comment && (
                <p className="mt-1 text-small text-ink-secondary rounded-[var(--radius-sm)] bg-accent-soft px-2 py-1 break-words whitespace-pre-wrap">
                  {step.comment}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
