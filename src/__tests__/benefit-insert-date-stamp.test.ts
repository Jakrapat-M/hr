import { describe, expect, it } from 'vitest';
import { applyIdentityToPlan } from '@/app/[locale]/admin/benefits/plans/plan-builders';
import {
  BENEFIT_PLAN_REGISTRY,
  type BenefitPlan,
} from '@/data/benefits/plan-registry';
import type { Tab1IdentityValues } from '@/components/benefits/Tab1IdentityFields';
import en from '../../messages/en.json';
import th from '../../messages/th.json';

// STA-123 — mirrors the page's handleSupersedePlan replacement builder (T0): the
// chosen effective date is stamped onto the new revision's
// eligibility.effectiveStartDate, guarded for v1 plans with no eligibility.
function buildSupersedeReplacement(
  edited: BenefitPlan,
  newId: string,
  seedDate?: string,
): BenefitPlan {
  return {
    ...edited,
    id: newId,
    status: 'active',
    ...(seedDate && 'eligibility' in edited && edited.eligibility
      ? { eligibility: { ...edited.eligibility, effectiveStartDate: seedDate } }
      : {}),
  };
}

const baseValues: Tab1IdentityValues = {
  ttt: 'BE_01',
  planKey: 'BE-X',
  nameTh: 'แผน',
  nameEn: 'Plan',
  category: 'medical',
  schemaVersion: 'v2',
  template: 'simple-claim',
  effectiveFrom: '',
  effectiveTo: '',
  country: 'TH',
  status: 'active',
  benefitTypeGroup: 'reimbursement-employee-hr',
  enrolment: 'auto',
  claimPeriod: 'year',
  entitlementCalcMethod: 'full',
  eligibleClaimDate: '30',
  company: '',
};

describe('STA-123 — Insert date stamp (T0)', () => {
  it('stamps the chosen effective date onto a v2 plan supersede replacement', () => {
    const v2 = BENEFIT_PLAN_REGISTRY.find((p) => p.schemaVersion === 'v2')!;
    const edited = applyIdentityToPlan(v2, { ...baseValues, planKey: v2.id });
    const replacement = buildSupersedeReplacement(edited, `${v2.id}-v2`, '2026-09-15');

    expect('eligibility' in replacement && replacement.eligibility.effectiveStartDate).toBe('2026-09-15');
    expect(replacement.status).toBe('active');
    expect(replacement.id).toBe(`${v2.id}-v2`);
  });

  it('skips the date stamp when no seed date is provided (in-place edit path unaffected)', () => {
    const v2 = BENEFIT_PLAN_REGISTRY.find((p) => p.schemaVersion === 'v2')!;
    const original = 'eligibility' in v2 ? v2.eligibility.effectiveStartDate : null;
    const edited = applyIdentityToPlan(v2, { ...baseValues, planKey: v2.id });
    const replacement = buildSupersedeReplacement(edited, `${v2.id}-v2`, undefined);

    expect('eligibility' in replacement && replacement.eligibility.effectiveStartDate).toBe(original);
  });
});

describe('STA-123 — title maps + i18n parity (T5/T6)', () => {
  it('plan title map produces insert / correction headers (dormant correction branch)', () => {
    const plansEn = en.admin_benefits_plans as Record<string, string>;
    expect(plansEn.insertPlan).toContain('Insert plan');
    expect(plansEn.correctionPlan).toContain('Make correction');
    expect(plansEn.editPlan).toContain('Edit plan');
  });

  it('rule title map produces Insert rule / Edit rule / Make correction headers', () => {
    const rulesEn = en.admin_benefits_entitlement_rules as Record<string, string>;
    expect(rulesEn.insertRule).toBe('Insert rule');
    expect(rulesEn.editRule).toBe('Edit rule');
    expect(rulesEn.makeCorrectionTitle).toBe('Make correction');
    expect(rulesEn.confirmInsert).toBe('Confirm insert');
  });

  it('new Insert keys have TH/EN parity in both benefit namespaces', () => {
    for (const ns of ['admin_benefits_plans', 'admin_benefits_entitlement_rules'] as const) {
      const enKeys = Object.keys((en as Record<string, Record<string, unknown>>)[ns]);
      const thKeys = Object.keys((th as Record<string, Record<string, unknown>>)[ns]);
      for (const k of ['insertPopupTitle', 'insertPopupDateLabel', 'proceed', 'confirmInsert']) {
        expect(enKeys).toContain(k);
        expect(thKeys).toContain(k);
      }
    }
  });
});
