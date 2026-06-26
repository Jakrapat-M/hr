/**
 * ot-validate.test.ts — STA-164 multi-day OT submission validation.
 *
 * Covers the pure validateOtDayRows helper: per-row validity, payroll period,
 * cross-row overlap, existing-OT overlap (stored multi-day days[] AND stored
 * single-day span both participate), leave overlap, and the monthly cap on the
 * SUMMED total. refDate is pinned to 2026-06-07 (period 21 May → 20 Jun) so the
 * period gate is deterministic regardless of wall-clock today.
 */

import { describe, it, expect } from 'vitest';
import { validateOtDayRows, type OtDayWindow } from '../ot-math';
import type { OTRequest } from '@/stores/overtime-requests';

const REF = new Date(Date.UTC(2026, 5, 7)); // 2026-06-07

function win(date: string, startTime: string, endTime: string, hours: number): OtDayWindow {
  return { date, startAt: `${date}T${startTime}:00`, endAt: `${date}T${endTime}:00`, hours };
}

function stored(overrides: Partial<OTRequest>): OTRequest {
  return {
    id: 'OT-S',
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

const base = {
  storedOt: [] as OTRequest[],
  leave: [] as { startDate: string; endDate: string }[],
  monthToDateHours: 0,
  refDate: REF,
};

describe('validateOtDayRows — per-row + period', () => {
  it('accepts a valid single-row submission', () => {
    expect(validateOtDayRows({ ...base, dayWindows: [win('2026-06-02', '18:00', '21:00', 3)] })).toBeNull();
  });

  it('rejects a row missing a date', () => {
    const bad: OtDayWindow = { date: '', startAt: '', endAt: '', hours: 0 };
    expect(validateOtDayRows({ ...base, dayWindows: [bad] })).toEqual({ code: 'invalid_row' });
  });

  it('rejects an equal-time row as bad_range (ordering: bad_range precedes hours<=0)', () => {
    // startAt === endAt → backwards/equal range. STA-173 drops the +1day
    // inference, so equal-time now surfaces as bad_range, not invalid_row.
    expect(validateOtDayRows({ ...base, dayWindows: [win('2026-06-02', '18:00', '18:00', 0)] })).toEqual({
      code: 'bad_range',
    });
  });

  it('rejects a backwards range (same date, earlier end) as bad_range', () => {
    // Build the window manually — win() assumes end>start; feed a genuine
    // backwards endAt (23:00 → 02:00 with NO date bump).
    const bad: OtDayWindow = {
      date: '2026-06-02',
      startAt: '2026-06-02T23:00:00',
      endAt: '2026-06-02T02:00:00',
      hours: 0,
    };
    expect(validateOtDayRows({ ...base, dayWindows: [bad] })).toEqual({ code: 'bad_range' });
  });

  it('keeps a blank row as invalid_row (empty check precedes bad_range)', () => {
    const blank: OtDayWindow = { date: '', startAt: '', endAt: '', hours: 0 };
    expect(validateOtDayRows({ ...base, dayWindows: [blank] })).toEqual({ code: 'invalid_row' });
  });

  it('accepts a valid cross-day row (23:00 → next-day 01:00)', () => {
    const crossDay: OtDayWindow = {
      date: '2026-06-02',
      startAt: '2026-06-02T23:00:00',
      endAt: '2026-06-03T01:00:00',
      hours: 2,
    };
    expect(validateOtDayRows({ ...base, dayWindows: [crossDay] })).toBeNull();
  });

  it('rejects a row outside the current payroll period', () => {
    // 2026-04-10 is well before the 21 May → 20 Jun period.
    expect(validateOtDayRows({ ...base, dayWindows: [win('2026-04-10', '18:00', '21:00', 3)] })).toEqual({
      code: 'outside_period',
    });
  });
});

describe('validateOtDayRows — cross-row overlap', () => {
  it('rejects two same-day rows that overlap in time', () => {
    const rows = [win('2026-06-02', '18:00', '21:00', 3), win('2026-06-02', '20:00', '22:00', 2)];
    expect(validateOtDayRows({ ...base, dayWindows: rows })).toEqual({ code: 'cross_row' });
  });

  it('accepts two rows on different days', () => {
    const rows = [win('2026-06-02', '18:00', '21:00', 3), win('2026-06-03', '18:00', '20:00', 2)];
    expect(validateOtDayRows({ ...base, dayWindows: rows })).toBeNull();
  });
});

describe('validateOtDayRows — existing-OT overlap', () => {
  it('matches a stored MULTI-DAY request via its days[] (not the span)', () => {
    const storedMulti = stored({
      id: 'OT-M',
      startAt: '2026-06-01T18:00:00',
      endAt: '2026-06-03T21:00:00', // misleading span
      hours: 9,
      days: [
        { date: '2026-06-01', startAt: '2026-06-01T18:00:00', endAt: '2026-06-01T21:00:00', hours: 3 },
        { date: '2026-06-03', startAt: '2026-06-03T18:00:00', endAt: '2026-06-03T21:00:00', hours: 3 },
      ],
      status: 'approved',
    });
    // New row collides with stored DAY 2 (06-03), which lives inside days[].
    const rows = [win('2026-06-03', '19:00', '22:00', 3)];
    expect(validateOtDayRows({ ...base, storedOt: [storedMulti], dayWindows: rows })).toEqual({
      code: 'existing_ot',
    });
  });

  it('does NOT match the misleading span gap of a stored multi-day request', () => {
    const storedMulti = stored({
      id: 'OT-M',
      startAt: '2026-06-01T18:00:00',
      endAt: '2026-06-03T21:00:00',
      hours: 6,
      days: [
        { date: '2026-06-01', startAt: '2026-06-01T18:00:00', endAt: '2026-06-01T21:00:00', hours: 3 },
        { date: '2026-06-03', startAt: '2026-06-03T18:00:00', endAt: '2026-06-03T21:00:00', hours: 3 },
      ],
      status: 'approved',
    });
    // 06-02 falls inside the SPAN but not inside any stored day → must be allowed.
    const rows = [win('2026-06-02', '18:00', '21:00', 3)];
    expect(validateOtDayRows({ ...base, storedOt: [storedMulti], dayWindows: rows })).toBeNull();
  });

  it('matches a stored SINGLE-DAY request via its span (still participates)', () => {
    const storedSingle = stored({
      id: 'OT-1',
      startAt: '2026-06-05T18:00:00',
      endAt: '2026-06-05T21:00:00',
      hours: 3,
      status: 'pending',
    });
    const rows = [win('2026-06-05', '20:00', '23:00', 3)];
    expect(validateOtDayRows({ ...base, storedOt: [storedSingle], dayWindows: rows })).toEqual({
      code: 'existing_ot',
    });
  });

  it('ignores a rejected stored request', () => {
    const rejected = stored({
      id: 'OT-R',
      startAt: '2026-06-05T18:00:00',
      endAt: '2026-06-05T21:00:00',
      hours: 3,
      status: 'rejected',
    });
    const rows = [win('2026-06-05', '18:00', '21:00', 3)];
    expect(validateOtDayRows({ ...base, storedOt: [rejected], dayWindows: rows })).toBeNull();
  });
});

describe('validateOtDayRows — leave + cap', () => {
  it('rejects a row whose date falls inside a leave span', () => {
    const rows = [win('2026-06-04', '18:00', '21:00', 3)];
    const leave = [{ startDate: '2026-06-03', endDate: '2026-06-05' }];
    expect(validateOtDayRows({ ...base, leave, dayWindows: rows })).toEqual({ code: 'leave' });
  });

  it('rejects when the END day of a cross-day row falls inside a leave span (start day leave-free)', () => {
    // STA-173 Change C — row 2 Jun 23:00 → 3 Jun 14:00; leave on 3 Jun only.
    // The start day (2 Jun) is leave-free; only the END day (3 Jun) collides.
    const crossDay: OtDayWindow = {
      date: '2026-06-02',
      startAt: '2026-06-02T23:00:00',
      endAt: '2026-06-03T14:00:00',
      hours: 15,
    };
    const leave = [{ startDate: '2026-06-03', endDate: '2026-06-03' }];
    expect(validateOtDayRows({ ...base, leave, dayWindows: [crossDay] })).toEqual({ code: 'leave' });
  });

  it('rejects when month-to-date + SUMMED total exceeds the cap; total carries the sum', () => {
    // cap 36; month-to-date 30; two rows summing 8 → 38 > 36.
    const rows = [win('2026-06-02', '18:00', '22:00', 4), win('2026-06-03', '18:00', '22:00', 4)];
    expect(validateOtDayRows({ ...base, monthToDateHours: 30, dayWindows: rows })).toEqual({
      code: 'over_cap',
      total: 38,
    });
  });

  it('accepts when the summed total stays within the cap', () => {
    const rows = [win('2026-06-02', '18:00', '22:00', 4), win('2026-06-03', '18:00', '22:00', 4)];
    expect(validateOtDayRows({ ...base, monthToDateHours: 20, dayWindows: rows })).toBeNull();
  });
});
