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
  APPROVAL_REGISTRY,
} from '../approval-registry';
import { canActOn } from '../claim-permissions';
import { APPROVAL_SEED_COUNT, APPROVAL_SEED_ROWS } from '../approval-seed-fixtures';
import {
  ensureDemoSeed,
  resetEnsureDemoSeedForTests,
  PAY_RATE_DEMO_COUNT,
  TAX_PLANNING_DEMO_COUNT,
  LEAVE_DEMO_COUNT,
} from '../demo-seed';

// Ids of the canonical (1-level, code-less) leave seed rows — used to pick a
// single-step leave row in the generic approve tests so they finalize on the
// first approval (the Group A demo rows include a 2-level maternity row that
// advances to HR instead of approving outright).
const CANONICAL_LEAVE_IDS = new Set(
  APPROVAL_SEED_ROWS.filter((r) => r.type === 'leave').map((r) => r.id),
);
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { useTransferApprovals } from '@/stores/transfer-approvals';
import { usePayRateApprovals } from '@/stores/pay-rate-approvals';
import { useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';

// Total rows the unified inbox seeds: the 20 registry-owned canonical rows PLUS
// the P2 pay-rate + tax-planning demo rows AND the Group A demo ESS leave rows,
// all injected directly by ensureDemoSeed.
const TOTAL_SEED_COUNT =
  APPROVAL_SEED_COUNT + PAY_RATE_DEMO_COUNT + TAX_PLANNING_DEMO_COUNT + LEAVE_DEMO_COUNT;

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
  it('ensureDemoSeed produces the canonical rows plus the P2 pay-rate + tax rows', () => {
    const queue = getPendingApprovals();
    expect(queue).toHaveLength(TOTAL_SEED_COUNT);
    // The two new row types are now part of the unified inbox.
    expect(queue.some((q) => q.row.type === 'pay_rate')).toBe(true);
    expect(queue.some((q) => q.row.type === 'tax_planning')).toBe(true);
  });

  it('seeded ids ⊇ every list-reachable id (the 20 canonical rows)', () => {
    const seededIds = new Set(getPendingApprovals().map((q) => q.row.id));
    for (const row of APPROVAL_SEED_ROWS) {
      expect(seededIds.has(row.id)).toBe(true);
    }
  });

  it('seeding twice does not duplicate rows (init-overwrite-empties)', () => {
    ensureDemoSeed(); // second call — guarded, no-op
    expect(getPendingApprovals()).toHaveLength(TOTAL_SEED_COUNT);
  });
});

// ── AC-1b.4 — persist round-trip (rehydrate-to-seed) ─────────────────────────
describe('persist round-trip — AC-1b.4', () => {
  it('approve a leave row → simulate rehydrate → full seeded set returns', () => {
    const before = getPendingApprovals();
    const leaveRow = before.find((q) => q.row.type === 'leave' && CANONICAL_LEAVE_IDS.has(q.row.id));
    expect(leaveRow).toBeDefined();

    // Approve via the store (mirrors the eventual PR-1c dispatch).
    useLeaveApprovals.getState().approve(leaveRow!.row.id, { id: 'MGR', name: 'Manager' });
    const approved = getPendingApprovals().find((q) => q.row.id === leaveRow!.row.id);
    expect(approved?.status).toBe('approved');

    // Hard refresh = fresh module load: stores rehydrate empty (merge contract),
    // then the single seed authority refills. Simulate by clearing + reseeding.
    reseed();
    const after = getPendingApprovals();
    expect(after).toHaveLength(TOTAL_SEED_COUNT);
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

// ── P2: pay-rate + tax-planning unified-queue integration ────────────────────
describe('pay-rate + tax-planning surface in the unified queue — P2', () => {
  it('seeds at least one pay_rate and one tax_planning pending row', () => {
    const queue = getPendingApprovals();
    const payRate = queue.filter((q) => q.row.type === 'pay_rate');
    const taxPlan = queue.filter((q) => q.row.type === 'tax_planning');
    expect(payRate.length).toBeGreaterThanOrEqual(1);
    expect(taxPlan.length).toBeGreaterThanOrEqual(1);
    expect(payRate.every((q) => q.status === 'pending')).toBe(true);
    expect(taxPlan.every((q) => q.status === 'pending')).toBe(true);
  });

  it('pay_rate approve via the registry flips the store row to approved', () => {
    const row = getPendingApprovals().find((q) => q.row.type === 'pay_rate')!.row;
    APPROVAL_REGISTRY.pay_rate.approve(row.id, { name: 'SPD', role: 'spd' });
    expect(usePayRateApprovals.getState().requests.find((r) => r.id === row.id)?.status).toBe('approved');
    expect(getPendingApprovals().find((q) => q.row.id === row.id)?.status).toBe('approved');
  });

  it('pay_rate reject via the registry flips the store row to rejected', () => {
    const row = getPendingApprovals().find((q) => q.row.type === 'pay_rate')!.row;
    APPROVAL_REGISTRY.pay_rate.reject(row.id, { name: 'SPD', role: 'spd' }, 'over budget');
    expect(getPendingApprovals().find((q) => q.row.id === row.id)?.status).toBe('rejected');
  });

  it('tax_planning approve advances the draft through Payroll review to approved', () => {
    const row = getPendingApprovals().find((q) => q.row.type === 'tax_planning')!.row;
    APPROVAL_REGISTRY.tax_planning.approve(row.id, { name: 'Payroll', role: 'spd' });
    expect(useBenefitTaxPlanningStore.getState().drafts.find((d) => d.id === row.id)?.status).toBe('approved');
    expect(getPendingApprovals().find((q) => q.row.id === row.id)?.status).toBe('approved');
  });

  it('tax_planning reject advances the draft through Payroll review to rejected', () => {
    const row = getPendingApprovals().find((q) => q.row.type === 'tax_planning')!.row;
    APPROVAL_REGISTRY.tax_planning.reject(row.id, { name: 'Payroll', role: 'spd' }, 'incomplete');
    expect(useBenefitTaxPlanningStore.getState().drafts.find((d) => d.id === row.id)?.status).toBe('rejected');
    expect(getPendingApprovals().find((q) => q.row.id === row.id)?.status).toBe('rejected');
  });
});

// ── P2: action-capability gate (canActOn) for the new row types ───────────────
describe('canActOn — pay-rate + tax-planning view-only for plain managers — P2', () => {
  it('a senior approver (spd) can act on pay_rate + tax_planning rows', () => {
    const queue = getPendingApprovals();
    const payRate = queue.find((q) => q.row.type === 'pay_rate')!;
    const taxPlan = queue.find((q) => q.row.type === 'tax_planning')!;
    expect(canActOn(payRate, ['spd'])).toBe(true);
    expect(canActOn(taxPlan, ['spd'])).toBe(true);
  });

  it('a plain manager is VIEW-ONLY on pay_rate + tax_planning (not first-line approver)', () => {
    const queue = getPendingApprovals();
    const payRate = queue.find((q) => q.row.type === 'pay_rate')!;
    const taxPlan = queue.find((q) => q.row.type === 'tax_planning')!;
    expect(canActOn(payRate, ['manager'])).toBe(false);
    expect(canActOn(taxPlan, ['manager'])).toBe(false);
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
