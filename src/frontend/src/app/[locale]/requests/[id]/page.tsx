'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, FileSearch } from 'lucide-react';
import {
  Card,
  CardEyebrow,
  CardTitle,
  Button,
  EmptyState,
} from '@/components/humi';
import { Badge } from '@/components/ui/badge';
import { getBenefitRequestTimeline, type BenefitRequestTimeline, type TimelineEvent } from '@/lib/workflow-api';
import { lookupName } from '@/lib/demo-org-chart';
import Link from 'next/link';

// ────────────────────────────────────────────────────────────
// Activity name map + helper
// ────────────────────────────────────────────────────────────

const TIMELINE_KEY_MAP: Record<string, string> = {
  start_event_submit: 'requestDetail.activityName.startEvent.submit',
  service_validate_amount: 'requestDetail.activityName.serviceTask.validateAmount',
  user_task_manager_review: 'requestDetail.activityName.userTask.managerReview',
  service_hr_audit: 'requestDetail.activityName.serviceTask.hrAudit',
  service_finance_payout: 'requestDetail.activityName.serviceTask.financePayout',
  service_notify_approved: 'requestDetail.activityName.serviceTask.notify',
  service_notify_rejected: 'requestDetail.activityName.serviceTask.notify',
  end_event_done: 'requestDetail.activityName.endEvent.done',
  end_event_rejected: 'requestDetail.activityName.endEvent.rejected',
};

function formatActivityName(act: TimelineEvent, t: (k: string) => string): string {
  const key = TIMELINE_KEY_MAP[act.activityId];
  if (key) return t(key);
  return act.activityName || act.activityId;
}

// ────────────────────────────────────────────────────────────
// Status badge (reuses the same variant map as requests/page)
// ────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<BenefitRequestTimeline['status'], 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'info',
  paid: 'success',
  rejected: 'error',
};

// ────────────────────────────────────────────────────────────
// Thai-locale timestamp formatter
// ────────────────────────────────────────────────────────────

function formatTs(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function formatThb(amount: unknown): string {
  if (typeof amount !== 'number') return String(amount ?? '—');
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
}

// ────────────────────────────────────────────────────────────
// Page component
// ────────────────────────────────────────────────────────────

export default function RequestDetailPage() {
  const params = useParams<{ id: string; locale: string }>();
  const id = params.id;
  const locale = useLocale();
  const t = useTranslations();

  const [data, setData] = useState<BenefitRequestTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getBenefitRequestTimeline(id);
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <EmptyState
        icon={FileSearch}
        titleTh="กำลังโหลด..."
        titleEn="Loading..."
        descTh=""
        descEn=""
      />
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={FileSearch}
        titleTh="ไม่พบคำขอที่ระบุ"
        titleEn="Request not found"
        descTh={error ?? ''}
        descEn={error ?? ''}
        ctaLabelTh="ย้อนกลับ"
        ctaLabelEn="Back"
        ctaHref={`/${locale}/requests`}
      />
    );
  }

  const requesterId = String(data.variables.requesterId ?? '');
  const requesterName = requesterId ? lookupName(requesterId, locale as 'th' | 'en') : requesterId;
  const amount = data.variables.amount;
  const reviewerComment = typeof data.variables.reviewerComment === 'string'
    ? data.variables.reviewerComment
    : null;

  return (
    <>
      {/* Page header */}
      <header className="mb-6 flex items-center gap-3">
        <Link href={`/${locale}/requests`}>
          <Button variant="ghost" size="sm">{t('common.back')}</Button>
        </Link>
        <div>
          <CardEyebrow>{t('requestDetail.title')}</CardEyebrow>
          <h1 className="font-display font-semibold tracking-tight text-ink text-[length:var(--text-display-h2)] leading-[var(--text-display-h2--line-height)]">
            {id}
          </h1>
        </div>
      </header>

      {/* Summary card */}
      <Card variant="raised" size="lg" className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>{requesterName || requesterId}</CardTitle>
            {amount !== undefined && (
              <p className="text-body text-ink-muted">{formatThb(amount)}</p>
            )}
            <p className="text-small text-ink-muted">
              {t('requestDetail.title')} · {formatTs(data.submittedAt, locale)}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[data.status] ?? 'warning'}>
            {t(`benefitWorkflow.status.${data.status}`) ?? t('requestDetail.statusUnknown')}
          </Badge>
        </div>
      </Card>

      {/* Reviewer comment */}
      {reviewerComment && (
        <Card variant="raised" size="md" className="mb-6">
          <CardEyebrow>{t('requestDetail.reviewerComment')}</CardEyebrow>
          <blockquote className="mt-2 border-l-4 border-accent pl-4 text-body text-ink-soft italic">
            {reviewerComment}
          </blockquote>
        </Card>
      )}

      {/* Timeline */}
      <Card variant="raised" size="lg" className="mb-6">
        <CardTitle className="mb-4">{t('requestDetail.timeline')}</CardTitle>
        {data.timeline.length === 0 ? (
          <p className="text-small text-ink-muted">{t('common.noData')}</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {data.timeline.map((act, i) => (
              <li key={`${act.activityId}-${i}`} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-[color:var(--color-sage-ink)]">
                  <CheckCircle2 size={18} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-ink">
                    {formatActivityName(act, (k) => t(k as Parameters<typeof t>[0]))}
                  </p>
                  <p className="text-small text-ink-muted">
                    {formatTs(act.startTime, locale)}
                    {act.endTime && ` – ${formatTs(act.endTime, locale)}`}
                    {act.durationMs !== null && ` · ${formatDuration(act.durationMs)}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Variables (collapsible) */}
      <Card variant="raised" size="md" className="mb-6">
        <details>
          <summary className="cursor-pointer text-small font-semibold text-ink-muted select-none">
            {t('requestDetail.variables')}
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-[var(--radius-sm)] bg-canvas-soft p-3 text-[length:var(--text-eyebrow)] text-ink-soft">
            {JSON.stringify(data.variables, null, 2)}
          </pre>
        </details>
      </Card>
    </>
  );
}
