// id-card-type.ts — National ID Card Type picklist
// Source: BA-EC-SUMMARY.md row 13 (National ID Card Type)
// Picklist ID: idType_ID_Card
import type { PicklistItem } from './index'

// Q6 decision: only NATIONAL_ID/NATIONAL_ID_2/PASSPORT have SF bindings (tni/tni2/PN)
// WORK_PERMIT/ALIEN_ID/OTHER dropped — no SF cardType counterpart for THA scope.
export const PICKLIST_ID_CARD_TYPE: readonly PicklistItem[] = [
  { id: 'NATIONAL_ID',   labelTh: 'บัตรประชาชน',   labelEn: 'National ID Card', sortOrder: 1, active: true },
  { id: 'PASSPORT',      labelTh: 'หนังสือเดินทาง', labelEn: 'Passport',         sortOrder: 2, active: true },
] as const

export type IdCardTypeId = 'NATIONAL_ID' | 'PASSPORT'
