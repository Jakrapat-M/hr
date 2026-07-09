// lib/time/leave-hours.ts — STA-258
//
// MOCK ONLY. Pure "requested hours" calculator for leave requests: counts only
// WORKING days in the leave span — a day that collides with the employee's
// weekly day-off (per their schedule template) or a public holiday does NOT
// count — × the standard 8-hour day. Half-day leave = 4 hours; duration-based
// (hourly) leave converts minutes → hours directly. Deterministic, no Date.now.

import { templateForEmployee } from '@/lib/time/schedule-template';
import { getHolidaysForPeriod } from '@/lib/time/holiday-calendar';

/** Standard working-day hours for leave accounting (mock figure). */
export const LEAVE_DAY_HOURS = 8;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** X.XX display formatting shared by the table + detail surfaces. */
export function fmtHours(hours: number): string {
  return hours.toFixed(2);
}

/**
 * Working days in [startIso..endIso] for an employee: skips the weekly day-off
 * (resolved from the employee's schedule template byWeekday pattern, so it works
 * for any date — not just the seeded demo period) and public holidays.
 */
export function leaveWorkingDays(startIso: string, endIso: string, employeeId: string): number {
  if (!startIso) return 0;
  const end = endIso || startIso;
  if (end < startIso) return 0;
  const start = new Date(`${startIso}T00:00:00Z`);
  const stop = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(stop.getTime())) return 0;

  const template = templateForEmployee(employeeId);
  const holidays = getHolidaysForPeriod(startIso, end);

  let days = 0;
  for (const d = new Date(start); d <= stop; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const weeklyOff = (template.byWeekday[d.getUTCDay()] ?? null) === null;
    if (weeklyOff || holidays.has(iso)) continue;
    days += 1;
  }
  return days;
}

/**
 * Requested leave hours for a span (STA-258): working days × 8h.
 *   • `durationMinutes` (hourly leave) wins when present → minutes / 60.
 *   • `halfDay` → 4h (a half-day request is single-day by definition; 0 when
 *     that day itself is a holiday/day-off).
 * Rounded to 2 decimals — render with `fmtHours` (X.XX).
 */
export function leaveHours(
  startIso: string,
  endIso: string,
  employeeId: string,
  opts?: { halfDay?: boolean; durationMinutes?: number },
): number {
  if (opts?.durationMinutes && opts.durationMinutes > 0) {
    return round2(opts.durationMinutes / 60);
  }
  const days = leaveWorkingDays(startIso, endIso, employeeId);
  if (opts?.halfDay) return days > 0 ? LEAVE_DAY_HOURS / 2 : 0;
  return round2(days * LEAVE_DAY_HOURS);
}
