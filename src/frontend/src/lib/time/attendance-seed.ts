// Attendance for the current payroll period (21→20). The SCHEDULE now comes from
// the single Working Hour Template source (schedule-template.getScheduleForPeriod) —
// this file only overlays actual clock punches on top. Deterministic (no Date.now /
// Math.random) so SSR + tests are stable: days up to the demo "today" carry punches
// (a few intentionally late so the Late column is demoable); future days are
// scheduled-only. Mockup, no backend.

import { getScheduleForPeriod, templateForEmployee } from './schedule-template';
import { getShiftCode } from './shift-codes';
import type { AttendanceDay } from './attendance-math';

// Aligns with period.ts DEMO_TODAY so "past" days (with punches) are consistent.
const DEMO_TODAY = '2026-06-07';

function addMinutes(hhmm: string, add: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + add;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** EC Plan Hours (wiki §1) — contracted daily hours, derived from the employee's
 *  Working Hour Template (its first working day's shift). */
export function ecPlanHoursFor(empId: string): number {
  const tmpl = templateForEmployee(empId);
  const firstCode = tmpl.byWeekday.find((c) => c !== null) ?? null;
  return getShiftCode(firstCode)?.workHrs ?? 8;
}

export function getAttendanceForPeriod(empId: string): AttendanceDay[] {
  const schedule = getScheduleForPeriod(empId);
  const todayD = new Date(DEMO_TODAY + 'T00:00:00Z');

  return schedule.map((s, i) => {
    let actualIn: string | null = null;
    let actualOut: string | null = null;
    const isPast = new Date(s.date + 'T00:00:00Z').getTime() <= todayD.getTime();
    if (!s.dayOff && s.scheduledIn && isPast) {
      // Deterministic late pattern: ~every 7th day late 23m, ~every 11th 12m.
      const lateMin = i % 7 === 3 ? 23 : i % 11 === 5 ? 12 : 0;
      actualIn = addMinutes(s.scheduledIn, lateMin);
      actualOut = s.scheduledOut;
    }
    return { ...s, actualIn, actualOut };
  });
}
