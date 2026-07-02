import { describe, it, expect, afterEach, vi } from 'vitest';
import { previousPeriod } from '../period';

// STA-170 — the Time Correction backdate floor = the start of the PREVIOUS
// payroll cycle (wall-clock, no refDate), identical to the shipped leave rule
// (LEAVE_BACKDATE_MIN → previousPeriod). Asserted two-sided under a faked clock
// (not real today, which drifts): the floor date is admitted, the day before is
// rejected. This is the value TimeCorrectionForm feeds to both the native `min`
// and the blockReason submit gate.
describe('STA-170 correction backdate floor (previous payroll cycle start)', () => {
  afterEach(() => vi.useRealTimers());

  it('floor = previous payroll cycle start, two-sided boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T00:00:00Z'));
    const floor = previousPeriod().start; // 2026-07-21
    expect(floor).toBe('2026-07-21');
    expect('2026-07-21' >= floor).toBe(true); // floor itself admitted
    expect('2026-07-20' < floor).toBe(true); // day before floor rejected
  });

  it('floor tracks wall-clock across another cycle', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T00:00:00Z'));
    // current cycle 06-21…07-20 → previous cycle starts 05-21
    expect(previousPeriod().start).toBe('2026-05-21');
  });
});
