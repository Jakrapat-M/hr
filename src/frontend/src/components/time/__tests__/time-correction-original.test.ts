/**
 * time-correction-original.test.ts — STA-174: the "Original" clock time is read-only
 * and derived from the actual clock record via the pure `deriveOriginal` helper.
 * Covers per-type sourcing (in→actualIn, out→actualOut, both→dual), null-punch → '',
 * and no-record → all ''.
 */

import { describe, it, expect } from 'vitest';
import { deriveOriginal } from '../TimeCorrectionForm';
import type { AttendanceDay } from '@/lib/time/attendance-math';

function day(p: Partial<AttendanceDay> & { date: string }): AttendanceDay {
  return {
    weekday: 1,
    dayOff: false,
    shiftCode: 'D',
    scheduledIn: '09:00',
    scheduledOut: '18:00',
    breakStart: null,
    breakEnd: null,
    actualIn: null,
    actualOut: null,
    ...p,
  };
}

const D = '2026-06-25';
const worked = [day({ date: D, actualIn: '09:35', actualOut: '18:10' })];

describe('deriveOriginal — per-type Original sourcing', () => {
  it("'in' → actualIn", () => {
    const o = deriveOriginal(worked, D, 'in');
    expect(o.single).toBe('09:35');
  });

  it("'out' → actualOut (NOT actualIn)", () => {
    const o = deriveOriginal(worked, D, 'out');
    expect(o.single).toBe('18:10');
  });

  it("'both' → { clockIn: actualIn, clockOut: actualOut }", () => {
    const o = deriveOriginal(worked, D, 'both');
    expect(o.clockIn).toBe('09:35');
    expect(o.clockOut).toBe('18:10');
    // For 'both', single mirrors the clock-in anchor.
    expect(o.single).toBe('09:35');
  });

  it('null punch (day off / forgot) → blank for both sides', () => {
    const off = [day({ date: D, dayOff: true, actualIn: null, actualOut: null })];
    const o = deriveOriginal(off, D, 'both');
    expect(o.single).toBe('');
    expect(o.clockIn).toBe('');
    expect(o.clockOut).toBe('');
    expect(deriveOriginal(off, D, 'in').single).toBe('');
    expect(deriveOriginal(off, D, 'out').single).toBe('');
  });

  it('half punch — actualIn set, actualOut null → out original blank', () => {
    const half = [day({ date: D, actualIn: '09:35', actualOut: null })];
    expect(deriveOriginal(half, D, 'in').single).toBe('09:35');
    expect(deriveOriginal(half, D, 'out').single).toBe('');
    const both = deriveOriginal(half, D, 'both');
    expect(both.clockIn).toBe('09:35');
    expect(both.clockOut).toBe('');
  });

  it('no record for the date → all blank', () => {
    const o = deriveOriginal(worked, '2099-01-01', 'both');
    expect(o.single).toBe('');
    expect(o.clockIn).toBe('');
    expect(o.clockOut).toBe('');
  });

  it('empty date → all blank (no crash)', () => {
    const o = deriveOriginal(worked, '', 'in');
    expect(o.single).toBe('');
  });

  it('render and submit derive the SAME value for a fixed (attendance, date, type)', () => {
    // The form calls deriveOriginal at render, at summary, and at submit; a stable
    // input must yield an identical result each call so the sites cannot diverge.
    const a = deriveOriginal(worked, D, 'out');
    const b = deriveOriginal(worked, D, 'out');
    expect(a).toEqual(b);
  });
});
