import { describe, it, expect } from 'vitest';
import { validateRosterOt, rosterOtHours, type BlockedWindow } from '../roster-ot';

// STA-260 — manager-scheduled roster OT: overlap guard + hours math.
const SHIFT: BlockedWindow = { start: '10:00', end: '19:00', labelTh: 'กะทำงาน', labelEn: 'shift' };
const OTHER_OT: BlockedWindow = { start: '19:00', end: '21:00', labelTh: 'OT เดิม', labelEn: 'existing OT' };
const LEAVE: BlockedWindow = { start: '08:00', end: '10:00', labelTh: 'การลา', labelEn: 'leave block' };
const DAY = [SHIFT, OTHER_OT, LEAVE];

describe('validateRosterOt — overlap guard', () => {
  it('rejects a window intersecting the shift', () => {
    expect(validateRosterOt('18:00', '20:00', [SHIFT])).toEqual({ code: 'overlap', block: SHIFT });
  });
  it('rejects a window intersecting another OT', () => {
    expect(validateRosterOt('20:00', '22:00', DAY)).toEqual({ code: 'overlap', block: OTHER_OT });
  });
  it('rejects a window intersecting a leave block', () => {
    expect(validateRosterOt('09:00', '09:30', DAY)).toEqual({ code: 'overlap', block: LEAVE });
  });
  it('allows exactly-touching boundaries (OT can start when the last block ends)', () => {
    expect(validateRosterOt('21:00', '23:00', DAY)).toBeNull();
  });
  it('rejects a window that fully contains a block', () => {
    expect(validateRosterOt('07:00', '22:00', [OTHER_OT])).toEqual({ code: 'overlap', block: OTHER_OT });
  });
  it('rejects blank times and backwards/equal ranges', () => {
    expect(validateRosterOt('', '20:00', DAY)).toEqual({ code: 'missing_time' });
    expect(validateRosterOt('20:00', '', DAY)).toEqual({ code: 'missing_time' });
    expect(validateRosterOt('22:00', '21:30', [])).toEqual({ code: 'bad_range' });
    expect(validateRosterOt('22:00', '22:00', [])).toEqual({ code: 'bad_range' });
  });
  it('accepts a clean free window', () => {
    expect(validateRosterOt('21:30', '23:00', DAY)).toBeNull();
  });
});

describe('rosterOtHours', () => {
  it('computes decimal hours', () => {
    expect(rosterOtHours('19:00', '21:00')).toBe(2);
    expect(rosterOtHours('19:00', '20:30')).toBe(1.5);
    expect(rosterOtHours('19:15', '20:00')).toBe(0.75);
  });
  it('is 0 for invalid/backwards input', () => {
    expect(rosterOtHours('', '20:00')).toBe(0);
    expect(rosterOtHours('21:00', '20:00')).toBe(0);
  });
});
