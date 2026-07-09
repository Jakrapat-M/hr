import { describe, it, expect } from 'vitest';
import { expandRange, isWorkingDay } from '../use-results-inputs';

describe('expandRange', () => {
  it('expands an inclusive ISO date range to per-day strings', () => {
    expect(expandRange('2026-06-08', '2026-06-10')).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
    ]);
  });
  it('handles a single-day range', () => {
    expect(expandRange('2026-06-08', '2026-06-08')).toEqual(['2026-06-08']);
  });
  it('returns [] for an inverted or empty range', () => {
    expect(expandRange('2026-06-10', '2026-06-08')).toEqual([]);
    expect(expandRange('', '2026-06-08')).toEqual([]);
  });
  it('crosses a month boundary', () => {
    expect(expandRange('2026-05-30', '2026-06-01')).toEqual([
      '2026-05-30',
      '2026-05-31',
      '2026-06-01',
    ]);
  });
});

describe('isWorkingDay', () => {
  const working = new Set(['2026-06-08', '2026-06-09', '2026-06-10']);
  const holidays = new Map<string, unknown>([['2026-06-09', { nameTh: 'x', nameEn: 'x' }]]);

  it('is true for a scheduled day that is not a holiday', () => {
    expect(isWorkingDay('2026-06-08', working, holidays)).toBe(true);
  });
  it('is false for a holiday even if scheduled', () => {
    expect(isWorkingDay('2026-06-09', working, holidays)).toBe(false);
  });
  it('is false for a day-off (not in the working set)', () => {
    expect(isWorkingDay('2026-06-07', working, holidays)).toBe(false);
  });
});
