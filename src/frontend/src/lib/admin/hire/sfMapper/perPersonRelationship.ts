// SF entity: PerPersonRelationship — Dependents (multi-record)
// API verb: UPSERT
// Phase: 5b-4 (strict BA parity)
// Source: plan v2 errata round 3, sf-extract/_probe_personRelationship.json
//
// SF dump findings (sf-qas-ec-fields-FULL-2026-04-25.json):
//   Composite key: (personIdExternal, relatedPersonIdExternal, startDate)
//   UPSERTABLE mandatory:
//     personIdExternal   — employee ID
//     relatedPersonIdExternal — derived: ${personIdExternal}-D${nn} (zero-padded index)
//     relationshipType   — picklist code (e.g. "5107" = Spouse, "5109" = Daughter)
//     startDate          — hire date in SF /Date(ms)/ format
//   UPSERTABLE optional:
//     endDate            — set to SF_HIGH_DATE for active records
//   NOT UPSERTABLE but sap_required=true (persisted via nav):
//     firstName          — persisted via relPersonalNav (PerPersonal_ref)
//     lastName           — persisted via relPersonalNav (PerPersonal_ref)
//   NOTE: firstName/lastName are included in payload for downstream nav-hydration consistency.
//         They are not directly writable on PerPersonRelationship itself per the OData schema.
import type { PortletMapper, MapperResult } from './types'
import { SF_HIGH_DATE } from './types'
import { toSfDate } from './derivedRules'

interface PerPersonRelationshipPayload extends Record<string, unknown> {
  personIdExternal: string
  relatedPersonIdExternal: string  // composite key: ${personIdExternal}-D${nn}, zero-padded index
  relationshipType: string          // picklist code — form stores code string directly
  startDate: string | null          // SF /Date(ms)/ — from hire date
  endDate: string                   // SF_HIGH_DATE for active records
  // Nav-persisted (not directly writable on PPR) — included for downstream hydration
  firstName: string
  lastName: string
}

export const PerPersonRelationshipMapper: PortletMapper = {
  entity: 'PerPersonRelationship',
  verb: 'UPSERT',
  build(input): MapperResult {
    const personIdExternal = (input.identity?.employeeId ?? '').trim()
    const startDate = toSfDate(input.identity?.hireDate) ?? null
    const entries = input.dependents ?? []

    // Filter: only emit records that have relationshipType + at least one name
    const records: PerPersonRelationshipPayload[] = entries
      .filter((dep) => dep.relationshipType.trim() && (dep.firstNameEn.trim() || dep.firstNameLocal.trim()))
      .map((dep, idx) => ({
        personIdExternal,
        relatedPersonIdExternal: `${personIdExternal}-D${String(idx + 1).padStart(2, '0')}`,
        relationshipType: dep.relationshipType.trim(),
        startDate,
        endDate: SF_HIGH_DATE,
        firstName: dep.firstNameEn.trim() || dep.firstNameLocal.trim(),
        lastName: dep.lastNameEn.trim() || dep.lastNameLocal.trim(),
      }))

    return {
      verb: 'UPSERT',
      payload: records,
      notes: [
        'Multi-record: one payload entry per dependent with relationshipType + at least one name',
        'relatedPersonIdExternal composite key: ${personIdExternal}-D${nn} (1-indexed, zero-padded)',
        'firstName/lastName are sap_upsertable=false on PerPersonRelationship — they are persisted via relPersonalNav (PerPersonal_ref)',
        'Empty dependents list returns empty array (valid — dependents are optional)',
        'endDate set to SF_HIGH_DATE (9999-12-31) for active records',
        'startDate derived from hire date via toSfDate() — SF /Date(ms)/ format',
      ],
    }
  },
}
