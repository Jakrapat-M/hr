import { describe, expect, test } from 'vitest';
import {
  currentPeriod,
  isWithinCurrentPeriod,
  isTimesheetLocked,
  isBookableLeaveDate,
  LEAVE_BOOKING_HORIZON_DAYS,
} from '@/lib/time/period';

function isoPlusDays(base: Date, days: number): string {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('period (21 → 20 payroll window)', () => {
  test('ref day >= 21 → [this month 21 → next month 20]', () => {
    const p = currentPeriod(new Date(Date.UTC(2026, 5, 25))); // 2026-06-25
    expect(p.start).toBe('2026-06-21');
    expect(p.end).toBe('2026-07-20');
  });

  test('ref day < 21 → [previous month 21 → this month 20]', () => {
    const p = currentPeriod(new Date(Date.UTC(2026, 5, 10))); // 2026-06-10
    expect(p.start).toBe('2026-05-21');
    expect(p.end).toBe('2026-06-20');
  });

  test('window crosses a year boundary', () => {
    const p = currentPeriod(new Date(Date.UTC(2026, 11, 30))); // 2026-12-30
    expect(p.start).toBe('2026-12-21');
    expect(p.end).toBe('2027-01-20');
  });

  test('isWithinCurrentPeriod respects inclusive bounds', () => {
    const ref = new Date(Date.UTC(2026, 5, 25));
    expect(isWithinCurrentPeriod('2026-06-21', ref)).toBe(true);
    expect(isWithinCurrentPeriod('2026-07-20', ref)).toBe(true);
    expect(isWithinCurrentPeriod('2026-06-20', ref)).toBe(false);
    expect(isWithinCurrentPeriod('2026-07-21', ref)).toBe(false);
  });

  test('no refDate yields a coherent 21→20 window around the real today', () => {
    const p = currentPeriod();
    // Window is always a valid 21→20 pair: start day is the 21st, end day the 20th.
    expect(p.start.slice(8)).toBe('21');
    expect(p.end.slice(8)).toBe('20');
    expect(p.start < p.end).toBe(true);
  });
});

describe('isBookableLeaveDate (today..+90d advance window)', () => {
  const REF = new Date(Date.UTC(2026, 5, 7)); // 2026-06-07

  test('today is bookable', () => {
    expect(isBookableLeaveDate('2026-06-07', REF)).toBe(true);
  });

  test('a near-future date (next week) is bookable — the core P1-2 fix', () => {
    expect(isBookableLeaveDate('2026-06-14', REF)).toBe(true);
  });

  test('a future date beyond the current payroll period is still bookable', () => {
    // 2026-07-20 sits outside the 21→20 period for ref 06-07 (05-21..06-20)
    // but is within the 90-day leave horizon.
    expect(isWithinCurrentPeriod('2026-07-20', REF)).toBe(false);
    expect(isBookableLeaveDate('2026-07-20', REF)).toBe(true);
  });

  test('the horizon boundary is inclusive; one day past is not bookable', () => {
    expect(isBookableLeaveDate(isoPlusDays(REF, LEAVE_BOOKING_HORIZON_DAYS), REF)).toBe(true);
    expect(isBookableLeaveDate(isoPlusDays(REF, LEAVE_BOOKING_HORIZON_DAYS + 1), REF)).toBe(false);
  });

  test('past dates are not bookable', () => {
    expect(isBookableLeaveDate('2026-06-06', REF)).toBe(false);
  });

  test('empty string is not bookable', () => {
    expect(isBookableLeaveDate('', REF)).toBe(false);
  });
});

describe('time-correction lock semantics are unchanged by the leave horizon', () => {
  const REF = new Date(Date.UTC(2026, 5, 7)); // 2026-06-07 → period 05-21..06-20

  test('a date before the current period start is still locked for corrections', () => {
    expect(isTimesheetLocked('2026-05-20', REF)).toBe(true);
  });

  test('a date inside the current period is not locked', () => {
    expect(isTimesheetLocked('2026-06-07', REF)).toBe(false);
  });
});
