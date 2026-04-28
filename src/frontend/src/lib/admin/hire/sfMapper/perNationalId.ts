// SF entity: PerNationalId — National ID / Passport records
// API verb: UPSERT
// Phase: 4 (NID card type REMAP + primary flag logic)
// Source: plan v2 §2.4, MISSING-PICKLISTS.md Q6
import type { PortletMapper } from './types'
import { pending } from './types'

export const PerNationalIdMapper: PortletMapper = {
  entity: 'PerNationalId',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        'REMAP cardType via NID_CARD_TYPE_FORM_TO_SF (only tni/tni2/PN per Q6)',
        'isPrimary YES/NO → boolean',
        'issueDate/expiryDate via toSfDate',
      ],
      4,
    )
  },
}
