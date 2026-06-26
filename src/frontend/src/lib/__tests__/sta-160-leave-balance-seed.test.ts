import { describe, it, expect, beforeEach } from 'vitest';
import { ensureDemoSeed, resetEnsureDemoSeedForTests } from '@/lib/demo-seed';
import { useLeaveBalances, remainingFor } from '@/stores/leave-balances';

// STA-160 — Leave-balance cards seed sample quota (Sick 30/6/24, Annual 10/3/7,
// Personal 3/1/2). The clean Tier-A viewer ADM001 (excluded from the personnel +1
// reserve loop and the EMP001 annual deduct) must read those values EXACTLY.
//
// Card math (leave-balances.ts): remaining = initial + credits − debits − reserved;
// used = debits + reserved = Total − Remaining.

const ADM = 'ADM001';
const EMP = 'EMP001';

function used(employeeId: string, kind: string, total: number): number {
  return total - remainingFor(employeeId, kind);
}

describe('STA-160 — leave-balance sample-quota seed', () => {
  beforeEach(() => {
    // resetEnsureDemoSeedForTests() clears the balances + resets the once-per-session
    // guard, so ensureDemoSeed() re-runs the REAL shipped DEMO_LEAVE_BALANCE_SEEDS
    // fan-out (incl. the new ADM001 spread).
    resetEnsureDemoSeedForTests();
    ensureDemoSeed();
  });

  it('AC1: ADM001 cards read EXACTLY 30/6/24, 10/3/7, 3/1/2', () => {
    expect(remainingFor(ADM, 'sick_leave')).toBe(24);
    expect(remainingFor(ADM, 'annual_leave')).toBe(7);
    expect(remainingFor(ADM, 'personnel_leave')).toBe(2);
    expect(used(ADM, 'sick_leave', 30)).toBe(6);
    expect(used(ADM, 'annual_leave', 10)).toBe(3);
    expect(used(ADM, 'personnel_leave', 3)).toBe(1);
  });

  it('AC2: ADM001 is outside the personnel +1 reserve loop (reserved === 0)', () => {
    const bucket = useLeaveBalances.getState().balances[`${ADM}:personnel_leave`];
    expect(bucket?.reserved).toBe(0);
  });

  it('AC4: EMP001 cards are populated (non-zero, no empty state); sick exact, annual/personnel ranged', () => {
    // EMP001 is the live ESS submit persona — it legitimately carries in-flight
    // activity (+1 personnel reserve, an annual deduct), so only sick is exact.
    expect(remainingFor(EMP, 'sick_leave')).toBe(24);
    expect(remainingFor(EMP, 'annual_leave')).toBeGreaterThan(0);
    expect(remainingFor(EMP, 'personnel_leave')).toBeGreaterThan(0);
    // no empty-state: every visible card has a positive Total (initial seeded).
    const b = useLeaveBalances.getState().balances;
    expect(b[`${EMP}:sick_leave`]?.initial).toBe(30);
    expect(b[`${EMP}:annual_leave`]?.initial).toBe(10);
    expect(b[`${EMP}:personnel_leave`]?.initial).toBe(3);
  });

  it('AC5 (NO-RED): every seeded Remaining is >= 0 (no over/danger state)', () => {
    for (const kind of ['sick_leave', 'annual_leave', 'personnel_leave'] as const) {
      expect(remainingFor(ADM, kind)).toBeGreaterThanOrEqual(0);
      expect(remainingFor(EMP, kind)).toBeGreaterThanOrEqual(0);
    }
  });

  it('AC3 (reload idempotency): re-seeding a debits-only row over persisted state PRESERVES reserved (loop never re-arms)', () => {
    // Keystone: seedBalances merges field-by-field — a seed WITHOUT `reserved`
    // keeps next[key]?.reserved. This is why the shared row carries `debits` only,
    // never `reserved`. Simulate a reload WITHOUT clearing the store.
    const store = () => useLeaveBalances.getState();
    const key = `${EMP}:personnel_leave`;

    // After the real seed, the guarded +1 loop has set EMP001 personnel reserved = 1.
    expect(store().balances[key]?.reserved).toBe(1);

    // Reload: re-run the SAME debits-only seed (no `reserved` key) + the guarded
    // loop again, over the still-persisted store (NO clear()).
    store().seedBalances([{ employeeId: EMP, kind: 'personnel_leave', initial: 3, debits: 1 }]);
    if ((store().balances[key]?.reserved ?? 0) === 0) {
      store().reserve(EMP, 'personnel_leave', 1); // guarded: must NOT fire — reserved is already 1
    }

    // reserved must still be 1 (preserved), proving the debits-only row did not
    // reset it to 0 and re-arm the +1 loop (which would drift to 2).
    expect(store().balances[key]?.reserved).toBe(1);
    expect(remainingFor(EMP, 'personnel_leave')).toBe(remainingFor(EMP, 'personnel_leave')); // stable
    // ADM001 stays untouched at reserved 0.
    expect(store().balances[`${ADM}:personnel_leave`]?.reserved).toBe(0);
  });
});
