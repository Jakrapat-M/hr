import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getScheduleForPeriod } from '../schedule-template';
import { getAttendanceForPeriod } from '../attendance-seed';
import { currentPeriod, DEMO_TODAY } from '../period';

// Regression lock for the time-module demo-seed anchor.
//
// The DEMO time-grid seeds (schedule/attendance, rendered by /roster +
// /time/timesheet) must stay pinned to the DEMO_TODAY payroll period so the
// seeded ~30-day window never slides off wall-clock today and goes blank.
// Meanwhile currentPeriod()'s DEFAULT ref must keep tracking real today — the
// leave-booking / timesheet-lock logic depends on it. This test pins BOTH
// invariants under a faked clock well outside the demo period.
describe('time-module demo anchor (DEMO_TODAY pinning)', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T03:00:00Z')); // a month past the demo period
  });
  afterAll(() => vi.useRealTimers());

  it('DEMO_TODAY is the canonical 2026-06-07 anchor', () => {
    expect(DEMO_TODAY).toBe('2026-06-07');
  });

  it('currentPeriod() default still follows wall-clock (booking/lock logic intact)', () => {
    expect(currentPeriod()).toEqual({ start: '2026-06-21', end: '2026-07-20' });
  });

  it('schedule seed stays pinned to the DEMO_TODAY period (no wall-clock drift)', () => {
    const s = getScheduleForPeriod('EMP101');
    expect(s[0].date).toBe('2026-05-21');
    expect(s[s.length - 1].date).toBe('2026-06-20');
  });

  it('attendance seed stays pinned and past demo days carry punches', () => {
    const a = getAttendanceForPeriod('EMP101');
    expect(a[0].date).toBe('2026-05-21');
    expect(a[a.length - 1].date).toBe('2026-06-20');
    expect(a.some((d) => d.actualIn !== null)).toBe(true);
  });
});
