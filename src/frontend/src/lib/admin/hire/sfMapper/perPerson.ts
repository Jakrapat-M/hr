// SF entity: PerPerson — Person Root (16 fields, 2 mandatory)
// API verb: UPSERT
// Phase: 1 (mapper foundation)
// Source: plan v2 §2.2, .omc/research/CREATE-VS-UPSERT.md
import type { PortletMapper } from './types'
import { pending } from './types'

export const PerPersonMapper: PortletMapper = {
  entity: 'PerPerson',
  verb: 'UPSERT',
  build(_input) {
    return pending(
      [
        'personIdExternal from identity.employeeId',
        'dateOfBirth from identity.dateOfBirth as toSfDate',
        'countryOfBirth/regionOfBirth pass-through optional',
      ],
      1,
    )
  },
}
