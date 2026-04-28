// SF entity: PerPersonRelationship — Dependents (multi-record)
// API verb: UPSERT
// Phase: 5 (strict BA parity — Phase 5b-4)
// Source: plan v2 errata round 3
import type { PortletMapper } from './types'
import { pending } from './types'

export const PerPersonRelationshipMapper: PortletMapper = {
  entity: 'PerPersonRelationship',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        'Dependents — multi-record per dependent',
        "BA section 'Dependens' — 26 fields per dependent (relationship type, names EN/TH, nationality, DOB, NID type/country/number)",
        'Phase 5b-4 — strict BA parity addition',
      ],
      5,
    )
  },
}
