import { describe, expect, it } from 'vitest';
import {
  BUCKETS_BY_CATEGORY,
  BUCKETS_BY_TYPE,
  bucketsForPlan,
  bucketsForType,
  getClaimFields,
  getConditionalFields,
  resolveClaimDisplayValue,
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
];

describe('claim-field-config — resolvers are total', () => {
  const ALL_CATEGORIES: PlanCategory[] = [
    'medical', 'dental', 'physical', 'gasoline', 'toll', 'parking',
    'life', 'gift', 'funeral', 'wreath', 'beneficiary', 'lifecycle',
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
    const hospitalName = getConditionalFields(bucketsForType('medical')).find((f) => f.key === 'hospitalName')!;
    expect(resolveClaimDisplayValue(hospitalName, 'รพ.สมิติเวช', 'en')).toBe('รพ.สมิติเวช');
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
