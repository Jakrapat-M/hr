// SF entity: EmpJobRelationships — Job relationships (matrix manager, HR manager, etc.)
// API verb: UPSERT
// Phase: 5b-1 (strict BA parity)
// Source: plan v2 errata round 3, sf-extract/qas-fields-2026-04-25
//
// SF fields (from dump):
//   userId          — required, upsertable — the new hire's employee ID
//   relUserId       — required, upsertable — SF label "Name"; stores the related user's SF userId
//   relationshipType — required, upsertable — e.g. "matrix manager", "HR manager"
//   startDate       — required, upsertable — OData /Date(epochMs)/ format (usually hireDate)
//   endDate         — optional, upsertable — omitted on hire (SF defaults to high-date)
//   operation       — optional, upsertable — omitted (SF default)
import type { PortletMapper, MapperResult } from './types'
import { toSfDate } from './derivedRules'

interface EmpJobRelationshipsRecord extends Record<string, unknown> {
  userId: string
  // TODO(Phase 5b-1): SF relUserId must be a real SF userId, but the form stores a free-text name.
  // For now we store the name string directly. Integration team must resolve name→userId
  // lookup before live SF submission. Tracked in plan v2 §Phase 5b-1.
  relUserId: string
  relationshipType: string
  startDate: string
}

export const EmpJobRelationshipsMapper: PortletMapper<EmpJobRelationshipsRecord> = {
  entity: 'EmpJobRelationships',
  verb: 'UPSERT',
  build(input): MapperResult<EmpJobRelationshipsRecord> {
    const userId = input.identity.employeeId.trim()
    const startDate = toSfDate(input.identity.hireDate) ?? ''

    const payload: EmpJobRelationshipsRecord[] = (input.contact.jobRelationships ?? [])
      .filter((rel) => rel.relationshipType.trim() && rel.name.trim())
      .map((rel) => ({
        userId,
        relUserId: rel.name.trim(),
        relationshipType: rel.relationshipType.trim(),
        startDate,
      }))

    return {
      verb: 'UPSERT',
      payload,
      notes: [
        'Multi-record: one per contact.jobRelationships[] non-empty entry',
        'relUserId stores free-text name from form — requires name→SF userId resolution before live submission',
        'startDate = hireDate in OData /Date(epochMs)/ format',
        'endDate omitted on hire (SF defaults to high-date 9999-12-31)',
      ],
    }
  },
}
