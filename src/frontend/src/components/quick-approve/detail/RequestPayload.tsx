'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { Capability } from '@/components/humi';
import type {
  PendingRequest,
  LeaveDetails,
  OvertimeDetails,
  ClaimDetails,
  TransferDetails,
} from '@/lib/quick-approve-api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-hairline last:border-0">
      <dt className="w-40 shrink-0 text-small font-medium text-ink-muted">{label}</dt>
      <dd className="flex-1 text-small text-ink">{value}</dd>
    </div>
  );
}

function HiddenFieldPlaceholder() {
  const t = useTranslations('quick_approve_detail');
  return (
    <div className="flex items-center justify-center rounded-[var(--radius-md)] border border-dashed border-hairline bg-accent-soft/40 py-8 text-small text-ink-muted">
      {t('claimHidden')}
    </div>
  );
}

// ── Sub-renderers ─────────────────────────────────────────────────────────────

function LeavePayload({ details, t }: { details: LeaveDetails; t: ReturnType<typeof useTranslations> }) {
  return (
    <dl>
      <Row label={t('leaveType')} value={details.leaveType} />
      <Row label={t('startDate')} value={details.startDate} />
      <Row label={t('endDate')} value={details.endDate} />
      <Row label={t('totalDays')} value={`${details.totalDays} ${t('days')}`} />
      <Row label={t('balance')} value={`${details.balance} ${t('days')}`} />
      <Row label={t('reason')} value={details.reason} />
    </dl>
  );
}

function OvertimePayload({ details, t }: { details: OvertimeDetails; t: ReturnType<typeof useTranslations> }) {
  return (
    <dl>
      <Row label={t('date')} value={details.date} />
      <Row label={t('hours')} value={`${details.hours} ${t('hoursUnit')}`} />
      <Row label={t('rate')} value={`${details.rate}x`} />
      <Row label={t('reason')} value={details.reason} />
    </dl>
  );
}

function ClaimPayload({ details, t }: { details: ClaimDetails; t: ReturnType<typeof useTranslations> }) {
  return (
    <dl>
      <Row
        label={t('amount')}
        value={`${details.amount.toLocaleString()} ${details.currency}`}
      />
      <Row label={t('category')} value={details.category} />
      <Row label={t('merchant')} value={details.merchant} />
      {details.receiptUrl && (
        <Row
          label={t('receipt')}
          value={
            <a
              href={details.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline"
            >
              {t('viewReceipt')} <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          }
        />
      )}
      <Row
        label={t('policyChecks')}
        value={
          <ul className="space-y-1">
            {details.policyChecks.map((check) => (
              <li key={check.rule} className="flex items-center gap-2">
                <span
                  className={
                    check.passed
                      ? 'h-2 w-2 rounded-full bg-success'
                      : 'h-2 w-2 rounded-full bg-danger'
                  }
                  aria-hidden
                />
                <span className={check.passed ? 'text-success' : 'text-danger'}>{check.rule}</span>
              </li>
            ))}
          </ul>
        }
      />
    </dl>
  );
}

function TransferPayload({ details, t }: { details: TransferDetails; t: ReturnType<typeof useTranslations> }) {
  return (
    <dl>
      <Row label={t('fromDepartment')} value={details.fromDepartment} />
      <Row label={t('toDepartment')} value={details.toDepartment} />
      <Row label={t('fromPosition')} value={details.fromPosition} />
      <Row label={t('toPosition')} value={details.toPosition} />
      <Row label={t('effectiveDate')} value={details.effectiveDate} />
      <Row label={t('reason')} value={details.reason} />
    </dl>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface RequestPayloadProps {
  request: PendingRequest;
}

export function RequestPayload({ request }: RequestPayloadProps) {
  const t = useTranslations('quick_approve_detail');

  const inner = () => {
    switch (request.type) {
      case 'leave':
        return <LeavePayload details={request.details as LeaveDetails} t={t} />;
      case 'overtime':
        return <OvertimePayload details={request.details as OvertimeDetails} t={t} />;
      case 'claim':
        return <ClaimPayload details={request.details as ClaimDetails} t={t} />;
      case 'transfer':
        return <TransferPayload details={request.details as TransferDetails} t={t} />;
      default:
        return (
          <dl>
            {Object.entries(request.details as Record<string, unknown>).map(([k, v]) => (
              <Row key={k} label={k} value={String(v)} />
            ))}
          </dl>
        );
    }
  };

  const content = (
    <div className="rounded-[var(--radius-lg)] border border-hairline bg-surface p-5">
      <h3 className="mb-4 text-base font-semibold text-ink">{t('requestDetails')}</h3>
      {inner()}
    </div>
  );

  if (request.type === 'claim') {
    return (
      <Capability entity="BenefitEmployeeClaim" fallback={<HiddenFieldPlaceholder />}>
        {content}
      </Capability>
    );
  }

  return content;
}
