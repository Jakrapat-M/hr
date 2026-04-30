import { beforeEach, describe, expect, it } from 'vitest';
import {
  estimateTaxPlanning,
  formatTHB,
  selectTaxPlanningRequestSummaries,
  serializeTaxPlanningDraftsForStorage,
  useBenefitTaxPlanningStore,
} from '@/stores/benefit-tax-planning';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';

describe('benefit tax planning store', () => {
  beforeEach(() => {
    useBenefitTaxPlanningStore.getState().clear();
    useBenefitClaimsStore.getState().clear();
  });

  it('calculates deterministic Thai tax planning estimates with capped allowances', () => {
    const estimate = estimateTaxPlanning({
      taxYear: 2026,
      ytdIncome: 720_000,
      expectedAdditionalIncome: 180_000,
      ytdWithholding: 45_000,
      personalAllowance: 60_000,
      insurancePremium: 250_000,
      retirementFund: 30_000,
      donations: 5_000,
    });

    expect(estimate.grossAnnualIncome).toBe(900_000);
    expect(estimate.totalDeductions).toBe(304_000);
    expect(estimate.taxableIncome).toBe(596_000);
    expect(estimate.estimatedTax).toBeGreaterThan(0);
    expect(estimate.formatted.estimatedTax).toBe(formatTHB(estimate.estimatedTax));
  });

  it('rejects negative income or deduction inputs', () => {
    expect(() => estimateTaxPlanning({
      taxYear: 2026,
      ytdIncome: -1,
      ytdWithholding: 0,
    })).toThrow('Negative tax planning input is not allowed: ytdIncome');
  });

  it('saves safe tax planning drafts without reimbursement claims or raw tax ID persistence', () => {
    const draft = useBenefitTaxPlanningStore.getState().saveDraft({
      employeeId: 'EMP001',
      employeeName: 'จงรักษ์ ทานากะ',
      taxId: '3101700000000',
      taxYear: 2026,
      ytdIncome: 720_000,
      expectedAdditionalIncome: 180_000,
      ytdWithholding: 45_000,
      personalAllowance: 60_000,
    });

    expect(draft.status).toBe('draft');
    expect(draft.maskedTaxId).toMatch(/X/);
    expect(JSON.stringify(draft)).not.toContain('3101700000000');
    expect(serializeTaxPlanningDraftsForStorage([draft])).not.toContain('3101700000000');
    expect(selectTaxPlanningRequestSummaries([draft])).toEqual([]);
    expect(useBenefitClaimsStore.getState().claims).toHaveLength(0);
    expect(useBenefitTaxPlanningStore.getState()).not.toHaveProperty('submitForReview');
  });
});
