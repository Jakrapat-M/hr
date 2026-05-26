'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronLeft, CheckCircle2, XCircle, ShieldOff, Square, CheckSquare } from 'lucide-react';
import { Button, DataTable, Modal, FormField, Capability } from '@/components/humi';
import { UrgencyBadge } from '@/components/quick-approve/UrgencyBadge';
import type { DataTableColumn } from '@/components/humi';
import { APPROVAL_REGISTRY, useSelectPendingApprovals } from '@/lib/approval-registry';
import type { PendingRequest } from '@/lib/quick-approve-api';

// Demo manager actor for mock dispatch (mirrors quick-approve-simple).
const MANAGER_NAME = 'ผู้จัดการ / Manager';

// ── Not-authorized fallback ───────────────────────────────────────────────────

function NotAuthorized() {
  const t = useTranslations('quick_approve_bulk');
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <ShieldOff className="h-12 w-12 text-ink-muted" aria-hidden />
      <p className="text-large font-semibold text-ink">{t('notAuthorized')}</p>
      <p className="max-w-xs text-center text-small text-ink-muted">{t('notAuthorizedDesc')}</p>
      <Button variant="secondary" size="md" onClick={() => router.back()}>
        <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
        {t('back')}
      </Button>
    </div>
  );
}

// ── Bulk page inner (only rendered when capability passes) ────────────────────

function BulkApproveInner() {
  const t = useTranslations('quick_approve_bulk');
  const router = useRouter();

  // PR-1c: the bulk queue derives from the SAME seeded stores as the unified inbox
  // (only still-pending rows are actionable in bulk), so dispatching mutates the
  // real source store — no parallel mock array.
  const queue = useSelectPendingApprovals();
  const rows = useMemo<PendingRequest[]>(
    () => queue.filter((q) => q.status === 'pending').map((q) => q.row),
    [queue],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ action: 'approve' | 'reject'; count: number } | null>(null);

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  const columns: DataTableColumn<PendingRequest>[] = [
    {
      id: 'select',
      header: (
        <button
          type="button"
          onClick={toggleAll}
          aria-label="Select all"
          className="flex items-center"
        >
          {rows.length > 0 && selectedIds.size === rows.length ? (
            <CheckSquare className="h-4 w-4 text-accent" />
          ) : (
            <Square className="h-4 w-4 text-ink-muted" />
          )}
        </button>
      ),
      cell: (row) => (
        <button
          type="button"
          onClick={() => toggleRow(row.id)}
          aria-label={`Select ${row.id}`}
          className="flex items-center"
        >
          {selectedIds.has(row.id) ? (
            <CheckSquare className="h-4 w-4 text-accent" />
          ) : (
            <Square className="h-4 w-4 text-ink-muted" />
          )}
        </button>
      ),
      className: 'w-10',
    },
    {
      id: 'id',
      header: t('colId'),
      cell: (row) => <span className="font-mono text-small text-ink">{row.id}</span>,
    },
    {
      id: 'requester',
      header: t('colRequester'),
      cell: (row) => (
        <div>
          <p className="text-small font-medium text-ink">{row.requester.name}</p>
          <p className="text-xs text-ink-muted">{row.requester.department}</p>
        </div>
      ),
    },
    {
      id: 'type',
      header: t('colType'),
      cell: (row) => (
        <span className="text-small capitalize text-ink">{t(`type_${row.type}`)}</span>
      ),
    },
    {
      id: 'urgency',
      header: t('colUrgency'),
      cell: (row) => <UrgencyBadge urgency={row.urgency} />,
    },
    {
      id: 'waitingDays',
      header: t('colWaiting'),
      cell: (row) => (
        <span className="text-small text-ink">
          {row.waitingDays} {t('days')}
        </span>
      ),
    },
    {
      id: 'description',
      header: t('colDescription'),
      cell: (row) => (
        <span className="line-clamp-1 text-small text-ink-secondary">{row.description}</span>
      ),
    },
  ];

  const handleBulkAction = (action: 'approve' | 'reject') => {
    setBulkAction(action);
    setReason('');
  };

  const handleConfirm = async () => {
    if (!bulkAction) return;
    setSubmitting(true);
    const count = selectedIds.size;
    // AC-1c.3: dispatch every selected row to its correct source store by type so
    // each ends in a terminal/next-pending state — no invisible/indeterminate row.
    // Await the async benefit adapter so claims reach pending_spd before we close.
    const byId = new Map(rows.map((r) => [r.id, r]));
    await Promise.all(
      Array.from(selectedIds).map((id) => {
        const row = byId.get(id);
        if (!row) return Promise.resolve();
        const adapter = APPROVAL_REGISTRY[row.type];
        const result =
          bulkAction === 'approve'
            ? adapter.approve(id, { name: MANAGER_NAME })
            : adapter.reject(id, { name: MANAGER_NAME }, reason);
        return Promise.resolve(result);
      }),
    );
    setDone({ action: bulkAction, count });
    setSelectedIds(new Set());
    setBulkAction(null);
    setReason('');
    setSubmitting(false);
  };

  const canConfirm = bulkAction === 'approve' || reason.trim().length > 0;

  if (done) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <CheckCircle2 className="h-12 w-12 text-success" aria-hidden />
        <p className="text-large font-semibold text-ink">
          {done.action === 'approve'
            ? t('approveSuccess', { count: done.count })
            : t('rejectSuccess', { count: done.count })}
        </p>
        <Button variant="secondary" size="md" onClick={() => setDone(null)}>
          {t('backToQueue')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Back nav */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-ink-muted"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t('back')}
      </Button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">{t('title')}</h1>
        <p className="text-small text-ink-muted">{t('subtitle')}</p>
      </div>

      {/* Selection info bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-accent-soft px-4 py-2 text-small text-accent">
          <span>{t('selected', { count: selectedIds.size })}</span>
        </div>
      )}

      {/* Table */}
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        caption={t('title')}
        captionVisuallyHidden
        emptyState={
          <p className="py-8 text-center text-small text-ink-muted">{t('empty')}</p>
        }
      />

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-hairline bg-surface px-5 py-3 shadow-[var(--shadow-md)]">
        <span className="text-small text-ink-muted">
          {t('selectedCount', { count: selectedIds.size, total: rows.length })}
        </span>
        <div className="flex gap-3">
          <Button
            variant="danger"
            size="md"
            disabled={selectedIds.size === 0}
            onClick={() => handleBulkAction('reject')}
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" aria-hidden />
            {t('rejectSelected')}
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={selectedIds.size === 0}
            onClick={() => handleBulkAction('approve')}
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {t('approveSelected')}
          </Button>
        </div>
      </div>

      {/* Confirmation modal */}
      {bulkAction && (
        <Modal
          open
          onClose={() => setBulkAction(null)}
          title={
            bulkAction === 'approve'
              ? t('confirmApproveTitle', { count: selectedIds.size })
              : t('confirmRejectTitle', { count: selectedIds.size })
          }
        >
          <div className="flex flex-col gap-4 p-4">
            {bulkAction === 'reject' && (
              <FormField label={t('rejectReason')} required>
                {(controlProps) => (
                  <textarea
                    {...controlProps}
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t('rejectReasonPlaceholder')}
                    className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
                  />
                )}
              </FormField>
            )}
            {bulkAction === 'approve' && (
              <p className="text-small text-ink-secondary">
                {t('approveConfirmDesc', { count: selectedIds.size })}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setBulkAction(null)}
                disabled={submitting}
              >
                {t('cancel')}
              </Button>
              <Button
                variant={bulkAction === 'approve' ? 'primary' : 'danger'}
                size="md"
                onClick={handleConfirm}
                disabled={!canConfirm || submitting}
              >
                {submitting ? t('submitting') : t('confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Route default export (gated) ──────────────────────────────────────────────

export default function BulkApprovePage() {
  return (
    <Capability action="bulkApprove" fallback={<NotAuthorized />}>
      <BulkApproveInner />
    </Capability>
  );
}
