// correction-overlay — composes the PURE seed-derived hero/exceptions
// (lib/time/exceptions.ts) with live time-correction state, WITHOUT mutating
// either source. Once a manager approves a correction for a day, that day's
// late/exception should visibly resolve in the at-a-glance hero + exception
// list — but exceptions.ts stays pure (its unit tests are unchanged). The
// timesheet page calls these to derive DISPLAY-adjusted values.

import type { HeroSummary, TimeException } from './exceptions';
import type { TimeCorrectionRequest } from '@/stores/time-corrections';

/**
 * Dates (YYYY-MM-DD) with an APPROVED correction, scoped to the current period.
 * `periodDates` is the set of the period's working days (from getAttendanceForPeriod),
 * so stale localStorage corrections outside the current period never leak in.
 */
export function approvedCorrectionDates(
  requests: TimeCorrectionRequest[],
  empId: string,
  periodDates: Set<string>,
): Set<string> {
  // Convention X (multi-day): a request can cover several days — day 0 lives in
  // the top-level `date`, days 1..n in `days[]`. Collect EVERY covered date so an
  // approved multi-day correction resolves the hero exception/late on each one,
  // not just day 0 (MF-3). Intersect with periodDates so stale localStorage
  // corrections outside the current period never leak in.
  const covered = new Set<string>();
  for (const r of requests) {
    if (r.employeeId !== empId || r.status !== 'approved') continue;
    for (const date of [r.date, ...(r.days?.map((d) => d.date) ?? [])]) {
      if (periodDates.has(date)) covered.add(date);
    }
  }
  return covered;
}

/**
 * Hero counts with approved-correction days resolved out: `exceptionCount` drops
 * the resolved exceptions, `lateDays` drops days whose `late` exception is resolved.
 * Other hero metrics (hours, on-time %) are left as the raw record.
 */
export function adjustHeroForApproved(
  hero: HeroSummary,
  exceptions: TimeException[],
  approvedDates: Set<string>,
): HeroSummary {
  if (approvedDates.size === 0) return hero;
  const resolved = exceptions.filter((e) => approvedDates.has(e.date));
  const lateResolved = resolved.filter((e) => e.type === 'late').length;
  return {
    ...hero,
    exceptionCount: Math.max(0, hero.exceptionCount - resolved.length),
    lateDays: Math.max(0, hero.lateDays - lateResolved),
  };
}

/** Exceptions still OPEN (no approved correction for that day). */
export function openExceptions(
  exceptions: TimeException[],
  approvedDates: Set<string>,
): TimeException[] {
  return exceptions.filter((e) => !approvedDates.has(e.date));
}
