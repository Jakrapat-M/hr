'use client';

// ════════════════════════════════════════════════════════════
// useBulkApproveDispatch — shared bulk approve/reject engine.
//
// Extracted from /quick-approve/bulk so BOTH the standalone Bulk Approve Queue
// AND the inline multi-select in the unified inbox (QuickApproveSimple) dispatch
// through the SAME proven loop and stay in sync (selection state + the
// per-type APPROVAL_REGISTRY dispatch, awaiting each async adapter so a benefit
// claim reaches pending_spd before we resolve).
//
// The hook owns selection + action + reason + submitting state and the dispatch
// loop; each surface renders its own checkbox column / action bar / success UI.
// ════════════════════════════════════════════════════════════

import { useState } from 'react';
import { APPROVAL_REGISTRY } from '@/lib/approval-registry';
import type { PendingRequest } from '@/lib/quick-approve-api';

export type BulkAction = 'approve' | 'reject';
export interface BulkActor {
  name: string;
}
export interface BulkDispatchResult {
  action: BulkAction;
  count: number;
}

export function useBulkApproveDispatch(actor: BulkActor) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSelected = (id: string) => selectedIds.has(id);

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Select-all across a specific id set (the currently visible + actionable
  // rows), leaving any other selection untouched. If every id in the set is
  // already selected → deselect those ids.
  const toggleAll = (ids: string[]) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });

  const clear = () => setSelectedIds(new Set());

  const openAction = (action: BulkAction) => {
    setPendingAction(action);
    setReason('');
  };
  const closeAction = () => setPendingAction(null);

  // Confirm is allowed for approve, or reject once a reason is typed.
  const canConfirm = pendingAction === 'approve' || reason.trim().length > 0;

  // Dispatch every selected row to its correct source store by type so each ends
  // in a terminal / next-pending state. Await the async benefit adapter so claims
  // reach pending_spd before we resolve.
  const dispatch = async (rows: PendingRequest[]): Promise<BulkDispatchResult | null> => {
    if (!pendingAction) return null;
    setSubmitting(true);
    const action = pendingAction;
    const count = selectedIds.size;
    const byId = new Map(rows.map((r) => [r.id, r]));
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => {
          const row = byId.get(id);
          if (!row) return Promise.resolve();
          const adapter = APPROVAL_REGISTRY[row.type];
          const result =
            action === 'approve'
              ? adapter.approve(id, { name: actor.name })
              : adapter.reject(id, { name: actor.name }, reason);
          return Promise.resolve(result);
        }),
      );
      // Success — clear the selection and close the confirm modal.
      setSelectedIds(new Set());
      setPendingAction(null);
      setReason('');
      return { action, count };
    } finally {
      // Always release the "Processing…" state, even if an adapter rejected, so
      // the modal can never get stuck (the selection is preserved on failure so
      // the user can retry).
      setSubmitting(false);
    }
  };

  return {
    selectedIds,
    isSelected,
    toggle,
    toggleAll,
    clear,
    pendingAction,
    openAction,
    closeAction,
    reason,
    setReason,
    submitting,
    canConfirm,
    dispatch,
  };
}
