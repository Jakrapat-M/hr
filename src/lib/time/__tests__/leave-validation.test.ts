import { describe, expect, test } from 'vitest';
import { validateLeaveRequest } from '@/lib/time/leave-validation';
import type { LeaveTypeDef } from '@/lib/time/leave-types';
import type { EmployeeEligibility } from '@/lib/time/employee-eligibility';

// A minimal WorkingDay type with no restrictions — the baseline "open" type.
const baseType: LeaveTypeDef = {
  code: 'test_leave',
  nameEn: 'Test Leave',
  nameTh: 'ลาทดสอบ',
  paid: true,
  quotaTracked: false,
  minUnit: '1-day',
  docRequired: false,
  dayCountMode: 'WorkingDay',
};

const openEligibility: EmployeeEligibility = {
  gender: 'M',
  maritalStatus: 'married',
  yearsOfService: 7,
};

function run(
  type: LeaveTypeDef,
  overrides: Partial<Parameters<typeof validateLeaveRequest>[0]> = {},
) {
  return validateLeaveRequest({
    type,
    totalDays: 1,
    hasRange: true,
    eligibility: openEligibility,
    hasPriorSameCodeRequest: false,
    ...overrides,
  }).reasons;
}

function keys(type: LeaveTypeDef, overrides = {}) {
  return run(type, overrides).map((r) => r.key);
}

describe('validateLeaveRequest', () => {
  test('open type + valid input → no reasons', () => {
    expect(run(baseType)).toEqual([]);
  });

  test('undefined type → no reasons', () => {
    expect(
      validateLeaveRequest({
        type: undefined,
        totalDays: 5,
        hasRange: true,
        eligibility: openEligibility,
        hasPriorSameCodeRequest: true,
      }).reasons,
    ).toEqual([]);
  });

  // ── AC-3: Day-off ──
  describe('dayOffOnly (AC-3)', () => {
    test('WorkingDay type, range selected, 0 countable days → fires', () => {
      expect(keys(baseType, { totalDays: 0, hasRange: true })).toContain('dayOffOnly');
    });

    test('WorkingDay type with countable days → no-op', () => {
      expect(keys(baseType, { totalDays: 2, hasRange: true })).not.toContain('dayOffOnly');
    });

    test('no range selected → no-op even at 0 days', () => {
      expect(keys(baseType, { totalDays: 0, hasRange: false })).not.toContain('dayOffOnly');
    });

    test('CalendarDay type is exempt', () => {
      const cal: LeaveTypeDef = { ...baseType, dayCountMode: 'CalendarDay' };
      expect(keys(cal, { totalDays: 0, hasRange: true })).not.toContain('dayOffOnly');
    });
  });

  // ── AC-8: Min/Max duration ──
  describe('min/max duration (AC-8)', () => {
    test('maxDays exceeded → fires', () => {
      const t: LeaveTypeDef = { ...baseType, maxDays: 7 };
      expect(keys(t, { totalDays: 8 })).toContain('maxDays');
    });

    test('maxDays at boundary → no-op', () => {
      const t: LeaveTypeDef = { ...baseType, maxDays: 7 };
      expect(keys(t, { totalDays: 7 })).not.toContain('maxDays');
    });

    test('minDays not met → fires', () => {
      const t: LeaveTypeDef = { ...baseType, minDays: 3 };
      expect(keys(t, { totalDays: 1 })).toContain('minDays');
    });

    test('minDays at boundary → no-op', () => {
      const t: LeaveTypeDef = { ...baseType, minDays: 3 };
      expect(keys(t, { totalDays: 3 })).not.toContain('minDays');
    });

    test('minDays with 0 days (no range yet) → no-op', () => {
      const t: LeaveTypeDef = { ...baseType, minDays: 3 };
      expect(keys(t, { totalDays: 0, hasRange: false })).not.toContain('minDays');
    });

    test('no min/max config → no-op', () => {
      expect(keys(baseType, { totalDays: 99 })).not.toContain('maxDays');
      expect(keys(baseType, { totalDays: 1 })).not.toContain('minDays');
    });
  });

  // ── AC-9: Service / YoS ──
  describe('service / years-of-service (AC-9)', () => {
    test('YoS below threshold → fires', () => {
      const t: LeaveTypeDef = { ...baseType, minYearsOfService: 10 };
      expect(keys(t, { eligibility: { ...openEligibility, yearsOfService: 7 } })).toContain('service');
    });

    test('YoS at threshold → no-op', () => {
      const t: LeaveTypeDef = { ...baseType, minYearsOfService: 5 };
      expect(keys(t, { eligibility: { ...openEligibility, yearsOfService: 5 } })).not.toContain('service');
    });

    test('no service config → no-op', () => {
      expect(keys(baseType, { eligibility: { ...openEligibility, yearsOfService: 0 } })).not.toContain('service');
    });
  });

  // ── AC-6/7: Gender ──
  describe('gender (AC-6/AC-7)', () => {
    test('mismatched gender → fires', () => {
      const t: LeaveTypeDef = { ...baseType, genderRestriction: 'F' };
      expect(keys(t, { eligibility: { ...openEligibility, gender: 'M' } })).toContain('gender');
    });

    test('matching gender → no-op', () => {
      const t: LeaveTypeDef = { ...baseType, genderRestriction: 'F' };
      expect(keys(t, { eligibility: { ...openEligibility, gender: 'F' } })).not.toContain('gender');
    });

    test('unknown profile gender → no-op (cannot disqualify)', () => {
      const t: LeaveTypeDef = { ...baseType, genderRestriction: 'F' };
      expect(keys(t, { eligibility: { ...openEligibility, gender: undefined } })).not.toContain('gender');
    });

    test('no gender restriction → no-op', () => {
      expect(keys(baseType)).not.toContain('gender');
    });

    test('gender message is neutral (no Female/Male exposure)', () => {
      const t: LeaveTypeDef = { ...baseType, genderRestriction: 'F' };
      const reason = run(t, { eligibility: { ...openEligibility, gender: 'M' } }).find((r) => r.key === 'gender');
      expect(reason?.msgEn).toBe('This leave type is not available for your profile');
      expect(reason?.msgEn).not.toMatch(/female|male/i);
    });
  });

  // ── AC-7: Marital ──
  describe('marital (AC-7)', () => {
    test('mismatched marital status → fires', () => {
      const t: LeaveTypeDef = { ...baseType, maritalRestriction: 'single' };
      expect(keys(t, { eligibility: { ...openEligibility, maritalStatus: 'married' } })).toContain('marital');
    });

    test('matching marital status → no-op', () => {
      const t: LeaveTypeDef = { ...baseType, maritalRestriction: 'single' };
      expect(keys(t, { eligibility: { ...openEligibility, maritalStatus: 'single' } })).not.toContain('marital');
    });

    test('unknown profile marital status → no-op', () => {
      const t: LeaveTypeDef = { ...baseType, maritalRestriction: 'single' };
      expect(keys(t, { eligibility: { ...openEligibility, maritalStatus: undefined } })).not.toContain('marital');
    });

    test('no marital restriction → no-op', () => {
      expect(keys(baseType)).not.toContain('marital');
    });
  });

  // ── AC-10: One-time ──
  describe('one-time per employment (AC-10)', () => {
    test('one-time type with prior non-rejected request → fires', () => {
      const t: LeaveTypeDef = { ...baseType, oneTimePerEmployment: true };
      expect(keys(t, { hasPriorSameCodeRequest: true })).toContain('oneTime');
    });

    test('one-time type with no prior request → no-op', () => {
      const t: LeaveTypeDef = { ...baseType, oneTimePerEmployment: true };
      expect(keys(t, { hasPriorSameCodeRequest: false })).not.toContain('oneTime');
    });

    test('non one-time type with prior request → no-op', () => {
      expect(keys(baseType, { hasPriorSameCodeRequest: true })).not.toContain('oneTime');
    });
  });

  // ── AC-0/AC-1 reference: clamp + quota message are in page.tsx, not the helper.
  // The helper only carries the NEW predicates; quota/overlap/docs stay in the form.

  test('every reason carries both EN and TH copy', () => {
    const t: LeaveTypeDef = {
      ...baseType,
      maxDays: 1,
      minYearsOfService: 99,
      genderRestriction: 'F',
      maritalRestriction: 'single',
      oneTimePerEmployment: true,
    };
    const reasons = run(t, {
      totalDays: 5,
      hasRange: true,
      eligibility: { gender: 'M', maritalStatus: 'married', yearsOfService: 1 },
      hasPriorSameCodeRequest: true,
    });
    expect(reasons.length).toBeGreaterThan(0);
    for (const r of reasons) {
      expect(r.msgEn.length).toBeGreaterThan(0);
      expect(r.msgTh.length).toBeGreaterThan(0);
    }
  });
});
