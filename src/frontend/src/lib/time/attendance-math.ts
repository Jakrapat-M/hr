// Attendance / Late math — the core of the WFS "Time Entry" requirement (wiki §1,
// §5, §7.5): Late = actual clock-in minus scheduled shift start. The Time module
// recomputes Late from the schedule, which is exactly what the old project-hours
// timesheet could not show.

export type AttendanceDay = {
  date: string; // 'YYYY-MM-DD'
  weekday: number; // 0 Sun .. 6 Sat
  dayOff: boolean; // DWS `F` (weekly rest)
  shiftCode: string | null;
  scheduledIn: string | null; // 'HH:MM'
  scheduledOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  actualIn: string | null; // null = no clock-in yet (future / absent)
  actualOut: string | null;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Minutes late = max(0, actualIn − scheduledIn). Returns null when there is no
 * comparison to make (day off, or not yet clocked in). Early/on-time → 0.
 */
export function computeLateMinutes(
  scheduledIn: string | null,
  actualIn: string | null,
): number | null {
  if (!scheduledIn || !actualIn) return null;
  return Math.max(0, toMinutes(actualIn) - toMinutes(scheduledIn));
}

/** Late minutes for an attendance day (null on day-off / no punch). */
export function lateMinutesFor(d: AttendanceDay): number | null {
  if (d.dayOff) return null;
  return computeLateMinutes(d.scheduledIn, d.actualIn);
}

export function formatLate(min: number | null, isTh: boolean): string {
  if (min === null) return '—';
  if (min === 0) return isTh ? 'ตรงเวลา' : 'On time';
  return isTh ? `สาย ${min} นาที` : `${min} min late`;
}

/** Period roll-up: how many days were late and the total late minutes. */
export function periodLateSummary(days: AttendanceDay[]): {
  lateDays: number;
  totalLateMin: number;
  workedDays: number;
} {
  let lateDays = 0;
  let totalLateMin = 0;
  let workedDays = 0;
  for (const d of days) {
    const late = lateMinutesFor(d);
    if (late === null) continue; // day off or no punch
    workedDays += 1;
    if (late > 0) {
      lateDays += 1;
      totalLateMin += late;
    }
  }
  return { lateDays, totalLateMin, workedDays };
}
