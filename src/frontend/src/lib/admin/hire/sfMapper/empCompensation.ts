// SF entity: EmpCompensation — Compensation record
// API verb: UPSERT
// Phase: 5 (strict BA parity)
// Source: plan v2 §2.10, CREATE-VS-UPSERT.md
import type { PortletMapper } from './types'
import { pending } from './types'

export const EmpCompensationMapper: PortletMapper = {
  entity: 'EmpCompensation',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        'payGroup, payrollId, event, eventReason — Phase 5 (strict BA parity)',
        'Companion entities EmpPayCompRecurring + PaymentInformationV3 in separate stubs',
      ],
      5,
    )
  },
}
