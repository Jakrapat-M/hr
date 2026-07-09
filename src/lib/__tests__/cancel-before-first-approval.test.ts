/**
 * cancel-before-first-approval.test.ts — STA-175 acceptance tests.
 *
 * Employee self-cancel-before-first-approval, generalized beyond leave (STA-157)
 * to the self-service subset: leave (done) + overtime + claim + time_correction.
 *
 * Covers:
 *   AC-1  isCancellable predicate is honest per-type (single-stage OT, 2-stage
 *         claim incl. send_back, step-name time_correction, leave awaitingNext).
 *   AC-3  a cancelled row DROPS from the unified inbox for EVERY in-scope type —
 *         proving each per-type loop in selectPendingApprovals has the guard, not
 *         just leave's (a missed loop would re-collapse the row to 'pending').
 *   AC-4  a pending_spd claim (manager already approved) is NOT cancellable.
 *   AC-4b a cancelled claim maps to a terminal tracker status, never 'pending'.
 */

import { describe, it, expect } from 'vitest';
import { selectPendingApprovals, APPROVAL_REGISTRY } from '../approval-registry';
import type { PendingRequest } from '../quick-approve-api';
import type { OTRequest } from '@/stores/overtime-requests';
import type { TimeCorrectionRequest } from '@/stores/time-corrections';

// Minimal snapshot — the leave/claim loops re-emit `row` from `queueSnapshot`, so a
// thin cast is enough there.
function snap(type: PendingRequest['type'], id: string): PendingRequest {
  return {
    id,
    type,
    requester: { id: 'EMP-1', name: 'Employee One' },
    submittedAt: '2026-06-20T00:00:00.000Z',
  } as PendingRequest;
}

// The OT / time-correction loops read the record NATIVELY via toQueueItem (no
// queueSnapshot), so the synthetic record only needs id + status; cast to the
// store record type to satisfy the selector input + the tsc build gate.
const ot = (id: string, status: string): OTRequest => ({ id, status } as unknown as OTRequest);
const tc = (id: string, status: string): TimeCorrectionRequest =>
  ({ id, status } as unknown as TimeCorrectionRequest);

// ── AC-3 — a cancelled row drops from the inbox, per in-scope type ────────────
describe('selectPendingApprovals drops cancelled rows — STA-175 AC-3 (per loop)', () => {
  it('overtime: a cancelled OT row is removed; the pending one survives', () => {
    const out = selectPendingApprovals({
      leave: [],
      workflow: [],
      claims: [],
      transfers: [],
      overtime: [ot('OT-PENDING', 'pending'), ot('OT-CANCELLED', 'cancelled')],
    });
    const ids = out.map((q) => q.row.id);
    expect(ids).toContain('OT-PENDING');
    expect(ids).not.toContain('OT-CANCELLED');
  });

  it('time_correction: a cancelled correction row is removed', () => {
    const out = selectPendingApprovals({
      leave: [],
      workflow: [],
      claims: [],
      transfers: [],
      timeCorrections: [tc('TC-PENDING', 'pending_manager'), tc('TC-CANCELLED', 'cancelled')],
    });
    const ids = out.map((q) => q.row.id);
    expect(ids).toContain('TC-PENDING');
    expect(ids).not.toContain('TC-CANCELLED');
  });

  it('claim: a cancelled claim row is removed; pending_spd stays in-queue', () => {
    const out = selectPendingApprovals({
      leave: [],
      workflow: [],
      claims: [
        { id: 'CL-PENDING', status: 'pending_manager_approval', queueSnapshot: snap('claim', 'CL-PENDING') },
        { id: 'CL-SPD', status: 'pending_spd', queueSnapshot: snap('claim', 'CL-SPD') },
        { id: 'CL-CANCELLED', status: 'cancelled', queueSnapshot: snap('claim', 'CL-CANCELLED') },
      ],
      transfers: [],
    });
    const ids = out.map((q) => q.row.id);
    expect(ids).toContain('CL-PENDING');
    expect(ids).toContain('CL-SPD'); // manager already acted → still pending SPD, not dropped
    expect(ids).not.toContain('CL-CANCELLED');
  });
});

// ── AC-1 / AC-4 — per-type cycle-window predicate (STA-183 supersedes STA-157) ─
// demoToday() = 2026-06-07 → current cycle [2026-05-21 … 06-20], previous cycle
// starts 2026-04-21. Cancellable iff status ∉ {rejected,cancelled} AND the start
// date is in the current or previous cycle (no longer first-approval-only).
const IN_CYCLE = '2026-06-01'; // inside the current cycle
const OLD = '2026-03-01'; // before the previous cycle → not cancellable
describe('isCancellable — STA-183 cycle-window rule (per type)', () => {
  it('overtime: cancellable for any non-terminal row whose OT date is in-cycle', () => {
    const c = APPROVAL_REGISTRY.overtime.isCancellable!;
    expect(c({ status: 'pending', startAt: `${IN_CYCLE}T18:00:00` } as never)).toBe(true);
    expect(c({ status: 'approved', startAt: `${IN_CYCLE}T18:00:00` } as never)).toBe(true);
    expect(c({ status: 'pending', startAt: `${OLD}T18:00:00` } as never)).toBe(false); // out of cycle
    expect(c({ status: 'rejected', startAt: `${IN_CYCLE}T18:00:00` } as never)).toBe(false);
    expect(c({ status: 'cancelled', startAt: `${IN_CYCLE}T18:00:00` } as never)).toBe(false);
  });

  it('time_correction: cancellable for any non-terminal row whose day is in-cycle', () => {
    const c = APPROVAL_REGISTRY.time_correction.isCancellable!;
    expect(c({ status: 'pending_manager', date: IN_CYCLE } as never)).toBe(true);
    expect(c({ status: 'approved', date: IN_CYCLE } as never)).toBe(true);
    expect(c({ status: 'pending_manager', date: OLD } as never)).toBe(false);
    expect(c({ status: 'cancelled', date: IN_CYCLE } as never)).toBe(false);
  });

  it('claim: cancellable at pending_manager_approval OR send_back; NOT pending_spd', () => {
    const c = APPROVAL_REGISTRY.claim.isCancellable!;
    expect(c({ status: 'pending_manager_approval' } as never)).toBe(true);
    expect(c({ status: 'send_back' } as never)).toBe(true); // returned to employee, pre-approval
    expect(c({ status: 'pending_spd' } as never)).toBe(false); // manager already approved (AC-4)
    expect(c({ status: 'approved' } as never)).toBe(false);
  });

  it('leave: cancellable for any non-terminal in-cycle row (incl. awaitingNext + approved)', () => {
    const c = APPROVAL_REGISTRY.leave.isCancellable!;
    expect(c({ status: 'pending', awaitingNext: false, startDate: IN_CYCLE } as never)).toBe(true);
    expect(c({ status: 'pending', awaitingNext: true, startDate: IN_CYCLE } as never)).toBe(true);
    expect(c({ status: 'approved', startDate: IN_CYCLE } as never)).toBe(true);
    expect(c({ status: 'pending', startDate: OLD } as never)).toBe(false); // out of cycle
    expect(c({ status: 'rejected', startDate: IN_CYCLE } as never)).toBe(false);
    expect(c({ status: 'cancelled', startDate: IN_CYCLE } as never)).toBe(false);
  });

  it('admin-initiated types are NOT self-cancellable (no capability wired)', () => {
    expect(APPROVAL_REGISTRY.pay_rate.isCancellable).toBeUndefined();
    expect(APPROVAL_REGISTRY.transfer.isCancellable).toBeUndefined();
    expect(APPROVAL_REGISTRY.probation.isCancellable).toBeUndefined();
  });
});
