// brand.ts — Brand picklist (STA-82 A1)
// BA: Organization Extras. The retail-brand the employee works under.
import type { PicklistDefinition } from './types'

export const BRAND_OPTIONS: PicklistDefinition = [
  { id: 'TOPS', labelTh: 'Tops', labelEn: 'Tops' },
  { id: 'CENTRAL_FOOD_HALL', labelTh: 'Central Food Hall', labelEn: 'Central Food Hall' },
  { id: 'FAMILYMART', labelTh: 'FamilyMart', labelEn: 'FamilyMart' },
  { id: 'ROBINSON', labelTh: 'Robinson Lifestyle', labelEn: 'Robinson Lifestyle' },
  { id: 'CENTRAL_DEPT', labelTh: 'Central Department Store', labelEn: 'Central Department Store' },
  { id: 'POWERBUY', labelTh: 'Power Buy', labelEn: 'Power Buy' },
  { id: 'OFFICEMATE', labelTh: 'OfficeMate', labelEn: 'OfficeMate' },
  { id: 'B2S', labelTh: 'B2S', labelEn: 'B2S' },
  { id: 'SUPERSPORTS', labelTh: 'SuperSports', labelEn: 'SuperSports' },
  { id: 'CRG', labelTh: 'Central Restaurants (CRG)', labelEn: 'Central Restaurants (CRG)' },
] as const
