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
