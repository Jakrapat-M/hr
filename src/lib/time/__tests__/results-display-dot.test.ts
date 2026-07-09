// STA-233 — toBase60Dot: the Time Result base-60 column must render `H.mm` with
// a dot separator (not `H:mm`), matching the base-10 column's `X.XX` shape.

import { describe, it, expect } from 'vitest';
import { toBase60Dot } from '../results-display';

describe('toBase60Dot', () => {
  it('formats decimal hours as H.mm with a dot', () => {
    expect(toBase60Dot(8.5)).toBe('8.30');
    expect(toBase60Dot(8.0)).toBe('8.00');
  });

  it('handles zero', () => {
    expect(toBase60Dot(0)).toBe('0.00');
  });

  it('preserves the sign for deductions (negative hours)', () => {
    expect(toBase60Dot(-0.5)).toBe('-0.30');
  });

  it('rounds minutes the same way toBase60 does', () => {
    expect(toBase60Dot(2.25)).toBe('2.15');
    expect(toBase60Dot(7.999)).toBe('8.00');
  });

  it('never contains a colon', () => {
    expect(toBase60Dot(7.5)).not.toContain(':');
    expect(toBase60Dot(-1.25)).not.toContain(':');
  });
});
