import { describe, it, expect } from 'vitest';
import {
  computeLateMinutes,
  lateMinutesFor,
  periodLateSummary,
  formatLate,
  type AttendanceDay,
} from '../attendance-math';

function day(p: Partial<AttendanceDay>): AttendanceDay {
  return {
    date: '2026-06-01', weekday: 1, dayOff: false,
    shiftCode: '8A0800', scheduledIn: '08:00', scheduledOut: '17:00',
    breakStart: '12:00', breakEnd: '13:00', actualIn: '08:00', actualOut: '17:00',
    ...p,
  };
}

describe('computeLateMinutes', () => {
  it('returns minutes late when actual is after scheduled', () => {
    expect(computeLateMinutes('08:00', '08:23')).toBe(23);
    expect(computeLateMinutes('08:00', '09:05')).toBe(65);
  });
  it('is 0 when on time or early', () => {
    expect(computeLateMinutes('08:00', '08:00')).toBe(0);
    expect(computeLateMinutes('08:00', '07:45')).toBe(0);
  });
  it('returns null when there is no comparison (missing in/schedule)', () => {
    expect(computeLateMinutes('08:00', null)).toBeNull();
    expect(computeLateMinutes(null, '08:00')).toBeNull();
  });
});

describe('lateMinutesFor', () => {
  it('is null on a day off', () => {
    expect(lateMinutesFor(day({ dayOff: true, actualIn: null }))).toBeNull();
  });
  it('computes late vs the scheduled shift start', () => {
    expect(lateMinutesFor(day({ actualIn: '08:12' }))).toBe(12);
  });
});

describe('periodLateSummary', () => {
  it('rolls up late days and total minutes, ignoring day-off / no-punch', () => {
    const days = [
      day({ date: '2026-06-01', actualIn: '08:00' }), // on time
      day({ date: '2026-06-02', actualIn: '08:23' }), // late 23
      day({ date: '2026-06-03', actualIn: '08:12' }), // late 12
      day({ date: '2026-06-06', dayOff: true, actualIn: null }), // off
      day({ date: '2026-06-07', actualIn: null }), // future / no punch
    ];
    const s = periodLateSummary(days);
    expect(s.lateDays).toBe(2);
    expect(s.totalLateMin).toBe(35);
    expect(s.workedDays).toBe(3); // 3 days had a punch
  });
});

describe('formatLate', () => {
  it('formats TH / EN', () => {
    expect(formatLate(23, true)).toBe('สาย 23 นาที');
    expect(formatLate(23, false)).toBe('23 min late');
    expect(formatLate(0, false)).toBe('On time');
    expect(formatLate(null, true)).toBe('—');
  });
});
