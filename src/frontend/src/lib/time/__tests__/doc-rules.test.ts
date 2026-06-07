import { describe, expect, test } from 'vitest';
import { requiredDocsFor } from '@/lib/time/doc-rules';

describe('doc-rules', () => {
  test('sick_leave: <=3 days needs no doc, >3 days needs a medical cert', () => {
    expect(requiredDocsFor('sick_leave', 2)).toEqual([]);
    expect(requiredDocsFor('sick_leave', 5)).toHaveLength(1);
  });

  test('marriage_leave always needs one doc', () => {
    expect(requiredDocsFor('marriage_leave', 1)).toHaveLength(1);
  });

  test('unknown code needs nothing', () => {
    expect(requiredDocsFor('annual_leave', 3)).toEqual([]);
  });
});
