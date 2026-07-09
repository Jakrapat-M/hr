// STA-195 — Time Result display helpers + the dedicated breakdown seed.

import { describe, it, expect } from 'vitest';
import { toBase60, resultAmount, resultsTotals } from '../results-display';
import { getResultsBreakdown } from '../results-breakdown-seed';

describe('toBase60', () => {
  it('formats decimal hours as H:mm', () => {
    expect(toBase60(7.5)).toBe('7:30');
    expect(toBase60(8)).toBe('8:00');
    expect(toBase60(2)).toBe('2:00');
    expect(toBase60(0)).toBe('0:00');
  });

  it('preserves the sign for deductions', () => {
    expect(toBase60(-0.5)).toBe('-0:30');
  });
});

describe('results breakdown totals', () => {
  const rows = getResultsBreakdown('EMP101');

  it('amount total matches the mock (690.00)', () => {
    expect(resultsTotals(rows).amount).toBe(690);
  });

  it('captures the LATE_DEDUCT negative and a consistent net', () => {
    const t = resultsTotals(rows);
    expect(t.negative).toBeCloseTo(0.5, 5);
    expect(t.base10).toBeCloseTo(t.positive - t.negative, 5);
  });

  it('resultAmount maps allowance pay kinds', () => {
    const sp = rows.find((r) => r.payKind === 'shift_premium')!;
    const meal = rows.find((r) => r.payKind === 'meal')!;
    const hp = rows.find((r) => r.payKind === 'holiday_premium')!;
    expect(resultAmount(sp)).toBe(60);
    expect(resultAmount(meal)).toBe(50);
    expect(resultAmount(hp)).toBe(300);
  });
});
