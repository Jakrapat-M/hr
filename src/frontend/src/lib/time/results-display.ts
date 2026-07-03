// lib/time/results-display.ts — pure display helpers for the My Timesheet "Time
// Result" tab (STA-195): base-10 ↔ base-60 hour formatting, per-line amount, and
// the Total-row roll-up. Operates over the dedicated results-breakdown seed.
//
// MOCK ONLY. Pure + deterministic.

import type { WageBreakdownRow } from './results-breakdown-seed';

/**
 * Format decimal hours as base-60 "H:mm" (e.g. 7.5 → "7:30", 8 → "8:00",
 * -0.5 → "-0:30"). Minutes are rounded to the nearest whole minute.
 */
export function toBase60(decimalHours: number): string {
  const sign = decimalHours < 0 ? '-' : '';
  const totalMin = Math.round(Math.abs(decimalHours) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Mock amount (THB) for a breakdown line, keyed by its semantic pay kind:
 * Shift Premium = 60, Meal Allowance = 50, holiday premium = 300, else 0.
 * Deterministic — mirrors the mock's Amount column.
 */
export function resultAmount(row: WageBreakdownRow): number {
  switch (row.payKind) {
    case 'shift_premium':
      return 60;
    case 'meal':
      return 50;
    case 'holiday_premium':
      return 300;
    default:
      return 0;
  }
}

export type ResultsTotals = {
  /** Net base-10 hours (positives − deductions). */
  base10: number;
  /** Net hours as base-60 "H:mm". */
  base60: string;
  /** Sum of positive hour lines. */
  positive: number;
  /** Absolute sum of negative (deduction) hour lines. */
  negative: number;
  days: number;
  amount: number;
};

/** Round to 2 decimals (avoids float drift in the summed totals). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Total-row roll-up over the breakdown rows (skips the pending "today" row). */
export function resultsTotals(rows: WageBreakdownRow[]): ResultsTotals {
  let positive = 0;
  let negative = 0;
  let days = 0;
  let amount = 0;
  for (const r of rows) {
    if (r.pending) continue;
    if (r.hours != null) {
      if (r.hours >= 0) positive += r.hours;
      else negative += -r.hours;
    }
    days += r.days;
    amount += resultAmount(r);
  }
  positive = round2(positive);
  negative = round2(negative);
  const base10 = round2(positive - negative);
  return {
    base10,
    base60: toBase60(base10),
    positive,
    negative,
    days: round2(days),
    amount: round2(amount),
  };
}
