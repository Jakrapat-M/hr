// SF entity: PerPhone — Phone numbers (multi-record)
// API verb: UPSERT
// Phase: 1.3 (real implementation)
// Source: plan v2 §2.6, MISSING-PICKLISTS.md ecPhoneType
import type { PortletMapper, MapperResult } from './types'
import { PHONE_TYPE_FORM_TO_SF } from './picklistMaps'

export const PerPhoneMapper: PortletMapper = {
  entity: 'PerPhone',
  verb: 'UPSERT',
  build(input): MapperResult {
    const personIdExternal = input.identity.employeeId.trim()

    return {
      verb: 'UPSERT',
      payload: input.contact.phones
        .filter(p => p.value.trim() !== '')
        .map(p => ({
          personIdExternal,
          phoneType: PHONE_TYPE_FORM_TO_SF[p.type as keyof typeof PHONE_TYPE_FORM_TO_SF] ?? p.type,
          phoneNumber: p.value,
          countryCode: '66',
          isPrimary: p.isPrimary,
        })),
      notes: [
        'REMAP phoneType via PHONE_TYPE_FORM_TO_SF (mobile→C, office→B, home→H)',
        'countryCode constant 66 (Thailand) — form +66 stripped to 66',
      ],
    }
  },
}
