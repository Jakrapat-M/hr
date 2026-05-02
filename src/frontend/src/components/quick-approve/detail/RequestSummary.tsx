'use client';

import { useTranslations } from 'next-intl';
import { Calendar, Clock, User } from 'lucide-react';
import { Avatar } from '@/components/humi';
import { UrgencyBadge } from '@/components/quick-approve/UrgencyBadge';
import type { PendingRequest } from '@/lib/quick-approve-api';

interface RequestSummaryProps {
  request: PendingRequest;
}

export function RequestSummary({ request }: RequestSummaryProps) {
  const t = useTranslations('quick_approve_detail');

  const submittedDate = new Date(request.submittedAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-hairline bg-surface p-5">
      {/* Requester */}
      <div className="flex items-center gap-3">
        <Avatar
          src={request.requester.avatar}
          name={request.requester.name}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{request.requester.name}</p>
          <p className="text-small text-ink-muted">{request.requester.position}</p>
          <p className="text-small text-ink-muted">{request.requester.department}</p>
        </div>
        <UrgencyBadge urgency={request.urgency} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4 border-t border-hairline pt-4 text-small text-ink-muted">
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-medium text-ink">{t('requestId')}:</span>
          <span className="font-mono">{request.id}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-medium text-ink">{t('submitted')}:</span>
          <span>{submittedDate}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-medium text-ink">{t('waiting')}:</span>
          <span>
            {request.waitingDays} {t('days')}
          </span>
        </span>
      </div>

      {/* Description */}
      <p className="text-small text-ink-secondary">{request.description}</p>
    </div>
  );
}
