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

export type TaxPlanningStatus =
  | 'draft'
  | 'estimated'
  | 'submitted_payroll'
  | 'payroll_reviewing'
  | 'send_back'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export const TAX_PLANNING_TRANSITIONS = {
  draft: ['estimated'],
  estimated: ['submitted_payroll', 'cancelled'],
  submitted_payroll: ['payroll_reviewing', 'send_back', 'approved', 'rejected', 'cancelled'],
  payroll_reviewing: ['send_back', 'approved', 'rejected', 'cancelled'],
  send_back: ['estimated', 'cancelled'],
  approved: [],
  rejected: [],
  cancelled: [],
} satisfies Record<TaxPlanningStatus, TaxPlanningStatus[]>;

export interface SafeTaxProfileSummary {
  employeeId: string;
  employeeName: string;
  maskedTaxId: string;
  taxYear: number;
  ytdIncome: number;
  ytdWithholding: number;
  socialSecurityYtd: number;
}

export interface TaxPlanningAuditEntry {
  at: string;
  actorRole: 'employee' | 'payroll';
  actorName: string;
  action: 'create' | 'save' | 'estimate' | 'submit' | 'start_review' | 'send_back' | 'resubmit' | 'approve' | 'reject' | 'cancel';
  note?: string;
}

export interface TaxPlanningDraft {
  id: string;
  workflowRequestId: string;
  employeeId: string;
  employeeName: string;
  maskedTaxId: string;
  taxYear: number;
  status: TaxPlanningStatus;
  expectedAdditionalIncome: number;
  allowances: TaxAllowanceInput;
  estimate?: TaxEstimateResult;
  submittedAt?: string;
  reviewedAt?: string;
  correctionReason?: string;
  rejectionReason?: string;
  updatedAt: string;
  audit: TaxPlanningAuditEntry[];
}

export interface TaxPlanningDraftInput {
  employeeId?: string;
  employeeName?: string;
  taxId?: string;
  taxYear?: number;
  ytdIncome?: number;
  ytdWithholding?: number;
  personalAllowance?: number;
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

interface Actor {
  role: 'employee' | 'payroll';
  name: string;
}

interface BenefitTaxPlanningState {
  profile: SafeTaxProfileSummary;
  drafts: TaxPlanningDraft[];
  saveDraft: (input: TaxPlanningDraftInput) => TaxPlanningDraft;
  estimateDraft: (id: string) => TaxPlanningDraft;
  submitTaxPlanningForPayrollReview: (id: string, actor?: Actor) => TaxPlanningDraft;
  startPayrollTaxPlanningReview: (id: string, actor?: Actor) => TaxPlanningDraft;
  sendBackPayrollTaxPlanningReview: (id: string, actor: Actor, reason: string) => TaxPlanningDraft;
  approvePayrollTaxPlanningReview: (id: string, actor: Actor, note?: string) => TaxPlanningDraft;
  rejectPayrollTaxPlanningReview: (id: string, actor: Actor, reason: string) => TaxPlanningDraft;
  cancelTaxPlanningReview: (id: string, actor?: Actor, reason?: string) => TaxPlanningDraft;
  resubmitTaxPlanningForPayrollReview: (id: string, actor?: Actor) => TaxPlanningDraft;
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

export const TAX_PLANNING_STATUS_LABEL: Record<TaxPlanningStatus, string> = {
  draft: 'ร่างแผนภาษี',
  estimated: 'คำนวณประมาณการแล้ว',
  submitted_payroll: 'ส่งให้ Payroll ตรวจแผน',
  payroll_reviewing: 'Payroll กำลังตรวจ',
  send_back: 'Payroll ส่งกลับให้แก้ไข',
  approved: 'Payroll รับทราบแผน',
  rejected: 'Payroll ไม่รับแผน',
  cancelled: 'ยกเลิกแผนภาษี',
};

const nowIso = () => new Date().toISOString();
const nextDraftId = (count: number) => `TAX-PLAN-${String(count + 1).padStart(4, '0')}`;
const nextWorkflowId = (count: number) => `REQ-TAX-${String(count + 1).padStart(4, '0')}`;
const employeeActor: Actor = { role: 'employee', name: 'จงรักษ์ ทานากะ' };
const payrollActor: Actor = { role: 'payroll', name: 'ทีม Payroll' };

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
    latestWorkflowRequestId: latestDraft?.workflowRequestId,
    latestCorrectionReason: latestDraft?.correctionReason,
    latestRejectionReason: latestDraft?.rejectionReason,
  };
}

function thaiDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusToRequestStatus(status: TaxPlanningStatus): RequestStatus | null {
  if (status === 'submitted_payroll' || status === 'payroll_reviewing') return 'pending';
  if (status === 'send_back') return 'info';
  if (status === 'approved') return 'approved';
  if (status === 'rejected' || status === 'cancelled') return 'rejected';
  return null;
}

function stepStatus(status: TaxPlanningStatus): HumiApprovalStep['status'] {
  if (status === 'approved') return 'approved';
  if (status === 'rejected' || status === 'cancelled') return 'rejected';
  return 'pending';
}

function hasPayrollReviewLineage(draft: TaxPlanningDraft) {
  return draft.audit.some((entry) => ['submit', 'start_review', 'send_back', 'resubmit'].includes(entry.action));
}

function safeEstimateSummary(estimate?: TaxEstimateResult) {
  if (!estimate) return 'ยังไม่มีประมาณการภาษี';
  const balanceLabel = estimate.remainingDue > 0
    ? `ต้องชำระเพิ่ม ${formatTHB(estimate.remainingDue)}`
    : `คาดว่าจะคืน ${formatTHB(estimate.refund)}`;
  return `ภาษีประมาณการ ${formatTHB(estimate.estimatedTax)} · ${balanceLabel}`;
}

export function selectTaxPlanningRequestSummaries(drafts: TaxPlanningDraft[]) {
  return drafts
    .filter((draft) => {
      if (draft.status === 'cancelled') return hasPayrollReviewLineage(draft);
      return statusToRequestStatus(draft.status) !== null;
    })
    .map((draft) => ({
      id: draft.workflowRequestId,
      type: 'วางแผนภาษี · Payroll review',
      sub: `ปีภาษี ${draft.taxYear} · ${draft.maskedTaxId} · ${safeEstimateSummary(draft.estimate)}`,
      submitted: thaiDate(draft.submittedAt ?? draft.updatedAt),
      status: statusToRequestStatus(draft.status) ?? 'pending',
      href: '/th/profile/me?tab=tax&mode=planning',
      approvalChain: [
        {
          role: 'Payroll Tax Review',
          name: 'ทีม Payroll',
          initials: 'PR',
          tone: 'butter' as const,
          status: stepStatus(draft.status),
          when: TAX_PLANNING_STATUS_LABEL[draft.status],
          note: draft.correctionReason ?? draft.rejectionReason,
        },
      ] satisfies HumiApprovalStep[],
    }));
}

export function selectPayrollTaxPlanningInboxRows(drafts: TaxPlanningDraft[]) {
  return drafts
    .filter((draft) => draft.status !== 'draft' && draft.status !== 'estimated' && (draft.status !== 'cancelled' || hasPayrollReviewLineage(draft)))
    .map((draft) => ({
      workflowId: draft.workflowRequestId,
      employeeId: draft.employeeId,
      employeeName: draft.employeeName,
      maskedTaxId: draft.maskedTaxId,
      taxYear: draft.taxYear,
      status: draft.status,
      statusLabel: TAX_PLANNING_STATUS_LABEL[draft.status],
      submittedAt: draft.submittedAt,
      reviewedAt: draft.reviewedAt,
      updatedAt: draft.updatedAt,
      correctionReason: draft.correctionReason,
      rejectionReason: draft.rejectionReason,
      estimateSummary: draft.estimate ? {
        grossAnnualIncome: draft.estimate.grossAnnualIncome,
        totalDeductions: draft.estimate.totalDeductions,
        taxableIncome: draft.estimate.taxableIncome,
        estimatedTax: draft.estimate.estimatedTax,
        remainingDue: draft.estimate.remainingDue,
        refund: draft.estimate.refund,
      } : undefined,
      auditSteps: draft.audit.map((entry) => ({
        at: entry.at,
        actorRole: entry.actorRole,
        actorName: entry.actorName,
        action: entry.action,
        note: entry.action === 'send_back' || entry.action === 'reject' || entry.action === 'cancel' ? entry.note : undefined,
      })),
    }));
}

function assertLegacyInput(input: LegacyTaxPlanningEstimateInput) {
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`Negative tax planning input is not allowed: ${key}`);
    }
  }
}

function assertDraftInput(input: TaxPlanningDraftInput) {
  const numericEntries = [
    ['expectedAdditionalIncome', input.expectedAdditionalIncome],
    ...Object.entries(input.allowances ?? {}),
  ];
  for (const [key, value] of numericEntries) {
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
  return JSON.stringify(drafts.map((draft) => ({
    id: draft.id,
    workflowRequestId: draft.workflowRequestId,
    employeeId: draft.employeeId,
    employeeName: draft.employeeName,
    maskedTaxId: draft.maskedTaxId,
    taxYear: draft.taxYear,
    status: draft.status,
    expectedAdditionalIncome: draft.expectedAdditionalIncome,
    allowances: draft.allowances,
    estimate: draft.estimate,
    submittedAt: draft.submittedAt,
    reviewedAt: draft.reviewedAt,
    correctionReason: draft.correctionReason,
    rejectionReason: draft.rejectionReason,
    updatedAt: draft.updatedAt,
    audit: draft.audit.map((entry) => ({
      at: entry.at,
      actorRole: entry.actorRole,
      actorName: entry.actorName,
      action: entry.action,
      note: entry.action === 'send_back' || entry.action === 'reject' || entry.action === 'cancel' ? entry.note : undefined,
    })),
  })));
}

function ensureTransition(status: TaxPlanningStatus, nextStatus: TaxPlanningStatus) {
  if (!(TAX_PLANNING_TRANSITIONS[status] as readonly TaxPlanningStatus[]).includes(nextStatus)) {
    throw new Error(`Invalid tax planning transition: ${status} -> ${nextStatus}`);
  }
}

function requireReason(reason: string, action: string) {
  if (!reason.trim()) throw new Error(`${action} requires a reason`);
  return reason.trim();
}

function withAudit(draft: TaxPlanningDraft, actor: Actor, action: TaxPlanningAuditEntry['action'], note?: string, at = nowIso()) {
  return {
    ...draft,
    updatedAt: at,
    audit: [...draft.audit, { at, actorRole: actor.role, actorName: actor.name, action, note }],
  } satisfies TaxPlanningDraft;
}

export function submitTaxPlanningForPayrollReview(draft: TaxPlanningDraft, actor: Actor = employeeActor) {
  ensureTransition(draft.status, 'submitted_payroll');
  if (!draft.estimate) throw new Error('Tax planning estimate is required before Payroll review submission');
  const at = nowIso();
  return withAudit({
    ...draft,
    status: 'submitted_payroll',
    submittedAt: draft.submittedAt ?? at,
    correctionReason: undefined,
    rejectionReason: undefined,
  }, actor, 'submit', 'ส่งประมาณการให้ Payroll ตรวจเพื่อการวางแผนเท่านั้น', at);
}

export function startPayrollTaxPlanningReview(draft: TaxPlanningDraft, actor: Actor = payrollActor) {
  ensureTransition(draft.status, 'payroll_reviewing');
  const at = nowIso();
  return withAudit({ ...draft, status: 'payroll_reviewing', reviewedAt: at }, actor, 'start_review', 'เริ่มตรวจแผนภาษี', at);
}

export function sendBackPayrollTaxPlanningReview(draft: TaxPlanningDraft, actor: Actor, reason: string) {
  ensureTransition(draft.status, 'send_back');
  const cleanReason = requireReason(reason, 'Payroll send-back');
  const at = nowIso();
  return withAudit({ ...draft, status: 'send_back', correctionReason: cleanReason, reviewedAt: at }, actor, 'send_back', cleanReason, at);
}

export function approvePayrollTaxPlanningReview(draft: TaxPlanningDraft, actor: Actor, note?: string) {
  ensureTransition(draft.status, 'approved');
  const at = nowIso();
  return withAudit({ ...draft, status: 'approved', reviewedAt: at, correctionReason: undefined }, actor, 'approve', note, at);
}

export function rejectPayrollTaxPlanningReview(draft: TaxPlanningDraft, actor: Actor, reason: string) {
  ensureTransition(draft.status, 'rejected');
  const cleanReason = requireReason(reason, 'Payroll rejection');
  const at = nowIso();
  return withAudit({ ...draft, status: 'rejected', reviewedAt: at, rejectionReason: cleanReason, correctionReason: undefined }, actor, 'reject', cleanReason, at);
}

export function cancelTaxPlanningReview(draft: TaxPlanningDraft, actor: Actor = employeeActor, reason?: string) {
  ensureTransition(draft.status, 'cancelled');
  return withAudit({ ...draft, status: 'cancelled' }, actor, 'cancel', reason?.trim() || undefined);
}

export function resubmitTaxPlanningForPayrollReview(draft: TaxPlanningDraft, actor: Actor = employeeActor) {
  if (draft.status !== 'estimated' || !draft.audit.some((entry) => entry.action === 'send_back')) {
    throw new Error('Tax planning resubmission requires a Payroll send-back and a fresh estimate');
  }
  const at = nowIso();
  return withAudit({
    ...draft,
    status: 'submitted_payroll',
    submittedAt: draft.submittedAt ?? at,
    correctionReason: undefined,
    rejectionReason: undefined,
  }, actor, 'resubmit', 'แก้ไขและส่งแผนภาษีให้ Payroll ตรวจอีกครั้ง', at);
}

function updateDraft(drafts: TaxPlanningDraft[], id: string, update: (draft: TaxPlanningDraft) => TaxPlanningDraft) {
  let updated: TaxPlanningDraft | undefined;
  const nextDrafts = drafts.map((draft) => {
    if (draft.id !== id) return draft;
    updated = update(draft);
    return updated;
  });
  if (!updated) throw new Error(`Tax planning draft not found: ${id}`);
  return { drafts: [updated, ...nextDrafts.filter((draft) => draft.id !== id)], updated };
}

export const useBenefitTaxPlanningStore = create<BenefitTaxPlanningState>()((set, get) => ({
  profile,
  drafts: [],
  saveDraft: (input) => {
    assertDraftInput(input);
    const at = nowIso();
    const latest = get().drafts[0];
    const existing = latest && !['submitted_payroll', 'payroll_reviewing', 'approved', 'rejected', 'cancelled'].includes(latest.status)
      ? latest
      : undefined;
    const isNew = !existing;
    const draft: TaxPlanningDraft = {
      id: existing?.id ?? nextDraftId(get().drafts.length),
      workflowRequestId: existing?.workflowRequestId ?? nextWorkflowId(get().drafts.length),
      employeeId: input.employeeId ?? existing?.employeeId ?? profile.employeeId,
      employeeName: input.employeeName ?? existing?.employeeName ?? profile.employeeName,
      maskedTaxId: input.taxId ? maskTaxId(input.taxId) : existing?.maskedTaxId ?? profile.maskedTaxId,
      taxYear: input.taxYear ?? existing?.taxYear ?? profile.taxYear,
      status: existing?.status ?? 'draft',
      expectedAdditionalIncome: input.expectedAdditionalIncome ?? existing?.expectedAdditionalIncome ?? 0,
      allowances: { ...EMPTY_TAX_ALLOWANCES, ...existing?.allowances, ...input.allowances },
      estimate: existing?.estimate,
      submittedAt: existing?.submittedAt,
      reviewedAt: existing?.reviewedAt,
      correctionReason: existing?.correctionReason,
      rejectionReason: existing?.rejectionReason,
      updatedAt: at,
      audit: [...(existing?.audit ?? []), { at, actorRole: 'employee', actorName: input.employeeName ?? existing?.employeeName ?? profile.employeeName, action: isNew ? 'create' : 'save', note: isNew ? 'สร้างร่างแผนภาษี' : 'บันทึกข้อมูลแผนภาษี' }],
    };
    set((state) => ({ drafts: [draft, ...state.drafts.filter((item) => item.id !== draft.id)] }));
    return draft;
  },
  estimateDraft: (id) => {
    const result = updateDraft(get().drafts, id, (draft) => {
      if (draft.status !== 'estimated') ensureTransition(draft.status, 'estimated');
      const at = nowIso();
      const estimate = calculateThaiPitEstimate({
        ytdIncome: profile.ytdIncome,
        ytdWithholding: profile.ytdWithholding,
        expectedAdditionalIncome: draft.expectedAdditionalIncome,
        allowances: draft.allowances,
      });
      return withAudit({ ...draft, status: 'estimated', estimate, updatedAt: at }, employeeActor, 'estimate', 'คำนวณประมาณการภาษี', at);
    });
    set({ drafts: result.drafts });
    return result.updated;
  },
  submitTaxPlanningForPayrollReview: (id, actor = employeeActor) => {
    const result = updateDraft(get().drafts, id, (draft) => submitTaxPlanningForPayrollReview(draft, actor));
    set({ drafts: result.drafts });
    return result.updated;
  },
  startPayrollTaxPlanningReview: (id, actor = payrollActor) => {
    const result = updateDraft(get().drafts, id, (draft) => startPayrollTaxPlanningReview(draft, actor));
    set({ drafts: result.drafts });
    return result.updated;
  },
  sendBackPayrollTaxPlanningReview: (id, actor, reason) => {
    const result = updateDraft(get().drafts, id, (draft) => sendBackPayrollTaxPlanningReview(draft, actor, reason));
    set({ drafts: result.drafts });
    return result.updated;
  },
  approvePayrollTaxPlanningReview: (id, actor, note) => {
    const result = updateDraft(get().drafts, id, (draft) => approvePayrollTaxPlanningReview(draft, actor, note));
    set({ drafts: result.drafts });
    return result.updated;
  },
  rejectPayrollTaxPlanningReview: (id, actor, reason) => {
    const result = updateDraft(get().drafts, id, (draft) => rejectPayrollTaxPlanningReview(draft, actor, reason));
    set({ drafts: result.drafts });
    return result.updated;
  },
  cancelTaxPlanningReview: (id, actor = employeeActor, reason) => {
    const result = updateDraft(get().drafts, id, (draft) => cancelTaxPlanningReview(draft, actor, reason));
    set({ drafts: result.drafts });
    return result.updated;
  },
  resubmitTaxPlanningForPayrollReview: (id, actor = employeeActor) => {
    const result = updateDraft(get().drafts, id, (draft) => resubmitTaxPlanningForPayrollReview(draft, actor));
    set({ drafts: result.drafts });
    return result.updated;
  },
  clear: () => set({ drafts: [] }),
}));
