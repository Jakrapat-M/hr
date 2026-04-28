// SF entity: PerGlobalInfoTHA — Thailand-specific global info
// API verb: UPSERT
// Phase: 5 (strict BA parity — Phase 5b-2)
// Source: plan v2 errata round 3
import type { PortletMapper } from './types'
import { pending } from './types'

export const PerGlobalInfoTHAMapper: PortletMapper = {
  entity: 'PerGlobalInfoTHA',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        '10 BA fields: Religion (genericString5), Number of children (genericNumber2), Disability Status (customString1), Disability Cert dates (customDate1/2), Type of Disability (genericString2), Certificate ID (genericString4), Spouse Father/Mother ID (genericNumber4/5), Additional Information (customString2)',
        'Phase 5b-2 — strict BA parity addition',
      ],
      5,
    )
  },
}
