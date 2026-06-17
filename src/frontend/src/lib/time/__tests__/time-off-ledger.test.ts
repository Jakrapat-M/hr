import { describe, it, expect } from 'vitest';
import {
  buildTimeOffLedger,
  endingBalance,
  leaveBalanceCard,
  type LeaveLedgerRow,
} from '../time-off-ledger';
import { quotaTrackedTypes } from '../leave-types';

function row(p: Partial<LeaveLedgerRow>): LeaveLedgerRow {
  return { kind: 'k', nameTh: 'ลา', nameEn: 'Leave', initial: 10, credits: 0, debits: 0, ...p };
}

describe('buildTimeOffLedger', () => {
  it('renders all 7 quota-tracked buckets with labels from LEAVE_TYPES', () => {
    const rows = buildTimeOffLedger({});
    const quota = quotaTrackedTypes();
    expect(rows.length).toBe(quota.length);
    expect(rows.length).toBe(7);
    // kind = leave code; labels come straight from the registry.
    for (const t of quota) {
      const r = rows.find((x) => x.kind === t.code)!;
      expect(r).toBeTruthy();
      expect(r.nameTh).toBe(t.nameTh);
      expect(r.nameEn).toBe(t.nameEn);
    }
  });

  it('feeds settled initial/credits/debits from the bucket input', () => {
    const rows = buildTimeOffLedger({
      annual_leave: { initial: 10, credits: 2, debits: 3 },
    });
    const annual = rows.find((r) => r.kind === 'annual_leave')!;
    expect(annual.initial).toBe(10);
    expect(annual.credits).toBe(2);
    expect(annual.debits).toBe(3);
    expect(endingBalance(annual)).toBe(9); // 10 + 2 − 3
  });

  it('renders a missing bucket as an all-zero row (never crashes)', () => {
    const rows = buildTimeOffLedger({ annual_leave: { initial: 10, credits: 0, debits: 0 } });
    const sick = rows.find((r) => r.kind === 'sick_leave')!;
    expect(sick.initial).toBe(0);
    expect(endingBalance(sick)).toBe(0);
  });
});

describe('endingBalance', () => {
  it('Ending = Initial + Credits − Debits', () => {
    expect(endingBalance({ kind: 'x', nameTh: '', nameEn: '', initial: 10, credits: 2, debits: 3 })).toBe(9);
  });
});

describe('leaveBalanceCard', () => {
  it('derives entitled / used / remaining / percentUsed', () => {
    expect(leaveBalanceCard(row({ initial: 10, credits: 0, debits: 3 }))).toEqual({
      entitled: 10, used: 3, remaining: 7, percentUsed: 30,
    });
  });
  it('counts credits toward entitlement', () => {
    const c = leaveBalanceCard(row({ initial: 10, credits: 5, debits: 6 }));
    expect(c.entitled).toBe(15);
    expect(c.remaining).toBe(9);
    expect(c.percentUsed).toBe(40); // 6 / 15
  });
  it('is 0% used when nothing is entitled (no divide-by-zero)', () => {
    const c = leaveBalanceCard(row({ initial: 0, credits: 0, debits: 0 }));
    expect(c.percentUsed).toBe(0);
    expect(c.remaining).toBe(0);
  });
  it('rounds percentUsed', () => {
    expect(leaveBalanceCard(row({ initial: 3, credits: 0, debits: 1 })).percentUsed).toBe(33);
  });
});
