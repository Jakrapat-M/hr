// Results — computed pay output (wiki §5 WFS "Results" tab). Turns the period's
// schedule + actual punches (+ holidays / approved leave) into per-day pay-code
// lines: Pay Code | Wage Type | Plan Hours | Actual Hours | Days. EC Plan Hours
// drives Plan Hour. Mockup: deterministic holiday + leave overlay, no backend.

import { getAttendanceForPeriod, ecPlanHoursFor } from './attendance-seed';
import type { AttendanceDay } from './attendance-math';

export type WageType = 'REGULAR' | 'HOLIDAY' | '2700' | '2701';

export type ResultRow = {
  date: string;
  payCodeTh: string;
  payCodeEn: string;
  wageType: WageType;
  planHours: number;
  actualHours: number;
  days: number;
};

// Mock public holidays falling in the current period (wiki §5 — HOLIDAY wage type).
const HOLIDAYS = new Set<string>(['2026-06-03']);
// Mock approved leave overlay (wage types 2701 = Annual, 2700 = Sick — wiki §5).
const DEMO_LEAVE: { date: string; wageType: WageType; nameTh: string; nameEn: string }[] = [
  { date: '2026-05-26', wageType: '2701', nameTh: 'ลาพักผ่อนประจำปี', nameEn: 'Annual leave' },
  { date: '2026-05-29', wageType: '2700', nameTh: 'ลาป่วย', nameEn: 'Sick leave' },
];

export const WAGE_TYPE_LABEL: Record<WageType, { th: string; en: string }> = {
  REGULAR: { th: 'ทำงานปกติ', en: 'Regular' },
  HOLIDAY: { th: 'วันหยุดนักขัตฤกษ์', en: 'Holiday' },
  '2700': { th: 'ลาป่วย (2700)', en: 'Sick leave (2700)' },
  '2701': { th: 'ลาพักผ่อน (2701)', en: 'Annual leave (2701)' },
};

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Actual worked hours for a day = (out − in) − break, rounded to 0.1h. */
export function workedHours(d: AttendanceDay): number {
  if (!d.actualIn || !d.actualOut) return 0;
  let mins = toMin(d.actualOut) - toMin(d.actualIn);
  if (d.breakStart && d.breakEnd) mins -= toMin(d.breakEnd) - toMin(d.breakStart);
  return Math.max(0, Math.round((mins / 60) * 10) / 10);
}

export function computeResultsForPeriod(empId: string): ResultRow[] {
  const days = getAttendanceForPeriod(empId);
  const plan = ecPlanHoursFor(empId);
  const leaveByDate = new Map(DEMO_LEAVE.map((l) => [l.date, l]));

  const rows: ResultRow[] = [];
  for (const d of days) {
    if (HOLIDAYS.has(d.date)) {
      rows.push({ date: d.date, payCodeTh: 'วันหยุดนักขัตฤกษ์', payCodeEn: 'Public holiday', wageType: 'HOLIDAY', planHours: plan, actualHours: 0, days: 1 });
      continue;
    }
    const lv = leaveByDate.get(d.date);
    if (lv) {
      rows.push({ date: d.date, payCodeTh: lv.nameTh, payCodeEn: lv.nameEn, wageType: lv.wageType, planHours: plan, actualHours: 0, days: 1 });
      continue;
    }
    if (!d.dayOff && d.actualIn) {
      rows.push({ date: d.date, payCodeTh: 'ทำงานปกติ', payCodeEn: 'Regular work', wageType: 'REGULAR', planHours: plan, actualHours: workedHours(d), days: 1 });
    }
  }
  return rows;
}

export function resultsSummary(rows: ResultRow[]): {
  totalActual: number;
  totalPlan: number;
  leaveDays: number;
  holidayDays: number;
  workedDays: number;
} {
  let totalActual = 0;
  let totalPlan = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let workedDays = 0;
  for (const r of rows) {
    totalPlan += r.planHours;
    totalActual += r.actualHours;
    if (r.wageType === 'HOLIDAY') holidayDays += r.days;
    else if (r.wageType === 'REGULAR') workedDays += r.days;
    else leaveDays += r.days;
  }
  return {
    totalActual: Math.round(totalActual * 10) / 10,
    totalPlan: Math.round(totalPlan * 10) / 10,
    leaveDays,
    holidayDays,
    workedDays,
  };
}
