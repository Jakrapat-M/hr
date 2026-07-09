import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  durationMinutes,
  hourlyLeaveFraction,
  isValidHourlySpan,
  timeOptions,
  endTimeOptions,
  WORKDAY_HOURS,
} from '@/lib/leave-math';

// STA-151 — hourly Sick leave: 30-min increments, min 30 / max 240, end > start,
// fraction = minutes / (WORKDAY_HOURS × 60). Default 8h ⇒ 4h = 0.5 day.

describe('timeToMinutes / durationMinutes', () => {
  it('parses HH:MM to minutes-since-midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('18:00')).toBe(1080);
  });

  it('returns null for malformed times', () => {
    expect(timeToMinutes('')).toBeNull();
    expect(timeToMinutes('9:30')).toBeNull();
    expect(timeToMinutes('25:00')).toBeNull();
    expect(timeToMinutes('09:60')).toBeNull();
  });

  it('returns the signed span between two times', () => {
    expect(durationMinutes('09:30', '10:00')).toBe(30);
    expect(durationMinutes('09:30', '11:30')).toBe(120);
    expect(durationMinutes('09:30', '13:30')).toBe(240);
    expect(durationMinutes('09:30', '14:00')).toBe(270);
    expect(durationMinutes('10:00', '09:30')).toBe(-30); // end before start
  });
});

describe('isValidHourlySpan — BA examples (30/120/240 pass, 270 block)', () => {
  it('accepts 30, 120, 240 minutes (inclusive)', () => {
    expect(isValidHourlySpan(30)).toBe(true);
    expect(isValidHourlySpan(120)).toBe(true);
    expect(isValidHourlySpan(240)).toBe(true);
  });

  it('rejects below 30 and above 240', () => {
    expect(isValidHourlySpan(15)).toBe(false);
    expect(isValidHourlySpan(0)).toBe(false);
    expect(isValidHourlySpan(270)).toBe(false); // 09:30–14:00 (4.5h)
  });

  it('rejects null / non-positive spans (end ≤ start)', () => {
    expect(isValidHourlySpan(null)).toBe(false);
    expect(isValidHourlySpan(-30)).toBe(false);
  });
});

describe('hourlyLeaveFraction — minutes → fractional day @ 8h workday', () => {
  it('converts BA spans to day fractions', () => {
    expect(WORKDAY_HOURS).toBe(8);
    expect(hourlyLeaveFraction(30)).toBeCloseTo(0.0625); // 0.5h
    expect(hourlyLeaveFraction(120)).toBe(0.25); // 2h ⇒ 0.25 day
    expect(hourlyLeaveFraction(240)).toBe(0.5); // 4h ⇒ 0.5 day
  });

  it('returns 0 for non-positive / non-finite minutes', () => {
    expect(hourlyLeaveFraction(0)).toBe(0);
    expect(hourlyLeaveFraction(-1)).toBe(0);
    expect(hourlyLeaveFraction(Number.NaN)).toBe(0);
  });

  it('honors a custom workday-hours basis', () => {
    expect(hourlyLeaveFraction(240, 7.5)).toBeCloseTo(0.5333, 3);
  });
});

describe('timeOptions — 30-min increments across the workday', () => {
  it('spans 08:00–18:00 inclusive in 30-min steps', () => {
    const opts = timeOptions();
    expect(opts[0]).toBe('08:00');
    expect(opts[opts.length - 1]).toBe('18:00');
    expect(opts).toContain('09:30');
    expect(opts).toContain('13:30');
    // (18-8)*2 + 1 = 21 slots
    expect(opts).toHaveLength(21);
  });
});

describe('endTimeOptions — gated by start (min 30 / max 240 / end>start)', () => {
  it('offers only 09:30+30min .. 09:30+4h for a 09:30 start', () => {
    const ends = endTimeOptions('09:30');
    expect(ends[0]).toBe('10:00'); // start + 30min, end > start
    expect(ends).toContain('11:30'); // 2h
    expect(ends).toContain('13:30'); // 4h (max)
    expect(ends).not.toContain('09:30'); // not end == start
    expect(ends).not.toContain('14:00'); // 4.5h blocked
  });

  it('clamps the max to the window end (18:00)', () => {
    const ends = endTimeOptions('17:00');
    expect(ends[0]).toBe('17:30');
    expect(ends[ends.length - 1]).toBe('18:00'); // not 21:00 (start+4h)
    expect(ends).not.toContain('18:30');
  });

  it('returns no options for an empty/invalid start', () => {
    expect(endTimeOptions('')).toEqual([]);
    expect(endTimeOptions('bad')).toEqual([]);
  });
});
