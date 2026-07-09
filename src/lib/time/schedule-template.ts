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
  // STA-137: MON + SAT off (works Sun, Tue–Fri). Two reasons:
  //  • Monday-off gives the demo week's holiday 2026-06-01 (a Monday) real
  //    coverage contrast — part-timers are off while full-timers work + earn
  //    holiday pay, instead of every row working the holiday.
  //  • Saturday-off keeps a NON-holiday Day-Off column visible in the week, so
  //    the rotating-day-off story (≥3 distinct day-off columns) still reads
  //    (Monday's day-off is otherwise masked by the holiday chip).
  // 4h part-time block, no break.
  byWeekday: ['4C0800', null, '4C0800', '4C0800', '4C0800', '4C0800', null],
};

// STA-137 — Morning store variant (06:00–15:00). Day off on TUE (weekday 2) so the
// weekly grid shows a Day-Off column that differs from the Store-standard Sunday.
const MORNING_STD: ScheduleTemplate = {
  id: 'TMPL-MORNING-STD',
  nameTh: 'กะเช้า มาตรฐาน',
  nameEn: 'Morning standard',
  effectiveDate: '2026-01-01',
  // Tue off; otherwise morning retail shift 06:00–15:00
  byWeekday: ['9A0600', '9A0600', null, '9A0600', '9A0600', '9A0600', '9A0600'],
};

// STA-137 — Afternoon/evening store variant (14:00–23:00). Day off on WED (weekday
// 3). This template also backs the "Night/กะดึก" DISPLAY label — it is a real,
// non-wrapping evening block (out > in), never a cross-midnight 22:00→07:00 code.
const AFTERNOON_STD: ScheduleTemplate = {
  id: 'TMPL-AFTERNOON-STD',
  nameTh: 'กะบ่าย มาตรฐาน',
  nameEn: 'Afternoon standard',
  effectiveDate: '2026-01-01',
  // Wed off; otherwise afternoon retail shift 14:00–23:00
  byWeekday: ['9A1400', '9A1400', '9A1400', null, '9A1400', '9A1400', '9A1400'],
};

export const SCHEDULE_TEMPLATES: Record<string, ScheduleTemplate> = {
  STORE_STD,
  HO_STD,
  PART_TIME,
  MORNING_STD,
  AFTERNOON_STD,
};

// STA-137 — deterministic Store-template spread. Store employees fan out across
// these four non-wrapping variants by a STABLE hash of empId (never Math.random,
// so SSR + tests are stable). Day-offs are staggered (Sun / Tue / Wed / Sat+Sun)
// so a single visible week shows Day-Off chips in ≥3 different weekday columns.
const STORE_SPREAD: ScheduleTemplate[] = [STORE_STD, MORNING_STD, AFTERNOON_STD, PART_TIME];

/** Stable, deterministic hash of an empId → index into STORE_SPREAD. */
function empIdHash(empId: string): number {
  let sum = 0;
  for (let i = 0; i < empId.length; i += 1) sum += empId.charCodeAt(i);
  return sum;
}

/**
 * Table 1 — Rule. Resolves the template for an employee. Mockup heuristic:
 * HO calendar → office template; Store calendar → one of four non-wrapping retail
 * variants chosen by a deterministic empId hash (Morning/Afternoon/Store/Part-time),
 * so the weekly grid shows realistic shift + day-off variety instead of a uniform
 * 10:00–19:00 / Sunday-off grid. (Real rule: Pattern + BU + Company + Division.)
 */
export function templateForEmployee(empId: string): ScheduleTemplate {
  const attrs = getEmployeeTimeAttrs(empId);
  if (attrs.calendarType === 'HO') return HO_STD;

  // STA-137 PIN (mandatory): EMP-0301 is the canonical OT-on-holiday demo employee
  // (pre-seeded OT rows on the 2026-06-01 holiday) and is NOT in employee-time-attrs,
  // so it would otherwise fall through the hash spread — which could land it on a
  // template whose Monday (06-01) is a day-off, orphaning its OT off the holiday.
  // Pin it to a Mon-working variant (STORE_STD works Mon) so its 06-01 cell keeps
  // Shift + Clock + OT.
  if (empId === 'EMP-0301') return STORE_STD;

  return STORE_SPREAD[empIdHash(empId) % STORE_SPREAD.length];
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
