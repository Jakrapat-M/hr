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
 * The payroll period (21st → 20th) immediately BEFORE the one containing
 * `refDate`. Derived from `currentPeriod`: the day before the current period
 * start (the 20th) falls inside the previous cycle.
 */
export function previousPeriod(refDate?: Date): { start: string; end: string } {
  const { start } = currentPeriod(refDate);
  const dayBeforeStart = new Date(`${start}T00:00:00Z`);
  dayBeforeStart.setUTCDate(dayBeforeStart.getUTCDate() - 1);
  return currentPeriod(dayBeforeStart);
}

/**
 * STA-183 — a request whose start date is cancellable iff it falls in the CURRENT
 * or the immediately-PREVIOUS payroll cycle (21st → 20th). One cycle back is the
 * self-service cancel window: anything before the previous cycle's start has been
 * processed and can no longer be self-cancelled. Pure + ref-injectable (pass
 * `demoToday()` on the demo surfaces so the window tracks the frozen demo day).
 * Empty/absent dates are never cancellable. Lower-bound only — a future-booked
 * start date stays cancellable (BA open question, intentional for the mockup).
 */
export function isCancellableByCycle(startDateISO: string, refDate?: Date): boolean {
  if (!startDateISO) return false;
  return startDateISO >= previousPeriod(refDate).start;
}

/**
 * STA-156 (BA, 2026-06-25) — earliest backdate allowed for a leave request: the
 * start of the PREVIOUS payroll cycle (1 cycle back). Backdated leave is permitted
 * for up to one previous attendance/payroll cycle (cycle = 21st → 20th); anything
 * before that previous-cycle start is already processed and not bookable. This
 * supersedes STA-130's current-period-only floor — Pattranuch's "1 previous cycle"
 * rule. Example: today 25 Jun 2026 → current cycle 21 Jun–20 Jul, previous cycle
 * 21 May–20 Jun → earliest selectable date = 21 May 2026.
 */
export function LEAVE_BACKDATE_MIN(refDate?: Date): string {
  return previousPeriod(refDate).start;
}

/**
 * STA-249 / STA-239 (shared) — the selectable payroll-period options for a period
 * dropdown (Team Overview, and any future period picker). Generates 21st→20th
 * pay-period windows bounded to `−1 year back` … `+3 months forward` from the
 * reference day: 12 previous periods + the current period + 3 forward = 16 options.
 * Each option carries the period `key` (its start ISO — a stable id), the inclusive
 * `[start, end]` ISO bounds, and an `isCurrent` flag (the current period is the
 * intended default selection). Bilingual labels are the CALLER's concern — format
 * `start`/`end` with the app date helpers — so this stays i18n-free and reusable.
 * Pure + `refDate`-injectable (pass `demoToday()` on the demo surfaces).
 */
export type PeriodOption = {
  /** Stable id for the option — the period's start ISO ('YYYY-MM-DD', a 21st). */
  key: string;
  /** Inclusive period start ISO (the 21st). */
  start: string;
  /** Inclusive period end ISO (the 20th of the next month). */
  end: string;
  /** True for the period containing `refDate` — the intended default. */
  isCurrent: boolean;
};

/** Months of history offered (−1 year). */
const PERIOD_OPTIONS_BACK = 12;
/** Months of look-ahead offered (+3 months). */
const PERIOD_OPTIONS_FORWARD = 3;

export function periodOptions(refDate?: Date): PeriodOption[] {
  const { start } = currentPeriod(refDate);
  const cur = new Date(`${start}T00:00:00Z`); // the current period's start (a 21st)
  const opts: PeriodOption[] = [];
  for (let n = -PERIOD_OPTIONS_BACK; n <= PERIOD_OPTIONS_FORWARD; n++) {
    const s = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + n, 21));
    const e = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 20));
    opts.push({ key: toISODate(s), start: toISODate(s), end: toISODate(e), isCurrent: n === 0 });
  }
  return opts;
}

/**
 * MOCK ONLY — leave-specific bookable window. Leave supports SF-style advance
 * booking up to `LEAVE_BOOKING_HORIZON_DAYS` days ahead, AND (STA-156) backdating
 * down to the start of the previous payroll cycle (`LEAVE_BACKDATE_MIN`). Dates
 * before that previous-cycle start (already-processed) and beyond the horizon are
 * not bookable. The payroll-period functions above are intentionally left untouched
 * so the time-correction lock semantics do not change.
 */
export function isBookableLeaveDate(dateISO: string, refDate?: Date): boolean {
  if (!dateISO) return false;
  const today = refOf(refDate);
  const horizon = new Date(today.getTime());
  horizon.setUTCDate(horizon.getUTCDate() + LEAVE_BOOKING_HORIZON_DAYS);
  const horizonISO = toISODate(horizon);
  return dateISO >= LEAVE_BACKDATE_MIN(refDate) && dateISO <= horizonISO;
}
