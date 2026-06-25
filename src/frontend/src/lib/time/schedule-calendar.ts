// STA-153 — group the period's attendance/schedule days into calendar weeks for
// the Timesheet "Schedule" tab Calendar View. Pure + UTC-pinned so it matches the
// rest of the time module (no local-tz drift). Mon-first weeks; leading/trailing
// cells outside the period are `null` (rendered as blanks).
import type { AttendanceDay } from '@/lib/time/attendance-math';

/** Mon-first weekday index (0=Mon … 6=Sun) for a YYYY-MM-DD date. */
export function mondayIndex(dateISO: string): number {
  const dow = new Date(`${dateISO}T00:00:00Z`).getUTCDay(); // 0=Sun … 6=Sat
  return (dow + 6) % 7;
}

/**
 * Lay the period days out as calendar weeks: arrays of exactly 7 cells, Mon→Sun.
 * The first row is left-padded with `null` so the first date sits under its real
 * weekday; the last row is right-padded to 7. Returns [] for no days.
 */
export function buildScheduleWeeks(days: AttendanceDay[]): (AttendanceDay | null)[][] {
  if (days.length === 0) return [];
  const cells: (AttendanceDay | null)[] = [];
  const lead = mondayIndex(days[0].date);
  for (let i = 0; i < lead; i++) cells.push(null);
  cells.push(...days);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (AttendanceDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Mon-first weekday header labels. */
export const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_LABELS_TH = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'] as const;
