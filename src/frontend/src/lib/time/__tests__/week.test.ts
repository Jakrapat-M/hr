import { describe, it, expect } from 'vitest';
import {
  DEMO_TODAY,
  weekWindow,
  defaultWeekWindow,
  addWeeks,
  formatWeekRangeBE,
  toIsoDate,
  seededPeriodBounds,
  weekIntersectsPeriod,
  clampWeekToPeriod,
} from '../week';

describe('weekWindow', () => {
  it('returns a Mon→Sun 7-day window', () => {
    const w = weekWindow('2026-06-03'); // a Wednesday
    expect(w.days).toHaveLength(7);
    expect(toIsoDate(w.start)).toBe('2026-06-01'); // Monday
    expect(toIsoDate(w.end)).toBe('2026-06-07'); // Sunday
    expect(w.days.map(toIsoDate)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ]);
  });

  it('treats Sunday as the last day of its week (no roll-forward)', () => {
    const w = weekWindow('2026-06-07'); // Sunday
    expect(toIsoDate(w.start)).toBe('2026-06-01');
    expect(toIsoDate(w.end)).toBe('2026-06-07');
  });

  it('treats Monday as the first day of its week', () => {
    const w = weekWindow('2026-06-01'); // Monday
    expect(toIsoDate(w.start)).toBe('2026-06-01');
  });
});

describe('defaultWeekWindow (DEMO_TODAY anchor)', () => {
  it('anchors to the Mon-started week containing DEMO_TODAY (2026-06-07)', () => {
    expect(DEMO_TODAY).toBe('2026-06-07');
    const w = defaultWeekWindow();
    expect(toIsoDate(w.start)).toBe('2026-06-01');
    expect(toIsoDate(w.end)).toBe('2026-06-07');
  });
});

describe('addWeeks', () => {
  it('advances by 7 days per week', () => {
    const next = addWeeks(new Date('2026-06-01T00:00:00Z'), 1);
    expect(toIsoDate(next)).toBe('2026-06-08');
  });
  it('handles negative weeks', () => {
    const prev = addWeeks(new Date('2026-06-01T00:00:00Z'), -1);
    expect(toIsoDate(prev)).toBe('2026-05-25');
  });
  it('crosses month boundaries', () => {
    const next = addWeeks(new Date('2026-06-29T00:00:00Z'), 1);
    expect(toIsoDate(next)).toBe('2026-07-06');
  });
});

describe('formatWeekRangeBE', () => {
  it('collapses a same-month week (EN)', () => {
    const w = weekWindow('2026-06-03');
    expect(formatWeekRangeBE(w.start, w.end, 'en')).toBe('1–7 Jun 2026');
  });
  it('collapses a same-month week (TH, Buddhist Era)', () => {
    const w = weekWindow('2026-06-03');
    expect(formatWeekRangeBE(w.start, w.end, 'th')).toBe('1–7 มิ.ย. 2569');
  });
  it('expands across a month boundary, same year (EN)', () => {
    // Mon 2026-06-29 → Sun 2026-07-05
    const w = weekWindow('2026-06-29');
    expect(toIsoDate(w.start)).toBe('2026-06-29');
    expect(toIsoDate(w.end)).toBe('2026-07-05');
    expect(formatWeekRangeBE(w.start, w.end, 'en')).toBe('29 Jun–5 Jul 2026');
  });
  it('expands across a year boundary (TH, Buddhist Era)', () => {
    // Mon 2026-12-28 → Sun 2027-01-03
    const w = weekWindow('2026-12-30');
    expect(toIsoDate(w.start)).toBe('2026-12-28');
    expect(toIsoDate(w.end)).toBe('2027-01-03');
    expect(formatWeekRangeBE(w.start, w.end, 'th')).toBe('28 ธ.ค. 2569–3 ม.ค. 2570');
  });
});

describe('out-of-period clamping', () => {
  // currentPeriod uses the real wall-clock today; for these structural assertions
  // we use a pinned refDate so the bounds are deterministic.
  const ref = new Date('2026-06-07T00:00:00Z'); // → period 2026-05-21..2026-06-20
  const bounds = seededPeriodBounds(ref);

  it('computes the payroll-period bounds (21st→20th)', () => {
    expect(toIsoDate(bounds.start)).toBe('2026-05-21');
    expect(toIsoDate(bounds.end)).toBe('2026-06-20');
  });

  it('a week inside the period intersects', () => {
    expect(weekIntersectsPeriod(weekWindow('2026-06-03'), bounds)).toBe(true);
  });

  it('a week fully outside the period does not intersect', () => {
    // Mid-August — well past the 2026-06-20 period end.
    expect(weekIntersectsPeriod(weekWindow('2026-08-12'), bounds)).toBe(false);
  });

  it('a week partially overlapping the period edge still intersects', () => {
    // Period ends 2026-06-20 (Sat). The week Mon 2026-06-15 → Sun 2026-06-21
    // overlaps through 06-20.
    expect(weekIntersectsPeriod(weekWindow('2026-06-18'), bounds)).toBe(true);
  });

  it('clampWeekToPeriod keeps the candidate when it intersects', () => {
    const current = weekWindow('2026-06-03');
    const candidate = weekWindow('2026-06-10');
    expect(clampWeekToPeriod(current, candidate, bounds)).toBe(candidate);
  });

  it('clampWeekToPeriod rejects a fully-outside candidate (returns current)', () => {
    const current = weekWindow('2026-06-15');
    const candidate = weekWindow('2026-08-12');
    expect(clampWeekToPeriod(current, candidate, bounds)).toBe(current);
  });
});
