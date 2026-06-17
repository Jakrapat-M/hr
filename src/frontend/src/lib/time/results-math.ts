// Results — computed pay output (wiki §5 WFS "Results" tab). Turns the period's
// schedule + actual punches (+ holidays / approved leave) into per-day pay-code
// lines: Pay Code | Wage Type | Plan Hours | Actual Hours | Days. EC Plan Hours
// drives Plan Hour. Mockup: deterministic holiday + leave overlay, no backend.

import { getAttendanceForPeriod, ecPlanHoursFor } from './attendance-seed';
import type { AttendanceDay } from './attendance-math';
import { getLeaveType, LEAVE_CODE_TO_WAGE_TYPE } from './leave-types';
import type { HolidayLabel } from './holiday-calendar';

export type WageType = 'REGULAR' | 'HOLIDAY' | '2700' | '2701';

export type ResultRow = {
  date: string;
  payCodeTh: string;
  payCodeEn: string;
  wageType: WageType;
  /**
   * Override pill/pay-code label for leave codes WITHOUT a documented wage type
   * (everything except Annual=2701 / Sick=2700). When set, the render prefers it
   * over WAGE_TYPE_LABEL[wageType] so a non-2700/2701 leave shows its own TH/EN
   * name instead of a fake numeric code — and `wageType` stays a valid union
   * value ('REGULAR') so the WAGE_TYPE_LABEL index never throws.
   */
  wageLabel?: { th: string; en: string };
  planHours: number;
  actualHours: number;
  days: number;
};

/** Approved leave for a date, keyed by ISO date (built by useResultsInputs). */
export type ApprovedLeaveDay = { leaveCode: string; days: number };

/** Inputs the page injects so this lib stays pure (no store reads). */
export type ResultsInputs = {
  /** date → holiday label, from getHolidaysForPeriod. */
  holidays: Map<string, HolidayLabel>;
  /** working date → approved leave, range-expanded by the selector hook. */
  approvedLeaveByDate: Map<string, ApprovedLeaveDay>;
};

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

/**
 * Per-day pay-code lines for the period. PURE: holidays + approved leave are
 * injected (built by the useResultsInputs selector hook), never read from a store
 * here. Precedence per attendance day: holiday → leave → worked.
 */
export function computeResultsForPeriod(empId: string, inputs: ResultsInputs): ResultRow[] {
  const days = getAttendanceForPeriod(empId);
  const plan = ecPlanHoursFor(empId);
  const { holidays, approvedLeaveByDate } = inputs;

  const rows: ResultRow[] = [];
  for (const d of days) {
    const holiday = holidays.get(d.date);
    if (holiday) {
      rows.push({ date: d.date, payCodeTh: holiday.nameTh, payCodeEn: holiday.nameEn, wageType: 'HOLIDAY', planHours: plan, actualHours: 0, days: 1 });
      continue;
    }
    const lv = approvedLeaveByDate.get(d.date);
    if (lv) {
      const def = getLeaveType(lv.leaveCode);
      const nameTh = def?.nameTh ?? lv.leaveCode;
      const nameEn = def?.nameEn ?? lv.leaveCode;
      const wageType = LEAVE_CODE_TO_WAGE_TYPE[lv.leaveCode];
      rows.push({
        date: d.date,
        payCodeTh: nameTh,
        payCodeEn: nameEn,
        // Annual/Sick → their documented numeric wage type (no override label).
        // Every other leave code → a valid 'REGULAR' union value + a wageLabel so
        // the pill shows the leave's own name (never a fake code, never a crash).
        wageType: wageType ?? 'REGULAR',
        wageLabel: wageType ? undefined : { th: nameTh, en: nameEn },
        planHours: plan,
        actualHours: 0,
        days: lv.days,
      });
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
    // Leave = the numeric wage types (2700/2701) OR a non-numeric leave carrying
    // its own override label (wageType is the 'REGULAR' placeholder for those).
    else if (r.wageType === '2700' || r.wageType === '2701' || r.wageLabel) leaveDays += r.days;
    else if (r.wageType === 'REGULAR') workedDays += r.days;
  }
  return {
    totalActual: Math.round(totalActual * 10) / 10,
    totalPlan: Math.round(totalPlan * 10) / 10,
    leaveDays,
    holidayDays,
    workedDays,
  };
}
