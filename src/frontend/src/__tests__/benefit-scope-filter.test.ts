/**
 * STA-64 — benefit-scope-filter unit suite.
 *
 * Proves the pure predicate's inclusion / exclusion / admin-bypass behavior for
 * both the HRBP dept axis and the SPD branch axis, without rendering anything.
 * Mirrors the scope-filter.test.ts style.
 */

import { describe, expect, test } from 'vitest';
import {
  filterByDept,
  filterBranches,
  type BenefitScope,
} from '@/lib/benefit-scope-filter';

interface Row {
  id: string;
  dept: string;
}

const ROWS: Row[] = [
  { id: 'a', dept: 'Finance' },
  { id: 'b', dept: 'HR' },
  { id: 'c', dept: 'IT' },
  { id: 'd', dept: 'Finance' },
  { id: 'e', dept: 'HR' },
];

const BRANCHES = ['BKK-Sukhumvit', 'BKK-Silom', 'CNX-Central', 'HKT-Patong'];

describe('STA-64 — filterByDept', () => {
  test('admin scope → all rows (bypass)', () => {
    const scope: BenefitScope = { kind: 'admin' };
    expect(filterByDept(ROWS, scope)).toHaveLength(ROWS.length);
    expect(filterByDept(ROWS, scope)).toEqual(ROWS);
  });

  test('single-dept scope → only that dept, others excluded', () => {
    const scope: BenefitScope = { kind: 'dept', departments: ['Finance'] };
    const out = filterByDept(ROWS, scope);
    expect(out.map((r) => r.id).sort()).toEqual(['a', 'd']);
    expect(out.every((r) => r.dept === 'Finance')).toBe(true);
  });

  test('switching dept swaps the visible set', () => {
    const out = filterByDept(ROWS, { kind: 'dept', departments: ['HR'] });
    expect(out.map((r) => r.id).sort()).toEqual(['b', 'e']);
  });

  test('multi-dept scope → union of matching rows', () => {
    const out = filterByDept(ROWS, { kind: 'dept', departments: ['IT', 'Finance'] });
    expect(out.map((r) => r.id).sort()).toEqual(['a', 'c', 'd']);
  });

  test('empty dept scope → empty result', () => {
    expect(filterByDept(ROWS, { kind: 'dept', departments: [] })).toEqual([]);
  });

  test('match is exact / case-sensitive (no normalization)', () => {
    expect(filterByDept(ROWS, { kind: 'dept', departments: ['finance'] })).toEqual([]);
  });

  test('branch scope on dept rows → empty (defensive)', () => {
    expect(filterByDept(ROWS, { kind: 'branch', branches: ['BKK-Silom'] })).toEqual([]);
  });
});

describe('STA-64 — filterBranches', () => {
  test('admin scope → all branches (bypass)', () => {
    expect(filterBranches(BRANCHES, { kind: 'admin' })).toEqual(BRANCHES);
  });

  test('branch scope → only assigned branches', () => {
    const out = filterBranches(BRANCHES, {
      kind: 'branch',
      branches: ['BKK-Silom', 'CNX-Central'],
    });
    expect(out).toEqual(['BKK-Silom', 'CNX-Central']);
  });

  test('branch scope ignores codes not in the source list', () => {
    const out = filterBranches(BRANCHES, {
      kind: 'branch',
      branches: ['BKK-Silom', 'NOPE-Ghost'],
    });
    expect(out).toEqual(['BKK-Silom']);
  });

  test('empty branch scope → empty result', () => {
    expect(filterBranches(BRANCHES, { kind: 'branch', branches: [] })).toEqual([]);
  });

  test('dept scope on branch list → empty (defensive)', () => {
    expect(filterBranches(BRANCHES, { kind: 'dept', departments: ['Finance'] })).toEqual([]);
  });
});
