import { describe, it, expect } from 'vitest';
import { getExceptionsForPeriod, heroSummary } from '../exceptions';

// emp-001 is a clocking employee with seeded attendance for the current period.
const EMP = 'emp-001';

describe('getExceptionsForPeriod', () => {
  const items = getExceptionsForPeriod(EMP);

  it('returns a well-formed list', () => {
    expect(Array.isArray(items)).toBe(true);
    for (const ex of items) {
      expect(['late', 'missing_out', 'continuous_shift']).toContain(ex.type);
      expect(['warn', 'danger']).toContain(ex.severity);
      expect(ex.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(ex.th.length).toBeGreaterThan(0);
      expect(ex.en.length).toBeGreaterThan(0);
    }
  });

  it('flags late items as danger with positive late minutes', () => {
    for (const ex of items.filter((e) => e.type === 'late')) {
      expect(ex.severity).toBe('danger');
      expect(ex.lateMin ?? 0).toBeGreaterThan(0);
    }
  });

  it('returns the same list on repeat calls (deterministic seed)', () => {
    expect(getExceptionsForPeriod(EMP)).toEqual(items);
  });
});

describe('heroSummary', () => {
  const hero = heroSummary(EMP);

  it('keeps headline metrics in valid ranges', () => {
    expect(hero.onTimeRate).toBeGreaterThanOrEqual(0);
    expect(hero.onTimeRate).toBeLessThanOrEqual(100);
    expect(hero.actualHrs).toBeGreaterThanOrEqual(0);
    expect(hero.planHrs).toBeGreaterThanOrEqual(0);
    expect(hero.lateDays).toBeLessThanOrEqual(hero.workedDays);
  });

  it('exceptionCount matches getExceptionsForPeriod length', () => {
    expect(hero.exceptionCount).toBe(getExceptionsForPeriod(EMP).length);
  });

  it('derives on-time rate from worked vs late days', () => {
    if (hero.workedDays > 0) {
      const expected = Math.round(
        ((hero.workedDays - hero.lateDays) / hero.workedDays) * 100,
      );
      expect(hero.onTimeRate).toBe(expected);
    } else {
      expect(hero.onTimeRate).toBe(100);
    }
  });
});
