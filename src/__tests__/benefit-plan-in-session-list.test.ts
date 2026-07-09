import { describe, expect, it } from 'vitest';
import {
  applyIdentityToPlan,
  buildPlanFromCreate,
} from '@/app/[locale]/admin/benefits/plans/plan-builders';
import {
  BENEFIT_PLAN_REGISTRY,
  type BenefitPlan,
} from '@/data/benefits/plan-registry';
import type { Tab1IdentityValues } from '@/components/benefits/Tab1IdentityFields';

// Mirrors the page's in-session reducers (handleCreatePlan / handleUpdatePlan).
const addPlan = (list: BenefitPlan[], created: BenefitPlan): BenefitPlan[] => [created, ...list];
const updatePlan = (list: BenefitPlan[], updated: BenefitPlan): BenefitPlan[] =>
  list.map((p) => (p.id === updated.id ? updated : p));

const createValues: Tab1IdentityValues = {
  ttt: 'BE_99',
  planKey: 'BE-NEW-999',
  nameTh: 'แผนทดสอบ',
  nameEn: 'Test Plan',
  category: 'medical',
  schemaVersion: 'v2',
  template: 'simple-claim',
  effectiveFrom: '2026-01-01',
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

describe('benefit plan in-session list (PR-4)', () => {
  it('buildPlanFromCreate + add → list length increases by 1 and contains the new plan', () => {
    const list = [...BENEFIT_PLAN_REGISTRY];
    const created = buildPlanFromCreate(createValues);
    const next = addPlan(list, created);

    expect(next).toHaveLength(list.length + 1);
    expect(next.find((p) => p.id === 'BE-NEW-999')).toBeDefined();
    expect(next[0].id).toBe('BE-NEW-999'); // prepended
    expect(created.nameEn).toBe('Test Plan');
    expect(created.recordType).toBe('claimable'); // derived from benefitTypeGroup
  });

  it('buildPlanFromCreate derives record type from benefit type group', () => {
    const recordPlan = buildPlanFromCreate({ ...createValues, benefitTypeGroup: 'record' });
    expect(recordPlan.recordType).toBe('records');
    expect(recordPlan.requiresReceipt).toBe(false);
  });

  it('applyIdentityToPlan + update → same length, edited field reflected, id stable', () => {
    const list = [...BENEFIT_PLAN_REGISTRY];
    const target = list[0];
    const edited = applyIdentityToPlan(target, {
      ...createValues,
      planKey: target.id,
      nameEn: 'Renamed Plan',
      nameTh: 'เปลี่ยนชื่อแผน',
    });
    const next = updatePlan(list, edited);

    expect(next).toHaveLength(list.length); // no row added/removed
    const found = next.find((p) => p.id === target.id);
    expect(found?.nameEn).toBe('Renamed Plan');
    expect(found?.nameTh).toBe('เปลี่ยนชื่อแผน');
    expect(found?.id).toBe(target.id); // id unchanged
  });

  it('applyIdentityToPlan preserves non-identity fields (e.g. coverage sub-object)', () => {
    const v2 = BENEFIT_PLAN_REGISTRY.find((p) => p.schemaVersion === 'v2')!;
    const edited = applyIdentityToPlan(v2, { ...createValues, planKey: v2.id, nameEn: 'X' });
    // Spread preserves everything not on the identity tab.
    expect(edited.schemaVersion).toBe('v2');
    expect((edited as typeof v2).coverage).toEqual((v2 as typeof v2).coverage);
  });
});
