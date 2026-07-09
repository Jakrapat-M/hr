import { describe, it, expect } from 'vitest';
import { TIME_HOLIDAYS_2026, getHolidaysForPeriod } from '../holiday-calendar';

describe('TIME_HOLIDAYS_2026', () => {
  it('has bilingual labels for every row', () => {
    expect(TIME_HOLIDAYS_2026.length).toBeGreaterThan(0);
    for (const h of TIME_HOLIDAYS_2026) {
      expect(h.date).toMatch(/^2026-\d{2}-\d{2}$/);
      expect(h.nameTh).toBeTruthy();
      expect(h.nameEn).toBeTruthy();
    }
  });
});

describe('getHolidaysForPeriod', () => {
  it('filters to the inclusive [start, end] window', () => {
    const m = getHolidaysForPeriod('2026-05-21', '2026-06-20');
    // Visakha Bucha (06-01) + Queen's Birthday (06-03) fall in this period.
    expect(m.has('2026-06-01')).toBe(true);
    expect(m.has('2026-06-03')).toBe(true);
    // Out-of-window holidays are excluded.
    expect(m.has('2026-05-04')).toBe(false); // before start
    expect(m.has('2026-07-28')).toBe(false); // after end
  });

  it('includes the boundary dates (inclusive)', () => {
    const m = getHolidaysForPeriod('2026-05-01', '2026-05-04');
    expect(m.has('2026-05-01')).toBe(true); // == start
    expect(m.has('2026-05-04')).toBe(true); // == end
  });

  it('returns labels, not just dates', () => {
    const m = getHolidaysForPeriod('2026-01-01', '2026-01-01');
    expect(m.get('2026-01-01')?.nameEn).toBe("New Year's Day");
  });

  it('is empty for a window with no holidays', () => {
    expect(getHolidaysForPeriod('2026-02-01', '2026-02-28').size).toBe(0);
  });
});
