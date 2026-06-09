import { describe, it, expect } from 'vitest';
import { TIME_OFF_LEDGER, endingBalance, leaveBalanceCard, type LeaveLedgerRow } from '../time-off-ledger';

function row(p: Partial<LeaveLedgerRow>): LeaveLedgerRow {
  return { kind: 'k', nameTh: 'ลา', nameEn: 'Leave', initial: 10, credits: 0, debits: 0, ...p };
}

describe('time-off-ledger', () => {
  it('Ending = Initial + Credits − Debits', () => {
    expect(endingBalance({ kind: 'x', nameTh: '', nameEn: '', initial: 10, credits: 2, debits: 3 })).toBe(9);
  });
  it('seeds the WFS leave buckets with non-negative endings', () => {
    expect(TIME_OFF_LEDGER.length).toBeGreaterThanOrEqual(4);
    expect(TIME_OFF_LEDGER.every((r) => endingBalance(r) >= 0)).toBe(true);
    expect(TIME_OFF_LEDGER.find((r) => r.kind === 'annual')!).toBeTruthy();
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
