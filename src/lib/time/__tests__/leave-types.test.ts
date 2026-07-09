import { describe, expect, test } from 'vitest';
import {
  LEAVE_TYPES,
  quotaTrackedTypes,
  getLeaveType,
  LEAVE_CODE_TO_BALANCE_KIND,
} from '@/lib/time/leave-types';

describe('leave-types', () => {
  test('has exactly 23 leave types', () => {
    expect(LEAVE_TYPES.length).toBe(23);
  });

  test('exactly 7 quota-tracked types', () => {
    expect(quotaTrackedTypes().length).toBe(7);
  });

  test('balance-kind map covers the 7 quota-tracked codes identically', () => {
    expect(Object.keys(LEAVE_CODE_TO_BALANCE_KIND).length).toBe(7);
    for (const t of quotaTrackedTypes()) {
      expect(LEAVE_CODE_TO_BALANCE_KIND[t.code]).toBe(t.code);
    }
  });

  test('getLeaveType resolves a known code and undefined otherwise', () => {
    expect(getLeaveType('annual_leave')?.nameEn).toBe('Annual Leave');
    expect(getLeaveType('nope')).toBeUndefined();
  });

  test('special_leave is store-only', () => {
    expect(getLeaveType('special_leave')?.storeOnly).toBe(true);
  });
});
