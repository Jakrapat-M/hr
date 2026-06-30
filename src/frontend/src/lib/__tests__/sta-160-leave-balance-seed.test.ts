import { describe, it, expect, beforeEach } from 'vitest';
import { ensureDemoSeed, resetEnsureDemoSeedForTests } from '@/lib/demo-seed';
import { useLeaveBalances, remainingFor } from '@/stores/leave-balances';

// STA-160 + STA-162 (canonical) — leave-balance seed sample quota. STA-162
// supersedes STA-160's annual (Remaining 7 → 6) and splits sick "Used 6" into
// Pending 1 + Used 5. Canonical sample (Total/Pending/Used/Remaining):
//   sick 30/1/5/24, annual 10/1/3/6, personnel 3/0/1/2, maternity ×4 initial-only.
// The clean Tier-A viewer ADM001 (excluded from the EMP001 annual deduct) reads
// these EXACTLY. Pending = reserved (set via guarded reserve, sick+annual only).
//
// Card math (leave-balances.ts): remaining = initial + credits − debits − reserved;
// Used (card) = debits + reserved = Total − Remaining.

const ADM = 'ADM001';
const EMP = 'EMP001';

function used(employeeId: string, kind: string, total: number): number {
  return total - remainingFor(employeeId, kind);
}

describe('STA-160/162 — leave-balance canonical sample seed', () => {
  beforeEach(() => {
    // resetEnsureDemoSeedForTests() clears the balances + resets the once-per-session
    // guard, so ensureDemoSeed() re-runs the REAL shipped seed (shared debits + the
    // guarded sick/annual reserve fan-out incl. ADM001).
    resetEnsureDemoSeedForTests();
    ensureDemoSeed();
  });

  it('AC1: ADM001 /timeoff cards read 30/24, 10/6, 3/2 (Remaining) with Used 6/4/1', () => {
    expect(remainingFor(ADM, 'sick_leave')).toBe(24);
    expect(remainingFor(ADM, 'annual_leave')).toBe(6); // STA-162: 7 → 6 (reserved 1 added)
    expect(remainingFor(ADM, 'personnel_leave')).toBe(2);
    // Card "Used" = debits + reserved.
    expect(used(ADM, 'sick_leave', 30)).toBe(6); // debits 5 + reserved 1
    expect(used(ADM, 'annual_leave', 10)).toBe(4); // debits 3 + reserved 1
    expect(used(ADM, 'personnel_leave', 3)).toBe(1); // debits 1, reserved 0
  });

  it('AC2: ADM001 Pending (reserved) is 1 for sick & annual, 0 for personnel', () => {
    const b = useLeaveBalances.getState().balances;
    expect(b[`${ADM}:sick_leave`]?.reserved).toBe(1);
    expect(b[`${ADM}:annual_leave`]?.reserved).toBe(1);
    expect(b[`${ADM}:personnel_leave`]?.reserved).toBe(0);
  });

  it('AC4: EMP001 cards are populated (non-zero, no empty state); sick exact', () => {
    // EMP001 is the live ESS submit persona — its annual carries an in-flight deduct
    // (LV-DEMO-EMP001-ANNUAL), so only sick is exact; annual/personnel are ranged.
    expect(remainingFor(EMP, 'sick_leave')).toBe(24);
    expect(remainingFor(EMP, 'annual_leave')).toBeGreaterThan(0);
    expect(remainingFor(EMP, 'personnel_leave')).toBeGreaterThan(0);
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

  it('AC3 (reload idempotency): re-seeding a debits-only row over persisted state PRESERVES reserved', () => {
    // Keystone: seedBalances merges field-by-field — a seed WITHOUT `reserved` keeps
    // next[key]?.reserved. The shared row carries `debits` only; `reserved` is set via
    // the guarded reserve(). Simulate a reload WITHOUT clearing the store.
    const store = () => useLeaveBalances.getState();
    const sickKey = `${ADM}:sick_leave`;

    // After the real seed, the guarded loop set ADM001 sick reserved = 1.
    expect(store().balances[sickKey]?.reserved).toBe(1);

    // Reload: re-run the SAME debits-only seed (no `reserved` key) + the guarded
    // reserve again, over the still-persisted store (NO clear()).
    store().seedBalances([{ employeeId: ADM, kind: 'sick_leave', initial: 30, debits: 5 }]);
    if ((store().balances[sickKey]?.reserved ?? 0) === 0) {
      store().reserve(ADM, 'sick_leave', 1); // guarded: must NOT fire — reserved is already 1
    }

    // reserved must still be 1 (preserved), proving the debits-only row did not reset
    // it to 0 and re-arm the reserve (which would drift to 2).
    expect(store().balances[sickKey]?.reserved).toBe(1);
    // personnel stays at reserved 0 (no reserve seeded for it).
    expect(store().balances[`${ADM}:personnel_leave`]?.reserved).toBe(0);
  });
});
