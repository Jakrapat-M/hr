import { describe, it, expect } from 'vitest';
import {
  validateDwsDay,
  validateDwsPeriod,
  continuousShiftGapMinutes,
} from '../dws-validation';
import type { DaySchedule } from '../schedule-template';

function sched(p: Partial<DaySchedule>): DaySchedule {
  return {
    date: '2026-06-01', weekday: 1, dayOff: false,
    shiftCode: '8A0800', scheduledIn: '08:00', scheduledOut: '17:00',
    breakStart: '12:00', breakEnd: '13:00',
    ...p,
  };
}

describe('continuousShiftGapMinutes', () => {
  it('counts across midnight from prev OUT to next IN', () => {
    expect(continuousShiftGapMinutes('23:00', '02:00')).toBe(180); // 3h
    expect(continuousShiftGapMinutes('19:00', '10:00')).toBe(900); // 15h
  });
});

describe('validateDwsDay (3-colour rule, wiki §2)', () => {
  it('🟢 green for a weekly day off', () => {
    expect(validateDwsDay(sched({ dayOff: true, shiftCode: null, scheduledIn: null }), null).level).toBe('green');
  });
  it('🔴 red for a working day with no / invalid shift code', () => {
    expect(validateDwsDay(sched({ shiftCode: null, scheduledIn: null }), null).level).toBe('red');
    expect(validateDwsDay(sched({ shiftCode: 'NOPE-999' }), null).level).toBe('red');
  });
  it('🟡 yellow when a shift starts < 5h after the previous shift ends', () => {
    const prev = sched({ scheduledOut: '23:00' });
    const today = sched({ scheduledIn: '02:00' }); // 3h gap
    expect(validateDwsDay(today, prev).level).toBe('yellow');
  });
  it('ok for a normal day with a comfortable gap', () => {
    const prev = sched({ scheduledOut: '17:00' });
    const today = sched({ scheduledIn: '08:00' }); // 15h gap
    expect(validateDwsDay(today, prev).level).toBe('ok');
  });
});

describe('validateDwsPeriod roll-up', () => {
  it('counts red and yellow warnings across the period', () => {
    const days = [
      sched({ date: '2026-06-01', scheduledOut: '23:00' }),
      sched({ date: '2026-06-02', scheduledIn: '02:00' }), // yellow (3h)
      sched({ date: '2026-06-03', shiftCode: null, scheduledIn: null }), // red
      sched({ date: '2026-06-04', dayOff: true, shiftCode: null, scheduledIn: null }), // green
    ];
    const r = validateDwsPeriod(days);
    expect(r.yellow).toBe(1);
    expect(r.red).toBe(1);
    expect(r.perDay).toHaveLength(4);
  });
});
