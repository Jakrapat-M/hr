import { describe, it, expect } from 'vitest';
import { currentPeriod, demoToday, DEMO_TODAY } from '../period';
import { getAttendanceForPeriod } from '../attendance-seed';

// STA-257 (supersedes STA-170) — the Time Correction editable window is ONE pay
// cycle: the start of the CURRENT payroll cycle through "today". DEMO-ANCHORED
// (demoToday/DEMO_TODAY) because the attendance rows the form corrects come from
// the demo-pinned seed — a wall-clock window would drift past the seeded period
// and leave nothing selectable. These are the values TimeCorrectionForm feeds to
// both the native `min`/`max` and the blockReason submit gate.
describe('STA-257 correction window (current demo cycle start → demo today)', () => {
  const floor = currentPeriod(demoToday()).start;
  const ceiling = DEMO_TODAY;

  it('floor = current demo payroll cycle start, two-sided boundary', () => {
    expect(floor).toBe('2026-05-21'); // DEMO_TODAY 2026-06-07 → cycle 05-21…06-20
    expect('2026-05-21' >= floor).toBe(true); // floor itself admitted
    expect('2026-05-20' < floor).toBe(true); // day before floor (previous cycle) rejected
  });

  it('ceiling = demo today: dates after it are rejected', () => {
    expect(ceiling).toBe('2026-06-07');
    expect('2026-06-08' > ceiling).toBe(true); // tomorrow rejected
    expect('2026-06-07' > ceiling).toBe(false); // demo today admitted
  });

  it('window covers the seeded attendance rows the form actually corrects', () => {
    // Integration guard against anchor drift (the exact regression a wall-clock
    // window introduces): past punched days in the seed must be correctable.
    const rows = getAttendanceForPeriod('EMP001');
    const pastPunched = rows.filter((r) => r.date <= ceiling);
    expect(pastPunched.length).toBeGreaterThan(0);
    for (const r of pastPunched) {
      expect(r.date >= floor && r.date <= ceiling).toBe(true);
    }
  });
});
