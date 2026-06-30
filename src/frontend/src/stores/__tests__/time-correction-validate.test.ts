import { describe, it, expect } from 'vitest';
import {
  materializeCorrectionDays,
  findCorrectionConflict,
  type TimeCorrectionRequest,
  type CorrectionDayKey,
} from '../time-corrections';

function req(p: Partial<TimeCorrectionRequest>): TimeCorrectionRequest {
  return {
    id: p.id ?? 'TCR-1',
    employeeId: 'emp-001',
    employeeName: 'Emp',
    department: 'Team',
    date: p.date ?? '2026-06-01',
    correctionType: p.correctionType ?? 'in',
    reasonCode: 'R',
    payCode: 'R',
    correctedTime: p.correctedTime ?? '08:00',
    reason: 'fix',
    status: p.status ?? 'pending_manager',
    submittedAt: '2026-06-01T09:00:00.000Z',
    audit: [],
    ...p,
  };
}

describe('materializeCorrectionDays — DAY-0-INCLUSIVE (Convention X, MF-5)', () => {
  it('single-day request yields exactly day 0', () => {
    const days = materializeCorrectionDays(req({ date: '2026-06-01', correctionType: 'in', correctedTime: '08:00' }));
    expect(days).toEqual([{ date: '2026-06-01', correctionType: 'in', correctedTime: '08:00' }]);
  });

  it('multi-day request yields [day0, ...days] (day 0 is NEVER dropped)', () => {
    const days = materializeCorrectionDays(
      req({
        date: '2026-06-01',
        correctionType: 'in',
        correctedTime: '08:00',
        days: [
          { date: '2026-06-02', correctionType: 'out', reasonCode: 'R', correctedTime: '17:00', reason: 'x' },
        ],
      }),
    );
    expect(days.map((d) => d.date)).toEqual(['2026-06-01', '2026-06-02']);
  });
});

describe('findCorrectionConflict (vs full materialized day-set)', () => {
  // A stored MULTI-DAY request: day 0 @ 06-01 (in), day 1 @ 06-02 (out).
  const stored: CorrectionDayKey[] = materializeCorrectionDays(
    req({
      date: '2026-06-01',
      correctionType: 'in',
      correctedTime: '08:00',
      days: [{ date: '2026-06-02', correctionType: 'out', reasonCode: 'R', correctedTime: '17:00', reason: 'x' }],
    }),
  );

  it('rejects a duplicate vs the stored multi-day DAY-N (06-02 out)', () => {
    expect(
      findCorrectionConflict({ date: '2026-06-02', correctionType: 'out', correctedTime: '19:00' }, stored),
    ).toBe('duplicate');
  });

  it('rejects a duplicate vs the stored DAY-0 (06-01 in) — day 0 not dropped', () => {
    expect(
      findCorrectionConflict({ date: '2026-06-01', correctionType: 'in', correctedTime: '07:00' }, stored),
    ).toBe('duplicate');
  });

  it('rejects a same-date-same-time clash (different type, identical clock value)', () => {
    expect(
      findCorrectionConflict({ date: '2026-06-01', correctionType: 'out', correctedTime: '08:00' }, stored),
    ).toBe('time_clash');
  });

  it('accepts a non-colliding day (different date)', () => {
    expect(
      findCorrectionConflict({ date: '2026-06-05', correctionType: 'in', correctedTime: '08:00' }, stored),
    ).toBeNull();
  });

  it('intra-submission: two candidate days sharing date+type collide', () => {
    const submission: CorrectionDayKey[] = [
      { date: '2026-06-10', correctionType: 'in', correctedTime: '08:00' },
    ];
    expect(
      findCorrectionConflict({ date: '2026-06-10', correctionType: 'in', correctedTime: '09:00' }, submission),
    ).toBe('duplicate');
  });

  it('single-day duplicate (legacy path) still rejected', () => {
    const single = materializeCorrectionDays(req({ date: '2026-06-01', correctionType: 'in', correctedTime: '08:00' }));
    expect(
      findCorrectionConflict({ date: '2026-06-01', correctionType: 'in', correctedTime: '08:00' }, single),
    ).toBe('duplicate');
  });
});
