import { describe, expect, it } from 'vitest';
import {
  BUCKETS_BY_CATEGORY,
  BUCKETS_BY_TYPE,
  bucketsForPlan,
  bucketsForType,
  getClaimFields,
  getConditionalFields,
  resolveClaimDisplayValue,
  isClaimFieldVisible,
  isClaimFieldRequired,
  isDependentScopedName,
  CLAIM_FIELD_GROUPS,
  type ClaimSpecBucket,
} from '@/data/benefits/claim-field-config';
import { BENEFIT_PLAN_REGISTRY, type PlanCategory } from '@/data/benefits/plan-registry';
import type { BenefitClaimType } from '@/stores/benefit-claims';

// Buildable-now seeded plans: category → equivalent store benefitType (MF-1/MF-7).
const BUILDABLE: Array<{ planId: string; type: BenefitClaimType }> = [
  { planId: 'BE-MED-001', type: 'medical' },
  { planId: 'BE-GAS-001', type: 'gasoline' },
  { planId: 'BE-PHY-001', type: 'physical_checkup' },
  { planId: 'BE-PHY-002', type: 'physical_checkup' },
  { planId: 'BE-MOB-001', type: 'mobile' }, // STA-145
];

describe('claim-field-config — resolvers are total', () => {
  const ALL_CATEGORIES: PlanCategory[] = [
    'medical', 'dental', 'physical', 'gasoline', 'toll', 'parking',
    'life', 'gift', 'funeral', 'wreath', 'beneficiary', 'lifecycle', 'mobile',
  ];
  const ALL_TYPES: BenefitClaimType[] = ['medical', 'gasoline', 'mobile', 'physical_checkup', 'dependent'];

  it('every PlanCategory maps to a non-empty bucket list starting with general', () => {
    for (const c of ALL_CATEGORIES) {
      const buckets = BUCKETS_BY_CATEGORY[c];
      expect(buckets, c).toBeDefined();
      expect(buckets[0]).toBe('general');
    }
  });

  it('every BenefitClaimType maps to a non-empty bucket list starting with general', () => {
    for (const t of ALL_TYPES) {
      const buckets = BUCKETS_BY_TYPE[t];
      expect(buckets, t).toBeDefined();
      expect(buckets[0]).toBe('general');
    }
  });

  it('falls back to [general] for an unknown key', () => {
    expect(bucketsForPlan({ category: 'unknown' as PlanCategory })).toEqual(['general']);
    expect(bucketsForType('unknown' as BenefitClaimType)).toEqual(['general']);
  });
});

describe('claim-field-config — AC13 resolver parity', () => {
  it.each(BUILDABLE)('plan %s and its benefitType resolve to the same buckets', ({ planId, type }) => {
    const plan = BENEFIT_PLAN_REGISTRY.find((p) => p.id === planId)!;
    expect(plan).toBeDefined();
    const byCategory = [...bucketsForPlan(plan)].sort();
    const byType = [...bucketsForType(type)].sort();
    expect(byCategory).toEqual(byType);
  });
});

describe('claim-field-config — field set shape', () => {
  it('medical buckets yield general + medicalDental + medical groups in order', () => {
    const plan = BENEFIT_PLAN_REGISTRY.find((p) => p.id === 'BE-MED-001')!;
    const keys = getClaimFields(bucketsForPlan(plan)).map((f) => f.key);
    expect(keys).toContain('opdIpd');
    expect(keys).toContain('medicalDental');
    expect(keys).toContain('diseaseDetails');
    // general always rendered first
    expect(keys[0]).toBe('selectedBenefit');
  });

  it('gasoline conditional group exposes the 9-option Claim Type LOV', () => {
    const conditional = getConditionalFields(bucketsForType('gasoline'));
    const claimType = conditional.find((f) => f.key === 'gasolineClaimType');
    expect(claimType?.lov).toHaveLength(9);
    expect(claimType?.infoOnlyOptionIds).toHaveLength(3);
  });

  it('physical bucket exposes invoice + hospital name LOV', () => {
    const keys = getConditionalFields(bucketsForType('physical_checkup')).map((f) => f.key);
    expect(keys).toContain('physicalInvoice');
    expect(keys).toContain('hospitalName');
  });

  it('every descriptor key in every group is unique within the general group', () => {
    const general = CLAIM_FIELD_GROUPS.general.map((f) => f.key);
    expect(new Set(general).size).toBe(general.length);
  });

  it('handles a claim with no conditional values without crashing', () => {
    const conditional = getConditionalFields(bucketsForType('gasoline'));
    for (const f of conditional) {
      expect(resolveClaimDisplayValue(f, undefined, 'th')).toBeUndefined();
    }
  });
});

describe('claim-field-config — select value re-resolves by locale (AC10)', () => {
  it('renders the option id as the locale-correct label', () => {
    const claimType = getConditionalFields(bucketsForType('gasoline')).find((f) => f.key === 'gasolineClaimType')!;
    expect(resolveClaimDisplayValue(claimType, 'gasoline', 'th')).toBe('น้ำมัน');
    expect(resolveClaimDisplayValue(claimType, 'gasoline', 'en')).toBe('Gasoline');
  });

  it('passes through plain text values unchanged', () => {
    const invoice = getConditionalFields(bucketsForType('physical_checkup')).find((f) => f.key === 'physicalInvoice')!;
    expect(resolveClaimDisplayValue(invoice, 'INV-2026-001', 'en')).toBe('INV-2026-001');
  });
});

describe('STA-145 Phase B — medical conditional cascade', () => {
  const medical = getConditionalFields(bucketsForType('medical'));
  const field = (key: string) => medical.find((f) => f.key === key)!;

  it('medical group carries the full gold field set', () => {
    const keys = medical.map((f) => f.key);
    for (const k of [
      'opdIpd', 'admittedStart', 'admittedEnd', 'hospitalType',
      'medicalHospitalName', 'hospitalOthers', 'patientTransferDoc',
      'diseaseDetails', 'diseaseDetailsDetail',
    ]) {
      expect(keys, k).toContain(k);
    }
    // Q1 — keep the existing Medical/Dental select.
    expect(keys).toContain('medicalDental');
  });

  it('Admitted dates show + require only on IPD', () => {
    expect(isClaimFieldVisible(field('admittedStart'), { opdIpd: 'OPD' })).toBe(false);
    expect(isClaimFieldVisible(field('admittedStart'), { opdIpd: 'IPD' })).toBe(true);
    expect(isClaimFieldRequired(field('admittedEnd'), { opdIpd: 'OPD' })).toBe(false);
    expect(isClaimFieldRequired(field('admittedEnd'), { opdIpd: 'IPD' })).toBe(true);
  });

  it('Others text shows + requires only when Hospital Name = others', () => {
    expect(isClaimFieldVisible(field('hospitalOthers'), { medicalHospitalName: 'bnh' })).toBe(false);
    expect(isClaimFieldVisible(field('hospitalOthers'), { medicalHospitalName: 'others' })).toBe(true);
    expect(isClaimFieldRequired(field('hospitalOthers'), { medicalHospitalName: 'others' })).toBe(true);
    expect(field('hospitalOthers').maxLength).toBe(100);
  });

  it('Details shows + requires only for the 3 accident/other diseases', () => {
    expect(isClaimFieldVisible(field('diseaseDetailsDetail'), { diseaseDetails: 'cold_fever' })).toBe(false);
    for (const id of ['workplace_accident', 'general_emergency_accident', 'other_specify']) {
      expect(isClaimFieldVisible(field('diseaseDetailsDetail'), { diseaseDetails: id }), id).toBe(true);
      expect(isClaimFieldRequired(field('diseaseDetailsDetail'), { diseaseDetails: id }), id).toBe(true);
    }
    expect(field('diseaseDetailsDetail').maxLength).toBe(100);
  });

  it('patient transfer + hospital name + disease are now mandatory selects', () => {
    expect(field('patientTransferDoc').required).toBe(true);
    expect(field('medicalHospitalName').type).toBe('select');
    expect(field('medicalHospitalName').lov?.length).toBe(16);
    expect(field('diseaseDetails').type).toBe('select');
    expect(field('diseaseDetails').lov?.length).toBe(23);
  });
});

describe('STA-145 Phase B — dependent reachability (BA-Q2)', () => {
  it('detects dependent-scoped names in both naming conventions', () => {
    expect(isDependentScopedName('Wreath (Spouse)')).toBe(true);
    expect(isDependentScopedName('Wreath (Parents & Child) - 800 THB/person')).toBe(true);
    expect(isDependentScopedName('[Records] Funeral Assistance — Spouse')).toBe(true);
    expect(isDependentScopedName('[Records] Wreath — Dependent')).toBe(true);
    expect(isDependentScopedName('โรงพยาบาล (คู่สมรส)')).toBe(true);
    expect(isDependentScopedName('Mobile reimbursement')).toBe(false);
    // bare "— Child" must NOT false-positive (it's a child-birth gift, not a dependent claim)
    expect(isDependentScopedName('Gift — Child Birth')).toBe(false);
    expect(isDependentScopedName(undefined)).toBe(false);
  });

  it('bucketsForPlan appends dependent group for a dependent-scoped plan', () => {
    const buckets = bucketsForPlan({ category: 'wreath', nameEn: 'Wreath (Spouse)', nameTh: 'พวงหรีด (คู่สมรส)' });
    expect(buckets).toContain('dependent');
    expect(buckets[0]).toBe('general');
  });

  it('does not append dependent for a non-dependent plan', () => {
    const buckets = bucketsForPlan({ category: 'mobile', nameEn: 'Mobile reimbursement', nameTh: 'ค่าโทรศัพท์' });
    expect(buckets).not.toContain('dependent');
    expect(buckets).toEqual(['general', 'mobile']);
  });

  it('dependent group has Name(≤50) / DOB / Relationship LOV', () => {
    const dep = CLAIM_FIELD_GROUPS.dependent;
    const name = dep.find((f) => f.key === 'dependentName')!;
    const rel = dep.find((f) => f.key === 'dependentRelationship')!;
    expect(name.maxLength).toBe(50);
    expect(rel.type).toBe('select');
    expect(rel.lov?.length).toBe(3);
  });
});

describe('claim-field-config — every bucket has a defined group', () => {
  const buckets: ClaimSpecBucket[] = [
    'general', 'medicalDental', 'medical', 'gasoline', 'physical', 'dependent', 'mobile',
  ];
  it.each(buckets)('bucket %s has descriptors', (b) => {
    expect(CLAIM_FIELD_GROUPS[b].length).toBeGreaterThan(0);
  });
});
