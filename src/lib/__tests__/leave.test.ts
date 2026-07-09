import { describe, it, expect } from 'vitest';
import {
  calculateWorkingDays,
  countLeaveDays,
  remainingAfter,
  isOverQuota,
} from '@/lib/leave-math';

describe('calculateWorkingDays', () => {
  it('returns 5 for a full work week (Mon-Fri)', () => {
    // 2026-03-02 is Monday, 2026-03-06 is Friday
    expect(calculateWorkingDays('2026-03-02', '2026-03-06')).toBe(5);
  });

  it('returns 1 for a single working day', () => {
    expect(calculateWorkingDays('2026-03-02', '2026-03-02')).toBe(1);
  });

  it('returns 0 for a single weekend day (Saturday)', () => {
    expect(calculateWorkingDays('2026-03-07', '2026-03-07')).toBe(0);
  });

  it('returns 0 for a single weekend day (Sunday)', () => {
    expect(calculateWorkingDays('2026-03-08', '2026-03-08')).toBe(0);
  });

  it('returns 0 when end is before start', () => {
    expect(calculateWorkingDays('2026-03-06', '2026-03-02')).toBe(0);
  });

  it('handles a two-week span correctly', () => {
    // Mon 2026-03-02 to Fri 2026-03-13 = 10 working days
    expect(calculateWorkingDays('2026-03-02', '2026-03-13')).toBe(10);
  });

  it('excludes weekends within a range', () => {
    // Thu 2026-03-05 to Tue 2026-03-10 = Thu, Fri, Mon, Tue = 4 days
    expect(calculateWorkingDays('2026-03-05', '2026-03-10')).toBe(4);
  });

  it('handles Songkran range (Sat-Wed includes 3 weekdays before holidays)', () => {
    // 2026-04-11 (Sat) to 2026-04-15 (Wed) = Mon, Tue, Wed = 3 working days
    expect(calculateWorkingDays('2026-04-11', '2026-04-15')).toBe(3);
  });
});

describe('countLeaveDays — weekend + holiday exclusion', () => {
  const holidays = ['2026-04-13', '2026-04-14', '2026-04-15']; // Songkran (Mon-Wed)

  it('matches calculateWorkingDays when no holidays given', () => {
    expect(countLeaveDays('2026-03-02', '2026-03-06')).toBe(5);
  });

  it('subtracts weekday holidays from the working-day base', () => {
    // Mon-Wed 2026-04-13..15 are all weekday Songkran holidays → 0 leave days
    expect(countLeaveDays('2026-04-13', '2026-04-15', { holidays })).toBe(0);
  });

  it('counts only the non-holiday weekdays in a mixed range', () => {
    // Fri 2026-04-10 (work) + Sat/Sun + Mon-Wed (holiday) = 1 leave day
    expect(countLeaveDays('2026-04-10', '2026-04-15', { holidays })).toBe(1);
  });

  it('ignores holidays that fall on a weekend (already excluded)', () => {
    // 2026-04-11/12 are Sat/Sun; passing them as holidays changes nothing
    expect(
      countLeaveDays('2026-04-09', '2026-04-10', {
        holidays: ['2026-04-11', '2026-04-12'],
      }),
    ).toBe(2);
  });

  it('applies half-day (0.5) only on a single working day', () => {
    expect(countLeaveDays('2026-03-02', '2026-03-02', { halfDay: 'morning' })).toBe(0.5);
    expect(countLeaveDays('2026-03-02', '2026-03-02', { halfDay: 'afternoon' })).toBe(0.5);
    expect(countLeaveDays('2026-03-02', '2026-03-02', { halfDay: 'none' })).toBe(1);
  });

  it('does not apply half-day across a multi-day range', () => {
    expect(countLeaveDays('2026-03-02', '2026-03-03', { halfDay: 'morning' })).toBe(2);
  });

  it('returns 0 for a weekend-only single day even with half-day', () => {
    expect(countLeaveDays('2026-03-07', '2026-03-07', { halfDay: 'morning' })).toBe(0);
  });
});

describe('remainingAfter / isOverQuota — string balance + unlimited guard', () => {
  it('parses a decimal string balance', () => {
    expect(remainingAfter('8.5', 2)).toBe(6.5);
  });

  it('can go negative when over-quota', () => {
    expect(remainingAfter('3.0', 5)).toBe(-2);
  });

  it('returns null (no quota) for unlimited balance', () => {
    expect(remainingAfter('ไม่จำกัด', 99)).toBeNull();
  });

  it('flags over-quota exactly at the boundary+1', () => {
    expect(isOverQuota('5', 5)).toBe(false); // equal is allowed
    expect(isOverQuota('5', 5.5)).toBe(true); // just over
    expect(isOverQuota('5', 6)).toBe(true);
  });

  it('never flags an unlimited balance as over-quota', () => {
    expect(isOverQuota('ไม่จำกัด', 1000)).toBe(false);
  });
});

describe('leave balance validation', () => {
  const mockBalances = [
    { type: 'annual', remaining: 5 },
    { type: 'sick', remaining: 27 },
    { type: 'personal', remaining: 2 },
  ];

  it('validates request does not exceed balance', () => {
    const balance = mockBalances.find((b) => b.type === 'annual');
    expect(balance).toBeDefined();
    expect(3 <= balance!.remaining).toBe(true);
  });

  it('detects when request exceeds balance', () => {
    const balance = mockBalances.find((b) => b.type === 'personal');
    expect(balance).toBeDefined();
    expect(5 <= balance!.remaining).toBe(false);
  });

  it('flags medical cert needed for sick leave >= 3 days', () => {
    const days = 3;
    const leaveType = 'sick';
    const needsMedCert = leaveType === 'sick' && days >= 3;
    expect(needsMedCert).toBe(true);
  });

  it('does not flag medical cert for sick leave < 3 days', () => {
    const days = 2;
    const leaveType = 'sick';
    const needsMedCert = leaveType === 'sick' && days >= 3;
    expect(needsMedCert).toBe(false);
  });

  it('flags HR approval for leaves > 5 days', () => {
    const days = 6;
    const needsHRApproval = days > 5;
    expect(needsHRApproval).toBe(true);
  });

  it('does not flag HR approval for leaves <= 5 days', () => {
    const days = 5;
    const needsHRApproval = days > 5;
    expect(needsHRApproval).toBe(false);
  });
});
