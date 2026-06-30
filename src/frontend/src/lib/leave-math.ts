/**
 * Leave-day math — single source of truth.
 *
 * `calculateWorkingDays` is relocated verbatim from the (now-deleted)
 * `components/leave/leave-request-form.tsx:39` weekend-excluding loop so the
 * whole app shares ONE leave-day semantic. `countLeaveDays` layers Thai
 * public-holiday exclusion + a half-day rule on top of that same base — it does
 * NOT fork a second day-count.
 */

export type HalfDayOption = 'none' | 'morning' | 'afternoon';

/** ISO date (YYYY-MM-DD) for the day under `current`, in local time. */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Weekend-excluding working-day count between two ISO dates (inclusive).
 * Relocated as-is from leave-request-form.tsx — do not fork.
 */
export function calculateWorkingDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  let count = 0;
  const current = new Date(s);
  while (current <= e) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

interface CountLeaveDaysOptions {
  /** ISO (YYYY-MM-DD) Thai public holidays to exclude when they fall on a weekday. */
  holidays?: readonly string[];
  /** Half-day only applies when start === end (single working day) → 0.5. */
  halfDay?: HalfDayOption;
}

/**
 * Leave-day count: weekend-excluding base, minus any working-day holidays in
 * range, with a single-day half-day rule (→ 0.5) folded in.
 */
export function countLeaveDays(
  start: string,
  end: string,
  options: CountLeaveDaysOptions = {},
): number {
  const { holidays = [], halfDay = 'none' } = options;

  const base = calculateWorkingDays(start, end);
  if (base === 0) return 0;

  // Single working day + half-day selected → 0.5 (reuses the orphan's rule).
  if (start === end && halfDay !== 'none') return 0.5;

  if (holidays.length === 0) return base;

  const holidaySet = new Set(holidays);
  const s = new Date(start);
  const e = new Date(end);
  let holidayWeekdays = 0;
  const current = new Date(s);
  while (current <= e) {
    const day = current.getDay();
    if (day !== 0 && day !== 6 && holidaySet.has(toISODate(current))) {
      holidayWeekdays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return Math.max(0, base - holidayWeekdays);
}

// ── Hourly leave (STA-151) ────────────────────────────────────────────────
// Computed ALONGSIDE countLeaveDays (its 4-arg signature is intentionally NOT
// extended, so the existing leave.test.ts assertions stay green). Sick-only.

/**
 * Default working-hours-per-day basis for converting an hourly leave span into a
 * fractional day. BA-Q: confirm 8h vs 7.5h. 8h ⇒ a 4h max span = 0.5 day.
 */
export const WORKDAY_HOURS = 8;

/** Min / max hourly-leave span (BA: minimum 30 minutes, maximum 4 hours). */
export const HOURLY_MIN_MINUTES = 30;
export const HOURLY_MAX_MINUTES = 240;

/** Minutes since midnight for an `HH:MM` 24h string; `null` if unparseable. */
export function timeToMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm?.trim() ?? '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Span in minutes between two `HH:MM` strings; `null` if either is invalid. */
export function durationMinutes(start: string, end: string): number | null {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === null || e === null) return null;
  return e - s;
}

/**
 * Fractional leave-day for an hourly span: `minutes / (WORKDAY_HOURS × 60)`.
 * e.g. 2h @ 8h = 0.25 day, 4h @ 8h = 0.5 day. No rounding — the balance/quota
 * helpers already tolerate decimals.
 */
export function hourlyLeaveFraction(minutes: number, workdayHours = WORKDAY_HOURS): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return minutes / (workdayHours * 60);
}

/** True when `minutes` is a valid hourly-leave span (30 ≤ m ≤ 240, inclusive). */
export function isValidHourlySpan(minutes: number | null): boolean {
  return (
    minutes !== null &&
    minutes >= HOURLY_MIN_MINUTES &&
    minutes <= HOURLY_MAX_MINUTES
  );
}

/**
 * 30-min-increment `HH:MM` options across an inclusive window (default the
 * 08:00–18:00 workday). BA-Q: confirm the selectable window.
 */
export function timeOptions(
  startHour = 8,
  endHour = 18,
  stepMinutes = 30,
): string[] {
  const out: string[] = [];
  for (let m = startHour * 60; m <= endHour * 60; m += stepMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return out;
}

/**
 * End-time options for a chosen start: only values where
 * `start + 30min ≤ end ≤ start + 4h` (enforces min 30 / max 240 / end > start at
 * the option level). Empty when `start` is unset/invalid.
 */
export function endTimeOptions(
  start: string,
  windowEndHour = 18,
  stepMinutes = 30,
): string[] {
  const s = timeToMinutes(start);
  if (s === null) return [];
  const lo = s + HOURLY_MIN_MINUTES;
  const hi = Math.min(s + HOURLY_MAX_MINUTES, windowEndHour * 60);
  const out: string[] = [];
  for (let m = lo; m <= hi; m += stepMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return out;
}

/**
 * Parse the string leave balance (e.g. `'8.5'`, `'ไม่จำกัด'`) and return the
 * balance remaining after `days`. Unlimited (`'ไม่จำกัด'`) → `null` (no quota).
 */
export function remainingAfter(balanceRemaining: string, days: number): number | null {
  const parsed = parseBalance(balanceRemaining);
  if (parsed === null) return null;
  return parsed - days;
}

/**
 * True when `days` exceeds the parsed balance. Unlimited balances are NEVER
 * over-quota.
 */
export function isOverQuota(balanceRemaining: string, days: number): boolean {
  const parsed = parseBalance(balanceRemaining);
  if (parsed === null) return false;
  return days > parsed;
}

/** Parse a string balance to a number; `null` for unlimited / unparseable. */
function parseBalance(balanceRemaining: string): number | null {
  const trimmed = balanceRemaining?.trim();
  if (!trimmed || trimmed === 'ไม่จำกัด') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
