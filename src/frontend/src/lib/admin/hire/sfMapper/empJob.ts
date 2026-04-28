// SF entity: EmpJob — Job information (38 mandatory fields)
// API verb: UPSERT
// Phase: 3 (full job data body)
// Source: plan v2 §2.9, CREATE-VS-UPSERT.md, phase-0-verify-resolution-2026-04-28.md
import type { PortletMapper } from './types'
import { pending } from './types'

export const EmpJobMapper: PortletMapper = {
  entity: 'EmpJob',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        '38 mandatory fields — Phase 3 implements full body',
        'DROP employeeClass per Q (no SF binding)',
        'REMAP customString5=corporateTitle, customString25=hrDistrict, customDouble1=dailyWorkingHours per Phase 0.2',
        '5 picklists TBD: customString6/8/9/21/31 — resolved Phase 3 entry-criterion',
      ],
      3,
    )
  },
}
