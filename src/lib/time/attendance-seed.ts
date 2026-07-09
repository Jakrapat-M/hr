// Attendance for the current payroll period (21→20). The SCHEDULE now comes from
// the single Working Hour Template source (schedule-template.getScheduleForPeriod) —
// this file only overlays actual clock punches on top. Deterministic (no Date.now /
// Math.random) so SSR + tests are stable: days up to the demo "today" carry punches
// (a few intentionally late so the Late column is demoable); future days are
// scheduled-only. Mockup, no backend.

import { getScheduleForPeriod, templateForEmployee } from './schedule-template';
import { getShiftCode } from './shift-codes';
import { DEMO_TODAY } from './period';
import type { AttendanceDay } from './attendance-math';

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

// Intentional mockup state: a WORKED DAY-OFF — `dayOff` stays true (the weekly rest
// day F) but we attach a real shiftCode so BOTH the Table (reads scheduledIn/Out) AND
// the Calendar (reads getShiftCode(d.shiftCode)) can show scheduled times. Do NOT
// "fix" the `dayOff:true + shiftCode!=null` pairing — it is deliberate (an employee
// scheduled to work on their rest day). The punch block below stays UNTOUCHED: no
// actualIn/actualOut on a day-off. Keyed `${empId}|${date}` → shiftCode.
const WORKED_DAYOFF_OVERRIDES: Record<string, string> = {
  'EMP-0301|2026-06-14': '8A1000', // Sunday rest day, scheduled 10:00–19:00 (break 14:00–15:00)
};

export function getAttendanceForPeriod(empId: string): AttendanceDay[] {
  const schedule = getScheduleForPeriod(empId);
  const todayD = new Date(DEMO_TODAY + 'T00:00:00Z');
  let multiPunchSeeded = false;

  return schedule.map((s, i) => {
    // Worked day-off override: derive ALL four scheduled fields from the shift code
    // (the Calendar reads getShiftCode(shiftCode), so setting scheduledIn alone would
    // silently fail it). Keep dayOff:true; no punches (punch block stays off).
    // The override returns BEFORE the deterministic late-pattern block below — a
    // day-off never carries actual punches, so it has no late pattern by design.
    const ovCode = WORKED_DAYOFF_OVERRIDES[`${empId}|${s.date}`];
    if (ovCode) {
      const sc = getShiftCode(ovCode)!;
      return {
        ...s,
        dayOff: true,
        shiftCode: ovCode,
        scheduledIn: sc.in,
        scheduledOut: sc.out,
        breakStart: sc.breakStart,
        breakEnd: sc.breakEnd,
        actualIn: null,
        actualOut: null,
      };
    }

    let actualIn: string | null = null;
    let actualOut: string | null = null;
    let punchPairs: { in: string; out: string | null }[] | undefined;
    const isPast = new Date(s.date + 'T00:00:00Z').getTime() <= todayD.getTime();
    if (!s.dayOff && s.scheduledIn && isPast) {
      // Deterministic late pattern: ~every 7th day late 23m, ~every 11th 12m.
      const lateMin = i % 7 === 3 ? 23 : i % 11 === 5 ? 12 : 0;
      actualIn = addMinutes(s.scheduledIn, lateMin);
      actualOut = s.scheduledOut;
      // STA-239 — ONE multi-punch scenario day per period (out for an errand and
      // back around the break): split into two in/out pairs so the summary row
      // is expandable. First-in/last-out (actualIn/actualOut) stay unchanged, so
      // worked-hours / late math is untouched. First eligible day from the 5th
      // schedule slot; break times when the shift has them, else a 13:00–14:00
      // gap — guarded to fall strictly inside the punch window.
      if (!multiPunchSeeded && i >= 4) {
        const splitOut = s.breakStart ?? '13:00';
        const splitIn = s.breakEnd ?? '14:00';
        if (actualIn < splitOut && splitOut < splitIn && actualOut !== null && splitIn < actualOut) {
          punchPairs = [
            { in: actualIn, out: splitOut },
            { in: splitIn, out: actualOut },
          ];
          multiPunchSeeded = true;
        }
      }
    }
    return { ...s, actualIn, actualOut, ...(punchPairs ? { punchPairs } : {}) };
  });
}
