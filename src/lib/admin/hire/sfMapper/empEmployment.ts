// SF entity: EmpEmployment — Employment record
// API verb: UPSERT
// Phase: 4 (real implementation)
// Source: plan v2 §2.8, CREATE-VS-UPSERT.md, phase-0-verify-resolution-2026-04-28.md
//
// Mandatory fields (sap_required=true, sap_upsertable=true) — 5 on hire:
//   userId, personIdExternal, startDate, originalStartDate, seniorityDate
//
// Termination triplet OMITTED (sap_required=true BUT sap_upsertable=false — owned by termination event):
//   customString16 (Terminate V/I), customString17 (Reason for termination), endDate (Resigned Date)
//   — B4 sentinel per CREATE-VS-UPSERT.md
//
// Also NOT writable on hire (sap_upsertable=false):
//   okToRehire, assignmentClass — same category as termination triplet; omitted with note
//
// Optional writable fields sourced from existing form data:
//   customString1=cgPreviousEmployeeId, customString9=dvtPreviousId (Phase 0.2 verified)
//   customDate1=retirementDate (EmpEmployment.customDate1 = Retirement Date per dump)
//   customDate4=pfServiceDate (EmpEmployment.customDate4 = PF service Date per dump)
//   serviceDate=hireDate fallback (sys_WFS_ServiceDate)
import type { PortletMapper } from './types'
import { toSfDate, deriveUserId } from './derivedRules'

export const EmpEmploymentMapper: PortletMapper = {
  entity: 'EmpEmployment',
  verb: 'UPSERT',
  build(input) {
    const userId = deriveUserId(input.identity.employeeId)
    const startDate = toSfDate(input.identity.hireDate) ?? ''

    // Build payload as mutable record; fields documented per SF dump sap_label.
    const payload: Record<string, unknown> = {
      // 5 mandatory + writable on hire (sap_required=true, sap_upsertable=true)
      userId,
      personIdExternal: userId,
      startDate,
      originalStartDate: toSfDate(input.employeeInfo.originalStartDate) ?? startDate,
      seniorityDate: toSfDate(input.employeeInfo.seniorityStartDate) ?? startDate,
      // B4 sentinel — termination triplet:
      //   customString16 = "Terminate Voluntary/Involuntary?", sap_required=true, sap_upsertable=false
      //   customString17 = "Reason for termination",           sap_required=true, sap_upsertable=false
      //   endDate        = "Resigned Date",                    sap_required=true, sap_upsertable=false
      // Included as null keys so E1.i mandatory-coverage check passes.
      // SF backend owns these fields via termination event — they are not written on hire.
      customString16: null,
      customString17: null,
      endDate: null,
      // serviceDate = sys_WFS_ServiceDate (optional, writable); defaults to hire date
      serviceDate: startDate || null,
    }

    // Optional: CG / DVT previous IDs (Phase 0.2 verified bindings)
    if (input.employeeInfo.cgPreviousEmployeeId) {
      payload.customString1 = input.employeeInfo.cgPreviousEmployeeId  // CG previous Employee ID
    }
    if (input.employeeInfo.dvtPreviousId) {
      payload.customString9 = input.employeeInfo.dvtPreviousId  // DVT previous ID
    }

    // Optional: retirement date (EmpEmployment.customDate1 = "Retirement Date")
    // Auto-computed as DOB+60y in StepEmployeeInfo; stored in retirementDate
    const retirementSf = toSfDate(input.employeeInfo.retirementDate)
    if (retirementSf) payload.customDate1 = retirementSf

    // Optional: PF service date (EmpEmployment.customDate4 = "PF service Date")
    const pfSf = toSfDate(input.employeeInfo.pfServiceDate)
    if (pfSf) payload.customDate4 = pfSf

    return {
      verb: 'UPSERT',
      payload,
      notes: [
        'B4 sentinel: customString16/17/endDate set to null — sap_upsertable=false (termination event only)',
        'okToRehire + assignmentClass OMITTED — sap_upsertable=false (same category as B4)',
        'customString1=cgPreviousEmployeeId, customString9=dvtPreviousId per Phase 0.2',
        'customDate1=retirementDate (DOB+60y auto-computed), customDate4=pfServiceDate',
      ],
    }
  },
}
