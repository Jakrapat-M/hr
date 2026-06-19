// Working Hour / Schedule Template model — wiki §7.1 (EC → Time Module):
//   EC Pattern → Table 1 Rule (Pattern + calendar/BU → Template)
//             → Table 2 Schedule Template Detail (per-weekday Start/End/Break/DayOff)
//             → (optional per-employee override) → effective-dated per-day schedule.
// This is the SINGLE source of an employee's scheduled shift per day; Time Entry,
// the Schedule tab, Results, and (later) /roster all derive from `getScheduleForPeriod`
// instead of ad-hoc seeds. Mockup: real CG shift codes (wiki §3), no backend.

import { currentPeriod, demoToday } from './period';
import { getShiftCode } from './shift-codes';
import { getEmployeeTimeAttrs } from './employee-time-attrs';
import type { AttendanceDay } from './attendance-math';

/** The scheduled portion of a day (everything an AttendanceDay has minus actuals). */
export type DaySchedule = Omit<AttendanceDay, 'actualIn' | 'actualOut'>;

// Table 2 — Schedule Template Detail. `byWeekday` is indexed by JS getUTCDay()
// (0 = Sun .. 6 = Sat); each entry is a shift code, or null for a day off (`F`).
export type ScheduleTemplate = {
  id: string;
  nameTh: string;
  nameEn: string;
  effectiveDate: string; // wiki §7.1: schedule is effective-dated
  byWeekday: (string | null)[];
};

const STORE_STD: ScheduleTemplate = {
  id: 'TMPL-STORE-STD',
  nameTh: 'กะร้านค้า มาตรฐาน',
  nameEn: 'Store standard',
  effectiveDate: '2026-01-01',
  // Sun off; Mon–Sat retail shift 10:00–19:00
  byWeekday: [null, '8A1000', '8A1000', '8A1000', '8A1000', '8A1000', '8A1000'],
};

const HO_STD: ScheduleTemplate = {
  id: 'TMPL-HO-STD',
  nameTh: 'กะสำนักงาน มาตรฐาน',
  nameEn: 'Head-office standard',
  effectiveDate: '2026-01-01',
  // Sat/Sun off; Mon–Fri office shift 08:00–17:00
  byWeekday: [null, '8A0800', '8A0800', '8A0800', '8A0800', '8A0800', null],
};

const PART_TIME: ScheduleTemplate = {
  id: 'TMPL-PARTTIME',
  nameTh: 'พาร์ทไทม์',
  nameEn: 'Part-time',
  effectiveDate: '2026-01-01',
  // Sat/Sun off; Mon–Fri 4h part-time, no break
  byWeekday: [null, '4C0800', '4C0800', '4C0800', '4C0800', '4C0800', null],
};

export const SCHEDULE_TEMPLATES: Record<string, ScheduleTemplate> = { STORE_STD, HO_STD, PART_TIME };

/**
 * Table 1 — Rule. Resolves the template for an employee. Mockup heuristic:
 * HO calendar → office template, Store calendar → retail template. (Real rule:
 * Pattern + BU + Company + Division → Template.)
 */
export function templateForEmployee(empId: string): ScheduleTemplate {
  const attrs = getEmployeeTimeAttrs(empId);
  return attrs.calendarType === 'HO' ? HO_STD : STORE_STD;
}

/** Per-day scheduled shift for the current payroll period (21→20) — single source. */
/** Per-day schedule for the current period from a GIVEN template (used by the
 *  manager shift-schedule surface to preview a manager override). */
export function scheduleFromTemplate(tmpl: ScheduleTemplate): DaySchedule[] {
  // Pin the demo schedule window to DEMO_TODAY (not wall-clock today) so the
  // seeded ~30-day grid never slides off the seeded period and goes blank.
  const { start, end } = currentPeriod(demoToday());
  const startD = new Date(start + 'T00:00:00Z');
  const endD = new Date(end + 'T00:00:00Z');

  const out: DaySchedule[] = [];
  for (const d = new Date(startD); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    const weekday = d.getUTCDay();
    const code = tmpl.byWeekday[weekday] ?? null;
    const sc = getShiftCode(code);
    out.push({
      date,
      weekday,
      dayOff: code === null,
      shiftCode: code,
      scheduledIn: sc?.in ?? null,
      scheduledOut: sc?.out ?? null,
      breakStart: sc?.breakStart ?? null,
      breakEnd: sc?.breakEnd ?? null,
    });
  }
  return out;
}

/** Per-day scheduled shift for an employee (resolves the template via Table 1 Rule). */
export function getScheduleForPeriod(empId: string): DaySchedule[] {
  return scheduleFromTemplate(templateForEmployee(empId));
}
