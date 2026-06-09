// contract-renewal.helpers.ts — pure, side-effect-free helpers for the
// contract-renewal action. Kept out of the page module so they are unit-testable
// without React.

import type { MockEmployee } from '@/mocks/employees'

/** Add a whole number of years to an ISO date (YYYY-MM-DD). */
export function addYears(isoDate: string, years: number): string {
  const d = new Date(isoDate)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

/**
 * Resolve the current contract end date for an employee.
 *
 * Returns the stored `contract_end_date` when present (the source of truth for
 * temporary/PARTIME staff). Falls back to `hire_date + 1 year` for any employee
 * lacking the field, preserving the previous behaviour for regular staff.
 */
export function resolveContractEndDate(employee: MockEmployee): string {
  return employee.contract_end_date ?? addYears(employee.hire_date, 1)
}
