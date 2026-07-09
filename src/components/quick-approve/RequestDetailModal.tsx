'use client';

// STA-172 — restore the request-detail POPUP on the /quick-approve approval inbox.
//
// A manager clicks a request ROW in the inbox → this modal opens in place with the
// full generic detail (the SAME prop-driven detail/* components the full page at
// app/[locale]/quick-approve/[id]/page.tsx renders) + Approve / Cancel; the table
// stays the LIST (no full-page takeover).
//
// Decision surface (Q1-a): Approve + Cancel only, plus an "Open full page" link so
// Reject/Return (which live on the dedicated detail page via ActionPanel /
// RejectReturnDrawer) are never stranded. We deliberately do NOT mount ActionPanel
// here — that avoids nesting a second cnext Modal (its confirm dialog) inside this
// one and the body-scroll-lock subtlety that comes with it.
//
// Mirrors the STA-159 ClaimDetailModal precedent (detail components in a cnext Modal).

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/cnext';
import { Modal } from '@/components/cnext';
import { RequestSummary } from '@/components/quick-approve/detail/RequestSummary';
import { RequestPayload } from '@/components/quick-approve/detail/RequestPayload';
import { AttachmentViewPanel } from '@/components/quick-approve/detail/AttachmentViewPanel';
import { HistoryTimeline } from '@/components/quick-approve/detail/HistoryTimeline';
import { APPROVAL_REGISTRY } from '@/lib/approval-registry';
import type { PendingRequest } from '@/lib/quick-approve-api';

interface RequestDetailModalProps {
  request: PendingRequest | null;
  open: boolean;
  onClose: () => void;
  /** Deep-link target for "Open full page" (mirrors the inbox detailHref). */
  fullPageHref?: string;
  /** Actor name used for the mock store dispatch. */
  actorName: string;
}

export function RequestDetailModal({
  request,
  open,
  onClose,
  fullPageHref,
  actorName,
}: RequestDetailModalProps) {
  const locale = useLocale() === 'en' ? 'en' : 'th';

  if (!request) return null;

  const en = locale === 'en';
  const hasAttachments =
    request.type === 'claim' && (request.attachments?.length ?? 0) > 0;

  // Single-step registry dispatch (same as the full page) → close → the
  // store-driven queue selector drops the row on its own.
  function handleApprove() {
    if (!request) return;
    void APPROVAL_REGISTRY[request.type].approve(request.id, { name: actorName });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={en ? 'Request detail' : 'รายละเอียดคำขอ'}
      widthClass="max-w-4xl"
    >
      <div className="flex flex-col gap-6">
        <RequestSummary request={request} />

        {hasAttachments ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <RequestPayload request={request} />
            <AttachmentViewPanel attachments={request.attachments ?? []} />
          </div>
        ) : (
          <RequestPayload request={request} />
        )}

        <HistoryTimeline steps={request.approvalTimeline} />

        {/* Footer — cnext Modal has no footer prop, so it lives in children. */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-hairline pt-4">
          {fullPageHref && (
            <Link
              href={fullPageHref}
              className="cnext-button cnext-button--ghost"
              style={{ fontSize: 13, padding: '6px 12px' }}
            >
              {en ? 'Open full page' : 'ดูเต็มหน้า'}
            </Link>
          )}
          <Button variant="ghost" size="md" onClick={onClose}>
            {en ? 'Cancel' : 'ยกเลิก'}
          </Button>
          <Button variant="primary" size="md" onClick={handleApprove}>
            {en ? 'Approve' : 'อนุมัติ'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
