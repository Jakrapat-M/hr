import { describe, it, expect, beforeEach } from 'vitest';
import { ensureDemoSeed, resetEnsureDemoSeedForTests } from '@/lib/demo-seed';
import { useLeaveBalances } from '@/stores/leave-balances';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { buildTimeOffLedger, endingBalance } from '@/lib/time/time-off-ledger';

// STA-162 — the /time/timesheet "Time Off" detail table reads the canonical 7-row
// sample for the clean admin viewer ADM001:
//   Leave type | Total | Pending | Used | Remaining
//   sick        30      1         5      24
//   annual      10      1         3      6
//   personnel   3       0         1      2
//   maternity ×4 (98/90/90/15) initial-only.
// The table maps store buckets {initial, debits, reserved} → {initial, pending:reserved,
// debits}; Ending = initial − (pending + debits).

const ADM = 'ADM001';

// Build the ADM001 table rows the way use-time-off-ledger does (pending = reserved).
function admLedger() {
  const balances = useLeaveBalances.getState().balances;
  const buckets: Record<string, { initial: number; pending: number; debits: number }> = {};
  for (const [key, b] of Object.entries(balances)) {
    const [emp, kind] = key.split(':');
    if (emp === ADM) buckets[kind] = { initial: b.initial, pending: b.reserved, debits: b.debits };
  }
  return buildTimeOffLedger(buckets);
}

describe('STA-162 — leave-balance detail table canonical sample', () => {
  beforeEach(() => {
    resetEnsureDemoSeedForTests();
    ensureDemoSeed();
  });

  it('ADM001 store buckets are the exact canonical {initial, debits, reserved}', () => {
    const b = useLeaveBalances.getState().balances;
    expect(b[`${ADM}:sick_leave`]).toMatchObject({ initial: 30, debits: 5, reserved: 1 });
    expect(b[`${ADM}:annual_leave`]).toMatchObject({ initial: 10, debits: 3, reserved: 1 });
    expect(b[`${ADM}:personnel_leave`]).toMatchObject({ initial: 3, debits: 1, reserved: 0 });
    expect(b[`${ADM}:maternity_leave`]).toMatchObject({ initial: 98, debits: 0, reserved: 0 });
    expect(b[`${ADM}:maternity_leave_unpaid`]).toMatchObject({ initial: 90, debits: 0, reserved: 0 });
    expect(b[`${ADM}:maternity_risk_case`]).toMatchObject({ initial: 90, debits: 0, reserved: 0 });
    expect(b[`${ADM}:maternity_spouse`]).toMatchObject({ initial: 15, debits: 0, reserved: 0 });
  });

  it('the detail-table rows render Total/Pending/Used/Ending = the canonical sample', () => {
    const rows = admLedger();
    const by = (kind: string) => rows.find((r) => r.kind === kind)!;
    // [Total(initial), Pending, Used(debits), Ending]
    expect([by('sick_leave').initial, by('sick_leave').pending, by('sick_leave').debits, endingBalance(by('sick_leave'))]).toEqual([30, 1, 5, 24]);
    expect([by('annual_leave').initial, by('annual_leave').pending, by('annual_leave').debits, endingBalance(by('annual_leave'))]).toEqual([10, 1, 3, 6]);
    expect([by('personnel_leave').initial, by('personnel_leave').pending, by('personnel_leave').debits, endingBalance(by('personnel_leave'))]).toEqual([3, 0, 1, 2]);
    expect(endingBalance(by('maternity_leave'))).toBe(98);
    expect(endingBalance(by('maternity_leave_unpaid'))).toBe(90);
    expect(endingBalance(by('maternity_risk_case'))).toBe(90);
    expect(endingBalance(by('maternity_spouse'))).toBe(15);
  });

  it('NO-RED: every Ending is >= 0', () => {
    for (const r of admLedger()) expect(endingBalance(r)).toBeGreaterThanOrEqual(0);
  });

  it('/quick-approve count is driven by the approvals store, NOT balance reserves', () => {
    // The leave-queue count comes from useLeaveApprovals rows, never from
    // useLeaveBalances.reserved — so a balance-store reserve must not change it.
    const count = () => useLeaveApprovals.getState().requests.filter((r) => r.status === 'pending').length;
    const before = count();
    useLeaveBalances.getState().reserve(ADM, 'sick_leave', 1); // touches balances only
    expect(count()).toBe(before);
  });
});
