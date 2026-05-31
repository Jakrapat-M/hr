/**
 * cross-persona-propagation.test.ts — PR-2 (clickable-HRMS) acceptance tests.
 *
 * Verifies that when a manager approves/rejects via APPROVAL_REGISTRY (the same
 * dispatch /quick-approve uses), the projections the employee /requests page and
 * the /workflows page read flip to the new status in-session — and the pending
 * count the admin report tile reads decrements by exactly 1 (AC-2.1 / AC-2.2).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  APPROVAL_REGISTRY,
  getPendingApprovals,
  queueApprovalToRequestRow,
  queueApprovalToWorkflowRow,
  type QueueApproval,
} from '../approval-registry';
import { ensureDemoSeed, resetEnsureDemoSeedForTests } from '../demo-seed';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { useTransferApprovals } from '@/stores/transfer-approvals';
import { usePayRateApprovals } from '@/stores/pay-rate-approvals';
import { useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';

const ACTOR = { name: 'Manager', role: 'spd' };

function clearAll() {
  useLeaveApprovals.getState().clear();
  useWorkflowApprovals.getState().clear();
  useBenefitClaimsStore.getState().clear();
  useTransferApprovals.getState().clear();
  usePayRateApprovals.getState().clear();
  useBenefitTaxPlanningStore.getState().clear();
}

function reseed() {
  clearAll();
  resetEnsureDemoSeedForTests();
  ensureDemoSeed();
}

beforeEach(reseed);

function firstOfType(queue: QueueApproval[], type: string): QueueApproval {
  const found = queue.find((q) => q.row.type === type);
  if (!found) throw new Error(`no seeded row of type ${type}`);
  return found;
}

function pendingCount(): number {
  return getPendingApprovals().filter((q) => q.status === 'pending').length;
}

// ── AC-2.1 — projections flip after a registry dispatch ───────────────────────
describe('requests + workflows projections reflect approval live — AC-2.1', () => {
  it('approve a leave row → SAME id flips to approved in BOTH projections', () => {
    const leave = firstOfType(getPendingApprovals(), 'leave');
    const id = leave.row.id;

    // Pre-state: both projections show pending for this id.
    const reqBefore = queueApprovalToRequestRow(
      getPendingApprovals().find((q) => q.row.id === id)!,
    );
    const wfBefore = queueApprovalToWorkflowRow(
      getPendingApprovals().find((q) => q.row.id === id)!,
    );
    expect(reqBefore.status).toBe('pending');
    expect(wfBefore.status).toBe('pending');

    // Manager approves via the registry (the /quick-approve dispatch path).
    APPROVAL_REGISTRY.leave.approve(id, ACTOR);

    // Re-derive both projections from the canonical source — SAME id, flipped.
    const after = getPendingApprovals().find((q) => q.row.id === id)!;
    expect(queueApprovalToRequestRow(after).status).toBe('approved');
    expect(queueApprovalToWorkflowRow(after).status).toBe('approved');
    // Projected ids are stable across surfaces (same canonical id).
    expect(queueApprovalToRequestRow(after).id).toBe(id);
    expect(queueApprovalToWorkflowRow(after).id).toBe(id);
  });

  it('reject a change_request row → SAME id flips to rejected in BOTH projections', () => {
    const cr = firstOfType(getPendingApprovals(), 'change_request');
    const id = cr.row.id;

    APPROVAL_REGISTRY.change_request.reject(id, ACTOR, 'missing docs');

    const after = getPendingApprovals().find((q) => q.row.id === id)!;
    expect(queueApprovalToRequestRow(after).status).toBe('rejected');
    expect(queueApprovalToWorkflowRow(after).status).toBe('rejected');
  });

  it('workflow projection maps urgency + builds a step chain from the timeline', () => {
    const leave = firstOfType(getPendingApprovals(), 'leave');
    const wf = queueApprovalToWorkflowRow(leave);
    expect(wf.steps.length).toBeGreaterThan(0);
    expect(['low', 'normal', 'high', 'critical']).toContain(wf.urgency);
    expect(wf.requesterName).toBe(leave.row.requester.name);
  });
});

// ── AC-2.2 — admin report pending figure decrements by exactly 1 ──────────────
describe('admin report pending-approvals figure decrements on approve — AC-2.2', () => {
  it('pending count drops by 1 after a single approve', () => {
    const before = pendingCount();
    const leave = firstOfType(getPendingApprovals(), 'leave');
    APPROVAL_REGISTRY.leave.approve(leave.row.id, ACTOR);
    expect(pendingCount()).toBe(before - 1);
  });

  it('pending count drops by 1 after a single reject', () => {
    const before = pendingCount();
    const leave = firstOfType(getPendingApprovals(), 'leave');
    APPROVAL_REGISTRY.leave.reject(leave.row.id, ACTOR, 'no');
    expect(pendingCount()).toBe(before - 1);
  });

  it('transfer approve also decrements the pending figure (terminal marker)', () => {
    const before = pendingCount();
    const transfer = firstOfType(getPendingApprovals(), 'transfer');
    APPROVAL_REGISTRY.transfer.approve(transfer.row.id, ACTOR);
    expect(pendingCount()).toBe(before - 1);
  });
});
