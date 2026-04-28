// SF entity: EmpPayCompRecurring — Recurring pay components (multi-record)
// API verb: UPSERT
// Phase: 5 (strict BA parity)
// Source: plan v2 §2.11, CREATE-VS-UPSERT.md
import type { PortletMapper } from './types'
import { pending } from './types'

export const EmpPayCompRecurringMapper: PortletMapper = {
  entity: 'EmpPayCompRecurring',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        'Multi-record: 1 row for baseSalary + N rows for recurringComponents[]',
        'Phase 5 strict BA parity',
      ],
      5,
    )
  },
}
