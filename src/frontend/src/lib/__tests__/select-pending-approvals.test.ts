/**
 * select-pending-approvals.test.ts — PR-1b (clickable-HRMS) acceptance tests.
 *
 * Covers:
 *   AC-1b.1 selectPendingApprovals collapses pending_* enums → pending.
 *   AC-1b.4 persist round-trip: approve a row → simulate rehydrate (merge) →
 *           re-run the single seed authority → inbox returns to the full seeded set.
 *   AC-1b.6 exactly one seed path: ensureDemoSeed populates all queue rows; the
 *           registry-owned stores hold the canonical fixtures.
 *   AC-1b.7 seeded ids ⊇ all list-reachable ids (the 20 canonical queue rows).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectPendingApprovals,
  collapseQueueStatus,
  getPendingApprovals,
} from '../approval-registry';
import { APPROVAL_SEED_COUNT, APPROVAL_SEED_ROWS } from '../approval-seed-fixtures';
import { ensureDemoSeed, resetEnsureDemoSeedForTests } from '../demo-seed';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { useTransferApprovals } from '@/stores/transfer-approvals';

function clearAll() {
  useLeaveApprovals.getState().clear();
  useWorkflowApprovals.getState().clear();
  useBenefitClaimsStore.getState().clear();
  useTransferApprovals.getState().clear();
}

function reseed() {
  clearAll();
  resetEnsureDemoSeedForTests();
  ensureDemoSeed();
}

beforeEach(reseed);

// ── AC-1b.1 — enum collapse ──────────────────────────────────────────────────
describe('collapseQueueStatus — AC-1b.1', () => {
  it.each([
    ['pending_spd', 'pending'],
    ['pending_hr', 'pending'],
    ['pending_manager', 'pending'],
    ['pending_manager_approval', 'pending'],
    ['send_back', 'pending'],
    ['approved', 'approved'],
    ['rejected', 'rejected'],
  ] as const)('collapses %s → %s', (raw, expected) => {
    expect(collapseQueueStatus(raw)).toBe(expected);
  });

  it('every collapsed pending_* row counts as pending in the selector', () => {
    const queue = getPendingApprovals();
    // All seeded rows start pending (no approvals yet).
    expect(queue.every((q) => q.status === 'pending')).toBe(true);
  });
});

// ── AC-1b.6 / AC-1b.7 — single seed path + id superset ───────────────────────
describe('seeded queue — AC-1b.6 + AC-1b.7', () => {
  it('ensureDemoSeed produces exactly the canonical 20 rows', () => {
    const queue = getPendingApprovals();
    expect(queue).toHaveLength(APPROVAL_SEED_COUNT);
  });

  it('seeded ids ⊇ every list-reachable id (the 20 canonical rows)', () => {
    const seededIds = new Set(getPendingApprovals().map((q) => q.row.id));
    for (const row of APPROVAL_SEED_ROWS) {
      expect(seededIds.has(row.id)).toBe(true);
    }
  });

  it('seeding twice does not duplicate rows (init-overwrite-empties)', () => {
    ensureDemoSeed(); // second call — guarded, no-op
    expect(getPendingApprovals()).toHaveLength(APPROVAL_SEED_COUNT);
  });
});

// ── AC-1b.4 — persist round-trip (rehydrate-to-seed) ─────────────────────────
describe('persist round-trip — AC-1b.4', () => {
  it('approve a leave row → simulate rehydrate → full seeded set returns', () => {
    const before = getPendingApprovals();
    const leaveRow = before.find((q) => q.row.type === 'leave');
    expect(leaveRow).toBeDefined();

    // Approve via the store (mirrors the eventual PR-1c dispatch).
    useLeaveApprovals.getState().approve(leaveRow!.row.id, { id: 'MGR', name: 'Manager' });
    const approved = getPendingApprovals().find((q) => q.row.id === leaveRow!.row.id);
    expect(approved?.status).toBe('approved');

    // Hard refresh = fresh module load: stores rehydrate empty (merge contract),
    // then the single seed authority refills. Simulate by clearing + reseeding.
    reseed();
    const after = getPendingApprovals();
    expect(after).toHaveLength(APPROVAL_SEED_COUNT);
    expect(after.every((q) => q.status === 'pending')).toBe(true);
  });

  it('benefit-claims merge drops queue-seeded claims but keeps own fixtures', () => {
    const own = useBenefitClaimsStore.getState().claims.filter((c) => !c.queueSnapshot);
    const queueClaims = useBenefitClaimsStore.getState().claims.filter((c) => c.queueSnapshot);
    expect(queueClaims.length).toBeGreaterThan(0);

    // Simulate rehydrate: persisted state = current claims; merge strips queueSnapshot.
    const merged = (
      useBenefitClaimsStore.persist.getOptions().merge as (p: unknown, c: unknown) => { claims: typeof own }
    )({ claims: useBenefitClaimsStore.getState().claims }, useBenefitClaimsStore.getState());
    expect(merged.claims.every((c) => !c.queueSnapshot)).toBe(true);
    expect(merged.claims.length).toBe(own.length);
  });
});

// ── selector unit — pure fan-IN ──────────────────────────────────────────────
describe('selectPendingApprovals — pure fan-in', () => {
  it('transfer terminal marker drops the row out of pending', () => {
    const out = selectPendingApprovals({
      leave: [],
      workflow: [],
      claims: [],
      transfers: [
        {
          id: 'T1',
          terminalStatus: 'approved',
          snapshot: APPROVAL_SEED_ROWS.find((r) => r.type === 'transfer')!,
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].status).toBe('approved');
  });
});
