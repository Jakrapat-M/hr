import { beforeEach, describe, expect, it } from 'vitest';
import {
  isSeededQueueClaim,
  migrateBenefitClaimsPersistedState,
  useBenefitClaimsStore,
} from '@/stores/benefit-claims';
import { APPROVAL_SEED_BY_TYPE } from '@/lib/approval-seed-fixtures';

// benefit-claims — persist/rehydrate contract: live claims survive F5, seeds reset.
//
// The discriminator between seed rows and live rows is the id space:
//   - Seeded queue claims: WF-2026-* (from MOCK_PENDING_REQUESTS via queueRowToBenefitClaim)
//   - Live submitted claims: BEN-CLM-* (from submitClaim)
//   - Store fixtures: BEN-CLM-MGR1, BEN-CLM-0001, BEN-CLM-0002 (no queueSnapshot, always persist)
//
// Using queueSnapshot presence as the criterion was the bug: live submitClaim also
// attaches a queueSnapshot, so a freshly submitted claim was wiped on every F5.

function makeMinimalPersistedClaim(overrides: Record<string, unknown>) {
  return {
    workflowRequestId: overrides.id ?? 'REQ-TEST',
    employeeId: 'EMP001',
    employeeName: 'Test User',
    company: 'Central Group',
    businessUnit: 'HR',
    employeeGroup: 'Monthly',
    personalGrade: 'PG4',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: 'ค่ารักษาพยาบาล',
    remainingAmount: 20000,
    currency: 'THB',
    receiptNo: 'RCPT-TEST',
    receiptDate: '2026-06-01',
    claimDate: '2026-06-01',
    receiptAmount: 1000,
    totalClaimAmount: 1000,
    remark: '',
    status: 'pending_manager_approval',
    submittedAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    attachments: [],
    audit: [],
    version: 1,
    previousVersions: [],
    ...overrides,
  };
}

describe('isSeededQueueClaim — unit', () => {
  it('WF-2026-004 → true', () => {
    expect(isSeededQueueClaim({ id: 'WF-2026-004' })).toBe(true);
  });

  it('WF-2026-001 → true', () => {
    expect(isSeededQueueClaim({ id: 'WF-2026-001' })).toBe(true);
  });

  it('BEN-CLM-0007 → false', () => {
    expect(isSeededQueueClaim({ id: 'BEN-CLM-0007' })).toBe(false);
  });

  it('BEN-CLM-MGR1 → false', () => {
    expect(isSeededQueueClaim({ id: 'BEN-CLM-MGR1' })).toBe(false);
  });

  it('BEN-CLM-0001 → false', () => {
    expect(isSeededQueueClaim({ id: 'BEN-CLM-0001' })).toBe(false);
  });
});

describe('SEED-ID COVERAGE — every APPROVAL_SEED_BY_TYPE.claim row must satisfy isSeededQueueClaim', () => {
  it('all claim seed rows match WF-2026-* pattern', () => {
    const claimSeeds = APPROVAL_SEED_BY_TYPE.claim;
    // Sanity: there must be at least one claim seed row.
    expect(claimSeeds.length).toBeGreaterThan(0);
    for (const row of claimSeeds) {
      expect(isSeededQueueClaim(row), `row ${row.id} should match WF-2026-*`).toBe(true);
    }
  });
});

describe('benefit-claims — persist / rehydrate contract', () => {
  beforeEach(() => {
    localStorage.clear();
    useBenefitClaimsStore.setState({ claims: [] });
  });

  it('live BEN-CLM-* claim survives simulated rehydrate with status and queueSnapshot intact', () => {
    // Submit a live claim (produces BEN-CLM-* id + queueSnapshot).
    const claim = useBenefitClaimsStore.getState().submitClaim({
      benefitType: 'medical',
      receiptNo: 'RCPT-PERSIST-001',
      receiptDate: '2026-06-01',
      receiptAmount: 2000,
      totalClaimAmount: 2000,
      attachments: [{ id: 'a1', filename: 'receipt.pdf', sizeMb: 0.5 }],
    });

    expect(claim.id).toMatch(/^BEN-CLM-/);
    expect(isSeededQueueClaim(claim)).toBe(false);

    // Capture persisted snapshot.
    const snapshot = { claims: [...useBenefitClaimsStore.getState().claims] };

    // Simulate rehydrate: apply migrate then merge.
    const migrated = migrateBenefitClaimsPersistedState(snapshot);

    // Apply the merge filter (same logic as persist merge option).
    const afterMerge = Array.isArray(migrated.claims)
      ? migrated.claims.filter((c) => !isSeededQueueClaim(c))
      : [];

    // Live claim must survive both stages.
    const found = afterMerge.find((c) => c.id === claim.id);
    expect(found).toBeDefined();
    expect(found?.status).toBe('pending_manager_approval');
    expect(found?.queueSnapshot).toBeDefined();
    expect(found?.queueSnapshot?.type).toBe('claim');
  });

  it('WF-2026-* seeded claim is dropped by migrate on rehydrate', () => {
    const seedClaim = makeMinimalPersistedClaim({
      id: 'WF-2026-004',
      queueSnapshot: { id: 'WF-2026-004', type: 'claim' },
    });

    const migrated = migrateBenefitClaimsPersistedState({ claims: [seedClaim] });
    expect(migrated.claims?.some((c) => c.id === 'WF-2026-004')).toBe(false);
  });

  it('WF-2026-* seeded claim is dropped by merge filter on rehydrate', () => {
    const seedClaim = makeMinimalPersistedClaim({
      id: 'WF-2026-009',
      queueSnapshot: { id: 'WF-2026-009', type: 'claim' },
    });

    const afterMerge = [seedClaim].filter((c) => !isSeededQueueClaim(c));
    expect(afterMerge).toHaveLength(0);
  });

  it('after rehydrate + seedQueueClaims each WF-2026-* row appears exactly once', () => {
    const claimSeeds = APPROVAL_SEED_BY_TYPE.claim;

    // Seed once.
    useBenefitClaimsStore.getState().seedQueueClaims(claimSeeds);
    const countAfterFirstSeed = useBenefitClaimsStore.getState().claims.filter((c) =>
      isSeededQueueClaim(c),
    ).length;
    expect(countAfterFirstSeed).toBe(claimSeeds.length);

    // Simulate rehydrate: drop WF-2026-* rows (what persist merge does).
    const snapshot = useBenefitClaimsStore.getState().claims;
    const afterMerge = snapshot.filter((c) => !isSeededQueueClaim(c));
    useBenefitClaimsStore.setState({ claims: afterMerge });

    // Re-seed (ensureDemoSeed calls seedQueueClaims again after rehydrate).
    useBenefitClaimsStore.getState().seedQueueClaims(claimSeeds);

    const seedRowsAfterReseed = useBenefitClaimsStore.getState().claims.filter((c) =>
      isSeededQueueClaim(c),
    );
    // Each WF-2026-* row must appear exactly once — no duplication.
    expect(seedRowsAfterReseed).toHaveLength(claimSeeds.length);
    for (const row of claimSeeds) {
      expect(
        seedRowsAfterReseed.filter((c) => c.id === row.id),
        `${row.id} should appear exactly once`,
      ).toHaveLength(1);
    }
  });

  it('approved/rejected WF-2026-* seed does NOT persist terminal status across rehydrate', () => {
    const claimSeeds = APPROVAL_SEED_BY_TYPE.claim;
    useBenefitClaimsStore.getState().seedQueueClaims(claimSeeds);

    // Approve the first seeded claim.
    const firstSeedId = claimSeeds[0].id;
    useBenefitClaimsStore.getState().approveClaim(firstSeedId, { role: 'spd', name: 'SPD' });
    expect(
      useBenefitClaimsStore.getState().claims.find((c) => c.id === firstSeedId)?.status,
    ).toBe('approved');

    // Simulate rehydrate: drop WF-2026-* rows.
    const snapshot = useBenefitClaimsStore.getState().claims;
    const afterMerge = snapshot.filter((c) => !isSeededQueueClaim(c));
    useBenefitClaimsStore.setState({ claims: afterMerge });

    // Re-seed — the row comes back fresh as pending_manager_approval.
    useBenefitClaimsStore.getState().seedQueueClaims(claimSeeds);

    const reseeded = useBenefitClaimsStore.getState().claims.find((c) => c.id === firstSeedId);
    expect(reseeded).toBeDefined();
    // Must be fresh pending, not the previously approved status.
    expect(reseeded?.status).toBe('pending_manager_approval');
  });

  it('store fixtures (BEN-CLM-MGR1 etc., no queueSnapshot) persist across rehydrate', () => {
    const fixture = makeMinimalPersistedClaim({ id: 'BEN-CLM-MGR1' });

    const migrated = migrateBenefitClaimsPersistedState({ claims: [fixture] });
    expect(migrated.claims?.some((c) => c.id === 'BEN-CLM-MGR1')).toBe(true);

    // Also survives the merge filter.
    const afterMerge = (migrated.claims ?? []).filter((c) => !isSeededQueueClaim(c));
    expect(afterMerge.some((c) => c.id === 'BEN-CLM-MGR1')).toBe(true);
  });
});
