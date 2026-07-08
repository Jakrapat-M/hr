import { describe, it, expect } from 'vitest';
import {
  punchesForDay,
  nextPunchType,
  lastPunchType,
  assertLegalPunch,
  clockButtonState,
  localDateKey,
  CLOCK_IN_COOLDOWN_MS,
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

const T0 = new Date('2026-06-09T08:00:00.000Z').getTime();

describe('assertLegalPunch — illegal-transition guard (STA-251 cooldown)', () => {
  it('allows an in on an empty day, rejects an out-first', () => {
    expect(assertLegalPunch([], 'in', T0)).toBe(true);
    expect(assertLegalPunch([], 'out', T0)).toBe(false);
  });
  it('rejects a second in within the 2-hour cooldown; allows the out', () => {
    const day = [p({ type: 'in', at: '2026-06-09T08:00:00.000Z' })];
    const oneHourLater = T0 + 60 * 60 * 1000;
    expect(assertLegalPunch(day, 'in', oneHourLater)).toBe(false);
    expect(assertLegalPunch(day, 'out', oneHourLater)).toBe(true);
  });
  it('allows a re-clock-in at exactly +2 h (boundary inclusive)', () => {
    const day = [p({ type: 'in', at: '2026-06-09T08:00:00.000Z' })];
    expect(assertLegalPunch(day, 'in', T0 + CLOCK_IN_COOLDOWN_MS - 1)).toBe(false);
    expect(assertLegalPunch(day, 'in', T0 + CLOCK_IN_COOLDOWN_MS)).toBe(true);
  });
  it('allows a new in after an out (next pair)', () => {
    const day = [
      p({ id: '1', type: 'in', at: '2026-06-09T08:00:00Z' }),
      p({ id: '2', type: 'out', at: '2026-06-09T12:00:00Z' }),
    ];
    expect(assertLegalPunch(day, 'in', T0)).toBe(true);
    expect(assertLegalPunch(day, 'out', T0)).toBe(false);
  });
});

describe('clockButtonState — STA-251 dual-button state matrix', () => {
  const HOUR = 60 * 60 * 1000;
  const inAt8 = p({ id: 'i1', type: 'in', at: '2026-06-09T08:00:00.000Z' });

  it('row 1 — no punches yet: in enabled, out disabled (needs an in)', () => {
    const s = clockButtonState([], T0);
    expect(s).toEqual({ canIn: true, canOut: false, inReason: null, outReason: 'needsIn' });
  });
  it('row 2 — clocked in < 2 h ago, not out: in disabled (cooldown), out enabled immediately', () => {
    const s = clockButtonState([inAt8], T0 + 1); // 1 ms after the in
    expect(s).toEqual({ canIn: false, canOut: true, inReason: 'cooldown', outReason: null });
  });
  it('row 3 — clocked in ≥ 2 h ago, not out: both enabled (boundary at exactly +2 h)', () => {
    expect(clockButtonState([inAt8], T0 + 2 * HOUR - 1).canIn).toBe(false);
    const s = clockButtonState([inAt8], T0 + 2 * HOUR);
    expect(s).toEqual({ canIn: true, canOut: true, inReason: null, outReason: null });
  });
  it('row 4 — last punch is an out: in enabled, out disabled until the next in', () => {
    const day = [
      inAt8,
      p({ id: 'o1', type: 'out', at: '2026-06-09T12:00:00.000Z' }),
    ];
    const s = clockButtonState(day, T0 + 5 * HOUR);
    expect(s).toEqual({ canIn: true, canOut: false, inReason: null, outReason: 'needsIn' });
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
