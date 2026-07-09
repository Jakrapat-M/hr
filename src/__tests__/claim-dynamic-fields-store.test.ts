import { beforeEach, describe, expect, it } from 'vitest';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import type { ClaimDetails } from '@/lib/quick-approve-api';

describe('STA-119 — submitClaim threads dynamicFields into flat record + nested details', () => {
  beforeEach(() => {
    localStorage.clear();
    useBenefitClaimsStore.setState({ claims: [] });
  });

  it('copies dynamicFields onto the flat claim record', () => {
    const claim = useBenefitClaimsStore.getState().submitClaim({
      benefitType: 'gasoline',
      receiptNo: 'RCPT-G1',
      receiptDate: '2026-06-01',
      claimDate: '2026-06-01',
      receiptAmount: 800,
      totalClaimAmount: 800,
      remark: 'fuel run',
      dynamicFields: { gasolineClaimType: 'gasoline' },
    });
    expect(claim.dynamicFields).toEqual({ gasolineClaimType: 'gasoline' });
  });

  it('widens queueSnapshot.details with all general fields + dynamicFields (MF-4)', () => {
    const claim = useBenefitClaimsStore.getState().submitClaim({
      benefitType: 'medical',
      benefitName: 'ค่ารักษาพยาบาล',
      receiptNo: 'RCPT-M1',
      receiptDate: '2026-06-02',
      claimDate: '2026-06-02',
      receiptAmount: 1500,
      totalClaimAmount: 1500,
      remainingAmount: 18000,
      remark: 'OPD visit',
      dynamicFields: { opdIpd: 'OPD', hospitalType: 'private' },
    });
    const details = claim.queueSnapshot?.details as ClaimDetails;
    expect(details).toBeDefined();
    // No general field is left undefined when its input was provided.
    expect(details.currency).toBe('THB');
    expect(details.remark).toBe('OPD visit');
    expect(details.receiptAmount).toBe(1500);
    expect(details.totalClaimAmount).toBe(1500);
    expect(details.remainingAmount).toBe(18000);
    // dynamicFields land in details too (MF-5 — both paths).
    expect(details.dynamicFields).toEqual({ opdIpd: 'OPD', hospitalType: 'private' });
  });

  it('survives a claim with no dynamicFields', () => {
    const claim = useBenefitClaimsStore.getState().submitClaim({
      benefitType: 'medical',
      receiptNo: 'RCPT-N1',
      receiptDate: '2026-06-03',
      receiptAmount: 500,
    });
    expect(claim.dynamicFields).toBeUndefined();
    const details = claim.queueSnapshot?.details as ClaimDetails;
    expect(details.dynamicFields).toBeUndefined();
    expect(details.currency).toBe('THB');
  });
});
