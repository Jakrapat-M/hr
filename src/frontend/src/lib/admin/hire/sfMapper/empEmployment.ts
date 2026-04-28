// SF entity: EmpEmployment — Employment record
// API verb: UPSERT
// Phase: 4 (B4 sentinel + customString remaps)
// Source: plan v2 §2.8, CREATE-VS-UPSERT.md, phase-0-verify-resolution-2026-04-28.md
import type { PortletMapper } from './types'
import { pending } from './types'

export const EmpEmploymentMapper: PortletMapper = {
  entity: 'EmpEmployment',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        'B4 sentinel: OMIT customString16/17/endDate from hire payload (sap_upsertable=false on these 3)',
        'REMAP customString1=cgPreviousEmployeeId, customString9=dvtPreviousId per Phase 0.2',
        'originalStartDate/seniorityDate from employeeInfo slice',
        'userId DERIVED',
      ],
      4,
    )
  },
}
