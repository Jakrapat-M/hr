// SF entity: PerNationalId — National ID / Passport records
// API verb: UPSERT
// Phase: 1.3 (real implementation — NID code remap brought forward from Phase 4)
// Source: plan v2 §2.4, MISSING-PICKLISTS.md Q6
import type { PortletMapper, MapperResult } from './types'
import { toSfDate } from './derivedRules'
import { NID_CARD_TYPE_FORM_TO_SF } from './picklistMaps'

export const PerNationalIdMapper: PortletMapper = {
  entity: 'PerNationalId',
  verb: 'UPSERT',
  build(input): MapperResult {
    const formCardType = input.identity.nationalIdCardType
    const mappedCardType = formCardType
      ? (NID_CARD_TYPE_FORM_TO_SF[formCardType as keyof typeof NID_CARD_TYPE_FORM_TO_SF] ?? formCardType)
      : null

    const notes: string[] = [
      'cardType REMAP via NID_CARD_TYPE_FORM_TO_SF (Q6: only tni/tni2/PN supported)',
      'isPrimary boolean conversion (form uses YES/NO, SF expects true/false)',
      'Single-record only on hire — Phase 4 may add multi-record if required',
    ]
    if (formCardType && !(formCardType in NID_CARD_TYPE_FORM_TO_SF)) {
      notes.push(`cardType '${formCardType}' has no entry in NID_CARD_TYPE_FORM_TO_SF — passed through as-is`)
    }

    return {
      verb: 'UPSERT',
      payload: {
        personIdExternal: input.identity.employeeId.trim(),
        country: input.identity.country ?? null,
        cardType: mappedCardType,
        nationalId: input.identity.nationalId.replace(/\s+/g, '').replace(/-/g, ''),
        isPrimary: input.identity.isPrimary === 'YES',
        customDate1: toSfDate(input.identity.issueDate),
        customDate2: toSfDate(input.identity.expiryDate),
      },
      notes,
    }
  },
}
