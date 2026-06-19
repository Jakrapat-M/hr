// lib/time/week.ts — STA-126 (Team Timesheet weekly grid)
//
// MOCK ONLY. Pure week-window + BE date-range helpers for the weekly Team
// Timesheet grid. Deterministic: all date math is done at UTC midnight so SSR +
// tests are stable and there is no local-timezone off-by-one (the time-domain
// seeds — schedule-template / attendance-seed / period — all key on UTC-midnight
// 'YYYY-MM-DD' strings, so the grid window must use the same basis to line up).

import { formatDate } from '@/lib/date';
import { currentPeriod } from './period';

// ── Single demo-today constant (FIX 2) ──────────────────────────────────────
// The grid's initial week anchor AND the attendance past/future cutoff both
// derive from this one date (mirrors attendance-seed.ts:13). The "today" button
// resets to the Mon-started week that contains it. Do NOT introduce a second
// anchor — a different date would put the grid's "past" days into the seed's
// blank "future" range.
export const DEMO_TODAY = '2026-06-07';

export type WeekWindow = {
  /** Monday of the week (UTC midnight). */
  start: Date;
  /** Sunday of the week (UTC midnight). */
  end: Date;
  /** The 7 days Mon→Sun (UTC midnight). */
  days: Date[];
};

/** Parse a 'YYYY-MM-DD' string (or Date) to a UTC-midnight Date. */
export function toUtcMidnight(value: string | Date): Date {
  if (typeof value === 'string') {
    return new Date(value + 'T00:00:00Z');
  }
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** ISO 'YYYY-MM-DD' for a Date, read in UTC. */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Add `n` whole days to a UTC-midnight date (n may be negative). */
function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

/** Add `n` whole weeks (7-day steps) to a date. */
export function addWeeks(date: Date, n: number): Date {
  return addDays(toUtcMidnight(date), n * 7);
}

/**
 * The Monday-started week window containing `anchor`.
 * getUTCDay(): 0 Sun .. 6 Sat → offset back to Monday (Sun counts as the LAST
 * day of the prior week, i.e. -6).
 */
export function weekWindow(anchor: string | Date): WeekWindow {
  const a = toUtcMidnight(anchor);
  const dow = a.getUTCDay(); // 0 Sun .. 6 Sat
  const backToMon = dow === 0 ? -6 : 1 - dow;
  const start = addDays(a, backToMon);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, end: days[6], days };
}

/** The default initial week — the Mon-started week containing DEMO_TODAY. */
export function defaultWeekWindow(): WeekWindow {
  return weekWindow(DEMO_TODAY);
}

/**
 * Bilingual BE date-range label for a week window, e.g.
 *   '2–8 มิ.ย. 2569'  /  '2–8 Jun 2026'
 * Collapses the shared month/year and expands across month / year rollover:
 *   '29 มิ.ย.–5 ก.ค. 2569' / '29 ธ.ค. 2569–4 ม.ค. 2570'.
 * Reuses formatDate('medium') for BE-year + localized month names.
 */
export function formatWeekRangeBE(start: Date, end: Date, locale: string): string {
  const isTh = locale === 'th';
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();

  // 'medium' → '<day> <monShort> <BE-year>' e.g. '2 มิ.ย. 2569' / '2 Jun 2026'.
  const startMedium = formatDate(start, 'medium', locale); // full start label
  const endMedium = formatDate(end, 'medium', locale); // full end label

  if (sameMonth && sameYear) {
    // '2–8 มิ.ย. 2569' — drop the start's month+year, keep just the day.
    return `${startDay}–${endMedium}`;
  }
  if (sameYear) {
    // Cross-month, same year: '29 มิ.ย.–5 ก.ค. 2569' — drop the start's year.
    // Build the start without its trailing year by trimming the end's year token.
    const endYear = isTh ? end.getUTCFullYear() + 543 : end.getUTCFullYear();
    const startNoYear = startMedium.replace(new RegExp(`\\s*${endYear}$`), '');
    // start year === end year here, so trimming the shared year value works.
    const startTrimmed = startNoYear === startMedium
      ? startMedium.replace(/\s+\d{4}$/, '')
      : startNoYear;
    return `${startTrimmed}–${endMedium}`;
  }
  // Cross-year: show both fully. '29 ธ.ค. 2569–4 ม.ค. 2570'.
  return `${startMedium}–${endMedium}`;
}

// ── Out-of-period behavior (FIX 3b) ─────────────────────────────────────────
// The time-domain seeds only cover the payroll-month window (21st→20th, ~30
// days; period.ts currentPeriod). Weeks fully outside that window have no seed
// data, so the grid must explicitly handle them rather than render silent blanks.

export type PeriodBounds = { start: Date; end: Date };

/**
 * The seeded payroll period as UTC-midnight bounds. Defaults the reference day to
 * DEMO_TODAY (NOT wall-clock today) so the period window, the grid's week anchor,
 * and the attendance past/future cutoff all agree on the SAME frozen reference.
 * Without this the period floats with real time: once wall-clock passes the 21st,
 * currentPeriod() slides to [21st→20th of next month], the DEMO_TODAY week stops
 * intersecting it, and the default grid renders the empty-week state on load
 * (and the attendance seed marks every generated day "future" → no punches).
 * Tests still pass an explicit refDate for deterministic period bounds.
 */
export function seededPeriodBounds(refDate?: Date): PeriodBounds {
  const ref = refDate ?? toUtcMidnight(DEMO_TODAY);
  const { start, end } = currentPeriod(ref);
  return { start: toUtcMidnight(start), end: toUtcMidnight(end) };
}

/** Does this week window intersect the seeded payroll period at all? */
export function weekIntersectsPeriod(win: WeekWindow, bounds: PeriodBounds): boolean {
  // Overlap iff week.start <= period.end AND week.end >= period.start.
  return win.start.getTime() <= bounds.end.getTime()
    && win.end.getTime() >= bounds.start.getTime();
}

/**
 * Clamp a prospective navigation step: returns the candidate week only if it
 * still intersects the seeded period; otherwise returns the current week
 * unchanged (prev/next nav is clamped to weeks with data).
 */
export function clampWeekToPeriod(
  current: WeekWindow,
  candidate: WeekWindow,
  bounds: PeriodBounds,
): WeekWindow {
  return weekIntersectsPeriod(candidate, bounds) ? candidate : current;
}
