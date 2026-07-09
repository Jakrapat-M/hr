import { describe, it, expect } from 'vitest';
import { leaveHours, leaveWorkingDays, fmtHours, LEAVE_DAY_HOURS } from '../leave-hours';

// STA-258 — requested leave hours: working days × 8h, where a day colliding with
// the employee's weekly day-off or a public holiday does NOT count.
//
// Fixture employee: EMP102 (calendarType 'HO' → HO_STD template: Sat+Sun off,
// Mon–Fri working). Holidays from TIME_HOLIDAYS_2026: 2026-06-01 (Visakha
// Bucha), 2026-06-03 (Queen's Birthday).
const EMP = 'EMP102';

describe('leaveWorkingDays', () => {
  it('skips public holidays inside the span', () => {
    // Mon 06-01 (holiday) · Tue 06-02 · Wed 06-03 (holiday) → only 06-02 counts.
    expect(leaveWorkingDays('2026-06-01', '2026-06-03', EMP)).toBe(1);
  });

  it('skips the weekly days-off (Sat+Sun for the HO template)', () => {
    // Fri 06-12 · Sat 06-13 (off) · Sun 06-14 (off) · Mon 06-15 → 2 days.
    expect(leaveWorkingDays('2026-06-12', '2026-06-15', EMP)).toBe(2);
  });

  it('a leave that falls entirely on a day-off counts zero', () => {
    expect(leaveWorkingDays('2026-06-14', '2026-06-14', EMP)).toBe(0); // Sunday
  });

  it('empty/backwards input → 0', () => {
    expect(leaveWorkingDays('', '', EMP)).toBe(0);
    expect(leaveWorkingDays('2026-06-10', '2026-06-09', EMP)).toBe(0);
  });
});

describe('leaveHours', () => {
  it('working days × 8h; holiday days do not count', () => {
    expect(leaveHours('2026-06-01', '2026-06-03', EMP)).toBe(1 * LEAVE_DAY_HOURS); // 8
    expect(leaveHours('2026-06-12', '2026-06-15', EMP)).toBe(2 * LEAVE_DAY_HOURS); // 16 (weekend skipped)
  });

  it('half-day leave = 4h; 0 when the day itself is a holiday/day-off', () => {
    expect(leaveHours('2026-06-09', '2026-06-09', EMP, { halfDay: true })).toBe(4);
    expect(leaveHours('2026-06-01', '2026-06-01', EMP, { halfDay: true })).toBe(0); // holiday
  });

  it('duration-based (hourly) leave converts minutes → hours', () => {
    expect(leaveHours('2026-06-09', '2026-06-09', EMP, { durationMinutes: 90 })).toBe(1.5);
  });
});

describe('fmtHours — X.XX display format', () => {
  it('always renders 2 decimals', () => {
    expect(fmtHours(16)).toBe('16.00');
    expect(fmtHours(1.5)).toBe('1.50');
    expect(fmtHours(0)).toBe('0.00');
  });
});
