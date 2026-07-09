import { describe, it, expect } from 'vitest';
import { formatStepDate } from '../HistoryTimeline';

describe('formatStepDate (STA-147 req-3)', () => {
  it('renders date-only seeds without a time component', () => {
    const out = formatStepDate('2026-04-26');
    expect(out).not.toMatch(/\d{2}:\d{2}/);
    // Thai BE year (2569) is present.
    expect(out).toContain('2569');
  });

  it('appends HH:mm when the ISO value carries a time', () => {
    const out = formatStepDate('2026-04-26T15:00');
    expect(out).toMatch(/15:00/);
    expect(out).toContain('2569');
  });

  it('returns the raw value for an unparseable date', () => {
    expect(formatStepDate('not-a-date')).toBe('not-a-date');
  });
});
