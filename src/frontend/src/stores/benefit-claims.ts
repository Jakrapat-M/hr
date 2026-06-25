import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HumiApprovalStep, RequestStatus } from '@/lib/humi-mock-data';
import type { PendingRequest } from '@/lib/quick-approve-api';
import type { ClaimFieldKey } from '@/data/benefits/claim-field-config';

/** STA-119: conditional claim values keyed by field-config descriptor key. */
export type ClaimDynamicFields = Partial<Record<ClaimFieldKey, string | number>>;

export type BenefitClaimStatus =
  | 'pending_manager_approval'   // STA-28: manager must approve before SPD
  | 'pending_spd'
  | 'send_back'
  | 'approved'
  | 'rejected';
export type BenefitClaimType = 'medical' | 'gasoline' | 'mobile' | 'physical_checkup' | 'dependent';

export interface BenefitAttachment {
  id: string;
  /** Canonical display name used by the benefit module. */
  filename?: string;
  /** Compatibility with earlier benefit-surface tests and fixture shape. */
  name?: string;
  extension?: string;
  /** Canonical size in MB. */
  sizeMb?: number;
  /** Compatibility with byte-sized mock upload fixtures. */
  size?: number;
  mimeType?: string;
}

export interface BenefitClaimAuditEntry {
  at: string;
  // STA-27 PR-A — widened to include 'hrbp' for exception oversight audit entries
  actorRole: 'employee' | 'spd' | 'manager' | 'hrbp' | 'system';
  actorName: string;
  action: 'submit' | 'approve' | 'reject' | 'send_back' | 'resubmit';
  note?: string;
}

export interface BenefitClaimRequest {
  id: string;
  workflowRequestId: string;
  employeeId: string;
  employeeName: string;
  company: string;
  businessUnit: string;
  employeeGroup: string;
  personalGrade: string;
  benefitType: BenefitClaimType;
  benefitCode: string;
  benefitName: string;
  remainingAmount: number;
  currency: 'THB';
  receiptNo: string;
  receiptDate: string;
  claimDate: string;
  receiptAmount: number;
  totalClaimAmount: number;
  /** Compatibility alias from earlier claim-form drafts. */
  claimAmount?: number;
  remark: string;
  status: BenefitClaimStatus;
  submittedAt: string;
  updatedAt: string;
  hospitalType?: string;
  opdIpd?: string;
  hospitalName?: string;
  patientTransferDocumentNo?: string;
  diseaseDetails?: string;
  gasolineClaimType?: string;
  dependentName?: string;
  dependentRelationship?: string;
  /** STA-119: config-driven conditional values (option ids for selects). */
  dynamicFields?: ClaimDynamicFields;
  attachments: BenefitAttachment[];
  audit: BenefitClaimAuditEntry[];
  correctionReason?: string;
  /** Q10 Option A: original remaining amount at time of submission for auto-restore on Send Back. */
  originalRemainingAmount?: number;
  version: number;
  previousVersions: Array<Pick<BenefitClaimRequest, 'receiptNo' | 'receiptAmount' | 'totalClaimAmount' | 'claimDate' | 'remark' | 'updatedAt' | 'version'>>;
  /**
   * PR-1b: canonical queue-row snapshot for claim rows that belong to the unified
   * inbox (the 20 seeded rows). Present only on queue-seeded claims so the live
   * inbox reconstructs the SAME display row. Independent of the store's own
   * benefit-claim fixtures, which back the benefits surfaces.
   */
  queueSnapshot?: PendingRequest;
}

export interface BenefitClaimInput {
  employeeId?: string;
  employeeName?: string;
  company?: string;
  businessUnit?: string;
  employeeGroup?: string;
  personalGrade?: string;
  benefitType?: BenefitClaimType;
  /** Compatibility alias from the first surface-test pass. */
  claimType?: BenefitClaimType;
  benefitCode?: string;
  benefitName?: string;
  remainingAmount?: number;
  receiptNo: string;
  receiptDate: string;
  claimDate?: string;
  receiptAmount: number;
  totalClaimAmount?: number;
  /** Compatibility alias from earlier claim-form drafts. */
  claimAmount?: number;
  remark?: string;
  /** Compatibility alias from medical-claim drafts. */
  remarks?: string;
  hospitalType?: string;
  opdIpd?: string;
  hospitalName?: string;
  patientTransferDocumentNo?: string;
  diseaseDetails?: string;
  gasolineClaimType?: string;
  dependentName?: string;
  dependentRelationship?: string;
  /** STA-119: config-driven conditional values (option ids for selects). */
  dynamicFields?: ClaimDynamicFields;
  attachments?: BenefitAttachment[];
}

export type BenefitClaimDraftInput = BenefitClaimInput;
export type BenefitClaimSubmitInput = BenefitClaimInput;

interface Actor {
  role: 'employee' | 'spd';
  name: string;
}

interface BenefitClaimsState {
  claims: BenefitClaimRequest[];
  submitClaim: (input: BenefitClaimInput) => BenefitClaimRequest;
  approveClaim: (id: string, actor: Actor, note?: string) => void;
  rejectClaim: (id: string, actor: Actor, reason: string) => void;
  sendBackClaim: (id: string, actor: Actor, reason: string) => void;
  resubmitClaim: (id: string, input: Partial<BenefitClaimInput>, actor?: Actor) => void;
  hasDuplicateReceipt: (employeeId: string, benefitCode: string, receiptNo: string, excludingId?: string) => boolean;
  /** STA-28 PR-C: Manager approves → status becomes pending_spd. Mock-async 300ms. */
  managerApprove: (claimId: string, managerName: string) => Promise<void>;
  /**
   * STA-28 PR-C: Manager sends back → status becomes send_back.
   * Q10 Option A: entitlement is auto-restored immediately on Send Back.
   * Appends two audit entries: (a) manager send_back entry, (b) system auto-restore entry.
   * Mock-async 300ms.
   */
  managerSendBack: (claimId: string, managerName: string, note: string) => Promise<void>;
  /**
   * PR-1b: seed the canonical claim queue rows (init-overwrite-empties — only adds
   * rows whose id is not already present). Orchestrated by ensureDemoSeed (R1).
   */
  seedQueueClaims: (rows: PendingRequest[]) => void;
  clear: () => void;
}

export const BENEFIT_STATUS_LABEL: Record<BenefitClaimStatus, string> = {
  pending_manager_approval: 'รออนุมัติจากหัวหน้า',
  pending_spd: 'รอ SPD อนุมัติ',
  send_back: 'ส่งกลับให้แก้ไข',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
};

export const BENEFIT_TYPE_LABEL: Record<BenefitClaimType, string> = {
  medical: 'ค่ารักษาพยาบาล',
  gasoline: 'ค่าน้ำมัน',
  mobile: 'ค่าโทรศัพท์',
  physical_checkup: 'ตรวจสุขภาพ',
  dependent: 'ค่ารักษาผู้รับสิทธิ์ร่วม',
};

export const BENEFIT_CODE_BY_TYPE: Record<BenefitClaimType, string> = {
  medical: 'BEN-MED-OPD',
  gasoline: 'BEN-FUEL',
  mobile: 'BEN-MOBILE',
  physical_checkup: 'BEN-CHECKUP',
  dependent: 'BEN-DEP-MED',
};

const nowIso = () => new Date().toISOString();
const thaiDate = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

function nextId(prefix: string, size: number, count: number) {
  return `${prefix}-${String(count + 1).padStart(size, '0')}`;
}

function statusToRequestStatus(status: BenefitClaimStatus): RequestStatus {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'send_back') return 'info';
  // pending_manager_approval and pending_spd both map to 'pending'
  return 'pending';
}

function stepStatus(status: BenefitClaimStatus): HumiApprovalStep['status'] {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

export function validateBenefitAttachmentRules(input: Pick<BenefitClaimInput, 'benefitType' | 'claimType' | 'attachments'>) {
  const attachments = input.attachments ?? [];
  const errors: string[] = [];
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.pptx', '.xlsx'];
  if (attachments.length > 5) errors.push('แนบไฟล์ได้สูงสุด 5 ไฟล์');
  attachments.forEach((file) => {
    const filename = file.filename ?? file.name ?? '';
    const lower = filename.toLowerCase();
    const sizeMb = file.sizeMb ?? (file.size ? file.size / 1_000_000 : 0);
    if (!allowed.some((ext) => lower.endsWith(ext))) errors.push(`ชนิดไฟล์ไม่รองรับ: ${filename || 'unknown file'}`);
    if (sizeMb > 10) errors.push(`ไฟล์เกิน 10 MB: ${filename || 'unknown file'}`);
  });
  if ((input.benefitType ?? input.claimType) === 'medical' && attachments.length === 0) {
    errors.push('ค่ารักษาพยาบาลต้องแนบเอกสารอย่างน้อย 1 ไฟล์');
  }
  return errors;
}

export function selectBenefitRequestSummaries(claims: BenefitClaimRequest[]) {
  return claims.map((claim) => {
    // Build a coherent two-step chain narrating manager → SPD.
    // Step 1 (Manager): pending while awaiting manager; completed once past that stage.
    const managerDone = claim.status !== 'pending_manager_approval';
    const managerStep: HumiApprovalStep = {
      role: 'หัวหน้างาน',
      name: 'หัวหน้างาน',
      initials: 'MG',
      tone: 'sage' as const,
      status: managerDone ? 'approved' : 'pending',
      when: managerDone ? 'หัวหน้าอนุมัติแล้ว' : 'รออนุมัติจากหัวหน้า',
    };
    // Step 2 (SPD): only active once the manager has approved.
    const spdStep: HumiApprovalStep = {
      role: 'SPD Benefits',
      name: 'ทีม SPD',
      initials: 'SP',
      tone: 'teal' as const,
      status: managerDone ? stepStatus(claim.status) : 'pending',
      when: managerDone ? BENEFIT_STATUS_LABEL[claim.status] : 'รอ SPD อนุมัติ',
      note: claim.correctionReason,
    };
    return {
      id: claim.workflowRequestId,
      type: `เบิกสวัสดิการ · ${BENEFIT_TYPE_LABEL[claim.benefitType]}`,
      sub: `${claim.benefitCode} · ใบเสร็จ ${claim.receiptNo} · ฿${claim.totalClaimAmount.toLocaleString('th-TH')}`,
      submitted: thaiDate(claim.submittedAt),
      status: statusToRequestStatus(claim.status),
      approvalChain: [managerStep, spdStep] satisfies HumiApprovalStep[],
      claim,
    };
  });
}

function normalizeAttachments(attachments: BenefitAttachment[] = []): BenefitAttachment[] {
  return attachments.map((file, index) => ({
    ...file,
    id: file.id || `att-${index + 1}`,
    filename: file.filename ?? file.name ?? 'attachment',
    sizeMb: file.sizeMb ?? (file.size ? file.size / 1_000_000 : 0),
  }));
}

function deriveClaimDate(claim: { claimDate?: unknown; receiptDate?: unknown; submittedAt?: unknown }): string {
  if (typeof claim.claimDate === 'string' && claim.claimDate.trim()) return claim.claimDate;
  if (typeof claim.receiptDate === 'string' && claim.receiptDate.trim()) return claim.receiptDate;
  if (typeof claim.submittedAt === 'string' && claim.submittedAt.length >= 10) return claim.submittedAt.slice(0, 10);
  return '';
}

function normalizePersistedClaim(claim: BenefitClaimRequest): BenefitClaimRequest {
  const claimDate = deriveClaimDate(claim);
  const remark = typeof claim.remark === 'string' ? claim.remark : '';
  return {
    ...claim,
    claimDate,
    remark,
    previousVersions: (claim.previousVersions ?? []).map((version) => ({
      ...version,
      claimDate: deriveClaimDate({ ...version, claimDate: version.claimDate }) || claimDate,
      remark: typeof version.remark === 'string' ? version.remark : '',
    })),
  };
}

const initialClaims: BenefitClaimRequest[] = [
  // STA-28 PR-C: seed claim pending manager approval — routable at /workflows/benefit-claim/BEN-CLM-MGR1
  {
    id: 'BEN-CLM-MGR1',
    workflowRequestId: 'REQ-BEN-MGR1',
    employeeId: 'EMP002',
    employeeName: 'สมใจ วงษ์ดี',
    company: 'Central Group',
    businessUnit: 'HR',
    employeeGroup: 'Monthly',
    personalGrade: 'PG3',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: 'ค่ารักษาพยาบาล',
    remainingAmount: 15000,
    originalRemainingAmount: 15000,
    currency: 'THB',
    receiptNo: 'RCPT-2026-0501',
    receiptDate: '2026-05-01',
    claimDate: '2026-05-01',
    receiptAmount: 3200,
    totalClaimAmount: 3200,
    remark: '',
    status: 'pending_manager_approval',
    submittedAt: '2026-05-16T08:00:00.000Z',
    updatedAt: '2026-05-16T08:00:00.000Z',
    hospitalType: 'private',
    hospitalName: 'รพ.สมิติเวช',
    opdIpd: 'OPD',
    diseaseDetails: 'ไข้หวัดใหญ่',
    attachments: [
      { id: 'att-mgr1-1', filename: 'receipt-0501.pdf', sizeMb: 0.9, mimeType: 'application/pdf' },
      { id: 'att-mgr1-2', filename: 'doctor-note.jpg', sizeMb: 0.4, mimeType: 'image/jpeg' },
    ],
    audit: [
      { at: '2026-05-16T08:00:00.000Z', actorRole: 'employee', actorName: 'สมใจ วงษ์ดี', action: 'submit', note: 'ส่งคำขอเบิกค่ารักษาพยาบาล' },
    ],
    version: 1,
    previousVersions: [],
  },
  {
    id: 'BEN-CLM-0001',
    workflowRequestId: 'REQ-BEN-0001',
    employeeId: 'EMP001',
    employeeName: 'จงรักษ์ ทานากะ',
    company: 'Central Group',
    businessUnit: 'People Operations',
    employeeGroup: 'Monthly',
    personalGrade: 'PG4',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: 'ค่ารักษาพยาบาล',
    remainingAmount: 18000,
    originalRemainingAmount: 18000,
    currency: 'THB',
    receiptNo: 'RCPT-2026-0415',
    receiptDate: '2026-04-15',
    claimDate: '2026-04-15',
    receiptAmount: 4820,
    totalClaimAmount: 4820,
    remark: '',
    status: 'pending_spd',
    submittedAt: '2026-04-15T09:20:00.000Z',
    updatedAt: '2026-04-15T09:20:00.000Z',
    hospitalType: 'private',
    hospitalName: 'รพ.บำรุงราษฎร์',
    patientTransferDocumentNo: 'PT-2026-009',
    diseaseDetails: 'ตรวจรักษาทั่วไป',
    attachments: [{ id: 'att-1', filename: 'receipt-0415.pdf', sizeMb: 1.2, mimeType: 'application/pdf' }],
    audit: [{ at: '2026-04-15T09:20:00.000Z', actorRole: 'employee', actorName: 'จงรักษ์ ทานากะ', action: 'submit', note: 'ส่งคำขอเบิกสวัสดิการ' }],
    version: 1,
    previousVersions: [],
  },
  // STA-26: seed approved claims (≥5) for exception source-picker variety
  {
    id: 'BEN-CLM-0002',
    workflowRequestId: 'REQ-BEN-0002',
    employeeId: 'EMP002',
    employeeName: 'สมใจ วงษ์ดี',
    company: 'Central Group',
    businessUnit: 'HR',
    employeeGroup: 'Monthly',
    personalGrade: 'PG3',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: 'ค่ารักษาพยาบาล',
    remainingAmount: 12000,
    currency: 'THB',
    receiptNo: 'RCPT-2026-0301',
    receiptDate: '2026-03-01',
    claimDate: '2026-03-01',
    receiptAmount: 3500,
    totalClaimAmount: 3500,
    remark: '',
    status: 'approved',
    submittedAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-03-02T10:00:00.000Z',
    hospitalType: 'private',
    hospitalName: 'รพ.สมิติเวช',
    diseaseDetails: 'ไข้หวัด',
    attachments: [{ id: 'att-2', filename: 'receipt-0301.pdf', sizeMb: 0.8, mimeType: 'application/pdf' }],
    audit: [
      { at: '2026-03-01T08:00:00.000Z', actorRole: 'employee', actorName: 'สมใจ วงษ์ดี', action: 'submit' },
      { at: '2026-03-02T10:00:00.000Z', actorRole: 'spd', actorName: 'ทีม SPD', action: 'approve', note: 'อนุมัติแล้ว' },
    ],
    version: 1,
    previousVersions: [],
  },
];

/**
 * PR-1b: build a native BenefitClaimRequest from a canonical claim queue row,
 * carrying the queueSnapshot so the unified inbox reconstructs the SAME row.
 * Seeded with status pending_manager_approval so it surfaces as pending.
 */
export function queueRowToBenefitClaim(row: PendingRequest): BenefitClaimRequest {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const amount = typeof details.amount === 'number' ? details.amount : 0;
  const at = row.submittedAt;
  return {
    id: row.id,
    workflowRequestId: row.id,
    employeeId: row.requester.id,
    employeeName: row.requester.name,
    company: 'Central Group',
    businessUnit: row.requester.department,
    employeeGroup: 'Monthly',
    personalGrade: 'PG4',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: typeof details.category === 'string' ? details.category : 'ค่ารักษาพยาบาล',
    remainingAmount: 20000,
    originalRemainingAmount: 20000,
    currency: 'THB',
    receiptNo: `RCPT-${row.id}`,
    receiptDate: at.slice(0, 10),
    claimDate: at.slice(0, 10),
    receiptAmount: amount,
    totalClaimAmount: amount,
    remark: row.description,
    status: 'pending_manager_approval',
    submittedAt: at,
    updatedAt: at,
    attachments: [],
    audit: [{ at, actorRole: 'employee', actorName: row.requester.name, action: 'submit' }],
    version: 1,
    previousVersions: [],
    queueSnapshot: row,
  };
}

export const BENEFIT_CLAIMS_PERSIST_VERSION = 3;

/**
 * Seeded queue claims use canonical WF-2026-* ids (from MOCK_PENDING_REQUESTS via
 * queueRowToBenefitClaim). Live claims submitted by employees use BEN-CLM-* ids.
 * Store fixtures (BEN-CLM-MGR1, BEN-CLM-0001, etc.) have no queueSnapshot and must
 * persist. This discriminator is the authoritative gate for the two persist-drop sites
 * below — do NOT use queueSnapshot presence as the criterion (live submitClaim also
 * attaches a queueSnapshot, so presence alone cannot distinguish seed from live).
 */
const CANONICAL_CLAIM_SEED_ID = /^WF-2026-/;
export function isSeededQueueClaim(c: { id: string }): boolean {
  return CANONICAL_CLAIM_SEED_ID.test(c.id);
}

export function migrateBenefitClaimsPersistedState(
  persistedState: unknown,
): Partial<BenefitClaimsState> {
  if (
    persistedState &&
    typeof persistedState === 'object' &&
    Array.isArray((persistedState as { claims?: unknown }).claims)
  ) {
    const state = persistedState as Partial<BenefitClaimsState>;
    return {
      ...state,
      // PR-1b rehydrate-to-seed: drop WF-2026-* seed claims so ensureDemoSeed
      // re-adds them fresh → "approve a queue claim → refresh" returns to the
      // seeded set. Keyed on WF-2026-* id space (not queueSnapshot presence)
      // so live BEN-CLM-* claims that also carry a queueSnapshot are kept.
      claims:
        state.claims?.filter((c) => !isSeededQueueClaim(c)).map(normalizePersistedClaim) ?? [],
    };
  }
  return { claims: initialClaims };
}

export const useBenefitClaimsStore = create<BenefitClaimsState>()(
  persist(
    (set, get) => ({
      claims: initialClaims,
      submitClaim: (input) => {
        const at = nowIso();
        const count = get().claims.length;
        const benefitType = input.benefitType ?? input.claimType ?? 'medical';
        const benefitCode = input.benefitCode ?? BENEFIT_CODE_BY_TYPE[benefitType];
        const totalClaimAmount = input.totalClaimAmount ?? input.claimAmount ?? input.receiptAmount;
        const claim: BenefitClaimRequest = {
          id: nextId('BEN-CLM', 4, count),
          workflowRequestId: nextId('REQ-BEN', 4, count),
          employeeId: input.employeeId ?? 'EMP001',
          employeeName: input.employeeName ?? 'จงรักษ์ ทานากะ',
          company: input.company ?? 'Central Group',
          businessUnit: input.businessUnit ?? 'People Operations',
          employeeGroup: input.employeeGroup ?? 'Monthly',
          personalGrade: input.personalGrade ?? 'PG4',
          benefitType,
          benefitCode,
          benefitName: input.benefitName ?? BENEFIT_TYPE_LABEL[benefitType],
          remainingAmount: input.remainingAmount ?? 20000,
          currency: 'THB',
          receiptNo: input.receiptNo,
          receiptDate: input.receiptDate,
          claimDate: input.claimDate ?? input.receiptDate,
          receiptAmount: input.receiptAmount,
          totalClaimAmount,
          claimAmount: totalClaimAmount,
          remark: input.remark ?? input.remarks ?? '',
          status: 'pending_manager_approval',
          submittedAt: at,
          updatedAt: at,
          hospitalType: input.hospitalType ?? input.opdIpd,
          hospitalName: input.hospitalName,
          patientTransferDocumentNo: input.patientTransferDocumentNo,
          diseaseDetails: input.diseaseDetails,
          gasolineClaimType: input.gasolineClaimType,
          dependentName: input.dependentName,
          dependentRelationship: input.dependentRelationship,
          dynamicFields: input.dynamicFields,
          attachments: normalizeAttachments(input.attachments),
          audit: [{ at, actorRole: 'employee', actorName: input.employeeName ?? 'จงรักษ์ ทานากะ', action: 'submit', note: 'ส่งคำขอเบิกสวัสดิการ' }],
          version: 1,
          previousVersions: [],
          queueSnapshot: {
            id: nextId('REQ-BEN', 4, count),
            type: 'claim',
            requester: {
              id: input.employeeId ?? 'EMP001',
              name: input.employeeName ?? 'จงรักษ์ ทานากะ',
              position: input.personalGrade ?? 'PG4',
              department: input.businessUnit ?? 'People Operations',
              employeeId: input.employeeId ?? 'EMP001',
              businessUnit: input.businessUnit ?? 'People Operations',
              company: input.company ?? 'Central Group',
            },
            description: `เบิก${input.benefitName ?? BENEFIT_TYPE_LABEL[benefitType]} ฿${totalClaimAmount?.toLocaleString('th-TH') ?? '0'}`,
            submittedAt: at,
            urgency: 'normal',
            waitingDays: 0,
            // STA-119 (MF-4): widen the details builder so the quick-approve
            // surface mirrors every submitted general field + the dynamicFields map,
            // not just the original 5 keys.
            details: {
              category: input.benefitName ?? BENEFIT_TYPE_LABEL[benefitType],
              benefitType,
              amount: totalClaimAmount ?? 0,
              currency: 'THB',
              merchant: input.benefitName ?? BENEFIT_TYPE_LABEL[benefitType],
              receiptNo: input.receiptNo,
              receiptDate: input.receiptDate,
              claimDate: input.claimDate ?? input.receiptDate,
              receiptAmount: input.receiptAmount,
              totalClaimAmount: totalClaimAmount ?? 0,
              remainingAmount: input.remainingAmount,
              remark: input.remark ?? input.remarks ?? '',
              dynamicFields: input.dynamicFields,
              policyChecks: [],
            },
            approvalTimeline: [
              { step: 1, approver: 'หัวหน้างาน', status: 'pending' as const },
              { step: 2, approver: 'SPD', status: 'pending' as const },
            ],
          },
        };
        set((s) => ({ claims: [claim, ...s.claims] }));
        return claim;
      },
      approveClaim: (id, actor, note) => set((s) => ({ claims: updateClaim(s.claims, id, 'approved', actor, 'approve', note) })),
      rejectClaim: (id, actor, reason) => set((s) => ({ claims: updateClaim(s.claims, id, 'rejected', actor, 'reject', reason) })),
      sendBackClaim: (id, actor, reason) => set((s) => ({ claims: updateClaim(s.claims, id, 'send_back', actor, 'send_back', reason) })),
      resubmitClaim: (id, input, actor = { role: 'employee', name: 'จงรักษ์ ทานากะ' }) => set((s) => ({
        claims: s.claims.map((claim) => {
          if (claim.id !== id) return claim;
          const at = nowIso();
          const remark = input.remark ?? input.remarks ?? claim.remark;
          return {
            ...claim,
            ...input,
            claimDate: input.claimDate ?? claim.claimDate,
            remark,
            status: 'pending_spd',
            updatedAt: at,
            correctionReason: undefined,
            version: claim.version + 1,
            previousVersions: [{
              receiptNo: claim.receiptNo,
              receiptAmount: claim.receiptAmount,
              totalClaimAmount: claim.totalClaimAmount,
              claimDate: claim.claimDate,
              remark: claim.remark,
              updatedAt: claim.updatedAt,
              version: claim.version,
            }, ...claim.previousVersions],
            audit: [...claim.audit, { at, actorRole: actor.role, actorName: actor.name, action: 'resubmit', note: 'ส่งกลับหลังแก้ไข' }],
          };
        }),
      })),
      hasDuplicateReceipt: (employeeId, benefitCode, receiptNo, excludingId) =>
        get().claims.some((claim) => claim.id !== excludingId && claim.employeeId === employeeId && claim.benefitCode === benefitCode && claim.receiptNo.trim().toLowerCase() === receiptNo.trim().toLowerCase()),
      managerApprove: (claimId, managerName) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const at = nowIso();
            set((s) => ({
              claims: s.claims.map((claim) =>
                claim.id !== claimId ? claim : {
                  ...claim,
                  status: 'pending_spd' as BenefitClaimStatus,
                  updatedAt: at,
                  audit: [
                    ...claim.audit,
                    { at, actorRole: 'manager' as const, actorName: managerName, action: 'approve' as const, note: 'หัวหน้าอนุมัติ / Manager approved' },
                  ],
                }
              ),
            }));
            resolve();
          }, 300);
        }),
      managerSendBack: (claimId, managerName, note) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const at = nowIso();
            set((s) => ({
              claims: s.claims.map((claim) => {
                if (claim.id !== claimId) return claim;
                // Q10 Option A: restore remainingAmount to originalRemainingAmount immediately on Send Back.
                const restored = claim.originalRemainingAmount ?? claim.remainingAmount;
                // STA-147 req-2: persist the send-back reason onto the queueSnapshot
                // (the row the detail page reads) so the read-only "Send Back Comment"
                // box populates after re-resolve, and keep the last history step's
                // comment in sync with the same reason (req-2/req-3 consistency).
                const snapshot = claim.queueSnapshot
                  ? {
                      ...claim.queueSnapshot,
                      sendBackComment: note,
                      approvalTimeline: claim.queueSnapshot.approvalTimeline.map((s, i, arr) =>
                        i === arr.length - 1
                          ? { ...s, status: 'rejected' as const, comment: note }
                          : s,
                      ),
                    }
                  : claim.queueSnapshot;
                return {
                  ...claim,
                  status: 'send_back' as BenefitClaimStatus,
                  updatedAt: at,
                  remainingAmount: restored,
                  correctionReason: note,
                  queueSnapshot: snapshot,
                  audit: [
                    ...claim.audit,
                    { at, actorRole: 'manager' as const, actorName: managerName, action: 'send_back' as const, note },
                    { at, actorRole: 'system' as const, actorName: 'ระบบ / System', action: 'resubmit' as const, note: 'Entitlement auto-restored (Q10 Option A)' },
                  ],
                };
              }),
            }));
            resolve();
          }, 300);
        }),
      // merge-drop + ensureDemoSeed re-add is keyed on the WF-2026-* id space,
      // disjoint from live BEN-CLM-* claims; the id-guard below stays correct.
      seedQueueClaims: (rows) =>
        set((s) => {
          const existing = new Set(s.claims.map((c) => c.id));
          const additions = rows
            .filter((row) => !existing.has(row.id))
            .map(queueRowToBenefitClaim);
          return additions.length ? { claims: [...additions, ...s.claims] } : s;
        }),
      clear: () => set({ claims: [] }),
    }),
    {
      name: 'humi-benefit-claims',
      version: BENEFIT_CLAIMS_PERSIST_VERSION,
      migrate: (persistedState) => migrateBenefitClaimsPersistedState(persistedState),
      // PR-1b rehydrate-to-seed: on EVERY rehydrate drop WF-2026-* seed claims
      // so ensureDemoSeed re-adds them fresh. Keyed on WF-2026-* id space (not
      // queueSnapshot presence) so live BEN-CLM-* claims are kept on F5.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<BenefitClaimsState>;
        const persistedClaims = Array.isArray(persisted.claims)
          ? persisted.claims.filter((c) => !isSeededQueueClaim(c))
          : currentState.claims;
        return { ...currentState, ...persisted, claims: persistedClaims };
      },
    },
  ),
);

function updateClaim(
  claims: BenefitClaimRequest[],
  id: string,
  status: BenefitClaimStatus,
  actor: Actor,
  action: BenefitClaimAuditEntry['action'],
  note?: string,
) {
  const at = nowIso();
  return claims.map((claim) => claim.id === id ? {
    ...claim,
    status,
    updatedAt: at,
    correctionReason: status === 'send_back' ? note : claim.correctionReason,
    audit: [...claim.audit, { at, actorRole: actor.role, actorName: actor.name, action, note }],
  } : claim);
}
