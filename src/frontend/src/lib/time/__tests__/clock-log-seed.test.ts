// STA-195 — deterministic per-punch GPS seed for the Clock Log tab.

import { describe, it, expect } from 'vitest';
import { getClockLogForPeriod, clockLogWarnCount } from '../clock-log-seed';
import { GEOFENCE_RADIUS_M } from '../geo';

const EMP = 'EMP101';

describe('clock-log-seed', () => {
  it('is deterministic across calls (no Math.random)', () => {
    expect(getClockLogForPeriod(EMP)).toEqual(getClockLogForPeriod(EMP));
  });

  it('emits an in/out pair per worked day (equal in/out counts)', () => {
    const entries = getClockLogForPeriod(EMP);
    expect(entries.length).toBeGreaterThan(0);
    const ins = entries.filter((e) => e.type === 'in').length;
    const outs = entries.filter((e) => e.type === 'out').length;
    expect(ins).toBe(outs);
    for (const date of new Set(entries.map((e) => e.date))) {
      const day = entries.filter((e) => e.date === date);
      expect(day.some((e) => e.type === 'in')).toBe(true);
      expect(day.some((e) => e.type === 'out')).toBe(true);
    }
  });

  it('has ≥1 out-of-radius warning and withinRadius agrees with the shared radius', () => {
    const entries = getClockLogForPeriod(EMP);
    expect(clockLogWarnCount(entries)).toBeGreaterThanOrEqual(1);
    for (const e of entries) {
      expect(e.withinRadius).toBe(e.distanceM <= GEOFENCE_RADIUS_M);
    }
  });
});
