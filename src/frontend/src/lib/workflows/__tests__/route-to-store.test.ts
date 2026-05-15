import { describe, it, expect } from 'vitest';
import { routeToStore } from '../route-to-store';
import type { EventReason, ApprovalStore } from '../route-to-store';

describe('routeToStore', () => {
  it('routes PRCHG_PROMO to promotion-approvals', () => {
    expect(routeToStore('PRCHG_PROMO')).toBe('promotion-approvals');
  });

  it('routes PRCHG_MERINC to pay-rate-approvals', () => {
    expect(routeToStore('PRCHG_MERINC')).toBe('pay-rate-approvals');
  });

  it('routes PRCHG_ADJPOS to pay-rate-approvals', () => {
    expect(routeToStore('PRCHG_ADJPOS')).toBe('pay-rate-approvals');
  });

  it('routes PRCHG_SALADJ to pay-rate-approvals', () => {
    expect(routeToStore('PRCHG_SALADJ')).toBe('pay-rate-approvals');
  });

  it('routes PRCHG_SALCUT to pay-rate-approvals', () => {
    expect(routeToStore('PRCHG_SALCUT')).toBe('pay-rate-approvals');
  });

  it('throws on unknown reason at runtime (defensive guard)', () => {
    expect(() => routeToStore('PRCHG_UNKNOWN' as EventReason)).toThrow(
      /routeToStore: unhandled EventReason "PRCHG_UNKNOWN"/,
    );
  });

  it('every EventReason maps to a valid ApprovalStore (exhaustiveness)', () => {
    const allReasons: EventReason[] = [
      'PRCHG_PROMO',
      'PRCHG_MERINC',
      'PRCHG_ADJPOS',
      'PRCHG_SALADJ',
      'PRCHG_SALCUT',
    ];
    const validStores: ApprovalStore[] = ['promotion-approvals', 'pay-rate-approvals'];
    allReasons.forEach((r) => {
      expect(validStores).toContain(routeToStore(r));
    });
    // Type-level: assignment to ApprovalStore[] fails to compile if routeToStore return type widens
    const _typeCheck: ApprovalStore[] = allReasons.map((r) => routeToStore(r));
    expect(_typeCheck).toHaveLength(allReasons.length);
  });
});
