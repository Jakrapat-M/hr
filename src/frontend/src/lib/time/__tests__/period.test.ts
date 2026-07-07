import { describe, expect, test } from 'vitest';
import {
  currentPeriod,
  previousPeriod,
  isWithinCurrentPeriod,
  isTimesheetLocked,
  isBookableLeaveDate,
  LEAVE_BACKDATE_MIN,
  LEAVE_BOOKING_HORIZON_DAYS,
  periodOptions,
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

  // STA-156 — backdated leave is allowed down to the PREVIOUS payroll cycle
  // (floor = previousPeriod start). For ref 06-07: current cycle = 05-21..06-20,
  // previous cycle = 04-21..05-20 → floor = 2026-04-21.
  test('a past date in the current cycle IS bookable', () => {
    expect(isBookableLeaveDate('2026-06-06', REF)).toBe(true); // current cycle
    expect(isBookableLeaveDate('2026-05-21', REF)).toBe(true); // current-cycle start
  });

  test('a past date in the previous cycle IS bookable (STA-156 extends 1 cycle back)', () => {
    expect(isBookableLeaveDate('2026-05-20', REF)).toBe(true); // previous-cycle end — blocked under STA-130, allowed now
    expect(isBookableLeaveDate('2026-04-21', REF)).toBe(true); // the floor itself (previous-cycle start)
  });

  test('a date before the previous cycle is NOT bookable (the 1-cycle cap)', () => {
    expect(isBookableLeaveDate('2026-04-20', REF)).toBe(false); // one day before the floor
  });

  test('LEAVE_BACKDATE_MIN returns the previous payroll-cycle start', () => {
    expect(LEAVE_BACKDATE_MIN(REF)).toBe('2026-04-21');
  });

  test('previousPeriod is the 21→20 cycle immediately before the current one', () => {
    expect(previousPeriod(REF)).toEqual({ start: '2026-04-21', end: '2026-05-20' });
  });

  // The ticket's canonical AC example: today 25 Jun 2026 → earliest = 21 May 2026.
  test('STA-156 AC example: ref 2026-06-25 → floor 2026-05-21', () => {
    const REF25 = new Date(Date.UTC(2026, 5, 25)); // 2026-06-25
    expect(LEAVE_BACKDATE_MIN(REF25)).toBe('2026-05-21');
    expect(isBookableLeaveDate('2026-05-21', REF25)).toBe(true);  // earliest selectable
    expect(isBookableLeaveDate('2026-05-20', REF25)).toBe(false); // before previous cycle
  });

  test('empty string is not bookable', () => {
    expect(isBookableLeaveDate('', REF)).toBe(false);
  });
});

describe('periodOptions — bounded pay-period dropdown options (STA-249)', () => {
  const REF = new Date(Date.UTC(2026, 5, 7)); // 2026-06-07 → current period 05-21..06-20

  test('offers 12 back + current + 3 forward = 16 options, exactly one current', () => {
    const opts = periodOptions(REF);
    expect(opts).toHaveLength(16);
    expect(opts.filter((o) => o.isCurrent)).toHaveLength(1);
    // The current option is the payroll period containing the ref day.
    const cur = opts.find((o) => o.isCurrent)!;
    expect(cur.start).toBe('2026-05-21');
    expect(cur.end).toBe('2026-06-20');
  });

  test('first option is not older than 1 year back; last is not beyond +3 months', () => {
    const opts = periodOptions(REF);
    const cur = opts.find((o) => o.isCurrent)!;
    // First option starts exactly one year before the current period start.
    expect(opts[0].start).toBe('2025-05-21');
    expect(opts[0].start >= isoPlusDays(new Date(`${cur.start}T00:00:00Z`), -366)).toBe(true);
    // Last option ends exactly three months after the current period end.
    expect(opts[opts.length - 1].end).toBe('2026-09-20');
    expect(opts[opts.length - 1].start).toBe('2026-08-21');
  });

  test('every option is a 21st → 20th window with a stable start-ISO key', () => {
    for (const o of periodOptions(REF)) {
      expect(o.key).toBe(o.start);
      expect(o.start.slice(-2)).toBe('21');
      expect(o.end.slice(-2)).toBe('20');
    }
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
