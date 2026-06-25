// dependentRelationship.ts — Dependent "Relationship Type" LOV (STA-145 Phase B)
// Bucket: DEPENDENT. Gold matrix: Parents / Child / Spouse.
import type { PicklistDefinition } from './types'

export const DEPENDENT_RELATIONSHIP_OPTIONS: PicklistDefinition = [
  { id: 'parents', labelTh: 'บิดา / มารดา', labelEn: 'Parents' },
  { id: 'child', labelTh: 'บุตร', labelEn: 'Child' },
  { id: 'spouse', labelTh: 'คู่สมรส', labelEn: 'Spouse' },
] as const
