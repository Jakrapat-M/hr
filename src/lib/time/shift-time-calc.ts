// lib/time/shift-time-calc.ts — STA-235 (Team Timesheet Draft 2)
//
// MOCK ONLY. Pure HH:MM helpers for the manager shift-time edit modal. The modal
// edits only the shift START + break PATTERN; the break-start and shift-end are
// derived here so the modal stays a thin render of these functions:
//   • break start defaults to shift start + 4h (manager may override)
//   • shift end = start + the employee's contracted span (8h or 9h, sourced from
//     the schedule-template / shift-code seed) — e.g. 08:00 + 9h → 17:00
//   • the break range label depends only on the chosen break pattern
// No backend: the "contracted length pulled from backend" is the seed span.

export type BreakPattern = 'break1h' | 'break90m' | 'none';

/** Minutes of break per pattern (drives the break-range label). */
export const BREAK_PATTERN_MINUTES: Record<BreakPattern, number> = {
  break1h: 60,
  break90m: 90,
  none: 0,
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  const norm = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2, '0')}:${String(norm % 60).padStart(2, '0')}`;
}

/** Default break start = shift start + 4h (overridable in the modal). */
export function breakStartFromShiftStart(start: string): string {
  return toHHMM(toMinutes(start) + 4 * 60);
}

/**
 * Auto shift-end = start + the employee's contracted span (hours). The span is
 * the in→out length the seed encodes (8 or 9), NOT the paid work hours — so the
 * ticket example 08:00 + 9h span → 17:00 holds regardless of break length.
 */
export function shiftEndFromStart(start: string, contractHours: number): string {
  return toHHMM(toMinutes(start) + Math.round(contractHours * 60));
}

/** In→out span in hours (0 when out ≤ in). Used to read a seed shift's contract span. */
export function spanHours(inTime: string, outTime: string): number {
  return Math.max(0, (toMinutes(outTime) - toMinutes(inTime)) / 60);
}

/** Break time range label, e.g. "12:00–13:00". `null` for the no-break pattern. */
export function breakRangeLabel(pattern: BreakPattern, breakStart: string): string | null {
  const dur = BREAK_PATTERN_MINUTES[pattern];
  if (dur <= 0) return null;
  return `${breakStart}–${toHHMM(toMinutes(breakStart) + dur)}`;
}

/** Bilingual label for each break pattern (modal select + legend). */
export const BREAK_PATTERN_LABEL: Record<BreakPattern, { th: string; en: string }> = {
  break1h: { th: 'เบรค 1 ชม.', en: '1 h break' },
  break90m: { th: 'เบรค 1.30 ชม.', en: '1.30 h break' },
  none: { th: 'ไม่มีเบรค', en: 'No break' },
};
