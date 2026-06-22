import { describe, it, expect } from 'vitest';
import {
  buildTimeOffLedger,
  endingBalance,
  leaveBalanceCard,
  type LeaveLedgerRow,
} from '../time-off-ledger';
import { quotaTrackedTypes } from '../leave-types';

function row(p: Partial<LeaveLedgerRow>): LeaveLedgerRow {
  return { kind: 'k', nameTh: 'ลา', nameEn: 'Leave', initial: 10, pending: 0, debits: 0, ...p };
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

  it('feeds initial/pending/debits from the bucket input', () => {
    const rows = buildTimeOffLedger({
      annual_leave: { initial: 10, pending: 2, debits: 3 },
    });
    const annual = rows.find((r) => r.kind === 'annual_leave')!;
    expect(annual.initial).toBe(10);
    expect(annual.pending).toBe(2);
    expect(annual.debits).toBe(3);
    expect(endingBalance(annual)).toBe(5); // 10 − (2 + 3)
  });

  it('renders a missing bucket as an all-zero row (never crashes)', () => {
    const rows = buildTimeOffLedger({ annual_leave: { initial: 10, pending: 0, debits: 0 } });
    const sick = rows.find((r) => r.kind === 'sick_leave')!;
    expect(sick.initial).toBe(0);
    expect(endingBalance(sick)).toBe(0);
  });
});

describe('endingBalance', () => {
  it('Ending = Total quota − (Pending + Debits)', () => {
    expect(endingBalance({ kind: 'x', nameTh: '', nameEn: '', initial: 3, pending: 1, debits: 0 })).toBe(2);
    expect(endingBalance({ kind: 'x', nameTh: '', nameEn: '', initial: 10, pending: 2, debits: 3 })).toBe(5);
  });
});

describe('leaveBalanceCard', () => {
  it('derives entitled / used / remaining / percentUsed', () => {
    expect(leaveBalanceCard(row({ initial: 10, pending: 0, debits: 3 }))).toEqual({
      entitled: 10, used: 3, remaining: 7, percentUsed: 30,
    });
  });
  it('pending does NOT count toward entitlement (entitled = initial only)', () => {
    const c = leaveBalanceCard(row({ initial: 10, pending: 5, debits: 6 }));
    expect(c.entitled).toBe(10);          // not 15 — pending is in-flight, not granted
    expect(c.used).toBe(6);
    expect(c.remaining).toBe(-1);          // 10 − (5 + 6) → over-committed may go negative
    expect(c.percentUsed).toBe(60);        // 6 / 10, unaffected by pending
  });
  it('remaining always equals endingBalance (card == table)', () => {
    const r = row({ initial: 3, pending: 1, debits: 0 });
    expect(leaveBalanceCard(r).remaining).toBe(endingBalance(r));
  });
  it('is 0% used when nothing is entitled (no divide-by-zero)', () => {
    const c = leaveBalanceCard(row({ initial: 0, pending: 0, debits: 0 }));
    expect(c.percentUsed).toBe(0);
    expect(c.remaining).toBe(0);
  });
  it('rounds percentUsed', () => {
    expect(leaveBalanceCard(row({ initial: 3, pending: 0, debits: 1 })).percentUsed).toBe(33);
  });
});
