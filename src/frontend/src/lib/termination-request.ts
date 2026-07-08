import type { TerminateEvent } from '@hrms/shared/types/timeline';
import type { AttachedFile } from '@/components/admin/AttachmentDropzone/AttachmentDropzone';
import {
  computeTerminationDate,
  TERMINATION_LOGIC,
  TERMINATION_LOGIC_CODES,
} from '@/lib/admin/termination-logic';
import { useEmployees } from '@/lib/admin/store/useEmployees';
import { useTimelines } from '@/lib/admin/store/useTimelines';

export type TerminationVoluntary = 'voluntary' | 'involuntary';
export type TerminationRequestSourceRoute = 'ess' | 'admin';
export type TerminationRequestSubmitterRole = 'employee' | 'manager' | 'hr';

export const TERMINATION_REASON_LABEL = {
  TERM_ABSENT: 'ขาดงานเกินกำหนด',
  TERM_COVID: 'เลิกจ้างเนื่องจาก COVID-19',
  TERM_DISMISS: 'ถูกเลิกจ้าง / ไล่ออก',
  TERM_ERLRETIRE: 'เกษียณก่อนกำหนด',
  TERM_EOC: 'ครบกำหนดสัญญาจ้าง',
  TERM_LAYOFF: 'ถูกพักงาน / เลิกจ้างชั่วคราว',
  TERM_PASSAWAY: 'เสียชีวิต',
  TERM_RESIGN: 'ลาออกโดยสมัครใจ',
  TERM_RETIRE: 'เกษียณอายุ',
  TERM_DM: 'อื่น ๆ',
  TERM_UNSUCPROB: 'ไม่ผ่านทดลองงาน',
  TERM_TRANS: 'โอนย้ายออกจากบริษัท',
  TERM_NOSHOW: 'ขาดงานโดยไม่แจ้ง',
} as const;

export type TerminationReasonCode = keyof typeof TERMINATION_REASON_LABEL;

const LEGACY_REASON_MAP: Record<string, TerminationReasonCode> = {
  TERM_RETRIE: 'TERM_RETIRE',
  TERM_OTHER: 'TERM_DM',
  TERM_REORG: 'TERM_DM',
  TERM_CRISIS: 'TERM_DM',
  TERM_REDUNDANCY: 'TERM_DM',
};

function isTerminationReasonCode(code: string): code is TerminationReasonCode {
  return Object.prototype.hasOwnProperty.call(TERMINATION_REASON_LABEL, code);
}

export function normalizeTerminationReason(code: string): TerminationReasonCode {
  if (isTerminationReasonCode(code)) return code;
  return LEGACY_REASON_MAP[code] ?? 'TERM_DM';
}

export function deriveTermination(resignedDate: string): { readonly terminationDate: string } {
  return { terminationDate: computeTerminationDate(resignedDate) };
}

export function deriveVoluntary(reasonCode: string): TerminationVoluntary {
  const canonical = normalizeTerminationReason(reasonCode);
  return TERMINATION_LOGIC[canonical].voluntary ? 'voluntary' : 'involuntary';
}

export type TerminationRequestFormValues = {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly requestedLastDay: string;
  readonly reasonCode: string;
  readonly reasonText?: string;
  readonly reasonForTermination?: string;
  readonly transferOutTo?: string;
  readonly okToRehire?: boolean;
  readonly additionalInfo?: string;
  readonly personalEmail?: string;
  readonly attachments?: readonly AttachedFile[];
};

export type TerminationRequestSubmitter = {
  readonly id: string;
  readonly name: string;
  readonly role: TerminationRequestSubmitterRole;
  readonly sourceRoute: TerminationRequestSourceRoute;
};

export function buildTerminationRequestPayload(
  formValues: TerminationRequestFormValues,
  submitter: TerminationRequestSubmitter,
) {
  const reasonCode = normalizeTerminationReason(formValues.reasonCode);
  return {
    employeeId: formValues.employeeId,
    employeeName: formValues.employeeName,
    requestedLastDay: formValues.requestedLastDay,
    terminationDate: deriveTermination(formValues.requestedLastDay).terminationDate,
    reasonCode,
    reasonText: formValues.reasonText?.trim() || undefined,
    reasonForTermination: formValues.reasonForTermination,
    voluntary: deriveVoluntary(reasonCode),
    transferOutTo: formValues.transferOutTo,
    okToRehire: formValues.okToRehire,
    additionalInfo: formValues.additionalInfo?.trim() || undefined,
    personalEmail: formValues.personalEmail,
    attachments: formValues.attachments?.length ? [...formValues.attachments] : undefined,
    submittedBy: {
      id: submitter.id,
      name: submitter.name,
      role: submitter.role,
    },
    sourceRoute: submitter.sourceRoute,
  };
}

export type ApprovedTerminationCommitRequest = {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly requestedLastDay: string;
  readonly terminationDate?: string;
  readonly reasonCode: string;
  readonly reasonForTermination?: string;
  readonly voluntary?: TerminationVoluntary;
  readonly transferOutTo?: string;
  readonly okToRehire?: boolean;
  readonly additionalInfo?: string;
  readonly personalEmail?: string;
};

export function commitApprovedTermination(request: ApprovedTerminationCommitRequest): void {
  const extraNote = [
    request.additionalInfo,
    request.reasonForTermination ? `เหตุผล: ${request.reasonForTermination}` : '',
    request.voluntary ? `ประเภท: ${request.voluntary === 'voluntary' ? 'Voluntary' : 'Involuntary'}` : '',
    request.transferOutTo ? `โอนย้ายไป: ${request.transferOutTo}` : '',
    request.personalEmail ? `อีเมลส่วนตัว: ${request.personalEmail}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const event = {
    id: `evt-term-${Date.now()}`,
    employeeId: request.employeeId,
    kind: 'terminate',
    effectiveDate: request.requestedLastDay,
    recordedAt: new Date().toISOString(),
    actorUserId: 'approval-flow',
    reasonCode: normalizeTerminationReason(request.reasonCode),
    lastDay: request.requestedLastDay,
    okToRehire: request.okToRehire === true,
    notes: extraNote || undefined,
  } satisfies TerminateEvent;

  useTimelines.getState().append(request.employeeId, event);
  useEmployees.getState().updateEmployee(request.employeeId, { status: 'terminated' });
}

export { TERMINATION_LOGIC_CODES };
