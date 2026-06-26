// lib/time/ot-math.ts — Group B (Time-module ESS OT reconcile)
//
// MOCK ONLY. Pure OT-hours arithmetic + period totals. Cross-midnight aware:
// an OT shift that ends "earlier" than it starts (e.g. 23:00 → 02:00) wraps to
// the next day and adds 24h. Deterministic + unit-tested.

import type { OTRequest } from '@/stores/overtime-requests';
import { currentPeriod, isWithinCurrentPeriod } from '@/lib/time/period';
import { overlaps } from '@/lib/time/time-overlap';

/**
 * Illustrative monthly OT cap (hours). Thai labour law caps OT differently per
 * scheme; this single number is a demo guardrail (wiki Open Q#2 — not a legal
 * figure). The OT submit form blocks when month-to-date + requested > cap.
 */
export const MONTHLY_OT_CAP_HOURS = 36;

/**
 * Computed OT hours between two ISO datetimes, cross-midnight aware.
 *   • end > start            → plain difference.
 *   • end <= start (wrap)    → add 24h (e.g. 23:00 → 02:00 = 3h).
 *   • equal time / invalid   → 0.
 * Rounded to 2 decimals.
 */
export function computeOtHours(startAtISO: string, endAtISO: string): number {
  const start = new Date(startAtISO).getTime();
  const end = new Date(endAtISO).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  let diffMs = end - start;
  if (diffMs === 0) return 0; // equal time → 0 (no shift)
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000; // cross-midnight wrap
  }
  if (diffMs <= 0) return 0;
  const hours = diffMs / (60 * 60 * 1000);
  return Math.round(hours * 100) / 100;
}

/**
 * Display/total OT hours for one request. For a multi-day request (`days?.length`)
 * `startAt`/`endAt` are the SPAN (earliest start … latest end), NOT a duration —
 * so return the stored total `hours`. For a single-day request recompute from the
 * window (cross-midnight aware). The single derived read for all consumers. */
export function otDisplayHours(req: OTRequest): number {
  return req.days?.length ? req.hours : computeOtHours(req.startAt, req.endAt);
}

/** Sum approved+pending OT hours for an employee within a [start,end] window. */
function sumWithin(
  reqs: OTRequest[],
  employeeId: string,
  start: string,
  end: string,
): number {
  const total = reqs
    .filter((r) => r.employeeId === employeeId)
    .filter((r) => r.status === 'approved' || r.status === 'pending')
    .filter((r) => {
      const day = (r.startAt ?? '').slice(0, 10);
      return day >= start && day <= end;
    })
    .reduce((sum, r) => sum + (r.hours ?? 0), 0);
  return Math.round(total * 100) / 100;
}

/**
 * Month-to-period OT total (approved+pending) for an employee, scoped to the
 * payroll period (21st → 20th) containing `refDate` / the demo today. Named
 * "monthly" per the cap semantics; the window is the payroll period.
 */
export function monthlyOtTotal(reqs: OTRequest[], employeeId: string, refDate?: Date): number {
  const { start, end } = currentPeriod(refDate);
  return sumWithin(reqs, employeeId, start, end);
}

/**
 * Year-to-date OT total (approved+pending) for an employee, scoped to the
 * calendar year of `refDate` / the demo today.
 */
export function yearlyOtTotal(reqs: OTRequest[], employeeId: string, refDate?: Date): number {
  const { end } = currentPeriod(refDate);
  const year = end.slice(0, 4);
  return sumWithin(reqs, employeeId, `${year}-01-01`, `${year}-12-31`);
}

// ── STA-164 multi-day OT validation (pure; the form maps codes → i18n) ────────

/** One candidate OT-day window built from a form row. */
export type OtDayWindow = { date: string; startAt: string; endAt: string; hours: number };

/** A pending/approved leave span the OT must not collide with (by date). */
export type LeaveSpan = { startDate: string; endDate: string };

/**
 * Discriminated validation outcome for a multi-day OT submission.
 *   • invalid_row     — a row is missing a date / has a zero-hour window.
 *   • bad_range       — a row's end is at or before its start (backwards/equal
 *                       range). With explicit Start/End dates (STA-173) the
 *                       +1day inference is gone, so a backwards range is a real
 *                       error, distinct from a blank row.
 *   • outside_period  — a row's date is outside the current payroll period.
 *   • cross_row       — two days in THIS request overlap.
 *   • existing_ot     — a day overlaps the employee's stored pending/approved OT.
 *   • leave           — a day collides with a pending/approved leave span.
 *   • over_cap        — month-to-date + summed total exceeds the monthly cap.
 *                       Carries `total` so the message can interpolate it.
 */
export type OtValidation =
  | { code: 'invalid_row' }
  | { code: 'bad_range' }
  | { code: 'outside_period' }
  | { code: 'cross_row' }
  | { code: 'existing_ot' }
  | { code: 'leave' }
  | { code: 'over_cap'; total: number }
  | null;

/**
 * Validate the candidate OT-day windows against per-row validity, the payroll
 * period, cross-row overlap, the employee's stored OT, leave spans, and the
 * monthly cap on the SUMMED total. Pure + deterministic. `storedOt` should be
 * the employee's pending/approved requests — a single-day stored request is
 * compared against its span, a multi-day one against each of its days[].
 */
export function validateOtDayRows(args: {
  dayWindows: OtDayWindow[];
  storedOt: OTRequest[];
  leave: LeaveSpan[];
  monthToDateHours: number;
  cap?: number;
  /** Pins the payroll-period reference day (defaults to today); used in tests. */
  refDate?: Date;
}): OtValidation {
  const { dayWindows, storedOt, leave, monthToDateHours, refDate } = args;
  const cap = args.cap ?? MONTHLY_OT_CAP_HOURS;

  // (i) per-row validity + payroll period.
  // Ordering invariant: empty → bad_range → hours<=0 → outside_period. The
  // backwards-range check reads the RAW window (endAt <= startAt) BEFORE the
  // hours<=0 guard, so an explicit backwards/equal range surfaces as bad_range
  // rather than being masked as a zeroed invalid_row (STA-173).
  for (const d of dayWindows) {
    if (!d.date || !d.startAt || !d.endAt) return { code: 'invalid_row' };
    if (d.endAt <= d.startAt) return { code: 'bad_range' };
    if (d.hours <= 0) return { code: 'invalid_row' };
    if (!isWithinCurrentPeriod(d.date, refDate)) return { code: 'outside_period' };
  }

  // (ii) cross-row overlap within this request (i<j).
  for (let i = 0; i < dayWindows.length; i++) {
    for (let j = i + 1; j < dayWindows.length; j++) {
      if (overlaps(dayWindows[i].startAt, dayWindows[i].endAt, dayWindows[j].startAt, dayWindows[j].endAt)) {
        return { code: 'cross_row' };
      }
    }
  }

  // (iii) overlap with the employee's own pending/approved OT. A stored single-day
  // request participates via its span; a multi-day one via each days[] window.
  const storedWindows = storedOt
    .filter((r) => r.status === 'pending' || r.status === 'approved')
    .flatMap((r) => r.days ?? [{ startAt: r.startAt, endAt: r.endAt }]);
  if (dayWindows.some((d) => storedWindows.some((w) => overlaps(d.startAt, d.endAt, w.startAt, w.endAt)))) {
    return { code: 'existing_ot' };
  }

  // (iv) OT + Leave overlap on each row's date. With explicit cross-day OT
  // (STA-173) the row can END on a different day than it starts, so test BOTH
  // the start (anchor) day and the end day against each leave span.
  if (
    dayWindows.some((d) => {
      const endDay = (d.endAt ?? '').slice(0, 10);
      return leave.some(
        (l) =>
          (d.date >= l.startDate && d.date <= l.endDate) || // start day
          (endDay >= l.startDate && endDay <= l.endDate), // STA-173: end day too
      );
    })
  ) {
    return { code: 'leave' };
  }

  // (v) monthly cap on the SUMMED total.
  const total = Math.round((monthToDateHours + dayWindows.reduce((s, d) => s + d.hours, 0)) * 100) / 100;
  if (total > cap) return { code: 'over_cap', total };

  return null;
}
