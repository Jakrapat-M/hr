/**
 * P2 — Persona scope helpers for the open /roster + /reports routes.
 *
 * The roster board (ROSTER_ROWS) and the report aggregates are demo surfaces
 * that are NOT pool-linked row-for-row. To make them persona-aware without a
 * new data layer, we reuse filterEmployeesByPersona over ALL_PORTED_EMPLOYEES
 * to decide HOW MANY rows the persona is entitled to see, then slice the visible
 * roster rows / aggregate set to that scope.
 *
 *   manager   → direct reports (reduced slice)
 *   hrbp      → BU members (reduced slice)
 *   spd / hr_admin / hr_manager → all (full board / full aggregate)
 *   employee  → self only
 *
 * Keeps /roster + /reports OPEN to their menu personas (no deny) while the
 * underlying data narrows to the persona's scope.
 */

import type { Role } from './rbac';
import type { HumiEmployee } from './humi-mock-data';
import { filterEmployeesByPersona, type ScopeMode } from './scope-filter';

export interface RosterScope {
  readonly mode: ScopeMode;
  /** How many roster rows this persona may see (clamped to total). */
  readonly visibleCount: number;
  /** The scoped employee slice (drives report aggregates). */
  readonly employees: ReadonlyArray<HumiEmployee>;
}

/**
 * Resolve the persona's roster/report scope.
 *
 * @param pool          ALL_PORTED_EMPLOYEES (full 212-row pool)
 * @param roles         active persona roles (view-as aware)
 * @param currentEmpId  emp-id of the persona (EMP_BY_LOGIN), or null
 * @param totalRows     number of roster rows available to slice (ROSTER_ROWS.length)
 */
export function pickRosterScope(
  pool: ReadonlyArray<HumiEmployee>,
  roles: ReadonlyArray<Role>,
  currentEmpId: string | null,
  totalRows: number,
): RosterScope {
  // No resolvable identity (e.g. email not in EMP_BY_LOGIN) → we cannot compute a
  // persona slice, so fall back to the full demo board rather than an empty one.
  // Real demo personas (manager/hrbp/...) resolve an emp-id and still scope below.
  if (!currentEmpId) {
    return Object.freeze({ mode: 'all', visibleCount: totalRows, employees: [...pool] });
  }

  const { mode, employees } = filterEmployeesByPersona(pool, roles, currentEmpId);

  // 'all' personas see the full board; scoped personas see a slice sized to
  // their entitled employee count (min with the available rows).
  const visibleCount =
    mode === 'all' ? totalRows : Math.min(employees.length, totalRows);

  return Object.freeze({ mode, visibleCount, employees });
}

/** Slice an array of roster rows to the persona's visible scope. */
export function scopeRosterRows<T>(
  rows: ReadonlyArray<T>,
  scope: RosterScope,
): T[] {
  if (scope.mode === 'all') return [...rows];
  return rows.slice(0, scope.visibleCount);
}
