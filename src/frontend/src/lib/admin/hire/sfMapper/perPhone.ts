// SF entity: PerPhone — Phone numbers (multi-record)
// API verb: UPSERT
// Phase: 1 (mapper foundation)
// Source: plan v2 §2.6, MISSING-PICKLISTS.md ecPhoneType
import type { PortletMapper } from './types'
import { pending } from './types'

export const PerPhoneMapper: PortletMapper = {
  entity: 'PerPhone',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        'REMAP phoneType via PHONE_TYPE_FORM_TO_SF',
        'Strip + from countryCode (form sends +66, SF wants 66)',
        'Multi-record per phones[]',
      ],
      1,
    )
  },
}
