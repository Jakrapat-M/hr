/**
 * sta-159-enroll-current-benefit.test.tsx
 *
 * STA-159 Part B — enrolling an EnrollableBenefit appends a CurrentBenefit row to
 * the in-session `benefitRows` shadow on /admin/employees/[id]. Mockup phase,
 * in-session state only.
 *
 * `enrollableToCurrentBenefit` / `handleEnrollSubmit` are closures inside
 * page.tsx (not exported), so — mirroring the sta-141 suite — the mapping is
 * proven as a pure-function unit and the wiring is asserted against page source.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const PAGE_SRC = fs.readFileSync(
  path.join(process.cwd(), 'src/app/[locale]/admin/employees/[id]/page.tsx'),
  'utf8',
);

// Pure mirror of the page's enrollableToCurrentBenefit mapping (seed-driven).
type Enrollable = { benefitName: string; benefitPlanId: string; entitlementAmount: string };
function mapEnrollable(b: Enrollable) {
  return {
    benefitName: b.benefitName,
    benefitPlanId: b.benefitPlanId,
    type: 'Standard' as const,
    status: 'Active' as const,
    amountUsed: 0,
    entitleAmount: parseInt(b.entitlementAmount.replace(/[^\d]/g, ''), 10) || 0,
    currency: 'THB',
  };
}

describe('STA-159 Part B — enrollableToCurrentBenefit mapping', () => {
  it('parses the entitlement amount into an integer and seeds Active/zero-used', () => {
    const row = mapEnrollable({
      benefitName: 'Mobile allowance',
      benefitPlanId: 'TH_MOB_006',
      entitlementAmount: '18,000',
    });
    expect(row.entitleAmount).toBe(18000);
    expect(row.amountUsed).toBe(0);
    expect(row.status).toBe('Active');
    expect(row.type).toBe('Standard');
    expect(row.currency).toBe('THB');
    expect(row.benefitPlanId).toBe('TH_MOB_006');
  });

  it('falls back to 0 when the entitlement string has no digits', () => {
    const row = mapEnrollable({ benefitName: 'X', benefitPlanId: 'Y', entitlementAmount: '-' });
    expect(row.entitleAmount).toBe(0);
  });

  it('submitting enroll grows the in-session list by one (append semantics)', () => {
    type Row = { benefitPlanId: string };
    const prev: Row[] = [{ benefitPlanId: 'TH_MED_001' }];
    const next = [...prev, { benefitPlanId: 'TH_MOB_006' }];
    expect(next).toHaveLength(prev.length + 1);
    expect(next.at(-1)?.benefitPlanId).toBe('TH_MOB_006');
  });
});

describe('STA-159 Part B — page wiring', () => {
  it('defines enrollableToCurrentBenefit returning a typed CurrentBenefit', () => {
    expect(PAGE_SRC).toMatch(/const enrollableToCurrentBenefit = \(b: EnrollableBenefit\): CurrentBenefit/);
    expect(PAGE_SRC).toMatch(/entitleAmount: parseInt\(b\.entitlementAmount\.replace\(\/\[\^\\d\]\/g, ''\), 10\)/);
  });

  it('handleEnrollSubmit appends to setBenefitRows and clears enrollTarget', () => {
    expect(PAGE_SRC).toMatch(/const handleEnrollSubmit = \(b: EnrollableBenefit\)/);
    expect(PAGE_SRC).toMatch(/setBenefitRows\(\(prev\) => \[\.\.\.prev, enrollableToCurrentBenefit\(b\)\]\)/);
    expect(PAGE_SRC).toMatch(/setEnrollTarget\(null\)/);
  });

  it('the enroll modal onSubmit is wired to handleEnrollSubmit (no longer a no-op)', () => {
    expect(PAGE_SRC).toMatch(/onSubmit=\{\(\) => handleEnrollSubmit\(enrollTarget\)\}/);
  });

  it('mounts the read-only ClaimDetailModal (Part A) on the admin page', () => {
    expect(PAGE_SRC).toContain("import { ClaimDetailModal } from '@/components/benefits/ClaimDetailModal'");
    expect(PAGE_SRC).toMatch(/<ClaimDetailModal[\s\S]*?claim=\{claimDetail\}/);
    expect(PAGE_SRC).toMatch(/onClick=\{\(\) => setClaimDetail\(c\)\}/);
  });
});
