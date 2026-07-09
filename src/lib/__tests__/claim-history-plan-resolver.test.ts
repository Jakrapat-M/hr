// STA-234 — planIdForClaimRow: full type/claimType matrix + registry existence.

import { describe, it, expect } from 'vitest';
import { planIdForClaimRow } from '../claim-history-plan-resolver';
import { BENEFIT_PLAN_REGISTRY } from '@/data/benefits/plan-registry';
import {
  bucketsForPlan,
  getConditionalFields,
  isClaimFieldRequired,
} from '@/data/benefits/claim-field-config';
import { CNEXT_CLAIM_HISTORY } from '../cnext-mock-data';

const registryIds = new Set(BENEFIT_PLAN_REGISTRY.map((p) => p.id));

describe('planIdForClaimRow', () => {
  it('maps medical → BE-MED-001', () => {
    expect(planIdForClaimRow('ค่ารักษาพยาบาล')).toBe('BE-MED-001');
  });

  it('maps dental → BE-DEN-001', () => {
    expect(planIdForClaimRow('ค่าทันตกรรม')).toBe('BE-DEN-001');
  });

  it('maps mobile → BE-MOB-001', () => {
    expect(planIdForClaimRow('ค่าโทรศัพท์')).toBe('BE-MOB-001');
  });

  it('maps fuel (no claimType / gasoline) → BE-GAS-001', () => {
    expect(planIdForClaimRow('ค่าน้ำมันรถ')).toBe('BE-GAS-001');
    expect(planIdForClaimRow('ค่าน้ำมันรถ', 'gasoline')).toBe('BE-GAS-001');
  });

  it('maps fuel toll → BE-TOL-001', () => {
    expect(planIdForClaimRow('ค่าน้ำมันรถ', 'toll')).toBe('BE-TOL-001');
  });

  it('maps fuel parking → BE-PAR-001', () => {
    expect(planIdForClaimRow('ค่าน้ำมันรถ', 'parking')).toBe('BE-PAR-001');
  });

  it('falls back to BE-MED-001 for unknown type', () => {
    expect(planIdForClaimRow('ค่าอบรม')).toBe('BE-MED-001');
    expect(planIdForClaimRow('')).toBe('BE-MED-001');
    // Unknown claimType on an unknown type still falls back.
    expect(planIdForClaimRow('something', 'toll')).toBe('BE-MED-001');
  });

  it('every returned id exists in BENEFIT_PLAN_REGISTRY', () => {
    const cases: Array<[string, string | undefined]> = [
      ['ค่ารักษาพยาบาล', undefined],
      ['ค่าทันตกรรม', undefined],
      ['ค่าโทรศัพท์', undefined],
      ['ค่าน้ำมันรถ', undefined],
      ['ค่าน้ำมันรถ', 'gasoline'],
      ['ค่าน้ำมันรถ', 'toll'],
      ['ค่าน้ำมันรถ', 'parking'],
      ['unknown', undefined],
    ];
    for (const [type, claimType] of cases) {
      expect(registryIds.has(planIdForClaimRow(type, claimType))).toBe(true);
    }
  });

  // STA-234 follow-up — Edit must Save with zero manual entry: every claim-
  // history row's seeded `dynamicFields` must already answer every conditional
  // field that is REQUIRED BY DEFAULT (empty values) for its resolved plan.
  it('every CNEXT_CLAIM_HISTORY row seeds all required-by-default conditional fields', () => {
    for (const row of CNEXT_CLAIM_HISTORY) {
      const planId = planIdForClaimRow(row.type, row.claimType);
      const plan = BENEFIT_PLAN_REGISTRY.find((p) => p.id === planId);
      expect(plan).toBeDefined();
      if (!plan) continue;

      const conditionalFields = getConditionalFields(bucketsForPlan(plan));
      const requiredByDefault = conditionalFields.filter((f) => isClaimFieldRequired(f, {}));

      for (const field of requiredByDefault) {
        const seeded = row.dynamicFields?.[field.key as keyof typeof row.dynamicFields];
        expect(
          seeded,
          `row ${row.id} (plan ${planId}) is missing required conditional field "${field.key}"`,
        ).toBeTruthy();
        // Select fields must carry an option id that actually exists in the lov.
        if (field.type === 'select' && field.lov) {
          const validIds = field.lov.map((o) => o.id);
          expect(
            validIds,
            `row ${row.id} field "${field.key}" value "${seeded}" is not a valid lov option`,
          ).toContain(seeded);
        }
      }
    }
  });
});
