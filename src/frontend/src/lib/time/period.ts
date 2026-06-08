// lib/time/period.ts — Group 0 (Time-module ESS shared foundations)
//
// MOCK ONLY. The payroll period runs the 21st of one month → the 20th of the
// next. Pure + deterministic: no `new Date()` at module top-level (SSR safety);
// the reference "today" is computed inside each function and overridable via
// `refDate` for tests.

/** Fixed demo "today" used when no refDate is supplied (deterministic for SSR). */
const DEMO_TODAY_ISO = '2026-06-07';

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
  const [y, m, d] = DEMO_TODAY_ISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
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
