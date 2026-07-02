'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, RotateCcw, Route, ShieldAlert, Eye } from 'lucide-react';
import { Button, Modal, FormField, Capability } from '@/components/humi';
import { cn } from '@/lib/utils';
import { moduleOf, type RequestType } from '@/lib/quick-approve-api';

interface ActionPanelProps {
  requestId: string;
  requestType?: RequestType;
  /**
   * DEFAULT-SCOPE gate (P2): does the active persona's role entitle it to ACT on
   * this row, per canActOn() from lib/claim-permissions? When false, the panel
   * renders a transparent VIEW-ONLY state (the row stays visible — no hidden
   * data — but the approve/reject/return controls are withheld). Defaults to
   * `true` so legacy callers that don't thread the gate keep their controls.
   */
  actable?: boolean;
  /**
   * STA-185: the shared "Approve / Send Back Comment" value owned by the page.
   * For the approve & return actions the confirm popup shows this read-only and
   * dispatches it (single-source), and the required-gate is driven by it (NOT the
   * internal editable inputValue). reject/reroute/override keep their own editable
   * textarea + inputValue path.
   */
  comment?: string;
  onApprove?: (id: string, comment: string) => void;
  onReject?: (id: string, reason: string) => void;
  onReturn?: (id: string, reason: string) => void;
  onReroute?: (id: string, target: string) => void;
  onOverride?: (id: string, reason: string) => void;
}

type ActionType = 'approve' | 'reject' | 'return' | 'reroute' | 'override';

export function ActionPanel({
  requestId,
  requestType,
  actable = true,
  comment,
  onApprove,
  onReject,
  onReturn,
  onReroute,
  onOverride,
}: ActionPanelProps) {
  const t = useTranslations('quick_approve_detail');
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = (action: ActionType) => {
    setActiveAction(action);
    setInputValue('');
  };

  const handleClose = () => {
    setActiveAction(null);
    setInputValue('');
  };

  const handleConfirm = async () => {
    if (!activeAction) return;
    setSubmitting(true);
    try {
      switch (activeAction) {
        // STA-185: approve & return single-source the shared page comment.
        case 'approve':
          onApprove?.(requestId, sharedComment);
          break;
        case 'return':
          onReturn?.(requestId, sharedComment);
          break;
        case 'reject':
          onReject?.(requestId, inputValue);
          break;
        case 'reroute':
          onReroute?.(requestId, inputValue);
          break;
        case 'override':
          onOverride?.(requestId, inputValue);
          break;
      }
    } finally {
      setSubmitting(false);
      handleClose();
    }
  };

  const modalTitle: Record<ActionType, string> = {
    approve: t('confirmApprove'),
    reject: t('confirmReject'),
    return: t('confirmReturn'),
    reroute: t('confirmReroute'),
    override: t('confirmOverride'),
  };

  const inputLabel: Record<ActionType, string> = {
    approve: t('commentOptional'),
    reject: t('rejectReason'),
    return: t('returnReason'),
    reroute: t('rerouteTarget'),
    override: t('overrideReason'),
  };

  const inputRequired: Record<ActionType, boolean> = {
    approve: false,
    reject: true,
    return: true,
    reroute: true,
    override: true,
  };

  // STA-185: approve & return read the shared page comment (read-only in the
  // popup); reject/reroute/override keep their editable in-modal textarea.
  const usesSharedComment = activeAction === 'approve' || activeAction === 'return';
  const sharedComment = comment ?? '';
  const effectiveValue = usesSharedComment ? sharedComment : inputValue;
  const canSubmit = activeAction
    ? !inputRequired[activeAction] || effectiveValue.trim().length > 0
    : false;
  const isClaim = requestType === 'claim';
  // STA-178 — EC-module requests (change_request / probation / transfer): HR can
  // only Approve or Send back (Return). Reject / Reroute / Override are withheld.
  const isEc = requestType ? moduleOf(requestType) === 'EC' : false;

  // DEFAULT-SCOPE view-only state (P2): persona is NOT the routed approver for this
  // row. Mirror the list (quick-approve-simple) — the row stays fully visible, but
  // the approve/reject/return controls are withheld and replaced by an honest
  // "view only" panel so the detail page can't act where the list says it can't.
  if (!actable) {
    return (
      <div
        className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-hairline bg-canvas-soft p-4"
        data-testid="action-panel-view-only"
      >
        <span className="inline-flex items-center gap-2 text-small font-semibold text-ink">
          <Eye className="h-4 w-4 text-ink-muted" aria-hidden />
          {t('viewOnly')}
        </span>
        <span className="text-small text-ink-muted">{t('viewOnlyHint')}</span>
      </div>
    );
  }

  return (
    <>
      {/* Action buttons */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-hairline bg-surface p-4 shadow-[var(--shadow-sm)]">
        <Capability action="approve">
          <Button
            variant="primary"
            size="md"
            onClick={() => handleOpen('approve')}
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {t('approve')}
          </Button>
          {!isClaim && !isEc && (
            <Button
              variant="danger"
              size="md"
              onClick={() => handleOpen('reject')}
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" aria-hidden />
              {t('reject')}
            </Button>
          )}
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleOpen('return')}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t('return')}
          </Button>
        </Capability>

        {!isClaim && !isEc && (
          <>
            <Capability action="reroute">
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleOpen('reroute')}
                className="flex items-center gap-2"
              >
                <Route className="h-4 w-4" aria-hidden />
                {t('reroute')}
              </Button>
            </Capability>

            <Capability action="override">
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleOpen('override')}
                className={cn('flex items-center gap-2 border-warning text-warning hover:bg-warning-soft')}
              >
                <ShieldAlert className="h-4 w-4" aria-hidden />
                {t('override')}
              </Button>
            </Capability>
          </>
        )}
      </div>

      {/* Confirmation modal */}
      {activeAction && (
        <Modal
          open
          onClose={handleClose}
          title={modalTitle[activeAction]}
        >
          <div className="flex flex-col gap-4 p-4">
            {usesSharedComment ? (
              // STA-185: approve/return show the shared page comment READ-ONLY —
              // it is single-sourced and dispatched as-is (no in-popup editing).
              <div className="flex flex-col gap-2">
                <p className="text-small text-ink-muted">
                  {activeAction === 'approve' ? t('confirmApproveBody') : t('confirmReturnBody')}
                </p>
                <p className="text-base font-semibold text-ink">{t('approveSendBackCommentTitle')}</p>
                <div className="min-h-[3rem] w-full whitespace-pre-wrap break-words rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2 text-body text-ink-secondary">
                  {sharedComment.trim() !== '' ? sharedComment : '-'}
                </div>
              </div>
            ) : (
              <FormField
                label={inputLabel[activeAction]}
                required={inputRequired[activeAction]}
              >
                {(controlProps) => (
                  <textarea
                    {...controlProps}
                    rows={3}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={inputRequired[activeAction] ? t('required') : t('optional')}
                    className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
                  />
                )}
              </FormField>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="md" onClick={handleClose} disabled={submitting}>
                {t('cancel')}
              </Button>
              <Button
                variant={activeAction === 'approve' ? 'primary' : 'danger'}
                size="md"
                onClick={handleConfirm}
                disabled={!canSubmit || submitting}
              >
                {submitting ? t('submitting') : t('confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
