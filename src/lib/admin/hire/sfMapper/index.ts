// Top-level entry point for all SF portlet mappers.
// 17 entities: 11 from plan v2 + 4 from errata round 3 (strict BA parity) + 2 additional.
//
// Usage:
//   import { mappers, buildAll } from '@/lib/admin/hire/sfMapper'
//   const submission = buildAll(formData)
//
import type { FormData } from '../../store/useHireWizard'
import type { MapperResult, PortletMapper, BuildOptions } from './types'

import { PerPersonMapper } from './perPerson'
import { PerPersonalMapper } from './perPersonal'
import { PerNationalIdMapper } from './perNationalId'
import { PerEmailMapper } from './perEmail'
import { PerPhoneMapper } from './perPhone'
import { PerAddressDEFLTMapper } from './perAddressDEFLT'
import { EmpEmploymentMapper } from './empEmployment'
import { EmpJobMapper } from './empJob'
import { EmpCompensationMapper } from './empCompensation'
import { EmpPayCompRecurringMapper } from './empPayCompRecurring'
import { PaymentInformationV3Mapper } from './paymentInformationV3'
import { PerEmergencyContactsMapper } from './perEmergencyContacts'
import { UserMapper } from './user'
import { PerGlobalInfoTHAMapper } from './perGlobalInfoTHA'
import { PerPersonRelationshipMapper } from './perPersonRelationship'
import { EmpWorkPermitMapper } from './empWorkPermit'
import { EmpJobRelationshipsMapper } from './empJobRelationships'

export const mappers = {
  perPerson: PerPersonMapper,
  perPersonal: PerPersonalMapper,
  perNationalId: PerNationalIdMapper,
  perEmail: PerEmailMapper,
  perPhone: PerPhoneMapper,
  perAddressDEFLT: PerAddressDEFLTMapper,
  empEmployment: EmpEmploymentMapper,
  empJob: EmpJobMapper,
  empCompensation: EmpCompensationMapper,
  empPayCompRecurring: EmpPayCompRecurringMapper,
  paymentInformationV3: PaymentInformationV3Mapper,
  perEmergencyContacts: PerEmergencyContactsMapper,
  user: UserMapper,
  perGlobalInfoTHA: PerGlobalInfoTHAMapper,
  perPersonRelationship: PerPersonRelationshipMapper,
  empWorkPermit: EmpWorkPermitMapper,
  empJobRelationships: EmpJobRelationshipsMapper,
} as const satisfies Record<string, PortletMapper>

export type MapperKey = keyof typeof mappers
export type AllMapperResults = Record<MapperKey, MapperResult>

/**
 * Build all 17 SF entity payloads from current form state.
 * Returns a record keyed by mapper name. Each value's `verb` field tells the caller
 * whether to UPSERT/CREATE (real implementation) or skip (PENDING — stub returns null payload).
 */
export function buildAll(input: FormData, opts?: BuildOptions): AllMapperResults {
  const result = {} as AllMapperResults
  for (const [key, mapper] of Object.entries(mappers) as [MapperKey, PortletMapper][]) {
    result[key] = mapper.build(input, opts)
  }
  return result
}

export type { SfApiVerb, MapperResult, PortletMapper, BuildOptions } from './types'
