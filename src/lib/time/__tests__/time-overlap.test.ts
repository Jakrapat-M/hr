import { describe, it, expect } from 'vitest';
import { overlaps } from '../time-overlap';

// overlaps takes ISO datetime strings (callers build them via combineDateTime),
// and is cross-midnight aware.
describe('overlaps (extracted single definition, MF-4)', () => {
  it('returns true for plainly overlapping windows', () => {
    expect(
      overlaps('2026-06-01T09:00:00', '2026-06-01T11:00:00', '2026-06-01T10:00:00', '2026-06-01T12:00:00'),
    ).toBe(true);
  });

  it('returns false for adjacent non-overlapping windows', () => {
    expect(
      overlaps('2026-06-01T09:00:00', '2026-06-01T10:00:00', '2026-06-01T10:00:00', '2026-06-01T11:00:00'),
    ).toBe(false);
  });

  it('normalizes a cross-midnight end so the interval test still holds', () => {
    // B wraps past midnight (23:00 → 01:00 → end += 24h) and overlaps A (22:00 → 23:30).
    expect(
      overlaps('2026-06-01T22:00:00', '2026-06-01T23:30:00', '2026-06-01T23:00:00', '2026-06-01T01:00:00'),
    ).toBe(true);
  });

  it('does not overlap a non-conflicting cross-midnight window', () => {
    // A (08:00 → 09:00) vs B wrapping (23:00 → 01:00) — disjoint.
    expect(
      overlaps('2026-06-01T08:00:00', '2026-06-01T09:00:00', '2026-06-01T23:00:00', '2026-06-01T01:00:00'),
    ).toBe(false);
  });

  it('returns false on unparseable datetimes', () => {
    expect(overlaps('', '', '', '')).toBe(false);
  });
});
