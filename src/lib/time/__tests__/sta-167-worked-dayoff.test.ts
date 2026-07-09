import { describe, it, expect } from 'vitest';
import { getAttendanceForPeriod } from '@/lib/time/attendance-seed';
import { getShiftCode } from '@/lib/time/shift-codes';

// STA-167 — a WORKED day-off (EMP-0301 @ 2026-06-14, a Sunday rest day) keeps
// dayOff:true but carries a real shiftCode + its four derived scheduled fields, so
// BOTH the Table (scheduledIn/Out) and the Calendar (getShiftCode(shiftCode)) can
// show the times. A genuine rest day keeps shiftCode/scheduledIn null.

const EMP = 'EMP-0301';
const WORKED = '2026-06-14';

describe('STA-167 — worked day-off seed override', () => {
  it('the override day stays dayOff:true but exposes the 8A1000 shift times', () => {
    const day = getAttendanceForPeriod(EMP).find((d) => d.date === WORKED)!;
    const sc = getShiftCode('8A1000')!;
    expect(day.dayOff).toBe(true);
    expect(day.shiftCode).toBe('8A1000');
    expect(day.scheduledIn).toBe(sc.in); // 10:00
    expect(day.scheduledOut).toBe(sc.out); // 19:00
    expect(day.breakStart).toBe(sc.breakStart); // 14:00
    expect(day.breakEnd).toBe(sc.breakEnd); // 15:00
    // Punch block stays off on a day-off (no actual clock-in/out).
    expect(day.actualIn).toBeNull();
    expect(day.actualOut).toBeNull();
  });

  it('a genuine (non-override) rest day keeps null shift/times', () => {
    // 2026-05-31 is also a Sunday rest day for EMP-0301 but has NO override.
    const rest = getAttendanceForPeriod(EMP).find((d) => d.date === '2026-05-31')!;
    expect(rest.dayOff).toBe(true);
    expect(rest.shiftCode).toBeNull();
    expect(rest.scheduledIn).toBeNull();
  });
});
