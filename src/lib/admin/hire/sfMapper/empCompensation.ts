// SF entity: EmpCompensation — Compensation record (effective-dated)
// API verb: UPSERT
// Phase: 5 (strict BA parity)
// Source: plan v2 §2.10, CREATE-VS-UPSERT.md, sf-qas-ec-fields-FULL-2026-04-25.json
//
// SF dump sap_required fields (sap_upsertable=true):
//   userId, startDate, payGroup, eventReason
// NOTE: event is sap_upsertable=false — DO NOT emit (same pattern as EmpEmployment termination triplet)
// payrollId: sap_required=false — optional, include when present
import type { PortletMapper, MapperResult } from './types'
import { toSfDate, deriveUserId } from './derivedRules'

export const EmpCompensationMapper: PortletMapper = {
  entity: 'EmpCompensation',
  verb: 'UPSERT',
  build(input): MapperResult {
    const userId = deriveUserId(input.identity.employeeId)
    const startDate = toSfDate(input.identity.hireDate)
    const eventReason = input.identity.eventReason ?? ''
    const payGroup = input.compensation.payGroup ?? ''

    const notes: string[] = []
    if (!payGroup) notes.push('payGroup is empty — required by SF (sap_required=true)')
    if (!eventReason) notes.push('eventReason is empty — required by SF (sap_required=true)')
    // event field is sap_upsertable=false — omitted intentionally (same as termination triplet pattern)
    notes.push('event field omitted: sap_upsertable=false (SF derives from eventReason internally)')

    return {
      verb: 'UPSERT',
      payload: {
        userId,
        startDate,
        payGroup,
        eventReason,
        // payrollId: sap_required=false — include when present (SF: mirrors userId by convention)
        payrollId: userId || null,
        // seqNumber: sap_required=false — SF assigns on first upsert; omit to let SF auto-assign
      },
      notes,
    }
  },
}
