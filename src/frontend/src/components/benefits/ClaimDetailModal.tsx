'use client';

// STA-159 — read-only claim-detail modal for BOTH claim-history surfaces (admin
// employee page + ESS benefits-hub history).
//
// Option C: render the approver's ClaimDetails rows via the UNWRAPPED ClaimPayload
// body — no <Capability> wrapper. The capability gate is persona-resolved (not
// data-scoped), so a wrapped RequestPayload would blank an employee viewing their
// OWN claim (BenefitEmployeeClaim: 'hidden'). Mounting ClaimPayload directly keeps
// one row definition while rendering identically on every persona.
//
// View-only by construction: ActionPanel / RejectReturnDrawer / ApproverNotesPanel
// are deliberately NOT imported — no Approve/Reject/Send-back control can render.

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Modal } from '@/components/humi';
import { ClaimPayload } from '@/components/quick-approve/detail/RequestPayload';
import { RequestSummary } from '@/components/quick-approve/detail/RequestSummary';
import { AttachmentViewPanel } from '@/components/quick-approve/detail/AttachmentViewPanel';
import { HistoryTimeline } from '@/components/quick-approve/detail/HistoryTimeline';
import type { ClaimDetails } from '@/lib/quick-approve-api';
import { benefitClaimToPendingRequest } from '@/lib/benefit-claim-to-pending-request';
import type { BenefitClaimRequest } from '@/stores/benefit-claims';

interface ClaimDetailModalProps {
  claim: BenefitClaimRequest | null;
  open: boolean;
  onClose: () => void;
}

export function ClaimDetailModal({ claim, open, onClose }: ClaimDetailModalProps) {
  const t = useTranslations('benefits');
  const payloadT = useTranslations('quick_approve_detail');
  const locale = useLocale() === 'en' ? 'en' : 'th';

  const request = useMemo(
    () => (claim ? benefitClaimToPendingRequest(claim) : null),
    [claim],
  );

  const attachments = request?.attachments ?? [];
  const hasAttachments = attachments.length > 0;

  return (
    <Modal open={open} onClose={onClose} title={t('claimDetailTitle')} widthClass="max-w-4xl">
      {request && (
        <div className="flex flex-col gap-6">
          <RequestSummary request={request} />

          <div className={hasAttachments ? 'grid gap-6 lg:grid-cols-2' : 'grid gap-6'}>
            <div className="rounded-[var(--radius-lg)] border border-hairline bg-surface p-5">
              <ClaimPayload
                details={request.details as ClaimDetails}
                t={payloadT}
                locale={locale}
              />
            </div>
            {hasAttachments && <AttachmentViewPanel attachments={attachments} />}
          </div>

          <HistoryTimeline steps={request.approvalTimeline} />
        </div>
      )}
    </Modal>
  );
}
