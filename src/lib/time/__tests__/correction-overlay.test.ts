import { describe, it, expect } from 'vitest';
import {
  approvedCorrectionDates,
  adjustHeroForApproved,
  openExceptions,
} from '../correction-overlay';
import type { HeroSummary, TimeException } from '../exceptions';
import { latestCorrectionForDate, type TimeCorrectionRequest } from '@/stores/time-corrections';

function corr(p: Partial<TimeCorrectionRequest>): TimeCorrectionRequest {
  return {
    id: p.id ?? 'TCR-1',
    employeeId: p.employeeId ?? 'emp-001',
    employeeName: 'Emp',
    department: 'Team',
    date: p.date ?? '2026-06-01',
    correctionType: p.correctionType ?? 'in',
    reasonCode: 'R1',
    payCode: 'R1',
    correctedTime: '08:00',
    reason: 'fix',
    status: p.status ?? 'pending_manager',
    submittedAt: p.submittedAt ?? '2026-06-01T09:00:00.000Z',
    audit: [],
    ...p,
  };
}

function exc(date: string, type: TimeException['type']): TimeException {
  return { date, type, severity: type === 'late' ? 'danger' : 'warn', th: 'x', en: 'x' };
}

const PERIOD = new Set(['2026-06-01', '2026-06-02', '2026-06-03']);

describe('approvedCorrectionDates', () => {
  it('includes only approved requests within the period for the employee', () => {
    const reqs = [
      corr({ date: '2026-06-01', status: 'approved' }),
      corr({ date: '2026-06-02', status: 'pending_manager' }), // not approved
      corr({ date: '2026-06-03', status: 'rejected' }),         // rejected
      corr({ date: '2026-05-20', status: 'approved' }),          // out of period
      corr({ date: '2026-06-01', status: 'approved', employeeId: 'emp-999' }), // other emp
    ];
    const set = approvedCorrectionDates(reqs, 'emp-001', PERIOD);
    expect([...set]).toEqual(['2026-06-01']);
  });

  it('is empty when there are no approved corrections', () => {
    expect(approvedCorrectionDates([corr({ status: 'pending_manager' })], 'emp-001', PERIOD).size).toBe(0);
  });
});

describe('adjustHeroForApproved', () => {
  const hero: HeroSummary = {
    actualHrs: 100, planHrs: 120, workedDays: 20, lateDays: 3, totalLateMin: 60, exceptionCount: 4, onTimeRate: 85,
  };
  const exceptions = [exc('2026-06-01', 'late'), exc('2026-06-02', 'late'), exc('2026-06-03', 'missing_out'), exc('2026-06-04', 'continuous_shift')];

  it('decrements exceptionCount + lateDays for resolved days only', () => {
    const adj = adjustHeroForApproved(hero, exceptions, new Set(['2026-06-01', '2026-06-03']));
    expect(adj.exceptionCount).toBe(2); // 4 - (late@01 + missing_out@03)
    expect(adj.lateDays).toBe(2);       // 3 - 1 late resolved
    expect(adj.actualHrs).toBe(100);    // untouched
  });

  it('is a no-op when nothing is approved', () => {
    expect(adjustHeroForApproved(hero, exceptions, new Set())).toEqual(hero);
  });

  it('never goes negative', () => {
    const adj = adjustHeroForApproved({ ...hero, lateDays: 0, exceptionCount: 1 }, [exc('2026-06-01', 'late')], new Set(['2026-06-01']));
    expect(adj.lateDays).toBe(0);
    expect(adj.exceptionCount).toBe(0);
  });
});

describe('openExceptions', () => {
  it('drops exceptions whose day has an approved correction', () => {
    const exceptions = [exc('2026-06-01', 'late'), exc('2026-06-02', 'missing_out')];
    expect(openExceptions(exceptions, new Set(['2026-06-01']))).toEqual([exc('2026-06-02', 'missing_out')]);
  });
});

describe('latestCorrectionForDate', () => {
  it('returns the latest non-rejected request for the employee+date', () => {
    const reqs = [
      corr({ id: 'a', date: '2026-06-01', submittedAt: '2026-06-01T08:00:00Z', status: 'pending_manager' }),
      corr({ id: 'b', date: '2026-06-01', submittedAt: '2026-06-01T10:00:00Z', status: 'approved' }),
      corr({ id: 'c', date: '2026-06-01', submittedAt: '2026-06-01T11:00:00Z', status: 'rejected' }),
    ];
    expect(latestCorrectionForDate(reqs, 'emp-001', '2026-06-01')?.id).toBe('b');
  });

  it('ignores other employees and dates', () => {
    const reqs = [corr({ id: 'a', date: '2026-06-02' }), corr({ id: 'b', employeeId: 'emp-999' })];
    expect(latestCorrectionForDate(reqs, 'emp-001', '2026-06-01')).toBeUndefined();
  });

  // Convention X (multi-day): a days[1..n] date matches and projects onto that day.
  it('matches a days[] (day 1..n) date and projects the matching day', () => {
    const reqs = [
      corr({
        id: 'multi',
        date: '2026-06-01',
        correctionType: 'in',
        correctedTime: '08:00',
        status: 'approved',
        days: [
          { date: '2026-06-02', correctionType: 'out', reasonCode: 'R2', correctedTime: '17:30', reason: 'fix d2' },
          { date: '2026-06-03', correctionType: 'both', reasonCode: 'R3', correctedTime: '09:15', reason: 'fix d3' },
        ],
      }),
    ];
    const day2 = latestCorrectionForDate(reqs, 'emp-001', '2026-06-02');
    expect(day2?.id).toBe('multi');
    expect(day2?.date).toBe('2026-06-02');
    expect(day2?.correctionType).toBe('out');
    expect(day2?.correctedTime).toBe('17:30');
    // Day 0 still projects from the top-level fields.
    const day0 = latestCorrectionForDate(reqs, 'emp-001', '2026-06-01');
    expect(day0?.correctionType).toBe('in');
    expect(day0?.correctedTime).toBe('08:00');
  });

  it('single-day request is byte-identical (no days projection)', () => {
    const reqs = [corr({ id: 'single', date: '2026-06-05', status: 'approved' })];
    const r = latestCorrectionForDate(reqs, 'emp-001', '2026-06-05');
    expect(r).toBe(reqs[0]); // same reference — unchanged path
  });
});

describe('approvedCorrectionDates — multi-day (MF-3)', () => {
  const PERIOD3 = new Set(['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04']);

  it('collects EVERY covered date of an approved multi-day request', () => {
    const reqs = [
      corr({
        date: '2026-06-01',
        status: 'approved',
        days: [
          { date: '2026-06-02', correctionType: 'in', reasonCode: 'R', correctedTime: '08:00', reason: 'x' },
          { date: '2026-06-03', correctionType: 'in', reasonCode: 'R', correctedTime: '08:00', reason: 'x' },
        ],
      }),
    ];
    const set = approvedCorrectionDates(reqs, 'emp-001', PERIOD3);
    expect([...set].sort()).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
  });

  it('intersects covered days with the period (out-of-period days dropped)', () => {
    const reqs = [
      corr({
        date: '2026-06-03',
        status: 'approved',
        days: [{ date: '2026-05-20', correctionType: 'in', reasonCode: 'R', correctedTime: '08:00', reason: 'x' }],
      }),
    ];
    const set = approvedCorrectionDates(reqs, 'emp-001', PERIOD3);
    expect([...set]).toEqual(['2026-06-03']);
  });
});
