// lib/time/period.ts — Group 0 (Time-module ESS shared foundations)
//
// MOCK ONLY. The payroll period runs the 21st of one month → the 20th of the
// next. Pure + deterministic: no `new Date()` at module top-level (SSR safety);
// the reference "today" is computed inside each function and overridable via
// `refDate` for tests.

/**
 * The reference "today" (UTC midnight) when no explicit `refDate` is supplied.
 * Uses the real current date so the bookable window tracks wall-clock time
 * (previously pinned to a fixed demo date, which made the future-booking window
 * shrink to nothing over time). Computed inside the function — never at module
 * top level — to stay SSR-safe.
 */
function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function toISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function refOf(refDate?: Date): Date {
  if (refDate) {
    return new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate()));
  }
  return todayUTC();
}

/** How many days ahead leave may be booked (SF-style advance booking). */
export const LEAVE_BOOKING_HORIZON_DAYS = 90;

/**
 * Frozen reference day for the DEMO time-grid seeds (schedule/attendance) and the
 * roster + timesheet surfaces that render them. Pins the seeded ~30-day payroll
 * window so it never slides off wall-clock today (otherwise demo cells go blank
 * once real today leaves the seeded period). Intentionally DISTINCT from
 * `currentPeriod()`'s default ref (real today) — the leave-booking/locking logic
 * must keep tracking wall-clock time, so only the demo seeds/displays pin to this.
 */
export const DEMO_TODAY = '2026-06-07';

/** `DEMO_TODAY` as a UTC-midnight Date, for passing as `currentPeriod(refDate)`. */
export function demoToday(): Date {
  return new Date(DEMO_TODAY + 'T00:00:00Z');
}

/**
 * The payroll period (21st → 20th) containing `refDate` (or the demo today).
 * If the ref day is >= 21, the window is [this month 21 → next month 20];
 * otherwise it is [previous month 21 → this month 20].
 */
export function currentPeriod(refDate?: Date): { start: string; end: string } {
  const ref = refOf(refDate);
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const day = ref.getUTCDate();

  let start: Date;
  let end: Date;
  if (day >= 21) {
    start = new Date(Date.UTC(y, m, 21));
    end = new Date(Date.UTC(y, m + 1, 20));
  } else {
    start = new Date(Date.UTC(y, m - 1, 21));
    end = new Date(Date.UTC(y, m, 20));
  }
  return { start: toISODate(start), end: toISODate(end) };
}

/** Is `dateISO` (YYYY-MM-DD) inside the current payroll period? Inclusive bounds. */
export function isWithinCurrentPeriod(dateISO: string, refDate?: Date): boolean {
  const { start, end } = currentPeriod(refDate);
  return dateISO >= start && dateISO <= end;
}

/**
 * MOCK ONLY — timesheet lock gate for time corrections (Group C / C3). A working
 * day belongs to a LOCKED period once payroll has closed it: anything strictly
 * before the start of the current payroll period is treated as locked (the prior
 * period has been processed and can no longer be corrected via ESS).
 */
export function isTimesheetLocked(dateISO: string, refDate?: Date): boolean {
  if (!dateISO) return false;
  const { start } = currentPeriod(refDate);
  return dateISO < start;
}

/**
 * STA-130 (BA, 2026-06-25) — earliest backdate allowed for a leave request: the
 * start of the current payroll period. Backdated leave is permitted within the
 * still-open period (sick leave is inherently retroactive), but not into a prior,
 * already-processed period — i.e. the "≈1 รอบ" cap Pattranuch asked for.
 */
export function LEAVE_BACKDATE_MIN(refDate?: Date): string {
  return currentPeriod(refDate).start;
}

/**
 * MOCK ONLY — leave-specific bookable window. Leave supports SF-style advance
 * booking up to `LEAVE_BOOKING_HORIZON_DAYS` days ahead, AND (STA-130) backdating
 * within the current payroll period (down to `LEAVE_BACKDATE_MIN`). Dates before
 * the current period start (already-processed) and beyond the horizon are not
 * bookable. The payroll-period functions above are intentionally left untouched so
 * the time-correction lock semantics do not change.
 */
export function isBookableLeaveDate(dateISO: string, refDate?: Date): boolean {
  if (!dateISO) return false;
  const today = refOf(refDate);
  const horizon = new Date(today.getTime());
  horizon.setUTCDate(horizon.getUTCDate() + LEAVE_BOOKING_HORIZON_DAYS);
  const horizonISO = toISODate(horizon);
  return dateISO >= LEAVE_BACKDATE_MIN(refDate) && dateISO <= horizonISO;
}
