import { describe, expect, test } from 'vitest';
import { leaveCodeToHistoryKind } from '@/app/[locale]/timeoff/page';
import { LEAVE_TYPES } from '@/lib/time/leave-types';

// P1-5 — the History tab mirrors the submitted leave type into the legacy
// `LeaveKind` union. Previously every submit hardcoded 'vacation'; this maps each
// registry code onto the correct history bucket so the icon/category match.

const VALID_KINDS = new Set([
  'vacation',
  'sick',
  'personal',
  'maternity',
  'ordination',
  'military',
  'parental',
  'unpaid',
]);

describe('leaveCodeToHistoryKind', () => {
  test('annual leave → vacation (no longer the hardcoded default)', () => {
    expect(leaveCodeToHistoryKind('annual_leave')).toBe('vacation');
  });

  test('sick variants → sick', () => {
    expect(leaveCodeToHistoryKind('sick_leave')).toBe('sick');
    expect(leaveCodeToHistoryKind('sick_leave_unpaid')).toBe('sick');
  });

  test('personnel variants → personal', () => {
    expect(leaveCodeToHistoryKind('personnel_leave')).toBe('personal');
    expect(leaveCodeToHistoryKind('personnel_leave_unpaid')).toBe('personal');
  });

  test('priesthood → ordination', () => {
    expect(leaveCodeToHistoryKind('priesthood_leave')).toBe('ordination');
    expect(leaveCodeToHistoryKind('priesthood_leave_unpaid')).toBe('ordination');
  });

  test('military training → military', () => {
    expect(leaveCodeToHistoryKind('military_train_leave')).toBe('military');
  });

  test('maternity risk case routes to parental, not maternity', () => {
    expect(leaveCodeToHistoryKind('maternity_risk_case')).toBe('parental');
  });

  test('other maternity codes → maternity', () => {
    expect(leaveCodeToHistoryKind('maternity_leave')).toBe('maternity');
    expect(leaveCodeToHistoryKind('maternity_leave_unpaid')).toBe('maternity');
    expect(leaveCodeToHistoryKind('maternity_spouse')).toBe('maternity');
  });

  test('unmatched codes fall back to the neutral unpaid bucket', () => {
    expect(leaveCodeToHistoryKind('marriage_leave')).toBe('unpaid');
    expect(leaveCodeToHistoryKind('totally_unknown_code')).toBe('unpaid');
  });

  test('every registry leave code maps to a valid LeaveKind', () => {
    for (const t of LEAVE_TYPES) {
      expect(VALID_KINDS.has(leaveCodeToHistoryKind(t.code))).toBe(true);
    }
  });
});
