// SF entity: PerEmergencyContacts — Emergency contact records
// API verb: UPSERT
// Phase: 1 (UI cluster + mapper + cascade)
// Source: plan v2 §2.13, errata round 3
import type { PortletMapper } from './types'
import { pending } from './types'

export const PerEmergencyContactsMapper: PortletMapper = {
  entity: 'PerEmergencyContacts',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        '11 mandatory: 4 visible (name/relationship/phone/primaryFlag/personIdExternal) + 7 hidden cascade (addressCountry/addressCustomString1/2/3/4/12/13)',
        'Phase 1.4 implements UI cluster + mapper',
        'Hidden sub-entity cascade: visible-parent province/district/etc populates hidden customString slots verbatim',
      ],
      1,
    )
  },
}
