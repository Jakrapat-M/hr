// pos.ts — Point of Sales (POS) picklist (STA-82 A1)
// BA: Organization Extras. Drives store-level reporting + brand routing.
import type { PicklistDefinition } from './types'

export const POS_OPTIONS: PicklistDefinition = [
  { id: 'POS_TOPS', labelTh: 'Tops', labelEn: 'Tops' },
  { id: 'POS_TOPS_DAILY', labelTh: 'Tops Daily', labelEn: 'Tops Daily' },
  { id: 'POS_TOPS_CLUB', labelTh: 'Tops CLUB', labelEn: 'Tops CLUB' },
  { id: 'POS_TOPS_FOOD', labelTh: 'Tops Food Hall', labelEn: 'Tops Food Hall' },
  { id: 'POS_FAMILYMART', labelTh: 'FamilyMart', labelEn: 'FamilyMart' },
  { id: 'POS_CENTRAL_FOOD', labelTh: 'Central Food Hall', labelEn: 'Central Food Hall' },
  { id: 'POS_ROBINSON', labelTh: 'Robinson Lifestyle', labelEn: 'Robinson Lifestyle' },
  { id: 'POS_WAREHOUSE', labelTh: 'Warehouse / DC', labelEn: 'Warehouse / DC' },
  { id: 'POS_HQ', labelTh: 'สำนักงานใหญ่', labelEn: 'Head Office' },
] as const
