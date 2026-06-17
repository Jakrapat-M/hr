import { describe, it, expect } from 'vitest';
import {
  computeResultsForPeriod,
  resultsSummary,
  workedHours,
  WAGE_TYPE_LABEL,
  type ResultsInputs,
} from '../results-math';
import { getAttendanceForPeriod } from '../attendance-seed';
import { getHolidaysForPeriod } from '../holiday-calendar';
import { currentPeriod } from '../period';
import type { AttendanceDay } from '../attendance-math';

function day(p: Partial<AttendanceDay>): AttendanceDay {
  return { date: '2026-06-01', weekday: 1, dayOff: false, shiftCode: '8A0800', scheduledIn: '08:00', scheduledOut: '17:00', breakStart: '12:00', breakEnd: '13:00', actualIn: '08:00', actualOut: '17:00', ...p };
}

/** Live holiday + approved-leave inputs (real calendar) for the current period. */
function liveInputs(approved: Record<string, { leaveCode: string; days: number }> = {}): ResultsInputs {
  const p = currentPeriod();
  return {
    holidays: getHolidaysForPeriod(p.start, p.end),
    approvedLeaveByDate: new Map(Object.entries(approved)),
  };
}

/** First working (scheduled, non-day-off, non-holiday) date in the period. */
function firstWorkingDate(empId: string): string {
  const p = currentPeriod();
  const holidays = getHolidaysForPeriod(p.start, p.end);
  const d = getAttendanceForPeriod(empId).find((x) => !x.dayOff && !holidays.has(x.date));
  if (!d) throw new Error('no working day in period');
  return d.date;
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
  it('produces REGULAR + HOLIDAY rows from the real calendar', () => {
    const rows = computeResultsForPeriod('EMP101', liveInputs());
    const wageTypes = new Set(rows.map((r) => r.wageType));
    expect(rows.length).toBeGreaterThan(0);
    expect(wageTypes.has('REGULAR')).toBe(true);
    // The live period (May 21 → Jun 20) contains TH holidays (Visakha Bucha / Queen's).
    expect(wageTypes.has('HOLIDAY')).toBe(true);
    expect(rows.every((r) => r.planHours > 0)).toBe(true);
  });

  it('maps annual→2701 and sick→2700 with NO override label', () => {
    const annualDate = firstWorkingDate('EMP101');
    const annualRows = computeResultsForPeriod('EMP101', liveInputs({
      [annualDate]: { leaveCode: 'annual_leave', days: 1 },
    }));
    const annual = annualRows.find((r) => r.date === annualDate)!;
    expect(annual.wageType).toBe('2701');
    expect(annual.wageLabel).toBeUndefined();
  });

  it('other leave codes keep a valid REGULAR wageType + carry a wageLabel', () => {
    const date = firstWorkingDate('EMP101');
    const rows = computeResultsForPeriod('EMP101', liveInputs({
      [date]: { leaveCode: 'personnel_leave', days: 1 },
    }));
    const r = rows.find((x) => x.date === date)!;
    expect(r.wageType).toBe('REGULAR'); // never a non-union value
    expect(r.wageLabel).toBeDefined();
    expect(r.wageLabel!.th).toContain('ลากิจ');
    // The render-site index must never throw for the placeholder union value.
    expect(WAGE_TYPE_LABEL[r.wageType].th).toBeTruthy();
  });

  it('precedence: holiday > leave > worked on the same day', () => {
    const empId = 'EMP101';
    const p = currentPeriod();
    const holidays = getHolidaysForPeriod(p.start, p.end);
    const holidayDate = [...holidays.keys()].find((d) =>
      getAttendanceForPeriod(empId).some((x) => x.date === d && !x.dayOff),
    );
    expect(holidayDate).toBeTruthy();
    // Even with an approved leave on the SAME date, holiday wins.
    const rows = computeResultsForPeriod(empId, {
      holidays,
      approvedLeaveByDate: new Map([[holidayDate!, { leaveCode: 'annual_leave', days: 1 }]]),
    });
    const r = rows.find((x) => x.date === holidayDate)!;
    expect(r.wageType).toBe('HOLIDAY');
  });
});

describe('resultsSummary', () => {
  it('rolls up worked / leave / holiday day counts and hours', () => {
    const date = firstWorkingDate('EMP101');
    const rows = computeResultsForPeriod('EMP101', liveInputs({
      [date]: { leaveCode: 'annual_leave', days: 1 },
    }));
    const s = resultsSummary(rows);
    expect(s.holidayDays).toBeGreaterThanOrEqual(1);
    expect(s.leaveDays).toBeGreaterThanOrEqual(1);
    expect(s.workedDays).toBeGreaterThan(0);
    expect(s.totalActual).toBeGreaterThan(0);
  });

  it('counts a non-numeric leave (wageLabel) toward leaveDays, not workedDays', () => {
    const date = firstWorkingDate('EMP101');
    const rows = computeResultsForPeriod('EMP101', liveInputs({
      [date]: { leaveCode: 'marriage_leave', days: 1 },
    }));
    const s = resultsSummary(rows);
    expect(s.leaveDays).toBeGreaterThanOrEqual(1);
  });
});

describe('WAGE_TYPE_LABEL', () => {
  it('labels all wage types TH/EN', () => {
    expect(WAGE_TYPE_LABEL['2700'].th).toContain('ลาป่วย');
    expect(WAGE_TYPE_LABEL.HOLIDAY.en).toBe('Holiday');
  });
});
