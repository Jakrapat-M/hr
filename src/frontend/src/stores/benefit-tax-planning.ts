import { create } from 'zustand';
import {
  THAI_TAX_YEAR_ASSUMPTIONS,
  calculateThaiPitEstimate,
  maskTaxId,
  formatTHB,
  type TaxAllowanceInput,
  type TaxEstimateInput,
  type TaxEstimateResult,
} from '@/lib/tax-planning';
import type { HumiApprovalStep, RequestStatus } from '@/lib/humi-mock-data';

export { formatTHB };

export type TaxPlanningStatus = 'draft' | 'estimated';

export interface SafeTaxProfileSummary {
  employeeId: string;
  employeeName: string;
  maskedTaxId: string;
  taxYear: number;
  ytdIncome: number;
  ytdWithholding: number;
  socialSecurityYtd: number;
}

export interface TaxPlanningDraft {
  id: string;
  employeeId: string;
  employeeName: string;
  maskedTaxId: string;
  taxYear: number;
  status: TaxPlanningStatus;
  expectedAdditionalIncome: number;
  allowances: TaxAllowanceInput;
  estimate?: TaxEstimateResult;
  updatedAt: string;
}

export interface TaxPlanningDraftInput {
  expectedAdditionalIncome?: number;
  allowances?: Partial<TaxAllowanceInput>;
}

export interface LegacyTaxPlanningEstimateInput {
  taxYear?: number;
  ytdIncome?: number;
  expectedAdditionalIncome?: number;
  ytdWithholding?: number;
  personalAllowance?: number;
  insurancePremium?: number;
  retirementFund?: number;
  donations?: number;
}

interface BenefitTaxPlanningState {
  profile: SafeTaxProfileSummary;
  drafts: TaxPlanningDraft[];
  saveDraft: (input: TaxPlanningDraftInput) => TaxPlanningDraft;
  estimateDraft: (id: string) => TaxPlanningDraft;
  clear: () => void;
}

export const EMPTY_TAX_ALLOWANCES: TaxAllowanceInput = {
  spouse: 0,
  children: 0,
  parents: 0,
  disability: 0,
  lifeInsurance: 0,
  providentFund: 0,
  retirementFund: 0,
  socialSecurity: 9000,
  donations: 0,
  other: 0,
};

const nowIso = () => new Date().toISOString();
const nextDraftId = (count: number) => `TAX-PLAN-${String(count + 1).padStart(4, '0')}`;

const profile: SafeTaxProfileSummary = {
  employeeId: 'EMP001',
  employeeName: 'จงรักษ์ ทานากะ',
  maskedTaxId: maskTaxId('1100100001001'),
  taxYear: THAI_TAX_YEAR_ASSUMPTIONS.taxYear,
  ytdIncome: 840000,
  ytdWithholding: 56000,
  socialSecurityYtd: 9000,
};

export function selectTaxPlanningSafeSummary(state: Pick<BenefitTaxPlanningState, 'profile' | 'drafts'>) {
  const latestDraft = state.drafts[0];
  return {
    ...state.profile,
    latestDraftStatus: latestDraft?.status,
    latestEstimate: latestDraft?.estimate,
    savedDrafts: state.drafts.length,
  };
}

export function selectTaxPlanningRequestSummaries(_drafts: TaxPlanningDraft[]) {
  return [] as Array<{
    id: string;
    type: string;
    sub: string;
    submitted: string;
    status: RequestStatus;
    approvalChain: HumiApprovalStep[];
  }>;
}

function assertLegacyInput(input: LegacyTaxPlanningEstimateInput) {
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`Negative tax planning input is not allowed: ${key}`);
    }
  }
}

export function estimateTaxPlanning(input: LegacyTaxPlanningEstimateInput) {
  assertLegacyInput(input);
  const estimateInput: TaxEstimateInput = {
    ytdIncome: input.ytdIncome ?? 0,
    ytdWithholding: input.ytdWithholding ?? 0,
    expectedAdditionalIncome: input.expectedAdditionalIncome ?? 0,
    allowances: {
      ...EMPTY_TAX_ALLOWANCES,
      lifeInsurance: input.insurancePremium ?? 0,
      retirementFund: input.retirementFund ?? 0,
      donations: input.donations ?? 0,
    },
  };
  const estimate = calculateThaiPitEstimate(estimateInput);
  return {
    ...estimate,
    taxYear: input.taxYear ?? THAI_TAX_YEAR_ASSUMPTIONS.taxYear,
    formatted: {
      grossAnnualIncome: formatTHB(estimate.grossAnnualIncome),
      totalDeductions: formatTHB(estimate.totalDeductions),
      taxableIncome: formatTHB(estimate.taxableIncome),
      estimatedTax: formatTHB(estimate.estimatedTax),
      remainingDue: formatTHB(estimate.remainingDue),
      refund: formatTHB(estimate.refund),
    },
  };
}

export function serializeTaxPlanningDraftsForStorage(drafts: TaxPlanningDraft[]) {
  return JSON.stringify(drafts);
}

export const useBenefitTaxPlanningStore = create<BenefitTaxPlanningState>()((set, get) => ({
  profile,
  drafts: [],
  saveDraft: (input) => {
    const at = nowIso();
    const existing = get().drafts[0];
    const draft: TaxPlanningDraft = {
      id: existing?.id ?? nextDraftId(get().drafts.length),
      employeeId: profile.employeeId,
      employeeName: profile.employeeName,
      maskedTaxId: profile.maskedTaxId,
      taxYear: profile.taxYear,
      status: existing?.status ?? 'draft',
      expectedAdditionalIncome: input.expectedAdditionalIncome ?? existing?.expectedAdditionalIncome ?? 0,
      allowances: { ...EMPTY_TAX_ALLOWANCES, ...existing?.allowances, ...input.allowances },
      estimate: existing?.estimate,
      updatedAt: at,
    };
    set((state) => ({ drafts: [draft, ...state.drafts.filter((item) => item.id !== draft.id)] }));
    return draft;
  },
  estimateDraft: (id) => {
    const draft = get().drafts.find((item) => item.id === id);
    if (!draft) throw new Error(`Tax planning draft not found: ${id}`);
    const at = nowIso();
    const estimate = calculateThaiPitEstimate({
      ytdIncome: profile.ytdIncome,
      ytdWithholding: profile.ytdWithholding,
      expectedAdditionalIncome: draft.expectedAdditionalIncome,
      allowances: draft.allowances,
    });
    const updated = { ...draft, status: 'estimated' as const, estimate, updatedAt: at };
    set((state) => ({ drafts: [updated, ...state.drafts.filter((item) => item.id !== id)] }));
    return updated;
  },
  clear: () => set({ drafts: [] }),
}));
