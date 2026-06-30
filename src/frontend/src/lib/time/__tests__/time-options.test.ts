// STA-158 — buildTimeOptions generates the dropdown time grid.
import { describe, expect, it } from 'vitest';
import { buildTimeOptions } from '@/lib/time/time-options';

describe('buildTimeOptions', () => {
  it('15-min step → 96 entries 00:00 … 23:45', () => {
    const opts = buildTimeOptions(15);
    expect(opts).toHaveLength(96);
    expect(opts[0]).toBe('00:00');
    expect(opts[95]).toBe('23:45');
    expect(opts).toContain('18:00'); // OT start default
    expect(opts).toContain('20:00'); // OT end default
    expect(opts).not.toContain('24:00');
  });

  it('every entry is a zero-padded 24-hour HH:MM', () => {
    for (const t of buildTimeOptions(15)) {
      expect(t).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('30-min step → 48 entries (helper is generic)', () => {
    const opts = buildTimeOptions(30);
    expect(opts).toHaveLength(48);
    expect(opts[0]).toBe('00:00');
    expect(opts[47]).toBe('23:30');
  });
});
