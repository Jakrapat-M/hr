import { describe, it, expect } from 'vitest';
import { otHoursByDateForWeek } from '../ot-week';
import { weekWindow } from '../week';
import type { OTRequest } from '@/stores/overtime-requests';

function ot(partial: Partial<OTRequest>): OTRequest {
  return {
    id: 'OT-X',
    employeeId: 'EMP-0301',
    employeeName: 'ทดสอบ',
    department: 'Store',
    otType: 'OT',
    startAt: '2026-06-01T18:00:00',
    endAt: '2026-06-01T21:00:00',
    hours: 3,
    reason: '',
    docs: [],
    status: 'pending',
    submittedAt: '2026-06-01T08:00:00',
    audit: [],
    ...partial,
  };
}

const week = weekWindow('2026-06-03'); // Mon 06-01 → Sun 06-07

describe('otHoursByDateForWeek', () => {
  it('sums an employee OT row on its startAt date within the week', () => {
    const map = otHoursByDateForWeek([ot({})], 'EMP-0301', week);
    expect(map['2026-06-01']).toBe(3);
  });

  it('counts a cross-midnight row on its START date (06-01), not the next day', () => {
    const map = otHoursByDateForWeek(
      [ot({ id: 'OT-NIGHT', startAt: '2026-06-01T23:00:00', endAt: '2026-06-02T02:00:00', hours: 3 })],
      'EMP-0301',
      week,
    );
    expect(map['2026-06-01']).toBe(3);
    expect(map['2026-06-02']).toBeUndefined();
  });

  it('sums multiple rows on the same day', () => {
    // Display hours derive from each single-day window (otDisplayHours): row `a`
    // is the default 18:00→21:00 (3h), row `b` is a 19:00→21:00 (2h) window.
    const map = otHoursByDateForWeek(
      [
        ot({ id: 'a', startAt: '2026-06-01T18:00:00', endAt: '2026-06-01T21:00:00', hours: 3 }),
        ot({ id: 'b', startAt: '2026-06-01T19:00:00', endAt: '2026-06-01T21:00:00', hours: 2 }),
      ],
      'EMP-0301',
      week,
    );
    expect(map['2026-06-01']).toBe(5);
  });

  it('ignores rows for a different employee', () => {
    const map = otHoursByDateForWeek(
      [ot({ employeeId: 'EMP-9999' })],
      'EMP-0301',
      week,
    );
    expect(Object.keys(map)).toHaveLength(0);
  });

  it('ignores rejected rows', () => {
    const map = otHoursByDateForWeek([ot({ status: 'rejected' })], 'EMP-0301', week);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it('ignores rows outside the week window', () => {
    const map = otHoursByDateForWeek(
      [ot({ startAt: '2026-06-15T18:00:00', endAt: '2026-06-15T21:00:00' })],
      'EMP-0301',
      week,
    );
    expect(Object.keys(map)).toHaveLength(0);
  });

  it('falls back to computeOtHours when row.hours is missing/zero', () => {
    const map = otHoursByDateForWeek(
      [ot({ hours: 0, startAt: '2026-06-02T18:00:00', endAt: '2026-06-02T22:00:00' })],
      'EMP-0301',
      week,
    );
    expect(map['2026-06-02']).toBe(4);
  });

  it('non-canonical employee with no rows → empty map (no crash)', () => {
    const map = otHoursByDateForWeek([], 'emp-sf-050', week);
    expect(map).toEqual({});
  });
});
