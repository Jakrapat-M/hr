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
  USAGE_MONTH_OPTIONS,
  HOSPITAL_MASTER_OPTIONS,
  HOSPITAL_MASTER_OTHERS_ID,
  DISEASE_DETAILS_OPTIONS,
  DISEASE_DETAIL_REQUIRES_DETAIL_IDS,
  DEPENDENT_RELATIONSHIP_OPTIONS,
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

/** Live conditional values keyed by descriptor key (selects carry option ids). */
export type ClaimFieldValues = Partial<Record<string, string>>;

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
  /** STA-145 Phase B — render only when the predicate is true (e.g. Admitted
   *  dates show only on IPD; Others shows only when Hospital=others). */
  showIf?: (values: ClaimFieldValues) => boolean;
  /** STA-145 Phase B — conditional Mandatory (same predicates as showIf). When
   *  present it overrides the static `required` for both the marker + submit gate. */
  requiredIf?: (values: ClaimFieldValues) => boolean;
  /** STA-145 Phase B — input maxLength (Others / Details = 100, names = 50). */
  maxLength?: number;
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

// STA-145 Phase B — IPD predicate (Admitted dates show + required only on IPD).
const isIpd = (v: ClaimFieldValues) => v.opdIpd === 'IPD';
// Hospital Name = "others" reveals the conditional free-text field.
const isHospitalOthers = (v: ClaimFieldValues) => v.medicalHospitalName === HOSPITAL_MASTER_OTHERS_ID;
// Disease ∈ the 3 accident/other values reveals the mandatory "Details" field.
const diseaseRequiresDetail = (v: ClaimFieldValues) =>
  (DISEASE_DETAIL_REQUIRES_DETAIL_IDS as readonly string[]).includes(v.diseaseDetails ?? '');

const MEDICAL_GROUP: ClaimFieldDescriptor[] = [
  { key: 'opdIpd', labelKey: 'opdIpd', type: 'select', required: true, lov: OPD_IPD_OPTIONS },
  { key: 'admittedStart', labelKey: 'admittedStart', type: 'date', required: false, showIf: isIpd, requiredIf: isIpd },
  { key: 'admittedEnd', labelKey: 'admittedEnd', type: 'date', required: false, showIf: isIpd, requiredIf: isIpd },
  { key: 'hospitalType', labelKey: 'hospitalType', type: 'select', required: true, lov: HOSPITAL_NAME_TYPE_OPTIONS },
  { key: 'medicalHospitalName', labelKey: 'medicalHospitalName', type: 'select', required: true, lov: HOSPITAL_MASTER_OPTIONS },
  { key: 'hospitalOthers', labelKey: 'hospitalOthers', type: 'text', required: false, maxLength: 100, showIf: isHospitalOthers, requiredIf: isHospitalOthers },
  { key: 'patientTransferDoc', labelKey: 'patientTransferDoc', type: 'select', required: true, lov: YES_NO_TRANSFER_DOC_OPTIONS },
  { key: 'diseaseDetails', labelKey: 'diseaseDetails', type: 'select', required: true, lov: DISEASE_DETAILS_OPTIONS },
  { key: 'diseaseDetailsDetail', labelKey: 'diseaseDetailsDetail', type: 'text', required: false, maxLength: 100, showIf: diseaseRequiresDetail, requiredIf: diseaseRequiresDetail },
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
  { key: 'physicalInvoice', labelKey: 'physicalInvoice', type: 'text', required: true }, // STA-145
  { key: 'hospitalName', labelKey: 'hospitalName', type: 'select', required: true, lov: HOSPITAL_NAME_TYPE_OPTIONS },
];

// PROVISIONAL — pending BA OQ-1/OQ-3 (no category/type/entry path). Defined so the
// bucket is buildable when a path appears, but not asserted-testable this iteration.
// STA-145 Phase B — reachable for dependent-scoped plans (BA-Q2, 2026-06-25):
// any benefit whose name carries a "(Spouse)" / "(Parents & Child)" / "— Dependent"
// marker appends this group (see isDependentScopedName + bucketsForPlan).
const DEPENDENT_GROUP: ClaimFieldDescriptor[] = [
  { key: 'dependentName', labelKey: 'dependentName', type: 'text', required: true, maxLength: 50 },
  { key: 'dependentDob', labelKey: 'dependentDob', type: 'date', required: false },
  { key: 'dependentRelationship', labelKey: 'dependentRelationship', type: 'select', required: false, lov: DEPENDENT_RELATIONSHIP_OPTIONS },
];

// STA-145 — Usage month is a fixed Jan–Dec LOV (gold matrix), not a native
// <input type="month">. Stored value is the option id (e.g. 'jan'); the display
// resolver re-resolves it via the LOV for TH/EN approver parity.
const MOBILE_GROUP: ClaimFieldDescriptor[] = [
  { key: 'realMonthDate', labelKey: 'realMonthDate', type: 'select', required: true, lov: USAGE_MONTH_OPTIONS },
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
  mobile: ['general', 'mobile'], // STA-145
};

/** Store / approval side holds only benefitType → resolve by type. */
export const BUCKETS_BY_TYPE: Record<BenefitClaimType, ClaimSpecBucket[]> = {
  medical: ['general', 'medicalDental', 'medical'],
  gasoline: ['general', 'gasoline'],
  mobile: ['general', 'mobile'], // PROVISIONAL (OQ-6)
  physical_checkup: ['general', 'physical'],
  dependent: ['general', 'dependent'], // PROVISIONAL (OQ-1/OQ-3)
};

/**
 * STA-145 Phase B (BA-Q2) — a plan is "dependent-scoped" when its name carries a
 * Spouse / Parents & Child / Dependent marker (the gold uses "(Spouse)" /
 * "(Parents & Child)"; our registry uses "— Spouse" / "— Dependent"). Such a
 * claim appends the Dependent field group so the claimant identifies the
 * dependent. Matches either naming, EN or TH name.
 */
export function isDependentScopedName(name?: string | null): boolean {
  if (!name) return false;
  // Require an explicit Spouse / "Parents & Child" / Dependent marker, prefixed
  // by "(" or a dash ("—"/"-"). Deliberately NOT a bare "child"/"parents" so
  // names like "Gift — Child Birth" don't false-positive into a dependent claim.
  return /(?:\(|—\s*|-\s*)\s*(?:spouse|parents?\s*(?:&|and)\s*child|dependent|คู่สมรส|ผู้อยู่ในอุปการะ)\s*\)?/i.test(
    name,
  );
}

export function bucketsForPlan(
  plan: Pick<BenefitPlan, 'category'> &
    Partial<Pick<BenefitPlan, 'nameEn' | 'nameTh' | 'requiresDependent'>>,
): ClaimSpecBucket[] {
  const base = BUCKETS_BY_CATEGORY[plan.category] ?? ['general'];
  // Prefer the explicit `requiresDependent` flag; fall back to the name marker for
  // gold plans that carry the suffix but not the flag.
  const dependentScoped =
    plan.requiresDependent === true ||
    isDependentScopedName(plan.nameEn) ||
    isDependentScopedName(plan.nameTh);
  if (dependentScoped && !base.includes('dependent')) {
    return [...base, 'dependent'];
  }
  return base;
}

export function bucketsForType(t: BenefitClaimType): ClaimSpecBucket[] {
  return BUCKETS_BY_TYPE[t] ?? ['general'];
}

/**
 * Approval-side resolver (STA-145 Phase B). Store/approval surfaces hold only a
 * benefitType + the benefit name, not a plan. Mirror the editable side's
 * dependent-append so a dependent-scoped claim shows its Dependent rows to the
 * approver instead of silently dropping them.
 */
export function bucketsForTypeAndName(
  t: BenefitClaimType,
  name?: string | null,
): ClaimSpecBucket[] {
  const base = bucketsForType(t);
  if (isDependentScopedName(name) && !base.includes('dependent')) {
    return [...base, 'dependent'];
  }
  return base;
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

// ── Conditional visibility / required (STA-145 Phase B) ───────────────────────
// Shared by ConditionalClaimFields (render + marker) and every form's submit gate
// so visibility/required logic never diverges between surfaces.

/** A field renders when it has no showIf, or its showIf predicate is true. */
export function isClaimFieldVisible(
  f: ClaimFieldDescriptor,
  values: ClaimFieldValues,
): boolean {
  return f.showIf ? f.showIf(values) : true;
}

/** A field is mandatory when visible AND (requiredIf ?? static required). */
export function isClaimFieldRequired(
  f: ClaimFieldDescriptor,
  values: ClaimFieldValues,
): boolean {
  if (!isClaimFieldVisible(f, values)) return false;
  return f.requiredIf ? f.requiredIf(values) : f.required;
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
