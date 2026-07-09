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
export { PARTNER_UNIVERSITY_OPTIONS } from './partnerUniversity'
export { DEGREE_LEVEL_OPTIONS } from './degreeLevel'

// ── Benefit claim picklists (STA-119) ─────────────────────────────────────────
export { MEDICAL_DENTAL_OPTIONS } from './medicalDental'
export { OPD_IPD_OPTIONS } from './opdIpd'
export { HOSPITAL_NAME_TYPE_OPTIONS } from './hospitalNameType'
export { YES_NO_TRANSFER_DOC_OPTIONS } from './yesNoTransferDoc'
export { GASOLINE_CLAIM_TYPE_OPTIONS } from './gasolineClaimType'

// ── Mobile reimbursement picklists (STA-145) ──────────────────────────────────
export { USAGE_MONTH_OPTIONS } from './usageMonth'

// ── Medical / dependent claim picklists (STA-145 Phase B) ─────────────────────
export { HOSPITAL_MASTER_OPTIONS, HOSPITAL_MASTER_OTHERS_ID } from './hospitalMaster'
export { DISEASE_DETAILS_OPTIONS, DISEASE_DETAIL_REQUIRES_DETAIL_IDS } from './diseaseDetails'
export { DEPENDENT_RELATIONSHIP_OPTIONS } from './dependentRelationship'

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
import { PARTNER_UNIVERSITY_OPTIONS } from './partnerUniversity'
import { DEGREE_LEVEL_OPTIONS } from './degreeLevel'
import { MEDICAL_DENTAL_OPTIONS } from './medicalDental'
import { OPD_IPD_OPTIONS } from './opdIpd'
import { HOSPITAL_NAME_TYPE_OPTIONS } from './hospitalNameType'
import { YES_NO_TRANSFER_DOC_OPTIONS } from './yesNoTransferDoc'
import { GASOLINE_CLAIM_TYPE_OPTIONS } from './gasolineClaimType'
import { USAGE_MONTH_OPTIONS } from './usageMonth'
import { HOSPITAL_MASTER_OPTIONS } from './hospitalMaster'
import { DISEASE_DETAILS_OPTIONS } from './diseaseDetails'
import { DEPENDENT_RELATIONSHIP_OPTIONS } from './dependentRelationship'

/**
 * PICKLIST_REGISTRY — canonical id → options map.
 *
 * Keys use the BA Picklist ID column verbatim where present; otherwise the
 * Cnext-local code that matches the file name. Consumers should reference by
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
  DVT_PARTNER_UNIVERSITY: PARTNER_UNIVERSITY_OPTIONS,
  DVT_DEGREE_LEVEL: DEGREE_LEVEL_OPTIONS,
  // STA-119 benefit claim picklists
  medicalDental: MEDICAL_DENTAL_OPTIONS,
  opdIpd: OPD_IPD_OPTIONS,
  hospitalNameType: HOSPITAL_NAME_TYPE_OPTIONS,
  yesNoTransferDoc: YES_NO_TRANSFER_DOC_OPTIONS,
  gasolineClaimType: GASOLINE_CLAIM_TYPE_OPTIONS,
  // STA-145 mobile reimbursement picklist
  usageMonth: USAGE_MONTH_OPTIONS,
  // STA-145 Phase B medical / dependent picklists
  hospitalMaster: HOSPITAL_MASTER_OPTIONS,
  diseaseDetails: DISEASE_DETAILS_OPTIONS,
  dependentRelationship: DEPENDENT_RELATIONSHIP_OPTIONS,
} as const satisfies Record<string, PicklistDefinition>

export type PicklistId = keyof typeof PICKLIST_REGISTRY
