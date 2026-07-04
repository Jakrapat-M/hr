import { describe, it, expect } from 'vitest';
import {
  punchesForDay,
  nextPunchType,
  lastPunchType,
  assertLegalPunch,
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

describe('lastPunchType', () => {
  it('is null on an empty day', () => {
    expect(lastPunchType([])).toBeNull();
  });
  it('is the latest punch type by timestamp (order-independent)', () => {
    const out = p({ id: 'o', type: 'out', at: '2026-06-09T17:00:00Z' });
    const inn = p({ id: 'i', type: 'in', at: '2026-06-09T08:00:00Z' });
    expect(lastPunchType([out, inn])).toBe('out');
    expect(lastPunchType([inn])).toBe('in');
  });
});

describe('nextPunchType — multiple pairs per day (never "done")', () => {
  it('is "in" when no punches', () => {
    expect(nextPunchType([])).toBe('in');
  });
  it('is "out" after an in', () => {
    expect(nextPunchType([p({ type: 'in' })])).toBe('out');
  });
  it('cycles in → out → in → out (never returns done)', () => {
    const seq: ClockPunch[] = [];
    expect(nextPunchType(seq)).toBe('in');

    seq.push(p({ id: '1', type: 'in', at: '2026-06-09T08:00:00Z' }));
    expect(nextPunchType(seq)).toBe('out');

    seq.push(p({ id: '2', type: 'out', at: '2026-06-09T12:00:00Z' }));
    // After a full pair, the day is NOT done — the next action is another in.
    expect(nextPunchType(seq)).toBe('in');

    seq.push(p({ id: '3', type: 'in', at: '2026-06-09T13:00:00Z' }));
    expect(nextPunchType(seq)).toBe('out');

    seq.push(p({ id: '4', type: 'out', at: '2026-06-09T17:00:00Z' }));
    expect(nextPunchType(seq)).toBe('in');
  });
});

describe('assertLegalPunch — illegal-transition guard', () => {
  it('allows an in on an empty day, rejects an out-first', () => {
    expect(assertLegalPunch([], 'in')).toBe(true);
    expect(assertLegalPunch([], 'out')).toBe(false);
  });
  it('rejects two ins in a row; allows the following out', () => {
    const day = [p({ type: 'in' })];
    expect(assertLegalPunch(day, 'in')).toBe(false);
    expect(assertLegalPunch(day, 'out')).toBe(true);
  });
  it('allows a new in after an out (next pair)', () => {
    const day = [
      p({ id: '1', type: 'in', at: '2026-06-09T08:00:00Z' }),
      p({ id: '2', type: 'out', at: '2026-06-09T12:00:00Z' }),
    ];
    expect(assertLegalPunch(day, 'in')).toBe(true);
    expect(assertLegalPunch(day, 'out')).toBe(false);
  });
});

describe('ClockPunch.geo (simulated geofence context)', () => {
  it('carries an optional geo record for outside punches', () => {
    const outside = p({
      type: 'in',
      geo: { withinRadius: false, distanceM: 380, notifiedSupervisor: true },
    });
    expect(outside.geo?.withinRadius).toBe(false);
    expect(outside.geo?.notifiedSupervisor).toBe(true);
    expect(outside.geo?.distanceM).toBe(380);
  });
});
