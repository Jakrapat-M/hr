import { describe, expect, test } from 'vitest';
import { currentPeriod, isWithinCurrentPeriod } from '@/lib/time/period';

describe('period (21 → 20 payroll window)', () => {
  test('ref day >= 21 → [this month 21 → next month 20]', () => {
    const p = currentPeriod(new Date(Date.UTC(2026, 5, 25))); // 2026-06-25
    expect(p.start).toBe('2026-06-21');
    expect(p.end).toBe('2026-07-20');
  });

  test('ref day < 21 → [previous month 21 → this month 20]', () => {
    const p = currentPeriod(new Date(Date.UTC(2026, 5, 10))); // 2026-06-10
    expect(p.start).toBe('2026-05-21');
    expect(p.end).toBe('2026-06-20');
  });

  test('window crosses a year boundary', () => {
    const p = currentPeriod(new Date(Date.UTC(2026, 11, 30))); // 2026-12-30
    expect(p.start).toBe('2026-12-21');
    expect(p.end).toBe('2027-01-20');
  });

  test('isWithinCurrentPeriod respects inclusive bounds', () => {
    const ref = new Date(Date.UTC(2026, 5, 25));
    expect(isWithinCurrentPeriod('2026-06-21', ref)).toBe(true);
    expect(isWithinCurrentPeriod('2026-07-20', ref)).toBe(true);
    expect(isWithinCurrentPeriod('2026-06-20', ref)).toBe(false);
    expect(isWithinCurrentPeriod('2026-07-21', ref)).toBe(false);
  });

  test('deterministic demo today (no refDate) is a valid window', () => {
    const p = currentPeriod();
    expect(p.start).toBe('2026-05-21');
    expect(p.end).toBe('2026-06-20');
  });
});
