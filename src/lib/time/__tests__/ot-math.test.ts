/**
 * ot-math.test.ts — Group B OT arithmetic acceptance tests.
 *
 * Covers the spec case (cross-midnight 23:00 → 02:00 = 3h), same-day diffs,
 * equal-time → 0, 2-decimal rounding, and the monthly cap total.
 */

import { describe, it, expect } from 'vitest';
import {
  computeOtHours,
  otDisplayHours,
  monthlyOtTotal,
  yearlyOtTotal,
  MONTHLY_OT_CAP_HOURS,
} from '../ot-math';
import type { OTRequest } from '@/stores/overtime-requests';

function ot(overrides: Partial<OTRequest>): OTRequest {
  return {
    id: 'OT-X',
    employeeId: 'EMP001',
    employeeName: 'A',
    department: 'Store',
    otType: 'OT',
    startAt: '2026-06-01T18:00:00',
    endAt: '2026-06-01T20:00:00',
    hours: 2,
    reason: 'r',
    docs: [],
    status: 'pending',
    submittedAt: '2026-06-01T08:00:00+07:00',
    audit: [],
    ...overrides,
  };
}

describe('computeOtHours', () => {
  it('cross-midnight: 1 Jun 23:00 → 2 Jun 02:00 = 3h (spec case)', () => {
    expect(computeOtHours('2026-06-01T23:00:00', '2026-06-02T02:00:00')).toBe(3);
  });

  it('same-day: 18:00 → 21:30 = 3.5h', () => {
    expect(computeOtHours('2026-06-01T18:00:00', '2026-06-01T21:30:00')).toBe(3.5);
  });

  it('equal time = 0', () => {
    expect(computeOtHours('2026-06-01T18:00:00', '2026-06-01T18:00:00')).toBe(0);
  });

  it('wrap when end time-of-day is earlier on the SAME date string adds 24h', () => {
    // 23:00 → 02:00 expressed same-day still wraps to 3h.
    expect(computeOtHours('2026-06-01T23:00:00', '2026-06-01T02:00:00')).toBe(3);
  });

  it('rounds to 2 decimals', () => {
    // 18:00 → 18:20 = 0.333... → 0.33
    expect(computeOtHours('2026-06-01T18:00:00', '2026-06-01T18:20:00')).toBe(0.33);
  });

  it('invalid input = 0', () => {
    expect(computeOtHours('nope', '2026-06-01T20:00:00')).toBe(0);
  });
});

describe('otDisplayHours (STA-164)', () => {
  it('single-day (no days[]) → equals computeOtHours(startAt, endAt)', () => {
    const req = ot({ startAt: '2026-06-01T18:00:00', endAt: '2026-06-01T21:30:00', hours: 3.5 });
    expect(otDisplayHours(req)).toBe(3.5);
    expect(otDisplayHours(req)).toBe(computeOtHours(req.startAt, req.endAt));
  });

  it('single-day with an empty days[] still recomputes from the window', () => {
    const req = ot({ startAt: '2026-06-01T18:00:00', endAt: '2026-06-01T20:00:00', hours: 2, days: [] });
    expect(otDisplayHours(req)).toBe(2);
  });

  it('multi-day → returns the stored TOTAL, not the span (span ≠ duration)', () => {
    // Span 1 Jun 18:00 → 3 Jun 02:00; the wall-clock span via computeOtHours would
    // wildly over-count (~32h), but the stored total is the summed 11h.
    const req = ot({
      startAt: '2026-06-01T18:00:00',
      endAt: '2026-06-03T02:00:00',
      hours: 11,
      days: [
        { date: '2026-06-01', startAt: '2026-06-01T18:00:00', endAt: '2026-06-01T22:00:00', hours: 4 },
        { date: '2026-06-02', startAt: '2026-06-02T18:00:00', endAt: '2026-06-02T21:00:00', hours: 3 },
        { date: '2026-06-03', startAt: '2026-06-03T18:00:00', endAt: '2026-06-03T22:00:00', hours: 4 },
      ],
    });
    expect(otDisplayHours(req)).toBe(11);
    // Guard: the naive span recompute really does diverge from the stored total.
    expect(computeOtHours(req.startAt, req.endAt)).not.toBe(11);
  });
});

describe('monthlyOtTotal / cap', () => {
  const refDate = new Date(Date.UTC(2026, 5, 7)); // 2026-06-07 (period 21 May → 20 Jun)

  it('sums approved + pending hours within the period; ignores rejected', () => {
    const reqs = [
      ot({ id: 'A', startAt: '2026-06-01T18:00:00', hours: 4, status: 'approved' }),
      ot({ id: 'B', startAt: '2026-06-02T18:00:00', hours: 3, status: 'pending' }),
      ot({ id: 'C', startAt: '2026-06-03T18:00:00', hours: 5, status: 'rejected' }),
    ];
    expect(monthlyOtTotal(reqs, 'EMP001', refDate)).toBe(7);
  });

  it('excludes rows outside the current period', () => {
    const reqs = [
      ot({ id: 'A', startAt: '2026-06-01T18:00:00', hours: 4, status: 'approved' }),
      ot({ id: 'D', startAt: '2026-04-10T18:00:00', hours: 6, status: 'approved' }),
    ];
    expect(monthlyOtTotal(reqs, 'EMP001', refDate)).toBe(4);
  });

  it('cap is 36 by default', () => {
    expect(MONTHLY_OT_CAP_HOURS).toBe(36);
  });

  it('only counts the matching employee', () => {
    const reqs = [
      ot({ id: 'A', employeeId: 'EMP001', startAt: '2026-06-01T18:00:00', hours: 4, status: 'approved' }),
      ot({ id: 'B', employeeId: 'EMP999', startAt: '2026-06-02T18:00:00', hours: 9, status: 'approved' }),
    ];
    expect(monthlyOtTotal(reqs, 'EMP001', refDate)).toBe(4);
  });
});

describe('yearlyOtTotal', () => {
  const refDate = new Date(Date.UTC(2026, 5, 7));
  it('sums across the calendar year', () => {
    const reqs = [
      ot({ id: 'A', startAt: '2026-02-10T18:00:00', hours: 4, status: 'approved' }),
      ot({ id: 'B', startAt: '2026-06-02T18:00:00', hours: 3, status: 'pending' }),
      ot({ id: 'C', startAt: '2025-12-30T18:00:00', hours: 5, status: 'approved' }),
    ];
    expect(yearlyOtTotal(reqs, 'EMP001', refDate)).toBe(7);
  });
});

// ── STA-256 — date/time entry helpers ────────────────────────────────────────
import { addDaysIso, autoEndDate, plusOneHour } from '../ot-math';

describe('addDaysIso', () => {
  it('adds days across month/year boundaries (UTC-safe)', () => {
    expect(addDaysIso('2026-07-08', 1)).toBe('2026-07-09');
    expect(addDaysIso('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('returns the input unchanged when unparseable', () => {
    expect(addDaysIso('not-a-date', 1)).toBe('not-a-date');
  });
});

describe('autoEndDate — STA-256 auto-filled End Date', () => {
  it('is empty without a start date; equals start while a time is blank', () => {
    expect(autoEndDate('', '18:00', '20:00')).toBe('');
    expect(autoEndDate('2026-07-08', '', '')).toBe('2026-07-08');
    expect(autoEndDate('2026-07-08', '18:00', '')).toBe('2026-07-08');
  });
  it('same day when end > start; +1 day when end ≤ start (cross-midnight)', () => {
    expect(autoEndDate('2026-07-08', '18:00', '20:00')).toBe('2026-07-08');
    expect(autoEndDate('2026-07-08', '23:00', '01:00')).toBe('2026-07-09');
    expect(autoEndDate('2026-07-08', '22:00', '22:00')).toBe('2026-07-09'); // equal → next day
  });
});

describe('plusOneHour — STA-256 +1 hour button math', () => {
  it('adds one hour, keeping minutes', () => {
    expect(plusOneHour('08:00')).toBe('09:00');
    expect(plusOneHour('18:30')).toBe('19:30');
  });
  it('wraps past midnight', () => {
    expect(plusOneHour('23:15')).toBe('00:15');
  });
  it('passes through malformed input', () => {
    expect(plusOneHour('')).toBe('');
    expect(plusOneHour('8:00')).toBe('8:00');
  });
});
