import { describe, it, expect } from 'vitest';
import {
  breakStartFromShiftStart,
  shiftEndFromStart,
  spanHours,
  breakRangeLabel,
} from '../shift-time-calc';

describe('shift-time-calc', () => {
  describe('shiftEndFromStart', () => {
    it('08:00 + 9h span → 17:00 (ticket example)', () => {
      expect(shiftEndFromStart('08:00', 9)).toBe('17:00');
    });

    it('08:00 + 8h span → 16:00', () => {
      expect(shiftEndFromStart('08:00', 8)).toBe('16:00');
    });

    it('wraps past midnight safely (22:00 + 9h → 07:00)', () => {
      expect(shiftEndFromStart('22:00', 9)).toBe('07:00');
    });
  });

  describe('breakStartFromShiftStart', () => {
    it('defaults to shift start + 4h', () => {
      expect(breakStartFromShiftStart('08:00')).toBe('12:00');
      expect(breakStartFromShiftStart('10:00')).toBe('14:00');
    });
  });

  describe('spanHours', () => {
    it('reads the contracted span from in/out (10:00–19:00 → 9)', () => {
      expect(spanHours('10:00', '19:00')).toBe(9);
    });
    it('clamps out ≤ in to 0', () => {
      expect(spanHours('19:00', '10:00')).toBe(0);
    });
  });

  describe('breakRangeLabel', () => {
    it('1h break → start + 1h', () => {
      expect(breakRangeLabel('break1h', '12:00')).toBe('12:00–13:00');
    });
    it('1.30h break → start + 90m', () => {
      expect(breakRangeLabel('break90m', '12:00')).toBe('12:00–13:30');
    });
    it('no break → null', () => {
      expect(breakRangeLabel('none', '12:00')).toBeNull();
    });
  });
});
