import { describe, it, expect } from 'vitest';
import { classifyClock, clockChipKind, CHIP_CLASS } from '../clock-state';
import { getAttendanceForPeriod } from '../attendance-seed';
import type { AttendanceDay } from '../attendance-math';

const CUTOFF = '2026-06-07'; // DEMO_TODAY

function day(partial: Partial<AttendanceDay>): AttendanceDay {
  return {
    date: '2026-06-02',
    weekday: 2,
    dayOff: false,
    shiftCode: '8A1000',
    scheduledIn: '10:00',
    scheduledOut: '19:00',
    breakStart: '14:00',
    breakEnd: '15:00',
    actualIn: null,
    actualOut: null,
    ...partial,
  };
}

describe('classifyClock — every branch', () => {
  it('day off → none', () => {
    expect(classifyClock(day({ dayOff: true }), CUTOFF)).toBe('none');
  });

  it('no scheduled shift → none', () => {
    expect(classifyClock(day({ scheduledIn: null }), CUTOFF)).toBe('none');
  });

  it('future scheduled day, no actual → none', () => {
    expect(classifyClock(day({ date: '2026-06-30' }), CUTOFF)).toBe('none');
  });

  it('clock-in set, no clock-out → mismatch', () => {
    expect(
      classifyClock(day({ actualIn: '10:00', actualOut: null }), CUTOFF),
    ).toBe('mismatch');
  });

  it('both punches, late → late', () => {
    expect(
      classifyClock(day({ actualIn: '10:23', actualOut: '19:00' }), CUTOFF),
    ).toBe('late');
  });

  it('both punches, on time → on-time', () => {
    expect(
      classifyClock(day({ actualIn: '10:00', actualOut: '19:00' }), CUTOFF),
    ).toBe('on-time');
  });

  it('both punches, early counts as on-time (late clamps to 0)', () => {
    expect(
      classifyClock(day({ actualIn: '09:50', actualOut: '19:00' }), CUTOFF),
    ).toBe('on-time');
  });

  it('past scheduled working day, no actual → absent', () => {
    expect(classifyClock(day({ date: '2026-06-02' }), CUTOFF)).toBe('absent');
  });
});

describe('clockChipKind', () => {
  it('maps each state to its chip kind', () => {
    expect(clockChipKind('on-time')).toBe('clockOnTime');
    expect(clockChipKind('late')).toBe('clockLate');
    expect(clockChipKind('mismatch')).toBe('clockMismatch');
    expect(clockChipKind('absent')).toBe('clockAbsent');
    expect(clockChipKind('none')).toBeNull();
  });
});

describe('CHIP_CLASS — NO-RED guardrail', () => {
  it('uses zero red tokens / hex anywhere', () => {
    const joined = Object.values(CHIP_CLASS).join(' ').toLowerCase();
    const forbidden = ['red', 'crimson', 'coral', 'clay'];
    for (const word of forbidden) {
      expect(joined).not.toContain(word);
    }
    // No raw 3- or 6-digit hex colors — chips are token-only.
    expect(joined).not.toMatch(/#[0-9a-f]{3,6}\b/);
    // danger token is pumpkin (NOT red) — its presence is the expected late/mismatch color.
    expect(joined).toContain('danger');
  });
});

describe('integration with the real attendance seed', () => {
  it('classifies a known-late seeded day as late for a Store employee', () => {
    // STORE_STD: Mon–Sat shifts; the deterministic late pattern in the seed makes
    // some past days late. At least one past working day must classify 'late'.
    const days = getAttendanceForPeriod('emp-001');
    const states = days.map((d) => classifyClock(d, CUTOFF));
    expect(states).toContain('late');
    // And at least one on-time past day exists too.
    expect(states).toContain('on-time');
  });
});
