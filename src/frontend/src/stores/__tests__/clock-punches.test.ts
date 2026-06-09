import { describe, it, expect } from 'vitest';
import {
  punchesForDay,
  nextPunchType,
  localDateKey,
  type ClockPunch,
} from '../clock-punches';

function p(over: Partial<ClockPunch>): ClockPunch {
  return {
    id: over.id ?? 'PCH-1',
    empId: over.empId ?? 'emp-001',
    type: over.type ?? 'in',
    at: over.at ?? '2026-06-09T08:00:00.000Z',
    dateKey: over.dateKey ?? '2026-06-09',
    ...over,
  };
}

describe('localDateKey', () => {
  it('formats local Y-M-D zero-padded', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05'); // Jan = month 0
    expect(localDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('punchesForDay', () => {
  const punches = [
    p({ id: 'a', at: '2026-06-09T17:00:00Z', type: 'out' }),
    p({ id: 'b', at: '2026-06-09T08:00:00Z', type: 'in' }),
    p({ id: 'c', dateKey: '2026-06-08' }),               // other day
    p({ id: 'd', empId: 'emp-999' }),                     // other emp
  ];
  it('filters by employee + day and sorts oldest first', () => {
    const out = punchesForDay(punches, 'emp-001', '2026-06-09');
    expect(out.map((x) => x.id)).toEqual(['b', 'a']);
  });
  it('is empty when nothing matches', () => {
    expect(punchesForDay(punches, 'emp-001', '2026-01-01')).toEqual([]);
  });
});

describe('nextPunchType', () => {
  it('is "in" when no punches', () => {
    expect(nextPunchType([])).toBe('in');
  });
  it('is "out" after an in', () => {
    expect(nextPunchType([p({ type: 'in' })])).toBe('out');
  });
  it('is "done" after in + out', () => {
    expect(nextPunchType([p({ type: 'in' }), p({ type: 'out' })])).toBe('done');
  });
});
