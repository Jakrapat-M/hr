// lib/time/ot-math.ts — Group B (Time-module ESS OT reconcile)
//
// MOCK ONLY. Pure OT-hours arithmetic + period totals. Cross-midnight aware:
// an OT shift that ends "earlier" than it starts (e.g. 23:00 → 02:00) wraps to
// the next day and adds 24h. Deterministic + unit-tested.

import type { OTRequest } from '@/stores/overtime-requests';
import { currentPeriod } from '@/lib/time/period';

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
