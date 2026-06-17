// claim-field-config.ts — STA-119 single source of truth for benefit-claim fields.
//
// One registry defines WHICH fields a claim carries (ordered groups by spec
// bucket). Two resolvers map the two app vocabularies onto bucket lists:
//   - BUCKETS_BY_CATEGORY: editable surfaces hold a BenefitPlan → key off plan.category.
//   - BUCKETS_BY_TYPE:     store/approval surfaces hold benefitType → key off it.
// Both are total (every key maps; documented ['general'] fallback) and proven
// equivalent for every seeded claimable benefit by a parity test.
//
// Value plumbing stays two-pathed by design (flat record vs nested details);
// this module unifies only field membership/order, never how values travel.

import type { PicklistDefinition } from '@/lib/admin/hire/picklists/types';
import {
  MEDICAL_DENTAL_OPTIONS,
  OPD_IPD_OPTIONS,
  HOSPITAL_NAME_TYPE_OPTIONS,
  YES_NO_TRANSFER_DOC_OPTIONS,
  GASOLINE_CLAIM_TYPE_OPTIONS,
} from '@/lib/admin/hire/picklists/picklistRegistry';
import type { PlanCategory, BenefitPlan } from './plan-registry';
import type { BenefitClaimType } from '@/stores/benefit-claims';

// ── Field descriptor model ────────────────────────────────────────────────────

export type ClaimFieldType =
  | 'text'
  | 'date'
  | 'month'
  | 'number'
  | 'select'
  | 'textarea'
  | 'file';

export type ClaimSpecBucket =
  | 'general'
  | 'medicalDental'
  | 'medical'
  | 'gasoline'
  | 'physical'
  | 'dependent'
  | 'mobile';

export interface ClaimFieldDescriptor {
  /** Stable key + dynamicFields map key (e.g. 'opdIpd'). */
  key: string;
  /** i18n key under benefits.claim.* */
  labelKey: string;
  type: ClaimFieldType;
  required: boolean;
  /** For type==='select' — reuse PicklistOption {id,labelTh,labelEn}. */
  lov?: PicklistDefinition;
  /** General field that auto-fills from another (mirror-on-input, STA-120). */
  defaultFrom?: 'receiptAmount' | 'employeePlan';
  /** Read-only display (Selected Benefit, Remaining Amount, Claim Date). */
  readOnlyField?: boolean;
  /** Gasoline "(Info only)" Fleet-Card rows — display-only selection (OQ-7). */
  infoOnlyOptionIds?: string[];
}

// ── General group (every claim) ───────────────────────────────────────────────
// Order matches AC1. Read-only general fields (Selected Benefit, Claim Date,
// Remaining Amount) are rendered by the form from props, but are listed here so
// the approval surfaces know the canonical order. The editable-only descriptors
// the form renders directly (attachment) live in the form, not the dynamic map.

const GENERAL_GROUP: ClaimFieldDescriptor[] = [
  { key: 'selectedBenefit', labelKey: 'selectedBenefit', type: 'text', required: false, readOnlyField: true },
  { key: 'claimDate', labelKey: 'claimDate', type: 'date', required: true, readOnlyField: true },
  { key: 'remainingAmount', labelKey: 'remainingAmount', type: 'number', required: false, readOnlyField: true },
  { key: 'currency', labelKey: 'currency', type: 'text', required: false, readOnlyField: true },
  { key: 'receiptNo', labelKey: 'receiptNo', type: 'text', required: true },
  { key: 'receiptDate', labelKey: 'receiptDate', type: 'date', required: false },
  { key: 'receiptAmount', labelKey: 'receiptAmount', type: 'number', required: true },
  { key: 'totalClaimAmount', labelKey: 'totalClaimAmount', type: 'number', required: false, defaultFrom: 'receiptAmount' },
  { key: 'remark', labelKey: 'remark', type: 'textarea', required: false },
];

// ── Conditional groups (spec buckets) ─────────────────────────────────────────

const MEDICAL_DENTAL_GROUP: ClaimFieldDescriptor[] = [
  { key: 'medicalDental', labelKey: 'medicalDental', type: 'select', required: true, lov: MEDICAL_DENTAL_OPTIONS },
];

const MEDICAL_GROUP: ClaimFieldDescriptor[] = [
  { key: 'opdIpd', labelKey: 'opdIpd', type: 'select', required: true, lov: OPD_IPD_OPTIONS },
  { key: 'hospitalType', labelKey: 'hospitalType', type: 'select', required: true, lov: HOSPITAL_NAME_TYPE_OPTIONS },
  { key: 'hospitalName', labelKey: 'hospitalName', type: 'text', required: true },
  { key: 'patientTransferDoc', labelKey: 'patientTransferDoc', type: 'select', required: false, lov: YES_NO_TRANSFER_DOC_OPTIONS },
  { key: 'diseaseDetails', labelKey: 'diseaseDetails', type: 'textarea', required: false },
];

const GASOLINE_GROUP: ClaimFieldDescriptor[] = [
  {
    key: 'gasolineClaimType',
    labelKey: 'gasolineClaimType',
    type: 'select',
    required: true,
    lov: GASOLINE_CLAIM_TYPE_OPTIONS,
    infoOnlyOptionIds: ['fleet_card_shell', 'fleet_card_bangchak', 'fleet_card_cpn'],
  },
];

const PHYSICAL_GROUP: ClaimFieldDescriptor[] = [
  { key: 'physicalInvoice', labelKey: 'physicalInvoice', type: 'text', required: false },
  { key: 'hospitalName', labelKey: 'hospitalName', type: 'select', required: true, lov: HOSPITAL_NAME_TYPE_OPTIONS },
];

// PROVISIONAL — pending BA OQ-1/OQ-3 (no category/type/entry path). Defined so the
// bucket is buildable when a path appears, but not asserted-testable this iteration.
const DEPENDENT_GROUP: ClaimFieldDescriptor[] = [
  { key: 'dependentName', labelKey: 'dependentName', type: 'text', required: true },
  { key: 'dependentDob', labelKey: 'dependentDob', type: 'date', required: false },
  { key: 'dependentRelationship', labelKey: 'dependentRelationship', type: 'text', required: false },
];

// PROVISIONAL — pending BA OQ-6 (synthetic plan + Excel cutoff).
const MOBILE_GROUP: ClaimFieldDescriptor[] = [
  { key: 'realMonthDate', labelKey: 'realMonthDate', type: 'month', required: true },
];

// ── Ordered groups by bucket ──────────────────────────────────────────────────

export const CLAIM_FIELD_GROUPS: Record<ClaimSpecBucket, ClaimFieldDescriptor[]> = {
  general: GENERAL_GROUP,
  medicalDental: MEDICAL_DENTAL_GROUP,
  medical: MEDICAL_GROUP,
  gasoline: GASOLINE_GROUP,
  physical: PHYSICAL_GROUP,
  dependent: DEPENDENT_GROUP,
  mobile: MOBILE_GROUP,
};

// MF-6 — typed key union; any read/write site with a typo'd key fails the build.
export type ClaimFieldKey =
  (typeof CLAIM_FIELD_GROUPS)[ClaimSpecBucket][number]['key'];

// ── TWO resolvers (MF-1) ──────────────────────────────────────────────────────

/** Editable surfaces hold a BenefitPlan → resolve by its registry category. */
export const BUCKETS_BY_CATEGORY: Record<PlanCategory, ClaimSpecBucket[]> = {
  medical: ['general', 'medicalDental', 'medical'],
  dental: ['general', 'medicalDental'], // PROVISIONAL (OQ-2)
  physical: ['general', 'physical'],
  gasoline: ['general', 'gasoline'],
  toll: ['general', 'gasoline'],
  parking: ['general', 'gasoline'],
  // Non-receipt categories fall back to the general group only.
  life: ['general'],
  gift: ['general'],
  funeral: ['general'],
  wreath: ['general'],
  beneficiary: ['general'],
  lifecycle: ['general'],
};

/** Store / approval side holds only benefitType → resolve by type. */
export const BUCKETS_BY_TYPE: Record<BenefitClaimType, ClaimSpecBucket[]> = {
  medical: ['general', 'medicalDental', 'medical'],
  gasoline: ['general', 'gasoline'],
  mobile: ['general', 'mobile'], // PROVISIONAL (OQ-6)
  physical_checkup: ['general', 'physical'],
  dependent: ['general', 'dependent'], // PROVISIONAL (OQ-1/OQ-3)
};

export function bucketsForPlan(plan: Pick<BenefitPlan, 'category'>): ClaimSpecBucket[] {
  return BUCKETS_BY_CATEGORY[plan.category] ?? ['general'];
}

export function bucketsForType(t: BenefitClaimType): ClaimSpecBucket[] {
  return BUCKETS_BY_TYPE[t] ?? ['general'];
}

// ── Config → field set ────────────────────────────────────────────────────────

/** Flatten the given buckets' groups in spec order into one descriptor list. */
export function getClaimFields(buckets: ClaimSpecBucket[]): ClaimFieldDescriptor[] {
  return buckets.flatMap((bucket) => CLAIM_FIELD_GROUPS[bucket] ?? []);
}

/** Only the conditional (non-general) descriptors for the given buckets. */
export function getConditionalFields(buckets: ClaimSpecBucket[]): ClaimFieldDescriptor[] {
  return buckets
    .filter((bucket) => bucket !== 'general')
    .flatMap((bucket) => CLAIM_FIELD_GROUPS[bucket] ?? []);
}

/**
 * Resolve a stored conditional value to its locale-correct display string.
 * Select values are stored as option ids and re-resolved via the descriptor LOV
 * so a TH-submitted claim renders correctly for an EN approver (and vice versa).
 * Returns undefined when no value was submitted (caller omits the row).
 */
export function resolveClaimDisplayValue(
  descriptor: ClaimFieldDescriptor,
  rawValue: string | number | undefined,
  locale: 'th' | 'en',
): string | undefined {
  if (rawValue === undefined || rawValue === null || `${rawValue}`.trim() === '') {
    return undefined;
  }
  const value = `${rawValue}`;
  if (descriptor.type === 'select' && descriptor.lov) {
    const opt = descriptor.lov.find((o) => o.id === value);
    return opt ? (locale === 'en' ? opt.labelEn : opt.labelTh) : value;
  }
  return value;
}
