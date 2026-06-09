import { describe, it, expect } from 'vitest';
import { computeResultsForPeriod, resultsSummary, workedHours, WAGE_TYPE_LABEL } from '../results-math';
import type { AttendanceDay } from '../attendance-math';

function day(p: Partial<AttendanceDay>): AttendanceDay {
  return { date: '2026-06-01', weekday: 1, dayOff: false, shiftCode: '8A0800', scheduledIn: '08:00', scheduledOut: '17:00', breakStart: '12:00', breakEnd: '13:00', actualIn: '08:00', actualOut: '17:00', ...p };
}

describe('workedHours', () => {
  it('subtracts the break from in→out', () => {
    expect(workedHours(day({ actualIn: '08:00', actualOut: '17:00' }))).toBe(8); // 9h - 1h break
    expect(workedHours(day({ actualIn: '10:00', actualOut: '19:00', breakStart: '14:00', breakEnd: '15:00' }))).toBe(8);
  });
  it('is 0 with no punch', () => {
    expect(workedHours(day({ actualIn: null, actualOut: null }))).toBe(0);
  });
});

describe('computeResultsForPeriod', () => {
  it('produces pay-code lines with REGULAR / HOLIDAY / leave wage types', () => {
    const rows = computeResultsForPeriod('EMP101'); // Store
    const wageTypes = new Set(rows.map((r) => r.wageType));
    expect(rows.length).toBeGreaterThan(0);
    expect(wageTypes.has('REGULAR')).toBe(true);
    expect(wageTypes.has('HOLIDAY')).toBe(true); // seeded 2026-06-03
    // seeded leave overlay (2701 annual on a working day)
    expect(wageTypes.has('2701')).toBe(true);
    expect(rows.every((r) => r.planHours > 0 && r.days === 1)).toBe(true);
  });
});

describe('resultsSummary', () => {
  it('rolls up worked / leave / holiday day counts and hours', () => {
    const rows = computeResultsForPeriod('EMP101');
    const s = resultsSummary(rows);
    expect(s.holidayDays).toBeGreaterThanOrEqual(1);
    expect(s.leaveDays).toBeGreaterThanOrEqual(1);
    expect(s.workedDays).toBeGreaterThan(0);
    expect(s.totalActual).toBeGreaterThan(0);
  });
});

describe('WAGE_TYPE_LABEL', () => {
  it('labels all wage types TH/EN', () => {
    expect(WAGE_TYPE_LABEL['2700'].th).toContain('ลาป่วย');
    expect(WAGE_TYPE_LABEL.HOLIDAY.en).toBe('Holiday');
  });
});
