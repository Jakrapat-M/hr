// In-session plan builders for the Benefit Plan catalog (no backend this phase).
// Saving the configurator mutates the in-session plan list rather than POSTing
// to the workflow gateway (out of scope). These builders translate the
// Identity-tab values into a registry-shaped BenefitPlan.

import {
  deriveRecordTypeFromBenefitTypeGroup,
  type BenefitPlan,
} from '@/data/benefits/plan-registry';
import type { Tab1IdentityValues } from '@/components/benefits/Tab1IdentityFields';

/** Apply Identity-tab edits onto an existing plan, preserving every other field. */
export function applyIdentityToPlan(
  plan: BenefitPlan,
  values: Tab1IdentityValues,
): BenefitPlan {
  const recordType = deriveRecordTypeFromBenefitTypeGroup(values.benefitTypeGroup);
  return {
    ...plan,
    ttt: values.ttt,
    nameTh: values.nameTh,
    nameEn: values.nameEn,
    category: values.category,
    template: values.template,
    recordType,
    benefitTypeGroup: values.benefitTypeGroup,
    country: values.country,
    status: values.status,
    enrolment: values.enrolment,
    claimPeriod: values.claimPeriod,
    entitlementCalcMethod: values.entitlementCalcMethod,
    eligibleClaimDate: values.eligibleClaimDate,
    company: values.company,
  } as BenefitPlan;
}

/**
 * Build a fresh v2 plan from the create form. Sub-objects start empty/default —
 * the placeholder tabs (Coverage/Eligibility/…) are configured in later PRs.
 */
export function buildPlanFromCreate(values: Tab1IdentityValues): BenefitPlan {
  const recordType = deriveRecordTypeFromBenefitTypeGroup(values.benefitTypeGroup);
  return {
    schemaVersion: 'v2',
    id: values.planKey.trim(),
    ttt: values.ttt,
    nameTh: values.nameTh.trim(),
    nameEn: values.nameEn.trim(),
    template: values.template,
    category: values.category,
    recordType,
    approvalChain: [],
    annualLimitThb: null,
    requiresDependent: false,
    requiresHospital: false,
    requiresReceipt: recordType === 'claimable',
    requiredDocsTh: [],
    requiredDocsEn: [],
    eligibilityTh: '',
    eligibilityEn: '',
    coverage: {
      entitlementAmount: null,
      currency: 'THB',
      claimsLimitPerFrequencyPeriod: null,
      frequency: null,
      exceedEntitlementAmount: false,
      balanceCarryForward: { enabled: false, maxYears: null, capAmount: null },
    },
    eligibility: {
      eligibilityRuleId: null,
      enrollmentRequired: false,
      dependentSpecificRule: false,
      noOfDependentsToConsider: null,
      effectiveStartDate: values.effectiveFrom || null,
      effectiveEndDate: values.effectiveTo || null,
    },
    claimRules: {
      employeeClaimWorkflowId: null,
      exceptionWorkflowId: null,
      taxationMode: null,
      payrollIntegration: { mode: null, deductionStartDate: null, retroCalculationMode: null },
    },
    coverageType: { coverage: null, benefitType: null, benefitProgram: null },
    notifications: {
      emailNotificationForEnrollment: false,
      showRemaningNoOfDaysForClaim: false,
      showRemaningNoOfDaysForEnrollment: false,
    },
    country: values.country,
    status: values.status,
    benefitTypeGroup: values.benefitTypeGroup,
    enrolment: values.enrolment,
    claimPeriod: values.claimPeriod,
    entitlementCalcMethod: values.entitlementCalcMethod,
    eligibleClaimDate: values.eligibleClaimDate,
    company: values.company,
  };
}
