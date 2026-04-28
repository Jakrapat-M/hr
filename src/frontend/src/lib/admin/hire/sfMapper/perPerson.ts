// SF entity: PerPerson — Person Root (16 fields, 2 mandatory)
// API verb: UPSERT
// Phase: 1.3 (real implementation)
// Source: plan v2 §2.2, .omc/research/CREATE-VS-UPSERT.md
import type { PortletMapper, MapperResult } from './types'
import { toSfDate } from './derivedRules'

export const PerPersonMapper: PortletMapper = {
  entity: 'PerPerson',
  verb: 'UPSERT',
  build(input): MapperResult {
    return {
      verb: 'UPSERT',
      payload: {
        personIdExternal: input.identity.employeeId.trim(),
        dateOfBirth: toSfDate(input.identity.dateOfBirth),
        countryOfBirth: input.identity.countryOfBirth ?? null,
        regionOfBirth: input.identity.regionOfBirth || null,
      },
    }
  },
}
