// SF entity: EmpJobRelationships — Job relationships (matrix manager, HR manager, etc.)
// API verb: UPSERT
// Phase: 5 (strict BA parity — Phase 5b-1)
// Source: plan v2 errata round 3
import type { PortletMapper } from './types'
import { pending } from './types'

export const EmpJobRelationshipsMapper: PortletMapper = {
  entity: 'EmpJobRelationships',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        '2 fields per relationship: relationship type + name',
        'UI exists already in form (jobRelationships[] in contact slice)',
        'Phase 5b-1 — quick mapper wire',
      ],
      5,
    )
  },
}
