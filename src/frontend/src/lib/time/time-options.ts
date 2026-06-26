// STA-158 — generate full-day `HH:MM` time options at a fixed minute step for
// dropdown selectors (OT form Start/End time). Pure + clock-agnostic; 24-hour
// values so they feed combineDateTime / duration math unchanged.

/**
 * Full-day options at `stepMinutes` spacing, from 00:00 up to (but not including)
 * 24:00. e.g. `buildTimeOptions(15)` → 96 entries `'00:00','00:15',…,'23:45'`.
 */
export function buildTimeOptions(stepMinutes: number): string[] {
  if (stepMinutes <= 0) throw new RangeError('stepMinutes must be > 0');
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return out;
}
