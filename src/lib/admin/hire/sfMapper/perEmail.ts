// SF entity: PerEmail — Email addresses (multi-record)
// API verb: UPSERT
// Phase: 1.3 (real implementation)
// Source: plan v2 §2.5, MISSING-PICKLISTS.md ecEmailType
import type { PortletMapper, MapperResult } from './types'
import { EMAIL_TYPE_FORM_TO_SF } from './picklistMaps'

export const PerEmailMapper: PortletMapper = {
  entity: 'PerEmail',
  verb: 'UPSERT',
  build(input): MapperResult {
    const personIdExternal = input.identity.employeeId.trim()

    return {
      verb: 'UPSERT',
      payload: input.contact.emails
        .filter(e => e.value.trim() !== '')
        .map(e => ({
          personIdExternal,
          emailType: EMAIL_TYPE_FORM_TO_SF[e.type as keyof typeof EMAIL_TYPE_FORM_TO_SF] ?? e.type,
          emailAddress: e.value,
          isPrimary: e.isPrimary,
        })),
      notes: ['REMAP emailType via EMAIL_TYPE_FORM_TO_SF (personal→P, work→B)'],
    }
  },
}
