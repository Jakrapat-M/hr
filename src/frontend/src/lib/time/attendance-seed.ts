// Per-employee attendance seed for the current payroll period (21→20, wiki §8).
// Deterministic (no Date.now / Math.random) so SSR + tests are stable. Weekdays get
// a standard shift; weekends are day-off (`F`). Days up to the demo "today" carry
// actual clock punches — a few intentionally late so the Late column is demoable;
// future days are scheduled-only. Mockup seed: real CG shift values, no backend.

import { currentPeriod } from './period';
import { SHIFT_CODES } from './shift-codes';
import type { AttendanceDay } from './attendance-math';

// Aligns with period.ts DEMO_TODAY so "past" days (with punches) are consistent.
const DEMO_TODAY = '2026-06-07';

function addMinutes(hhmm: string, add: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + add;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** EC Plan Hours for the employee (wiki §1) — contracted daily hours from EC.
 *  Mockup: derive from the assigned shift's working hours. */
export function ecPlanHoursFor(empId: string): number {
  const codeKeys = Object.keys(SHIFT_CODES);
  const base = codeKeys[(empId.charCodeAt(Math.max(0, empId.length - 1)) || 0) % codeKeys.length];
  return SHIFT_CODES[base].workHrs;
}

export function getAttendanceForPeriod(empId: string): AttendanceDay[] {
  const { start, end } = currentPeriod();
  const codeKeys = Object.keys(SHIFT_CODES);
  // Stable per-employee shift so different people vary a little.
  const baseCode = codeKeys[(empId.charCodeAt(Math.max(0, empId.length - 1)) || 0) % codeKeys.length];

  const startD = new Date(start + 'T00:00:00Z');
  const endD = new Date(end + 'T00:00:00Z');
  const todayD = new Date(DEMO_TODAY + 'T00:00:00Z');

  const days: AttendanceDay[] = [];
  let i = 0;
  for (const d = new Date(startD); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    const weekday = d.getUTCDay(); // 0 Sun .. 6 Sat
    const dayOff = weekday === 0 || weekday === 6;
    const shift = dayOff ? null : SHIFT_CODES[baseCode];
    const isPast = d.getTime() <= todayD.getTime();

    let actualIn: string | null = null;
    let actualOut: string | null = null;
    if (shift && isPast) {
      // Deterministic late pattern: ~every 7th working day late 23m, ~every 11th 12m.
      const lateMin = i % 7 === 3 ? 23 : i % 11 === 5 ? 12 : 0;
      actualIn = addMinutes(shift.in, lateMin);
      actualOut = shift.out;
    }

    days.push({
      date,
      weekday,
      dayOff,
      shiftCode: shift?.code ?? null,
      scheduledIn: shift?.in ?? null,
      scheduledOut: shift?.out ?? null,
      breakStart: shift?.breakStart ?? null,
      breakEnd: shift?.breakEnd ?? null,
      actualIn,
      actualOut,
    });
    i += 1;
  }
  return days;
}
