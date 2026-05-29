// transferTarget.ts — Transfer Target picklist (STA-82 A1)
// BA: Job > Transfer-Band. Targets for Transfer In / Transfer Out (BU / Company / Branch).
import type { PicklistDefinition } from './types'

export const TRANSFER_TARGET_OPTIONS: PicklistDefinition = [
  { id: 'CG_CENTRAL', labelTh: 'CG — Central Group', labelEn: 'CG — Central Group' },
  { id: 'CG_RETAIL', labelTh: 'CG Retail (CR)', labelEn: 'CG Retail (CR)' },
  { id: 'CG_PATTANA', labelTh: 'Central Pattana (CPN)', labelEn: 'Central Pattana (CPN)' },
  { id: 'CG_RESTAURANTS', labelTh: 'Central Restaurants (CRG)', labelEn: 'Central Restaurants (CRG)' },
  { id: 'CG_FAMILYMART', labelTh: 'Central FamilyMart', labelEn: 'Central FamilyMart' },
  { id: 'CG_TOPS', labelTh: 'Tops', labelEn: 'Tops' },
  { id: 'CG_ROBINSON', labelTh: 'Robinson', labelEn: 'Robinson' },
  { id: 'CG_POWERBUY', labelTh: 'Power Buy', labelEn: 'Power Buy' },
  { id: 'CG_OFFICEMATE', labelTh: 'OfficeMate', labelEn: 'OfficeMate' },
  { id: 'EXTERNAL', labelTh: 'ภายนอกกลุ่ม', labelEn: 'External (outside CG)' },
] as const
