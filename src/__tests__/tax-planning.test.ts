import { beforeEach, describe, expect, it } from 'vitest';
import { calculateThaiPitEstimate, formatTHB, maskTaxId } from '@/lib/tax-planning';
import { EMPTY_TAX_ALLOWANCES, selectTaxPlanningRequestSummaries, selectTaxPlanningSafeSummary, useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';

describe('tax planning estimator and store', () => {
  beforeEach(() => {
    useBenefitTaxPlanningStore.getState().clear();
  });

  it('calculates a deterministic Thai PIT estimate with capped allowances', () => {
    const estimate = calculateThaiPitEstimate({
      ytdIncome: 900000,
      ytdWithholding: 50000,
      expectedAdditionalIncome: 100000,
      allowances: { ...EMPTY_TAX_ALLOWANCES, lifeInsurance: 120000, donations: 50000 },
    });

    expect(estimate.grossAnnualIncome).toBe(1000000);
    expect(estimate.totalDeductions).toBe(319000);
    expect(estimate.taxableIncome).toBe(681000);
    expect(estimate.estimatedTax).toBeGreaterThan(0);
    expect(formatTHB(estimate.estimatedTax)).toContain('฿');
  });

  it('rejects negative inputs and masks tax IDs', () => {
    expect(() => calculateThaiPitEstimate({ ytdIncome: -1, ytdWithholding: 0, expectedAdditionalIncome: 0, allowances: EMPTY_TAX_ALLOWANCES })).toThrow(/zero or positive/);
    expect(maskTaxId('1100100001001')).toBe('X-XXXX-XXXXX-01-X');
  });

  it('saves and estimates drafts without raw tax id or request workflow rows', () => {
    const draft = useBenefitTaxPlanningStore.getState().saveDraft({
      expectedAdditionalIncome: 120000,
      allowances: { children: 60000, providentFund: 40000 },
    });
    const estimated = useBenefitTaxPlanningStore.getState().estimateDraft(draft.id);
    const state = useBenefitTaxPlanningStore.getState();
    const safe = selectTaxPlanningSafeSummary(state);

    expect(estimated.status).toBe('estimated');
    expect(safe.maskedTaxId).toBe('X-XXXX-XXXXX-01-X');
    expect(JSON.stringify(state)).not.toContain('1100100001001');
    expect(selectTaxPlanningRequestSummaries(state.drafts)).toEqual([]);
  });
});
