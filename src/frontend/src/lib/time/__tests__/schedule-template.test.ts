import { describe, it, expect } from 'vitest';
import {
  templateForEmployee,
  getScheduleForPeriod,
  SCHEDULE_TEMPLATES,
} from '../schedule-template';
import { getAttendanceForPeriod } from '../attendance-seed';
import { SHIFT_CODES } from '../shift-codes';
import { workedHours } from '../results-math';

describe('templateForEmployee (Table 1 Rule)', () => {
  it('routes HO-calendar employees to the office template (invariant)', () => {
    // EMP102 = HO calendar (employee-time-attrs seed) — unchanged by the spread.
    expect(templateForEmployee('EMP102').id).toBe('TMPL-HO-STD');
  });
  it('spreads Store employees across non-wrapping variants deterministically', () => {
    // STA-137 — Store ids now fan out by a stable empId hash. EMP101 lands on the
    // Store-standard variant; ZZZ999 (unknown id → Store default) lands on Morning.
    expect(templateForEmployee('EMP101').id).toBe('TMPL-STORE-STD');
    expect(templateForEmployee('ZZZ999').id).toBe('TMPL-MORNING-STD');
  });
  it('is deterministic — same id always resolves to the same template', () => {
    for (const id of ['EMP101', 'EMP103', 'ZZZ999', 'emp-001', 'EMP-0201']) {
      expect(templateForEmployee(id).id).toBe(templateForEmployee(id).id);
    }
  });
  it('produces ≥3 distinct templates across a sample empId set', () => {
    const ids = ['emp-001', 'emp-002', 'emp-003', 'emp-004', 'EMP101', 'EMP103', 'EMP104'];
    const distinct = new Set(ids.map((id) => templateForEmployee(id).id));
    expect(distinct.size).toBeGreaterThanOrEqual(3);
  });
  it('pins EMP-0301 to a Mon-working template (protects its 06-01 holiday OT seed)', () => {
    const tmpl = templateForEmployee('EMP-0301');
    // Monday = weekday index 1 must NOT be a day off.
    expect(tmpl.byWeekday[1]).not.toBeNull();
    expect(tmpl.id).toBe('TMPL-STORE-STD');
  });
});

describe('day-off spread (STA-137 rotating day-off)', () => {
  it('produces ≥3 distinct day-off weekday columns across a sample empId set', () => {
    const ids = ['emp-001', 'emp-002', 'emp-003', 'emp-004', 'EMP101', 'EMP103', 'EMP104'];
    const offWeekdays = new Set<number>();
    for (const id of ids) {
      const tmpl = templateForEmployee(id);
      tmpl.byWeekday.forEach((code, wd) => {
        if (code === null) offWeekdays.add(wd);
      });
    }
    expect(offWeekdays.size).toBeGreaterThanOrEqual(3);
  });
});

describe('getScheduleForPeriod (single source)', () => {
  it('emits a day for every date in the payroll period with template-derived shifts', () => {
    const sched = getScheduleForPeriod('EMP102'); // HO
    expect(sched.length).toBeGreaterThanOrEqual(28);
    // HO template: Sat (6) and Sun (0) are days off
    for (const d of sched) {
      if (d.weekday === 0 || d.weekday === 6) {
        expect(d.dayOff).toBe(true);
        expect(d.scheduledIn).toBeNull();
      } else {
        expect(d.dayOff).toBe(false);
        expect(d.scheduledIn).toBe('08:00'); // 8A0800
        expect(d.scheduledOut).toBe('17:00');
      }
    }
  });
  it('resolves EMP101 to its assigned (Store-standard) shift — Mon–Sat 10:00, Sun off', () => {
    // EMP101 deterministically lands on TMPL-STORE-STD (Sun off, 10:00–19:00).
    expect(templateForEmployee('EMP101').id).toBe('TMPL-STORE-STD');
    const sched = getScheduleForPeriod('EMP101');
    const sun = sched.find((d) => d.weekday === 0)!;
    const sat = sched.find((d) => d.weekday === 6)!;
    expect(sun.dayOff).toBe(true);
    expect(sat.dayOff).toBe(false);
    expect(sat.scheduledIn).toBe('10:00');
  });
});

describe('worked-holiday seed (EMP-0301 on 2026-06-01)', () => {
  it('EMP-0301 has a scheduled shift (not a day off) on the 2026-06-01 holiday', () => {
    const sched = getScheduleForPeriod('EMP-0301');
    const day = sched.find((d) => d.date === '2026-06-01')!;
    expect(day).toBeDefined();
    expect(day.dayOff).toBe(false);
    expect(day.scheduledIn).not.toBeNull();
  });
});

describe('getAttendanceForPeriod derives schedule from the Template (no separate model)', () => {
  it('HO employee actual schedule matches the HO template (08:00 working days)', () => {
    const days = getAttendanceForPeriod('EMP102');
    const working = days.filter((d) => !d.dayOff);
    expect(working.length).toBeGreaterThan(0);
    expect(working.every((d) => d.scheduledIn === '08:00')).toBe(true);
  });
  it('has at least one past day with an actual punch', () => {
    const days = getAttendanceForPeriod('EMP101');
    expect(days.some((d) => d.actualIn !== null)).toBe(true);
  });
});

describe('SHIFT_CODES are all non-wrapping (worked-hours gate)', () => {
  // STA-137 hard rule: every shift code must be same-day (out > in). A wrapping
  // 22:00→07:00 block would read 0h in results-math.workedHours and fabricate a
  // plan-vs-actual variance — this gate fails on any such code.
  it('every SHIFT_CODES entry yields a positive, plausible workedHours', () => {
    for (const sc of Object.values(SHIFT_CODES)) {
      const hours = workedHours({
        date: '2026-06-01',
        weekday: 1,
        dayOff: false,
        shiftCode: sc.code,
        scheduledIn: sc.in,
        scheduledOut: sc.out,
        breakStart: sc.breakStart,
        breakEnd: sc.breakEnd,
        actualIn: sc.in,
        actualOut: sc.out,
      });
      expect(hours, `code ${sc.code} (${sc.in}–${sc.out})`).toBeGreaterThan(0);
      expect(hours, `code ${sc.code} (${sc.in}–${sc.out})`).toBeLessThanOrEqual(12);
    }
  });
});

describe('templates registry', () => {
  it('exposes the seeded templates including the STA-137 variants', () => {
    expect(Object.keys(SCHEDULE_TEMPLATES)).toEqual(
      expect.arrayContaining([
        'STORE_STD',
        'HO_STD',
        'PART_TIME',
        'MORNING_STD',
        'AFTERNOON_STD',
      ]),
    );
  });
});
