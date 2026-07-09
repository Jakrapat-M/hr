// Time exceptions + at-a-glance hero — the "exception-first" direction from the
// ccg review (the old WFS made you scan a dense grid to find problems). Derives
// per-period anomalies from the existing schedule/attendance/DWS data; no new seed.

import { getAttendanceForPeriod } from './attendance-seed';
import { lateMinutesFor, periodLateSummary } from './attendance-math';
import { validateDwsPeriod } from './dws-validation';
import { workedHours } from './results-math';

export type ExceptionType = 'late' | 'missing_out' | 'continuous_shift';

export type TimeException = {
  date: string;
  type: ExceptionType;
  severity: 'warn' | 'danger';
  lateMin?: number;
  th: string;
  en: string;
};

/** Per-period anomalies a person (or their manager) should act on. */
export function getExceptionsForPeriod(empId: string): TimeException[] {
  const days = getAttendanceForPeriod(empId);
  const dws = validateDwsPeriod(days);
  const out: TimeException[] = [];
  days.forEach((d, i) => {
    const late = lateMinutesFor(d);
    if (late && late > 0) {
      out.push({ date: d.date, type: 'late', severity: 'danger', lateMin: late, th: `มาสาย ${late} นาที`, en: `${late} min late` });
    }
    if (!d.dayOff && d.actualIn && !d.actualOut) {
      out.push({ date: d.date, type: 'missing_out', severity: 'warn', th: 'ขาดเวลาออก', en: 'Missing clock-out' });
    }
    if (dws.perDay[i]?.level === 'yellow') {
      out.push({ date: d.date, type: 'continuous_shift', severity: 'warn', th: 'กะต่อเนื่องน้อยกว่า 5 ชม.', en: 'Continuous shift < 5h' });
    }
  });
  return out;
}

export type HeroSummary = {
  actualHrs: number;
  planHrs: number;
  workedDays: number;
  lateDays: number;
  totalLateMin: number;
  exceptionCount: number;
  onTimeRate: number; // 0..100
};

/** Headline metrics for the at-a-glance hero card. */
export function heroSummary(empId: string): HeroSummary {
  const days = getAttendanceForPeriod(empId);
  const late = periodLateSummary(days);
  let actualHrs = 0;
  let planHrs = 0;
  for (const d of days) {
    if (d.dayOff || !d.actualIn) continue;
    actualHrs += workedHours(d);
    // plan = scheduled span minus break
    if (d.scheduledIn && d.scheduledOut) {
      planHrs += workedHours({ ...d, actualIn: d.scheduledIn, actualOut: d.scheduledOut });
    }
  }
  const exceptionCount = getExceptionsForPeriod(empId).length;
  const onTimeRate = late.workedDays > 0 ? Math.round(((late.workedDays - late.lateDays) / late.workedDays) * 100) : 100;
  return {
    actualHrs: Math.round(actualHrs * 10) / 10,
    planHrs: Math.round(planHrs * 10) / 10,
    workedDays: late.workedDays,
    lateDays: late.lateDays,
    totalLateMin: late.totalLateMin,
    exceptionCount,
    onTimeRate,
  };
}
