import { beforeEach, describe, expect, it } from 'vitest';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { seedDemoClaimsIfNeeded } from '../seed-demo-claims';

beforeEach(() => {
  localStorage.clear();
  useBenefitClaimsStore.setState({ claims: [] });
});

describe('seedDemoClaimsIfNeeded', () => {
  it('seeds claims into an empty store', () => {
    seedDemoClaimsIfNeeded();
    const { claims } = useBenefitClaimsStore.getState();
    expect(claims.length).toBeGreaterThanOrEqual(8);
  });

  it('sets the localStorage flag after seeding', () => {
    seedDemoClaimsIfNeeded();
    expect(localStorage.getItem('demo-claims-seeded-v1')).toBe('yes');
  });

  it('does not seed a second time (localStorage flag set)', () => {
    seedDemoClaimsIfNeeded();
    const firstCount = useBenefitClaimsStore.getState().claims.length;

    // Add a fake claim to detect if seed appended again
    useBenefitClaimsStore.setState((s) => ({
      claims: [
        ...s.claims,
        {
          ...s.claims[0],
          id: 'BEN-CLM-EXTRA',
          workflowRequestId: 'REQ-BEN-EXTRA',
        },
      ],
    }));

    seedDemoClaimsIfNeeded(); // should no-op
    expect(useBenefitClaimsStore.getState().claims.length).toBe(firstCount + 1);
  });

  it('skips seeding when store already has claims', () => {
    // Simulate store with existing user claim
    useBenefitClaimsStore.getState().submitClaim({
      receiptNo: 'RCPT-EXISTING',
      receiptDate: '2026-04-01',
      receiptAmount: 1000,
    });
    seedDemoClaimsIfNeeded();
    // Only 1 claim — the pre-existing one; no seed appended
    expect(useBenefitClaimsStore.getState().claims.length).toBe(1);
    // Flag still gets set
    expect(localStorage.getItem('demo-claims-seeded-v1')).toBe('yes');
  });

  it('seeds a mix of workflow statuses', () => {
    seedDemoClaimsIfNeeded();
    const { claims } = useBenefitClaimsStore.getState();
    const statuses = claims.map((c) => c.workflowStatus);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('approved');
    expect(statuses).toContain('paid');
    expect(statuses).toContain('rejected');
  });
});
