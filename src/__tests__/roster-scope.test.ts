/**
 * P2 — Persona scope for the open /roster + /reports routes.
 *
 * Asserts a manager persona sees a reduced (direct-reports) roster slice while
 * an admin persona sees the full board, using the shared pool + scope helpers.
 */

import { describe, expect, test } from 'vitest';
import { pickRosterScope, scopeRosterRows } from '@/lib/roster-scope';
import type { HumiEmployee } from '@/lib/humi-mock-data';

const POOL: HumiEmployee[] = [
  { id: 'emp-002', employeeCode: 'M', firstNameTh: 'A', lastNameTh: 'A', initials: 'AA',
    position: 'Manager', department: 'Finance', status: 'active', avatarTone: 'teal',
    businessUnitId: 'BU-002' },
  { id: 'emp-003', employeeCode: 'E', firstNameTh: 'C', lastNameTh: 'C', initials: 'CC',
    position: 'Engineer', department: 'IT', status: 'active', avatarTone: 'sage',
    managerId: 'emp-002', businessUnitId: 'BU-002' },
  { id: 'emp-006', employeeCode: 'F', firstNameTh: 'D', lastNameTh: 'D', initials: 'DD',
    position: 'Analyst', department: 'Finance', status: 'active', avatarTone: 'indigo',
    managerId: 'emp-002', businessUnitId: 'BU-002' },
  { id: 'emp-007', employeeCode: 'H', firstNameTh: 'B', lastNameTh: 'B', initials: 'BB',
    position: 'HRBP', department: 'HR', status: 'active', avatarTone: 'butter',
    businessUnitId: 'BU-001' },
  { id: 'emp-100', employeeCode: 'X', firstNameTh: 'X', lastNameTh: 'X', initials: 'XX',
    position: 'HR Coord', department: 'HR', status: 'active', avatarTone: 'ink',
    managerId: 'emp-007', businessUnitId: 'BU-001' },
];

const TOTAL_ROWS = 6;
const ROWS = Array.from({ length: TOTAL_ROWS }, (_, i) => ({ id: `row-${i + 1}` }));

describe('P2 — pickRosterScope persona scope', () => {
  test('admin/spd persona → mode "all" sees the full board', () => {
    const scope = pickRosterScope(POOL, ['spd'], 'emp-001', TOTAL_ROWS);
    expect(scope.mode).toBe('all');
    expect(scope.visibleCount).toBe(TOTAL_ROWS);
    expect(scopeRosterRows(ROWS, scope)).toHaveLength(TOTAL_ROWS);
  });

  test('manager persona → reduced (direct-reports) slice, fewer than admin', () => {
    const scope = pickRosterScope(POOL, ['manager', 'employee'], 'emp-002', TOTAL_ROWS);
    expect(scope.mode).toBe('direct-reports');
    // self + 2 direct reports = 3 entitled employees
    expect(scope.employees).toHaveLength(3);
    expect(scope.visibleCount).toBe(3);
    const visible = scopeRosterRows(ROWS, scope);
    expect(visible).toHaveLength(3);
    expect(visible.length).toBeLessThan(TOTAL_ROWS);
  });

  test('hrbp persona → BU slice (reduced)', () => {
    const scope = pickRosterScope(POOL, ['hrbp', 'employee'], 'emp-007', TOTAL_ROWS);
    expect(scope.mode).toBe('bu');
    // BU-001 → emp-007 + emp-100 = 2
    expect(scope.employees).toHaveLength(2);
    expect(scopeRosterRows(ROWS, scope)).toHaveLength(2);
  });

  test('manager slice is strictly smaller than admin board', () => {
    const admin = scopeRosterRows(ROWS, pickRosterScope(POOL, ['hr_admin'], 'emp-005', TOTAL_ROWS));
    const manager = scopeRosterRows(ROWS, pickRosterScope(POOL, ['manager'], 'emp-002', TOTAL_ROWS));
    expect(manager.length).toBeLessThan(admin.length);
  });

  test('visibleCount clamps to available rows when scope exceeds them', () => {
    const scope = pickRosterScope(POOL, ['spd'], 'emp-001', 2);
    expect(scope.visibleCount).toBe(2);
    expect(scopeRosterRows(ROWS, scope)).toHaveLength(TOTAL_ROWS); // 'all' bypasses clamp
  });
});
