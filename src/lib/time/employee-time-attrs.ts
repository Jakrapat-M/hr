// lib/time/employee-time-attrs.ts — Group 0 (Time-module ESS shared foundations)
//
// MOCK ONLY. Per-employee time attributes that gate ESS Time flows:
//   • otEligible       → false hides/blocks the OT request entry (OT-flag gate).
//   • employeeType     → 'non-clocking' employees cannot raise a clock-time
//                        correction (correction clocking-gate).
//   • calendarType     → 'Store' vs 'HO' selects working-calendar / store-only
//                        leave types (e.g. special_leave is storeOnly).
//
// Demo map covers the current-user logins + EMP101..EMP106 so every gate is
// demoable. Unknown ids fall back to the permissive default.

export type EmployeeTimeAttrs = {
  otEligible: boolean;
  employeeType: 'clocking' | 'non-clocking';
  calendarType: 'Store' | 'HO';
};

/** Permissive default for ids not in the demo map. */
const DEFAULT_ATTRS: EmployeeTimeAttrs = {
  otEligible: true,
  employeeType: 'clocking',
  calendarType: 'Store',
};

// Demo seed. EMP103 is OT-ineligible; EMP105 is non-clocking (HO) so both gates
// are demoable. Current-user demo logins are included so the live persona works.
const EMPLOYEE_TIME_ATTRS: Record<string, EmployeeTimeAttrs> = {
  // Current demo user(s)
  'emp-001': { otEligible: true, employeeType: 'clocking', calendarType: 'Store' },
  'emp-002': { otEligible: true, employeeType: 'clocking', calendarType: 'Store' },
  // EMP101..EMP106 demo cohort
  EMP101: { otEligible: true, employeeType: 'clocking', calendarType: 'Store' },
  EMP102: { otEligible: true, employeeType: 'clocking', calendarType: 'HO' },
  EMP103: { otEligible: false, employeeType: 'clocking', calendarType: 'Store' },
  EMP104: { otEligible: true, employeeType: 'clocking', calendarType: 'Store' },
  EMP105: { otEligible: false, employeeType: 'non-clocking', calendarType: 'HO' },
  EMP106: { otEligible: true, employeeType: 'non-clocking', calendarType: 'HO' },
};

/** Time attributes for an employee id (permissive default for unknown ids). */
export function getEmployeeTimeAttrs(employeeId: string): EmployeeTimeAttrs {
  return EMPLOYEE_TIME_ATTRS[employeeId] ?? DEFAULT_ATTRS;
}
