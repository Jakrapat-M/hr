import { describe, it, expect } from 'vitest';
import {
  templateForEmployee,
  getScheduleForPeriod,
  SCHEDULE_TEMPLATES,
} from '../schedule-template';
import { getAttendanceForPeriod } from '../attendance-seed';

describe('templateForEmployee (Table 1 Rule)', () => {
  it('routes HO-calendar employees to the office template, Store to retail', () => {
    // EMP102 = HO, EMP101 = Store (employee-time-attrs seed)
    expect(templateForEmployee('EMP102').id).toBe('TMPL-HO-STD');
    expect(templateForEmployee('EMP101').id).toBe('TMPL-STORE-STD');
  });
  it('falls back to the Store template for unknown ids (permissive default = Store)', () => {
    expect(templateForEmployee('ZZZ999').id).toBe('TMPL-STORE-STD');
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
  it('Store template works Mon–Sat 10:00, only Sun off', () => {
    const sched = getScheduleForPeriod('EMP101');
    const sun = sched.find((d) => d.weekday === 0)!;
    const sat = sched.find((d) => d.weekday === 6)!;
    expect(sun.dayOff).toBe(true);
    expect(sat.dayOff).toBe(false);
    expect(sat.scheduledIn).toBe('10:00');
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

describe('templates registry', () => {
  it('exposes the three seeded templates', () => {
    expect(Object.keys(SCHEDULE_TEMPLATES)).toEqual(
      expect.arrayContaining(['STORE_STD', 'HO_STD', 'PART_TIME']),
    );
  });
});
