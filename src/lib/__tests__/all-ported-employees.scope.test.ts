/**
 * P2 — Verify the deterministic scope seeding on the REAL composed pool.
 *
 * seedScopeFields() in all-ported-employees.ts re-derives businessUnitId +
 * managerId from stable fields (department, id) so scope modes resolve to
 * non-empty, realistic cohorts. These tests pin the persona-facing behavior:
 *   - hrbp persona (emp-007) → mode 'bu' with a meaningful cohort (> 1, >= 10)
 *   - manager persona (emp-002) → mode 'direct-reports' with > 1 row
 */

import { describe, expect, test } from 'vitest';
import { ALL_PORTED_EMPLOYEES, EMP_BY_LOGIN } from '@/lib/all-ported-employees';
import {
  filterEmployeesByPersona,
  pickScopeMode,
  countDirectReports,
  resolveCurrentEmpId,
  EMP_BY_LOGIN_FULL,
} from '@/lib/scope-filter';

describe('P2 — every pooled row carries businessUnitId + managerId seed', () => {
  test('all rows have a businessUnitId', () => {
    expect(ALL_PORTED_EMPLOYEES.length).toBeGreaterThanOrEqual(200);
    const missing = ALL_PORTED_EMPLOYEES.filter((e) => !e.businessUnitId);
    expect(missing).toEqual([]);
  });

  test('managerId, when present, points at a real pooled emp-id (no email values, no cycles)', () => {
    const ids = new Set(ALL_PORTED_EMPLOYEES.map((e) => e.id));
    for (const e of ALL_PORTED_EMPLOYEES) {
      if (e.managerId == null) continue;
      // No email-valued managerId leaked through.
      expect(e.managerId).not.toContain('@');
      // Resolves to a real row.
      expect(ids.has(e.managerId)).toBe(true);
      // No self-loop.
      expect(e.managerId).not.toBe(e.id);
    }
  });
});

describe('P2 — hrbp persona (emp-007) resolves to a BU cohort', () => {
  const hrbpEmpId = resolveCurrentEmpId('hrbp@cnext.test');

  test('login map + EMP_BY_LOGIN agree on emp-007', () => {
    expect(hrbpEmpId).toBe('emp-007');
    expect(EMP_BY_LOGIN['hrbp@cnext.test']).toBe('emp-007');
    expect(EMP_BY_LOGIN_FULL['hrbp@cnext.test']).toBe('emp-007');
  });

  test('pickScopeMode hrbp → bu', () => {
    expect(pickScopeMode(['hrbp', 'employee'])).toBe('bu');
  });

  test('filterEmployeesByPersona returns a meaningful BU cohort (>= 10, includes self)', () => {
    const r = filterEmployeesByPersona(ALL_PORTED_EMPLOYEES, ['hrbp', 'employee'], hrbpEmpId);
    expect(r.mode).toBe('bu');
    expect(r.employees.length).toBeGreaterThan(1);
    expect(r.employees.length).toBeGreaterThanOrEqual(10);
    expect(r.employees.some((e) => e.id === 'emp-007')).toBe(true);
    // Every member shares emp-007's BU.
    const self = ALL_PORTED_EMPLOYEES.find((e) => e.id === 'emp-007')!;
    expect(r.employees.every((e) => e.businessUnitId === self.businessUnitId)).toBe(true);
  });
});

describe('P2 — manager persona (emp-002) resolves to direct reports', () => {
  const mgrEmpId = resolveCurrentEmpId('manager@cnext.test');

  test('login resolves to emp-002', () => {
    expect(mgrEmpId).toBe('emp-002');
  });

  test('pickScopeMode manager → direct-reports', () => {
    expect(pickScopeMode(['manager', 'employee'])).toBe('direct-reports');
  });

  test('emp-002 has several direct reports', () => {
    expect(countDirectReports(ALL_PORTED_EMPLOYEES, 'emp-002')).toBeGreaterThan(1);
  });

  test('filterEmployeesByPersona returns self + reports (> 1 row)', () => {
    const r = filterEmployeesByPersona(ALL_PORTED_EMPLOYEES, ['manager', 'employee'], mgrEmpId);
    expect(r.mode).toBe('direct-reports');
    expect(r.employees.length).toBeGreaterThan(1);
    expect(r.employees.some((e) => e.id === 'emp-002')).toBe(true);
    // Every non-self row reports to emp-002.
    expect(
      r.employees.filter((e) => e.id !== 'emp-002').every((e) => e.managerId === 'emp-002'),
    ).toBe(true);
  });
});
