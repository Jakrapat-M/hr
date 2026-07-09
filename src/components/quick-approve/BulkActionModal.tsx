'use client';

// ════════════════════════════════════════════════════════════
// BulkActionModal — shared approve/reject confirmation modal.
//
// Extracted from /quick-approve/bulk (reject-reason modal) so BOTH the bulk
// page and the inline inbox multi-select show an identical confirm/reject-reason
// dialog. Namespace-agnostic: the caller passes already-localised `labels`.
// Danger = pumpkin (Button variant="danger"); no red, no hex.
// ════════════════════════════════════════════════════════════

import { Modal, FormField, Button } from '@/components/humi';
import type { BulkAction } from './useBulkApproveDispatch';

export interface BulkActionModalLabels {
  approveTitle: string;
  rejectTitle: string;
  approveDesc: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  cancel: string;
  confirm: string;
  submitting: string;
}

interface BulkActionModalProps {
  action: BulkAction;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  submitting: boolean;
  canConfirm: boolean;
  labels: BulkActionModalLabels;
}

export function BulkActionModal({
  action,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  submitting,
  canConfirm,
  labels,
}: BulkActionModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title={action === 'approve' ? labels.approveTitle : labels.rejectTitle}
    >
      <div className="flex flex-col gap-4 p-4">
        {action === 'reject' && (
          <FormField label={labels.reasonLabel} required>
            {(controlProps) => (
              <textarea
                {...controlProps}
                rows={3}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder={labels.reasonPlaceholder}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
              />
            )}
          </FormField>
        )}
        {action === 'approve' && (
          <p className="text-small text-ink-secondary">{labels.approveDesc}</p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>
            {labels.cancel}
          </Button>
          <Button
            variant={action === 'approve' ? 'primary' : 'danger'}
            size="md"
            onClick={onConfirm}
            disabled={!canConfirm || submitting}
          >
            {submitting ? labels.submitting : labels.confirm}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
