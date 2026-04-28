// SF entity: PerAddressDEFLT — Default address (mailing)
// API verb: UPSERT
// Phase: 2 (address picklist cascade)
// Source: plan v2 §2.7, CREATE-VS-UPSERT.md
import type { PortletMapper } from './types'
import { pending } from './types'

export const PerAddressDEFLTMapper: PortletMapper = {
  entity: 'PerAddressDEFLT',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        'Address picklist cascade — Phase 2 implements zProvince/zDistrict/zSubDistrict/zPostalCode lookups',
        'addressType=mailing on hire (default)',
        'Multi-record support deferred (single-address form for now)',
      ],
      2,
    )
  },
}
