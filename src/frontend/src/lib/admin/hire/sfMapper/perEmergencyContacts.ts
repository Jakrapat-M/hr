// SF entity: PerEmergencyContacts — Emergency contact records
// API verb: UPSERT
// Phase: 1.4 (UI cluster + mapper + cascade)
// Source: plan v2 §2.11, errata round 3, SF dump verification 2026-04-28
//
// SF dump findings (sf-qas-ec-fields-FULL-2026-04-25.json):
//   VISIBLE mandatory (sap_required=true, sap_visible=true):
//     personIdExternal, name, relationship, primaryFlag
//   VISIBLE optional (sap_required=false, sap_visible=true):
//     phone — UI treats as required for UX; mapper includes when set
//   HIDDEN mandatory (sap_required=true, sap_visible=false):
//     addressCountry, addressCustomString1 (Province), addressCustomString2 (District),
//     addressCustomString3 (Sub-District), addressCustomString4 (Postal Code),
//     addressCustomString12 (Province — DUPLICATE of CS1), addressCustomString13 (District — DUPLICATE of CS2)
//   NOTE: addressCustomString12/13 duplicate CS1/CS2 per SF schema labeling.
//         Both pairs receive identical values. Phase 2 may disambiguate if SF UI
//         reveals different picklist binding between text and code slots.
import type { PortletMapper, MapperResult } from './types'

interface PerEmergencyContactPayload extends Record<string, unknown> {
  personIdExternal: string
  name: string
  relationship: string   // free-text Edm.String maxLength=50 (not a picklist at OData level)
  phone: string          // sap_required=false but UI-required; mapper includes if set
  primaryFlag: 'Y' | 'N'
  // 7 HIDDEN mandatory: address cascade from visible-parent UI inputs
  addressCountry: string
  addressCustomString1: string   // Province
  addressCustomString2: string   // District
  addressCustomString3: string   // Sub-District
  addressCustomString4: string   // Postal Code
  addressCustomString12: string  // Province (duplicate cascade pair of CS1)
  addressCustomString13: string  // District (duplicate cascade pair of CS2)
}

export const PerEmergencyContactsMapper: PortletMapper = {
  entity: 'PerEmergencyContacts',
  verb: 'UPSERT',
  build(input): MapperResult {
    const personIdExternal = (input.identity?.employeeId ?? '').trim()
    const entries = input.emergencyContacts ?? []

    // Filter: only emit records that have all three visible-required fields
    const records: PerEmergencyContactPayload[] = entries
      .filter((ec) => ec.name.trim() && ec.relationship.trim() && ec.phone.trim())
      .map((ec) => {
        const province = ec.addressProvince || ''
        const district = ec.addressDistrict || ''
        return {
          personIdExternal,
          name: ec.name.trim(),
          relationship: ec.relationship.trim(),
          phone: ec.phone.trim(),
          primaryFlag: ec.primaryFlag ? 'Y' : 'N',
          addressCountry: ec.addressCountry || 'THA',
          addressCustomString1: province,    // Province
          addressCustomString2: district,    // District
          addressCustomString3: ec.addressSubDistrict || '',   // Sub-District
          addressCustomString4: ec.addressPostalCode || '',    // Postal Code
          addressCustomString12: province,   // Province duplicate — SF schema pair of CS1
          addressCustomString13: district,   // District duplicate — SF schema pair of CS2
        }
      })

    return {
      verb: 'UPSERT',
      payload: records,
      notes: [
        'Multi-record: one payload entry per emergencyContacts[] entry with name+relationship+phone',
        'addressCustomString12 mirrors addressCustomString1 (Province); addressCustomString13 mirrors addressCustomString2 (District)',
        'Both duplicate pairs are sap_required=true per SF dump — identical values until Phase 2 disambiguation',
        'phone is sap_required=false in SF schema but required by UI validation tier',
        'relationship is Edm.String maxLength=50 (free-text; no picklist constraint at OData level)',
      ],
    }
  },
}
