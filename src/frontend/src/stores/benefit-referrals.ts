import { create } from 'zustand';
import type { HumiApprovalStep, RequestStatus } from '@/lib/humi-mock-data';
import { addReferralValidityWindow } from '@/lib/benefit-referral-adapters';

export type BenefitReferralStatus = 'draft' | 'pending_spd' | 'send_back' | 'approved' | 'rejected' | 'letter_issued' | 'cancelled';

export interface BenefitReferralHospital {
  id: string;
  name: string;
  branch: string;
  province: string;
  ePatientCode: string;
}

export interface BenefitReferralCoveredPerson {
  id: string;
  name: string;
  relationship: 'self' | 'spouse' | 'child' | 'parent';
}

export interface BenefitReferralLetter {
  referralNumber: string;
  validFrom: string;
  validUntil: string;
  issuedBy: string;
  issuedAt: string;
  previewTitle: string;
}

export interface BenefitReferralAuditEntry {
  at: string;
  actorRole: 'employee' | 'spd';
  actorName: string;
  action: 'create' | 'submit' | 'approve' | 'reject' | 'send_back' | 'resubmit' | 'issue_letter' | 'cancel';
  note?: string;
}

export interface BenefitReferralRequest {
  id: string;
  workflowRequestId: string;
  employeeId: string;
  employeeName: string;
  coveredPersonId: string;
  coveredPersonName: string;
  coveredPersonRelationship: BenefitReferralCoveredPerson['relationship'];
  hospital: BenefitReferralHospital;
  serviceReason: string;
  preferredVisitDate: string;
  notes?: string;
  status: BenefitReferralStatus;
  submittedAt?: string;
  updatedAt: string;
  correctionReason?: string;
  rejectionReason?: string;
  letter?: BenefitReferralLetter;
  audit: BenefitReferralAuditEntry[];
}

export interface BenefitReferralInput {
  employeeId?: string;
  employeeName?: string;
  coveredPersonId: string;
  hospitalId: string;
  serviceReason: string;
  preferredVisitDate: string;
  notes?: string;
}

interface Actor {
  role: 'employee' | 'spd';
  name: string;
}

interface BenefitReferralsState {
  referrals: BenefitReferralRequest[];
  hospitals: BenefitReferralHospital[];
  coveredPeople: BenefitReferralCoveredPerson[];
  createReferral: (input: BenefitReferralInput) => BenefitReferralRequest;
  submitReferral: (id: string, actor?: Actor) => void;
  resubmitReferral: (id: string, input: Partial<BenefitReferralInput>, actor?: Actor) => void;
  approveReferral: (id: string, actor: Actor, note?: string) => void;
  rejectReferral: (id: string, actor: Actor, reason: string) => void;
  sendBackReferral: (id: string, actor: Actor, reason: string) => void;
  issueReferralLetter: (id: string, actor: Actor) => void;
  cancelReferral: (id: string, actor?: Actor, reason?: string) => void;
  clear: () => void;
}

export const BENEFIT_REFERRAL_STATUS_LABEL: Record<BenefitReferralStatus, string> = {
  draft: 'ร่างคำขอ',
  pending_spd: 'รอ SPD อนุมัติ',
  send_back: 'ส่งกลับให้แก้ไข',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
  letter_issued: 'ออกใบส่งตัวแล้ว',
  cancelled: 'ยกเลิกแล้ว',
};

export const REFERRAL_HOSPITALS: BenefitReferralHospital[] = [
  { id: 'HOSP-BNH', name: 'โรงพยาบาลบีเอ็นเอช', branch: 'สีลม', province: 'กรุงเทพมหานคร', ePatientCode: 'EP-BNH-SILOM' },
  { id: 'HOSP-BDMS', name: 'โรงพยาบาลกรุงเทพ', branch: 'สำนักงานใหญ่', province: 'กรุงเทพมหานคร', ePatientCode: 'EP-BDMS-HQ' },
  { id: 'HOSP-CNX', name: 'โรงพยาบาลเชียงใหม่ราม', branch: 'เมืองเชียงใหม่', province: 'เชียงใหม่', ePatientCode: 'EP-CNX-RAM' },
];

export const COVERED_PEOPLE: BenefitReferralCoveredPerson[] = [
  { id: 'EMP001', name: 'จงรักษ์ ทานากะ', relationship: 'self' },
  { id: 'DEP-001', name: 'มายด์ ทานากะ', relationship: 'spouse' },
  { id: 'DEP-002', name: 'มิน ทานากะ', relationship: 'child' },
];

const initialReferrals: BenefitReferralRequest[] = [
  {
    id: 'BEN-REF-0001',
    workflowRequestId: 'REQ-REF-0001',
    employeeId: 'EMP001',
    employeeName: 'จงรักษ์ ทานากะ',
    coveredPersonId: 'EMP001',
    coveredPersonName: 'จงรักษ์ ทานากะ',
    coveredPersonRelationship: 'self',
    hospital: REFERRAL_HOSPITALS[0],
    serviceReason: 'พบแพทย์เฉพาะทางกระดูก',
    preferredVisitDate: '2026-05-05',
    notes: 'ต้องการใช้สิทธิ์ ePatient',
    status: 'pending_spd',
    submittedAt: '2026-04-29T09:00:00.000Z',
    updatedAt: '2026-04-29T09:00:00.000Z',
    audit: [{ at: '2026-04-29T09:00:00.000Z', actorRole: 'employee', actorName: 'จงรักษ์ ทานากะ', action: 'submit', note: 'ส่งคำขอใบส่งตัว' }],
  },
];

const nowIso = () => new Date().toISOString();
const thaiDate = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
const nextId = (prefix: string, count: number) => `${prefix}-${String(count + 1).padStart(4, '0')}`;

export function validateBenefitReferralInput(input: BenefitReferralInput, hospitals = REFERRAL_HOSPITALS, people = COVERED_PEOPLE) {
  const errors: string[] = [];
  if (!people.some((person) => person.id === input.coveredPersonId)) errors.push('กรุณาเลือกผู้ใช้สิทธิ์ที่อยู่ในแผนสวัสดิการ');
  if (!hospitals.some((hospital) => hospital.id === input.hospitalId)) errors.push('กรุณาเลือกโรงพยาบาลในเครือข่าย');
  if (!input.serviceReason.trim()) errors.push('กรุณาระบุเหตุผลหรือบริการที่ต้องการพบแพทย์');
  if (!input.preferredVisitDate) errors.push('กรุณาระบุวันที่ต้องการเข้ารับบริการ');
  return errors;
}

function statusToRequestStatus(status: BenefitReferralStatus): RequestStatus {
  if (status === 'approved' || status === 'letter_issued') return 'approved';
  if (status === 'rejected' || status === 'cancelled') return 'rejected';
  if (status === 'send_back') return 'info';
  return 'pending';
}

function stepStatus(status: BenefitReferralStatus): HumiApprovalStep['status'] {
  if (status === 'approved' || status === 'letter_issued') return 'approved';
  if (status === 'rejected' || status === 'cancelled') return 'rejected';
  return 'pending';
}

export function selectBenefitReferralRequestSummaries(referrals: BenefitReferralRequest[]) {
  return referrals
    .filter((referral) => referral.status !== 'draft')
    .map((referral) => ({
      id: referral.workflowRequestId,
      type: 'ขอใบส่งตัว · ePatient referral',
      sub: `${referral.hospital.name} · ${referral.coveredPersonName} · นัด ${thaiDate(referral.preferredVisitDate)}`,
      submitted: thaiDate(referral.submittedAt ?? referral.updatedAt),
      status: statusToRequestStatus(referral.status),
      approvalChain: [
        {
          role: 'SPD Benefits',
          name: 'ทีม SPD',
          initials: 'SP',
          tone: 'teal' as const,
          status: stepStatus(referral.status),
          when: BENEFIT_REFERRAL_STATUS_LABEL[referral.status],
          note: referral.correctionReason ?? referral.rejectionReason,
        },
      ] satisfies HumiApprovalStep[],
      referral,
    }));
}

export function selectReferralInboxRows(referrals: BenefitReferralRequest[]) {
  return referrals.filter((referral) => referral.status !== 'draft' && referral.status !== 'cancelled');
}

export const useBenefitReferralsStore = create<BenefitReferralsState>()((set, get) => ({
  referrals: initialReferrals,
  hospitals: REFERRAL_HOSPITALS,
  coveredPeople: COVERED_PEOPLE,
  createReferral: (input) => {
    const errors = validateBenefitReferralInput(input, get().hospitals, get().coveredPeople);
    if (errors.length > 0) throw new Error(errors.join('\n'));
    const at = nowIso();
    const count = get().referrals.length;
    const hospital = get().hospitals.find((item) => item.id === input.hospitalId)!;
    const person = get().coveredPeople.find((item) => item.id === input.coveredPersonId)!;
    const referral: BenefitReferralRequest = {
      id: nextId('BEN-REF', count),
      workflowRequestId: nextId('REQ-REF', count),
      employeeId: input.employeeId ?? 'EMP001',
      employeeName: input.employeeName ?? 'จงรักษ์ ทานากะ',
      coveredPersonId: person.id,
      coveredPersonName: person.name,
      coveredPersonRelationship: person.relationship,
      hospital,
      serviceReason: input.serviceReason.trim(),
      preferredVisitDate: input.preferredVisitDate,
      notes: input.notes?.trim() || undefined,
      status: 'draft',
      updatedAt: at,
      audit: [{ at, actorRole: 'employee', actorName: input.employeeName ?? 'จงรักษ์ ทานากะ', action: 'create', note: 'สร้างร่างคำขอใบส่งตัว' }],
    };
    set((state) => ({ referrals: [referral, ...state.referrals] }));
    return referral;
  },
  submitReferral: (id, actor = { role: 'employee', name: 'จงรักษ์ ทานากะ' }) => set((state) => ({
    referrals: state.referrals.map((referral) => {
      if (referral.id !== id) return referral;
      if (!['draft', 'send_back'].includes(referral.status)) return referral;
      const at = nowIso();
      return {
        ...referral,
        status: 'pending_spd',
        submittedAt: referral.submittedAt ?? at,
        updatedAt: at,
        correctionReason: undefined,
        audit: [...referral.audit, { at, actorRole: actor.role, actorName: actor.name, action: referral.status === 'send_back' ? 'resubmit' : 'submit', note: 'ส่งคำขอใบส่งตัว' }],
      };
    }),
  })),
  resubmitReferral: (id, input, actor = { role: 'employee', name: 'จงรักษ์ ทานากะ' }) => set((state) => ({
    referrals: state.referrals.map((referral) => {
      if (referral.id !== id || referral.status !== 'send_back') return referral;
      const hospital = input.hospitalId ? state.hospitals.find((item) => item.id === input.hospitalId) : referral.hospital;
      const person = input.coveredPersonId ? state.coveredPeople.find((item) => item.id === input.coveredPersonId) : undefined;
      const at = nowIso();
      return {
        ...referral,
        hospital: hospital ?? referral.hospital,
        coveredPersonId: person?.id ?? referral.coveredPersonId,
        coveredPersonName: person?.name ?? referral.coveredPersonName,
        coveredPersonRelationship: person?.relationship ?? referral.coveredPersonRelationship,
        serviceReason: input.serviceReason?.trim() || referral.serviceReason,
        preferredVisitDate: input.preferredVisitDate ?? referral.preferredVisitDate,
        notes: input.notes?.trim() || referral.notes,
        status: 'pending_spd',
        correctionReason: undefined,
        updatedAt: at,
        audit: [...referral.audit, { at, actorRole: actor.role, actorName: actor.name, action: 'resubmit', note: 'แก้ไขและส่งคำขอใบส่งตัวอีกครั้ง' }],
      };
    }),
  })),
  approveReferral: (id, actor, note) => set((state) => ({ referrals: transition(state.referrals, id, 'approved', actor, 'approve', note) })),
  rejectReferral: (id, actor, reason) => set((state) => ({ referrals: transition(state.referrals, id, 'rejected', actor, 'reject', reason) })),
  sendBackReferral: (id, actor, reason) => set((state) => ({ referrals: transition(state.referrals, id, 'send_back', actor, 'send_back', reason) })),
  issueReferralLetter: (id, actor) => set((state) => ({
    referrals: state.referrals.map((referral) => {
      if (referral.id !== id || referral.status !== 'approved') return referral;
      const at = nowIso();
      const validity = addReferralValidityWindow(at);
      return {
        ...referral,
        status: 'letter_issued',
        updatedAt: at,
        letter: {
          referralNumber: `EP-${new Date(at).getFullYear()}-${referral.id.slice(-4)}`,
          ...validity,
          issuedBy: actor.name,
          issuedAt: at,
          previewTitle: `ใบส่งตัว ${referral.hospital.name}`,
        },
        audit: [...referral.audit, { at, actorRole: actor.role, actorName: actor.name, action: 'issue_letter', note: 'ออกใบส่งตัว ePatient' }],
      };
    }),
  })),
  cancelReferral: (id, actor = { role: 'employee', name: 'จงรักษ์ ทานากะ' }, reason) => set((state) => ({
    referrals: state.referrals.map((referral) => {
      if (referral.id !== id || !['draft', 'pending_spd', 'send_back'].includes(referral.status)) return referral;
      const at = nowIso();
      return { ...referral, status: 'cancelled', updatedAt: at, audit: [...referral.audit, { at, actorRole: actor.role, actorName: actor.name, action: 'cancel', note: reason }] };
    }),
  })),
  clear: () => set({ referrals: [] }),
}));

function transition(
  referrals: BenefitReferralRequest[],
  id: string,
  status: BenefitReferralStatus,
  actor: Actor,
  action: BenefitReferralAuditEntry['action'],
  note?: string,
) {
  const at = nowIso();
  return referrals.map((referral) => {
    if (referral.id !== id || referral.status !== 'pending_spd') return referral;
    return {
      ...referral,
      status,
      updatedAt: at,
      correctionReason: status === 'send_back' ? note : undefined,
      rejectionReason: status === 'rejected' ? note : undefined,
      audit: [...referral.audit, { at, actorRole: actor.role, actorName: actor.name, action, note }],
    };
  });
}
