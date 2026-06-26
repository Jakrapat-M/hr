import { describe, expect, test } from 'vitest';
import { requiredDocsFor } from '@/lib/time/doc-rules';

describe('doc-rules', () => {
  // STA-176 — the boundary is INCLUSIVE: ≥ 3 working days requires the cert,
  // < 3 does not. The `=== 3` case is the regression guard for the >3→>=3 fix.
  test('sick_leave: <3 working days needs no doc, ≥3 working days needs a medical cert', () => {
    expect(requiredDocsFor('sick_leave', 2)).toEqual([]);
    expect(requiredDocsFor('sick_leave', 3)).toHaveLength(1); // boundary (was 0 under >3)
    expect(requiredDocsFor('sick_leave', 4)).toHaveLength(1);
    expect(requiredDocsFor('sick_leave', 5)).toHaveLength(1);
  });

  test('sick_leave_unpaid mirrors paid sick: ≥3 working days needs a medical cert', () => {
    expect(requiredDocsFor('sick_leave_unpaid', 2)).toEqual([]);
    expect(requiredDocsFor('sick_leave_unpaid', 3)).toHaveLength(1);
  });

  test('marriage_leave always needs one doc', () => {
    expect(requiredDocsFor('marriage_leave', 1)).toHaveLength(1);
  });

  test('unknown code needs nothing', () => {
    expect(requiredDocsFor('annual_leave', 3)).toEqual([]);
  });
});
