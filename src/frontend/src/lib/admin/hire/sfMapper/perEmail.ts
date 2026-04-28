// SF entity: PerEmail — Email addresses (multi-record)
// API verb: UPSERT
// Phase: 1 (mapper foundation)
// Source: plan v2 §2.5, MISSING-PICKLISTS.md ecEmailType
import type { PortletMapper } from './types'
import { pending } from './types'

export const PerEmailMapper: PortletMapper = {
  entity: 'PerEmail',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        'REMAP emailType via EMAIL_TYPE_FORM_TO_SF (personal→P, work→B)',
        'Multi-record: emit one record per emails[] entry',
        'personIdExternal DERIVED',
      ],
      1,
    )
  },
}
