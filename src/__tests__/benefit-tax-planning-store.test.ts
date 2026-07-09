import { beforeEach, describe, expect, it } from 'vitest';
import {
  TAX_PLANNING_TRANSITIONS,
  estimateTaxPlanning,
  formatTHB,
  selectPayrollTaxPlanningInboxRows,
  selectTaxPlanningRequestSummaries,
  serializeTaxPlanningDraftsForStorage,
  submitTaxPlanningForPayrollReview,
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

  it('moves estimated plans through Payroll review without exposing raw tax details', () => {
    const store = useBenefitTaxPlanningStore.getState();
    const draft = store.saveDraft({ expectedAdditionalIncome: 180_000 });

    expect(() => submitTaxPlanningForPayrollReview(draft)).toThrow(/Invalid tax planning transition/);

    const estimated = useBenefitTaxPlanningStore.getState().estimateDraft(draft.id);
    expect(TAX_PLANNING_TRANSITIONS.estimated).toContain('submitted_payroll');

    const submitted = useBenefitTaxPlanningStore.getState().submitTaxPlanningForPayrollReview(estimated.id);
    expect(submitted.status).toBe('submitted_payroll');

    const requestRows = selectTaxPlanningRequestSummaries(useBenefitTaxPlanningStore.getState().drafts);
    expect(requestRows).toHaveLength(1);
    expect(requestRows[0]).toMatchObject({
      id: submitted.workflowRequestId,
      status: 'pending',
      href: '/th/payroll/tax-planning',
    });
    expect(JSON.stringify(requestRows)).not.toContain('1100100001001');
    expect(JSON.stringify(requestRows)).not.toContain('allowances');

    const inboxRows = selectPayrollTaxPlanningInboxRows(useBenefitTaxPlanningStore.getState().drafts);
    expect(inboxRows).toHaveLength(1);
    expect(inboxRows[0].id).toBe(submitted.id);
    expect(inboxRows[0].workflowId).toBe(submitted.workflowRequestId);
    expect(inboxRows[0].maskedTaxId).toBe('X-XXXX-XXXXX-01-X');
    expect(JSON.stringify(inboxRows)).not.toContain('1100100001001');
  });

  it('supports send-back, fresh estimate, resubmit, and lineage-aware cancellation projection', () => {
    const store = useBenefitTaxPlanningStore.getState();
    const first = store.estimateDraft(store.saveDraft({ expectedAdditionalIncome: 50_000 }).id);
    store.submitTaxPlanningForPayrollReview(first.id);
    store.startPayrollTaxPlanningReview(first.id, { role: 'payroll', name: 'Payroll reviewer' });

    const sentBack = store.sendBackPayrollTaxPlanningReview(first.id, { role: 'payroll', name: 'Payroll reviewer' }, 'เพิ่มข้อมูลกองทุน');
    expect(sentBack.status).toBe('send_back');
    expect(() => store.resubmitTaxPlanningForPayrollReview(first.id)).toThrow(/fresh estimate/);

    store.saveDraft({ expectedAdditionalIncome: 60_000 });
    const reestimated = store.estimateDraft(first.id);
    expect(reestimated.status).toBe('estimated');

    const resubmitted = store.resubmitTaxPlanningForPayrollReview(first.id);
    expect(resubmitted.status).toBe('submitted_payroll');
    store.cancelTaxPlanningReview(first.id);
    expect(selectTaxPlanningRequestSummaries(useBenefitTaxPlanningStore.getState().drafts)[0].status).toBe('rejected');

    useBenefitTaxPlanningStore.getState().clear();
    const preSubmit = store.estimateDraft(store.saveDraft({ expectedAdditionalIncome: 10_000 }).id);
    store.cancelTaxPlanningReview(preSubmit.id);
    expect(selectTaxPlanningRequestSummaries(useBenefitTaxPlanningStore.getState().drafts)).toEqual([]);
  });
});
