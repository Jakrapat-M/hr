import { describe, expect, test } from 'vitest';
import { levelsForLeaveType, appliedChainFor } from '@/lib/time/approval-rules';

describe('approval-rules', () => {
  test('levelsForLeaveType: single-step vs two-step', () => {
    expect(levelsForLeaveType('annual_leave')).toBe(1);
    expect(levelsForLeaveType('maternity_leave')).toBe(2);
    expect(levelsForLeaveType('sick_leave_unpaid')).toBe(2);
  });

  test('appliedChainFor slices the leave chain to the leave-type depth', () => {
    expect(appliedChainFor('leave', 'annual_leave').length).toBe(1);
    expect(appliedChainFor('leave', 'maternity_leave').length).toBe(2);
  });

  test('leave with no code defaults to a single step', () => {
    expect(appliedChainFor('leave').length).toBe(1);
  });

  test('non-leave types return their full canonical chain', () => {
    expect(appliedChainFor('claim').length).toBe(2);
    expect(appliedChainFor('transfer').length).toBe(3);
  });
});
