// SF entity: EmpWorkPermit — Work permit (foreigners only)
// API verb: UPSERT
// Phase: 5 (strict BA parity — Phase 5b-3)
// Source: plan v2 errata round 3
import type { PortletMapper } from './types'
import { pending } from './types'

export const EmpWorkPermitMapper: PortletMapper = {
  entity: 'EmpWorkPermit',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        '8 BA fields: documentType, country, documentNumber, issueDate, expirationDate, customDate1=Arrival date (VISA), customDate2=90-day report (VISA), Attachment',
        'Conditional UI — only foreigners (nationality !== THA)',
        'Phase 5b-3',
      ],
      5,
    )
  },
}
