// STA-153 — buildScheduleWeeks groups period days into Mon-first calendar weeks.
import { describe, expect, test } from 'vitest';
import { buildScheduleWeeks, mondayIndex } from '@/lib/time/schedule-calendar';
import type { AttendanceDay } from '@/lib/time/attendance-math';

function day(date: string): AttendanceDay {
  return {
    date,
    shiftCode: 'D1',
    dayOff: false,
    scheduledIn: '09:00',
    scheduledOut: '18:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    actualIn: '09:00',
    actualOut: '18:00',
  } as AttendanceDay;
}

describe('mondayIndex (Mon-first weekday)', () => {
  test('2026-06-21 is a Sunday → index 6', () => {
    expect(mondayIndex('2026-06-21')).toBe(6); // Sun
  });
  test('2026-06-22 is a Monday → index 0', () => {
    expect(mondayIndex('2026-06-22')).toBe(0); // Mon
  });
});

describe('buildScheduleWeeks', () => {
  test('empty input yields no weeks', () => {
    expect(buildScheduleWeeks([])).toEqual([]);
  });

  test('every week row has exactly 7 cells', () => {
    // A 21→20 payroll window: 2026-06-21 .. 2026-07-20 (30 days).
    const days: AttendanceDay[] = [];
    for (let d = 21; d <= 30; d++) days.push(day(`2026-06-${d}`));
    for (let d = 1; d <= 20; d++) days.push(day(`2026-07-${String(d).padStart(2, '0')}`));
    const weeks = buildScheduleWeeks(days);
    weeks.forEach((w) => expect(w).toHaveLength(7));
  });

  test('first date is left-padded to its real weekday column (21 Jun = Sunday → 6 leading blanks)', () => {
    const weeks = buildScheduleWeeks([day('2026-06-21'), day('2026-06-22')]);
    const firstWeek = weeks[0];
    expect(firstWeek.slice(0, 6).every((c) => c === null)).toBe(true); // Mon..Sat blank
    expect(firstWeek[6]?.date).toBe('2026-06-21'); // Sun column
    // 22 Jun (Mon) wraps to the next week's first column.
    expect(weeks[1][0]?.date).toBe('2026-06-22');
  });

  test('preserves all input days in order with no loss', () => {
    const days = [day('2026-06-22'), day('2026-06-23'), day('2026-06-24')];
    const flat = buildScheduleWeeks(days).flat().filter(Boolean);
    expect(flat.map((d) => d!.date)).toEqual(['2026-06-22', '2026-06-23', '2026-06-24']);
  });
});
