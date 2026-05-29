// picklistRegistry.ts — STA-82 Stage A1 index
//
// Single import point for hire-wizard picklists. Re-exports each picklist const
// plus a `PICKLIST_REGISTRY` map keyed by Picklist ID (per BA-EC-SUMMARY rule:
// tree-shake by ID; UI consumers reference by code).
//
// Adding a new picklist:
//   1. Drop the file under src/lib/admin/hire/picklists/<id>.ts (TS-const array).
//   2. Re-export the constant here.
//   3. Add it to PICKLIST_REGISTRY with the canonical Picklist ID.
//   4. If registry > 25 entries, split into per-cluster sub-indexes.

import type { PicklistDefinition } from './types'

export type { PicklistOption, PicklistDefinition } from './types'
export { pickLabel } from './types'

// ── New picklists (STA-82 A1) ────────────────────────────────────────────────
export { OK_TO_REHIRE_OPTIONS } from './okToRehire'
export { OT_FLAG_OPTIONS } from './otFlag'
export { SCHOLARSHIP_OPTIONS } from './scholarship'
export { ADDRESS_TYPE_OPTIONS } from './addressType'
export { PERSONNEL_GRADE_OPTIONS } from './personnelGrade'
export { BAND_OPTIONS } from './band'
export { BAND_MATCHING_OPTIONS } from './bandMatching'
export { TRANSFER_TARGET_OPTIONS } from './transferTarget'
export { DVT_TYPE_OPTIONS } from './dvtType'
export { SPECIAL_BENEFIT_GROUP_OPTIONS } from './specialBenefitGroup'
export { SOCIAL_DOMAIN_OPTIONS } from './socialDomain'
export { OTHER_TITLE_TH_OPTIONS } from './otherTitleTh'
export { POS_OPTIONS } from './pos'
export { STORE_BRAND_FORMAT_OPTIONS } from './storeBrandFormat'
export { BRAND_OPTIONS } from './brand'

// Local re-imports for the keyed registry below.
import { OK_TO_REHIRE_OPTIONS } from './okToRehire'
import { OT_FLAG_OPTIONS } from './otFlag'
import { SCHOLARSHIP_OPTIONS } from './scholarship'
import { ADDRESS_TYPE_OPTIONS } from './addressType'
import { PERSONNEL_GRADE_OPTIONS } from './personnelGrade'
import { BAND_OPTIONS } from './band'
import { BAND_MATCHING_OPTIONS } from './bandMatching'
import { TRANSFER_TARGET_OPTIONS } from './transferTarget'
import { DVT_TYPE_OPTIONS } from './dvtType'
import { SPECIAL_BENEFIT_GROUP_OPTIONS } from './specialBenefitGroup'
import { SOCIAL_DOMAIN_OPTIONS } from './socialDomain'
import { OTHER_TITLE_TH_OPTIONS } from './otherTitleTh'
import { POS_OPTIONS } from './pos'
import { STORE_BRAND_FORMAT_OPTIONS } from './storeBrandFormat'
import { BRAND_OPTIONS } from './brand'

/**
 * PICKLIST_REGISTRY — canonical id → options map.
 *
 * Keys use the BA Picklist ID column verbatim where present; otherwise the
 * Humi-local code that matches the file name. Consumers should reference by
 * the constant (preferred for tree-shake) or by this map (when the id is
 * driven by data — e.g. a generic FormField that just gets a picklistId prop).
 */
export const PICKLIST_REGISTRY = {
  okToRehire: OK_TO_REHIRE_OPTIONS,
  otFlag: OT_FLAG_OPTIONS,
  scholarship: SCHOLARSHIP_OPTIONS,
  addressType: ADDRESS_TYPE_OPTIONS,
  personnelGrade: PERSONNEL_GRADE_OPTIONS,
  band: BAND_OPTIONS,
  bandMatching: BAND_MATCHING_OPTIONS,
  transferTarget: TRANSFER_TARGET_OPTIONS,
  dvtType: DVT_TYPE_OPTIONS,
  specialBenefitGroup: SPECIAL_BENEFIT_GROUP_OPTIONS,
  socialDomain: SOCIAL_DOMAIN_OPTIONS,
  otherTitleTh: OTHER_TITLE_TH_OPTIONS,
  pos: POS_OPTIONS,
  storeBrandFormat: STORE_BRAND_FORMAT_OPTIONS,
  brand: BRAND_OPTIONS,
} as const satisfies Record<string, PicklistDefinition>

export type PicklistId = keyof typeof PICKLIST_REGISTRY
