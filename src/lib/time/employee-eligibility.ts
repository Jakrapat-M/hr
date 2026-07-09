// lib/time/employee-eligibility.ts — STA-131
//
// Pure helper that distills a clean employee profile into the eligibility facts
// the leave-validation predicates consume. It does NOT parse display tuples —
// callers pass clean enum fields (gender, maritalStatus) and an ISO hireDate.
// Years-of-service is derived from the shared calcYearOfService calculator.

import { calcYearOfService } from '@/lib/calculations';

export type Gender = 'M' | 'F';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';

/** Clean employee profile input (no positional tuples). */
export type EmployeeEligibilityInput = {
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  /** ISO "YYYY-MM-DD" hire date — fed straight to calcYearOfService. */
  hireDate?: string;
};

/** The eligibility facts a leave-validation predicate needs. */
export type EmployeeEligibility = {
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  /** Whole years of service (floored), 0 when hireDate is absent/future. */
  yearsOfService: number;
};

/**
 * Derive eligibility facts from a clean profile. YoS uses calcYearOfService
 * (whole-year `.years`), with no lifecycle events and an optional asOf for
 * deterministic tests.
 */
export function deriveEmployeeEligibility(
  input: EmployeeEligibilityInput,
  asOf?: string,
): EmployeeEligibility {
  const yearsOfService = input.hireDate
    ? calcYearOfService(input.hireDate, [], asOf).years
    : 0;
  return {
    gender: input.gender,
    maritalStatus: input.maritalStatus,
    yearsOfService,
  };
}
