// SF entity: PerPersonal — Personal Information
// API verb: UPSERT
// Phase: 1.3 (real implementation)
// Source: plan v2 §2.3, errata Round 2
import type { PortletMapper, MapperResult } from './types'
import { toSfDate, deriveForeignerFlag } from './derivedRules'
import { SALUTATION_EN_FORM_TO_SF } from './picklistMaps'

export const PerPersonalMapper: PortletMapper = {
  entity: 'PerPersonal',
  verb: 'UPSERT',
  build(input): MapperResult {
    const salutationEn = input.identity.salutationEn
    const salutation = salutationEn
      ? (SALUTATION_EN_FORM_TO_SF[salutationEn as keyof typeof SALUTATION_EN_FORM_TO_SF] ?? salutationEn)
      : null

    return {
      verb: 'UPSERT',
      payload: {
        personIdExternal: input.identity.employeeId.trim(),
        startDate: toSfDate(input.identity.hireDate),
        salutation,
        customString1: input.identity.salutationLocal,
        firstName: input.identity.firstNameEn,
        lastName: input.identity.lastNameEn,
        customString2: input.biographical.firstNameLocal,
        customString3: input.biographical.lastNameLocal,
        nationality: input.biographical.nationality ?? null,
        customString4: input.biographical.middleNameLocal || '',
        customString5: input.biographical.militaryStatus || '',
        customString6: input.biographical.bloodType || '',
        customString14: deriveForeignerFlag(input.biographical.nationality),
        gender: input.biographical.gender ?? null,
        maritalStatus: input.biographical.maritalStatus ?? null,
        middleName: input.identity.middleNameEn || null,
        partnerName: null,
        preferredName: input.biographical.nickname || null,
      },
      notes: [
        'customString5/6 = Military Status/Blood Type per errata round 2 (was DROP-SOURCE in v2)',
        'customString14 = foreigner flag DERIVED via deriveForeignerFlag (NOT customString13 which is system)',
        'cust_religion deferred to Phase 5b-2 (Global Information)',
        'secondLastName (sys_EC_LastName) is a system field — not written; middleNameLocal goes to customString4 only',
      ],
    }
  },
}
