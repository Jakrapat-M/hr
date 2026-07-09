import { describe, it, expect, beforeEach } from 'vitest';
import { useLeaveBalances, remainingFor } from '@/stores/leave-balances';

// leave-balances — numeric quota ledger (Group A). reserve soft-holds,
// release gives back, deduct moves reserved → debits. remaining =
// initial + credits − debits − reserved.

const EMP = 'EMP-TEST';
const KIND = 'annual_leave';

describe('leave-balances store', () => {
  beforeEach(() => {
    useLeaveBalances.getState().clear();
    useLeaveBalances.getState().seedBalances([{ employeeId: EMP, kind: KIND, initial: 10 }]);
  });

  it('seeds an initial balance and reports it as remaining', () => {
    expect(remainingFor(EMP, KIND)).toBe(10);
  });

  it('reserve drops remaining without touching debits', () => {
    useLeaveBalances.getState().reserve(EMP, KIND, 3);
    expect(remainingFor(EMP, KIND)).toBe(7);
    const bucket = useLeaveBalances.getState().balances[`${EMP}:${KIND}`];
    expect(bucket.reserved).toBe(3);
    expect(bucket.debits).toBe(0);
  });

  it('deduct moves reserved → debits and keeps remaining stable', () => {
    useLeaveBalances.getState().reserve(EMP, KIND, 3);
    expect(remainingFor(EMP, KIND)).toBe(7);
    useLeaveBalances.getState().deduct(EMP, KIND, 3);
    // remaining unchanged (reserved was already subtracted), now via debits.
    expect(remainingFor(EMP, KIND)).toBe(7);
    const bucket = useLeaveBalances.getState().balances[`${EMP}:${KIND}`];
    expect(bucket.reserved).toBe(0);
    expect(bucket.debits).toBe(3);
  });

  it('release restores the reserved quota', () => {
    useLeaveBalances.getState().reserve(EMP, KIND, 4);
    expect(remainingFor(EMP, KIND)).toBe(6);
    useLeaveBalances.getState().release(EMP, KIND, 4);
    expect(remainingFor(EMP, KIND)).toBe(10);
    const bucket = useLeaveBalances.getState().balances[`${EMP}:${KIND}`];
    expect(bucket.reserved).toBe(0);
  });

  it('release never drives reserved below zero', () => {
    useLeaveBalances.getState().reserve(EMP, KIND, 2);
    useLeaveBalances.getState().release(EMP, KIND, 5);
    const bucket = useLeaveBalances.getState().balances[`${EMP}:${KIND}`];
    expect(bucket.reserved).toBe(0);
    expect(remainingFor(EMP, KIND)).toBe(10);
  });

  it('returns 0 remaining for an unseeded bucket', () => {
    expect(remainingFor('NOBODY', 'sick_leave')).toBe(0);
  });
});
