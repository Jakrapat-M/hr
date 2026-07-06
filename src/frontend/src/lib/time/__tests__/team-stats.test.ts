// team-stats.test.ts — STA-245 (Team Overview aggregation).
//
// Asserts the pure teamStats roll-up over the pinned demo week
// (2026-06-01 → 06-07, containing DEMO_TODAY 2026-06-07) against the canonical
// time-domain seeds. EMP-0301 is the pinned Store-standard demo employee
// (Mon–Sat 10:00–19:00, Sun off) with two seeded leave days (06-04, 06-05) and
// the two seeded OT rows on the 06-01 holiday. Never wall-clock.

import { describe, it, expect } from 'vitest';
import type { OTRequest } from '@/stores/overtime-requests';
import {
  teamStats,
  otMultiplierForDay,
  OT_MULTIPLIERS,
} from '../team-stats';
import { defaultWeekWindow, weekWindow, addWeeks, toUtcMidnight, DEMO_TODAY } from '../week';

// Two OT rows for EMP-0301 on the 06-01 holiday (mirrors demo-seed DEMO_PENDING_OT:
// an evening block + a cross-midnight block, both 3h).
const OT_ROWS: OTRequest[] = [
  {
    id: 'OT-TEST-0001',
    employeeId: 'EMP-0301',
    employeeName: 'พิมพ์ชนก ศรีวัฒน์',
    department: 'Store',
    otType: 'OT',
    startAt: '2026-06-01T18:00:00',
    endAt: '2026-06-01T21:00:00',
    hours: 3,
    reason: 'ปิดยอดขายสิ้นเดือน',
    docs: [],
    status: 'pending',
    submittedAt: '2026-06-06T08:00:00+07:00',
    audit: [],
  },
  {
    id: 'OT-TEST-0002',
    employeeId: 'EMP-0301',
    employeeName: 'พิมพ์ชนก ศรีวัฒน์',
    department: 'Store',
    otType: 'OT',
    startAt: '2026-06-01T23:00:00',
    endAt: '2026-06-02T02:00:00',
    hours: 3,
    reason: 'ตรวจนับสต็อกข้ามคืน',
    docs: [],
    status: 'pending',
    submittedAt: '2026-06-06T09:00:00+07:00',
    audit: [],
  },
];

describe('teamStats — demo week (EMP-0301)', () => {
  const week = defaultWeekWindow(); // 2026-06-01 → 06-07

  it('anchors on the demo week 2026-06-01 → 06-07', () => {
    expect(week.start.toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(week.end.toISOString().slice(0, 10)).toBe('2026-06-07');
  });

  it('rolls up attendance: 5 on-time, 1 late, 6 scheduled shifts (83%)', () => {
    const s = teamStats(week, ['EMP-0301'], OT_ROWS);
    expect(s.headcount).toBe(1);
    expect(s.onTime).toBe(5);
    expect(s.late).toBe(1);
    expect(s.mismatch).toBe(0);
    expect(s.absent).toBe(0);
    expect(s.missedScans).toBe(0);
    expect(s.scheduledDays).toBe(6);
    expect(s.onTimeRatePct).toBe(83);
  });

  it('counts the two seeded leave days (06-04 sick, 06-05 annual)', () => {
    const s = teamStats(week, ['EMP-0301'], OT_ROWS);
    expect(s.leaveCount).toBe(2);
  });

  it('counts the two public holidays in the week (Visakha Bucha, Queen\'s Birthday)', () => {
    const s = teamStats(week, ['EMP-0301'], OT_ROWS);
    expect(s.holidayCount).toBe(2);
  });

  it('buckets both OT rows as X3 (06-01 is a public holiday) → 6h total', () => {
    const s = teamStats(week, ['EMP-0301'], OT_ROWS);
    expect(s.otHours).toBe(6);
    expect(s.otHoursByMultiplier.x3).toBe(6);
    expect(s.otHoursByMultiplier.x1).toBe(0);
    expect(s.otHoursByMultiplier['x1.5']).toBe(0);
    expect(s.otHoursByMultiplier.x2).toBe(0);
  });

  it('OT bucket total always equals otHours', () => {
    const s = teamStats(week, ['EMP-0301'], OT_ROWS);
    const sum = OT_MULTIPLIERS.reduce((n, m) => n + s.otHoursByMultiplier[m], 0);
    expect(sum).toBe(s.otHours);
  });

  it('ignores OT rows outside the cohort or in a terminal state', () => {
    const withNoise: OTRequest[] = [
      ...OT_ROWS,
      { ...OT_ROWS[0], id: 'OT-OTHER', employeeId: 'EMP-9999' }, // not in cohort
      { ...OT_ROWS[0], id: 'OT-REJECTED', status: 'rejected' },
      { ...OT_ROWS[0], id: 'OT-CANCELLED', status: 'cancelled' },
    ];
    const s = teamStats(week, ['EMP-0301'], withNoise);
    expect(s.otHours).toBe(6); // unchanged
  });
});

describe('teamStats — period switch re-aggregates', () => {
  it('the previous week (no OT, no holidays) yields a different aggregate', () => {
    const thisWeek = defaultWeekWindow();
    const lastWeek = weekWindow(addWeeks(toUtcMidnight(DEMO_TODAY), -1)); // 05-25 → 05-31

    const now = teamStats(thisWeek, ['EMP-0301'], OT_ROWS);
    const prev = teamStats(lastWeek, ['EMP-0301'], OT_ROWS);

    expect(lastWeek.start.toISOString().slice(0, 10)).toBe('2026-05-25');
    expect(prev.otHours).toBe(0); // OT rows are on 06-01, outside last week
    expect(prev.holidayCount).toBe(0);
    // The two windows are genuinely distinct aggregates.
    expect(prev).not.toEqual(now);
  });
});

describe('teamStats — empty cohort', () => {
  it('returns a zeroed roll-up (rate 0, no divide-by-zero)', () => {
    const s = teamStats(defaultWeekWindow(), [], OT_ROWS);
    expect(s.headcount).toBe(0);
    expect(s.scheduledDays).toBe(0);
    expect(s.onTimeRatePct).toBe(0);
    expect(s.otHours).toBe(0);
    expect(s.leaveCount).toBe(0);
  });
});

describe('otMultiplierForDay — derived pay buckets', () => {
  it('public holiday → x3', () => {
    expect(otMultiplierForDay({ dayOff: false, scheduledIn: '10:00' }, true)).toBe('x3');
  });
  it('weekly rest day → x2', () => {
    expect(otMultiplierForDay({ dayOff: true, scheduledIn: null }, false)).toBe('x2');
  });
  it('normal working day → x1.5', () => {
    expect(otMultiplierForDay({ dayOff: false, scheduledIn: '10:00' }, false)).toBe('x1.5');
  });
  it('unscheduled non-rest day → x1', () => {
    expect(otMultiplierForDay({ dayOff: false, scheduledIn: null }, false)).toBe('x1');
    expect(otMultiplierForDay(undefined, false)).toBe('x1');
  });
});
