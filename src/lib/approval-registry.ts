// approval-registry — PR-1a (clickable-HRMS): canonical bridge over the 6
// heterogeneous approval stores. STATELESS function map — holds NO request
// state (no create()/useState/module-level mutable request array). Truth lives
// in the source stores; this module only routes.
//
// Architecture (plan §Architecture, locked):
//   APPROVAL_REGISTRY: Record<RequestType, ApprovalAdapter>
// Totality over all 6 RequestType values is type-enforced by Record<RequestType, …>
// so `tsc --noEmit` fails if any key is missing (AC-1a.2).
//
// Actor-shape divergence ({id,name} vs {role,name} vs {name}) is handled inside
// each adapter via a small per-adapter actor adapter — call sites stay dumb.

import type { ClaimDetails, PendingRequest, RequestType, Urgency } from '@/lib/quick-approve-api';
// ProbationCase stays TYPE-ONLY (no runtime cycle). The probation accessors are a
// safe value import: use-probation imports nothing from this module (one-way edge).
import type { ProbationCase } from '@/hooks/use-probation';
import { useProbationCases, getProbationCases } from '@/hooks/use-probation';
import {
  useBenefitClaimsStore,
  BENEFIT_STATUS_LABEL,
  BENEFIT_TYPE_LABEL,
  isSeededQueueClaim,
  type BenefitClaimRequest,
} from '@/stores/benefit-claims';
import {
  useLeaveApprovals,
  leaveStageLabel,
  LEAVE_TYPE_LABEL,
  type LeaveRequest,
} from '@/stores/leave-approvals';
import { getLeaveType } from '@/lib/time/leave-types';
import { isCancellableByCycle, demoToday } from '@/lib/time/period';
import { formatDate } from '@/lib/date';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import { useProbationApprovals } from '@/stores/probation-approvals';
import { useTransferApprovals } from '@/stores/transfer-approvals';
import { usePayRateApprovals, type PayRateRequest } from '@/stores/pay-rate-approvals';
import {
  useBenefitTaxPlanningStore,
  type TaxPlanningDraft,
} from '@/stores/benefit-tax-planning';
import {
  useTimeCorrections,
  type TimeCorrectionRequest,
  CORRECTION_TYPE_LABEL,
  TIME_CORRECTION_STEP_LABEL,
} from '@/stores/time-corrections';
import { getCorrectionReason } from '@/lib/time/correction-reasons';
import {
  useOvertimeRequests,
  queueRowToOTRequest,
  OT_STATUS_LABEL,
  type OTRequest,
} from '@/stores/overtime-requests';
import { OT_TYPES, type OtTypeCode } from '@/lib/time/ot-types';
import {
  useTerminationApprovals,
  type TerminationActorRole,
  type TerminationRequest,
} from '@/stores/termination-approvals';
import { useShiftAssignment } from '@/stores/shift-assignment';
import {
  assignedMemberCount,
  filledCellCount,
  formatMonthLabel,
  resolveEmpName,
  type ShiftGroup,
} from '@/lib/shift-groups';

// ── Actor (caller-facing) ─────────────────────────────────────────────────────
// Call sites pass one neutral actor shape; each adapter maps it to the store's
// own actor signature ({id,name} / {role,name} / {name}).
export interface ApprovalActor {
  id?: string;
  name: string;
  role?: string;
}

// ── Adapter contract ──────────────────────────────────────────────────────────
export interface ApprovalAdapter<Record_ = unknown> {
  /** Map a source-store record into the queue's PendingRequest shape. */
  toQueueItem: (record: Record_) => PendingRequest;
  /** Approve by id; reaches a terminal OR next-pending state without throwing. */
  approve: (id: string, actor: ApprovalActor) => void | Promise<void>;
  /** Reject by id with a reason; never throws. */
  reject: (id: string, actor: ApprovalActor, reason: string) => void | Promise<void>;
  /**
   * Idempotent seed hook. Orchestrated EXCLUSIVELY by ensureDemoSeed() (single
   * seed authority, plan R1) — NOT called on quick-approve mount. Receives the
   * canonical queue rows for this RequestType (APPROVAL_SEED_BY_TYPE) and writes
   * them into the source store via init-overwrite-empties.
   */
  seed: (fixtures?: PendingRequest[]) => void;
  labels: { th: string; en: string };
  /**
   * STA-175 — employee self-cancel before first approval. Absent ⇒ this type is
   * NOT self-cancellable (admin-initiated types omit it). Never throws.
   */
  cancel?: (id: string, actor: ApprovalActor) => void | Promise<void>;
  /**
   * STA-175 — true when `record` is still at its first approval stage with no
   * approver acted (so the employee may self-cancel). Absent ⇒ not cancellable.
   */
  isCancellable?: (record: Record_) => boolean;
}

// ── Lifted helpers (from quick-approve-page.tsx) ───────────────────────────────
// Lifted verbatim so the registry owns the bridge logic. Re-exported from the
// original location for back-compat (quick-approve-page.tsx useMemos at ~:317/:327).

// Probation cases live in their own mock store (PR #135) — adapt the pending
// ones into PendingRequest shape so they interleave with the other workflow
// approvals. Drill-in is special-cased to /workflows/probation/<id>.
//
// STA-238 — relocated from the legacy (unrouted) quick-approve-page.tsx so the
// registry owns the queue-eligibility rule. A probation case is queue-pending when
// it is awaiting the manager or HR (incl. a CEO escalation). `sent_back` maps to
// pending at the manager step but is intentionally NOT surfaced here (mirrors the
// prior behavior).
export function isProbationPending(c: ProbationCase): boolean {
  return (
    c.status === 'pending_manager' ||
    c.status === 'pending_hr' ||
    c.status === 'escalated_ceo'
  );
}

export function probationToPendingRequest(c: ProbationCase): PendingRequest {
  const slaMs = new Date(c.slaDeadline).getTime() - Date.now();
  const slaHours = slaMs / (1000 * 60 * 60);
  const urgency: Urgency = slaHours < 12 ? 'urgent' : slaHours < 48 ? 'normal' : 'low';
  const waitingDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(c.submittedAt ?? c.hireDate).getTime()) / 86400000),
  );
  const managerStatus =
    c.status === 'pending_manager' ? 'pending'
    // STA-23: sent_back returns the case to the manager's court → still 'pending' (explicit, no behavior change).
    : c.status === 'sent_back' ? 'pending'
    : c.status === 'pending_hr' || c.status === 'escalated_ceo' || c.status === 'approved' ? 'approved'
    : 'pending';
  const hrStatus =
    c.status === 'pending_hr' || c.status === 'escalated_ceo' ? 'pending'
    // STA-23: sent_back is awaiting the manager again, so HR has not yet approved → 'pending'.
    : c.status === 'sent_back' ? 'pending'
    : c.status === 'approved' ? 'approved'
    : 'pending';
  return {
    id: c.id,
    type: 'probation',
    requester: {
      id: c.employeeId,
      employeeId: c.employeeId,
      name: c.fullNameTh,
      position: c.position,
      department: c.department,
    },
    description: `อนุมัติผลทดลองงาน — ${c.fullNameTh}`,
    submittedAt: c.submittedAt ?? c.hireDate,
    urgency,
    waitingDays,
    details: {},
    approvalTimeline: [
      { step: 1, approver: 'หัวหน้างาน', status: managerStatus },
      { step: 2, approver: 'HR Director', status: hrStatus },
    ],
  };
}

// STA-28 PR-A — read-side bridge: surface pending_manager_approval benefit claims
// alongside legacy PendingRequest items. No store mutation, no schema change.
export function benefitClaimToPendingRequest(c: BenefitClaimRequest): PendingRequest {
  const slaMs = 72 * 60 * 60 * 1000; // 72-hour SLA for manager approval
  const elapsedMs = Date.now() - new Date(c.submittedAt).getTime();
  const slaHours = elapsedMs / (1000 * 60 * 60);
  const urgency: Urgency = slaHours > 48 ? 'urgent' : slaHours > 24 ? 'normal' : 'low';
  const waitingDays = Math.max(0, Math.floor(elapsedMs / 86400000));
  // slaMs retained for parity with the original (intentionally unused beyond
  // documenting the SLA window).
  void slaMs;
  return {
    id: c.id,
    type: 'claim',
    requester: {
      id: c.employeeId,
      employeeId: c.employeeId,
      name: c.employeeName,
      position: c.benefitName,
      department: c.businessUnit,
    },
    description: `เบิกสวัสดิการ ${c.benefitName} — ฿${c.totalClaimAmount.toLocaleString('th-TH')}`,
    submittedAt: c.submittedAt,
    urgency,
    waitingDays,
    // STA-79: surface receipt attachments + the rich filter facets the claim-approve
    // workspace reads (company / business-unit / event-reason / requested-for / etc.).
    attachments: c.attachments.map((file) => file.filename ?? file.name ?? 'attachment'),
    filterMeta: {
      eventReason: c.benefitType,
      requestedFor: c.employeeName,
      effectiveDate: c.receiptDate,
      initiatedBy: c.employeeName,
      initiatedDate: c.submittedAt.slice(0, 10),
      company: c.company,
      businessUnit: c.businessUnit,
      department: c.businessUnit,
      assignment: 'Manager approval',
    },
    // STA-128: surface the claim total structurally so the queue's ยอดเบิกรวม
    // column reads row.details.totalClaimAmount instead of parsing the description.
    details: { totalClaimAmount: c.totalClaimAmount },
    approvalTimeline: [
      { step: 1, approver: 'หัวหน้างาน', status: 'pending' },
      { step: 2, approver: 'SPD Benefits', status: 'pending' },
    ],
  };
}

// P2 (pay-rate + tax-planning into the unified queue) — read-side bridges.
// Both stores live OUTSIDE the legacy quick-approve umbrella; these mappers
// reconstruct a PendingRequest display row so the records interleave in the
// unified inbox. No store mutation, no schema change.

// pay_rate → pay-rate-approvals: SPD review chain. Timeline first step is the SPD
// approver (NOT the manager), so canActOn() lets only senior approvers act and a
// plain manager sees it VIEW-ONLY. Drill-in is special-cased to
// /workflows/pay-rate/<id>.
export function payRateToPendingRequest(r: PayRateRequest): PendingRequest {
  const elapsedMs = Date.now() - new Date(r.submittedAt).getTime();
  const slaHours = elapsedMs / (1000 * 60 * 60);
  const urgency: Urgency = slaHours > 48 ? 'urgent' : slaHours > 24 ? 'normal' : 'low';
  const waitingDays = Math.max(0, Math.floor(elapsedMs / 86400000));
  return {
    id: r.id,
    type: 'pay_rate',
    requester: {
      id: r.employeeId,
      employeeId: r.employeeId,
      name: r.employeeName,
      position: r.payComponent,
      department: r.payGroup,
    },
    description: `ปรับเงินเดือน — ${r.employeeName} (${r.amountType === 'percent' ? `${r.amount}%` : `฿${r.amount.toLocaleString('th-TH')}`})`,
    submittedAt: r.submittedAt,
    urgency,
    waitingDays,
    details: {},
    approvalTimeline: [{ step: 1, approver: 'SPD', status: 'pending' }],
  };
}

// tax_planning → benefit-tax-planning: a rich 8-state machine collapsed to
// pending/approved/rejected. Payroll is the routed approver (not the manager), so
// canActOn() keeps it VIEW-ONLY for a plain manager. Drill-in is special-cased to
// /workflows/tax-planning/<id>.
export function taxPlanToPendingRequest(d: TaxPlanningDraft): PendingRequest {
  const submittedAt = d.submittedAt ?? d.updatedAt;
  const elapsedMs = Date.now() - new Date(submittedAt).getTime();
  const slaHours = elapsedMs / (1000 * 60 * 60);
  const urgency: Urgency = slaHours > 48 ? 'urgent' : slaHours > 24 ? 'normal' : 'low';
  const waitingDays = Math.max(0, Math.floor(elapsedMs / 86400000));
  return {
    id: d.id,
    type: 'tax_planning',
    requester: {
      id: d.employeeId,
      employeeId: d.employeeId,
      name: d.employeeName,
      position: `ปีภาษี ${d.taxYear}`,
      department: 'Payroll review',
    },
    description: `วางแผนภาษี — ${d.employeeName} · ${d.maskedTaxId}`,
    submittedAt,
    urgency,
    waitingDays,
    details: {},
    approvalTimeline: [{ step: 1, approver: 'Payroll', status: 'pending' }],
  };
}

// P3 — time_correction → time-corrections store. Employee self-service correction
// of a timesheet/attendance punch. Manager (first-line) is the routed approver, so
// the timeline's first step is `หัวหน้างาน` → canActOn() lets a team manager act and
// a non-approver sees it VIEW-ONLY. Drill-in is special-cased to
// /workflows/time-correction/<id>.
export function timeCorrectionToPendingRequest(r: TimeCorrectionRequest): PendingRequest {
  const elapsedMs = Date.now() - new Date(r.submittedAt).getTime();
  const slaHours = elapsedMs / (1000 * 60 * 60);
  const urgency: Urgency = slaHours > 48 ? 'urgent' : slaHours > 24 ? 'normal' : 'low';
  const waitingDays = Math.max(0, Math.floor(elapsedMs / 86400000));
  const typeLabel = CORRECTION_TYPE_LABEL[r.correctionType]?.th ?? r.correctionType;
  const reasonLabel = getCorrectionReason(r.reasonCode)?.reasonTh ?? r.reasonCode;
  return {
    id: r.id,
    type: 'time_correction',
    requester: {
      id: r.employeeId,
      employeeId: r.employeeId,
      name: r.employeeName,
      position: reasonLabel,
      department: r.department,
    },
    // Convention X (multi-day): when the request carries days 1..n, summarize the
    // N-day span (N = 1 + days.length) as ONE queue item. A single-day request
    // (no `days`) keeps the EXACT original string (byte-identical).
    description: r.days?.length
      ? `แก้ไขเวลา (${typeLabel}) — ${r.date} +${r.days.length} วัน`
      : r.correctionType === 'both'
        ? `แก้ไขเวลา (เข้า-ออก) — ${r.date} · เข้า ${r.originalClockIn ?? r.originalTime ?? '—'}→${r.correctedClockIn ?? r.correctedTime} · ออก ${r.originalClockOut ?? '—'}→${r.correctedClockOut ?? '—'}`
        : `แก้ไขเวลา (${typeLabel}) — ${r.date} · ${r.correctedTime}`,
    submittedAt: r.submittedAt,
    urgency,
    waitingDays,
    details: {},
    approvalTimeline: [{ step: 1, approver: 'หัวหน้างาน', status: 'pending' }],
  };
}

// Group B — OT → overtime-requests store. Employee self-service OT request.
// Manager (first-line) is the routed approver, so the timeline's first step is
// `หัวหน้างาน` → canActOn() lets a team manager act and a non-approver sees it
// VIEW-ONLY. Drill-in is special-cased to /workflows/ot/<id>.
function otTypeLabelTh(code: OtTypeCode): string {
  return OT_TYPES.find((t) => t.code === code)?.nameTh ?? code;
}

export function otToPendingRequest(req: OTRequest): PendingRequest {
  const submittedAt = req.submittedAt ?? new Date().toISOString();
  const elapsedMs = Date.now() - new Date(submittedAt).getTime();
  const slaHours = elapsedMs / (1000 * 60 * 60);
  const urgency: Urgency = slaHours > 48 ? 'urgent' : slaHours > 24 ? 'normal' : 'low';
  const waitingDays = Math.max(0, Math.floor(elapsedMs / 86400000));
  const day = (req.startAt ?? '').slice(0, 10);
  return {
    id: req.id,
    type: 'overtime',
    requester: {
      id: req.employeeId,
      employeeId: req.employeeId,
      name: req.employeeName,
      position: otTypeLabelTh(req.otType),
      department: req.department,
    },
    description: `OT — ${req.employeeName}${day ? ` · ${day}` : ''} · ${req.hours} ชม.`,
    submittedAt,
    urgency,
    waitingDays,
    attachments: req.docs && req.docs.length > 0 ? req.docs : undefined,
    details: {},
    approvalTimeline: [{ step: 1, approver: 'หัวหน้างาน', status: 'pending' }],
  };
}

// Resignation (offboarding chain BRD #172) → termination-approvals store. An
// employee-submitted resignation sits at `pending_manager`; the manager is the
// routed first-line approver. The locked `RequestType` union has no `resignation`
// member (time-module handoff forbids adding one), so resignations ride the
// existing `change_request` vehicle. The row keeps its TR-* id; detailHref +
// the change_request adapter both detect a TR-* id to route to the dedicated
// resignation surface. Drill-in is special-cased to /workflows/resignation/<id>.
export function terminationToPendingRequest(r: TerminationRequest): PendingRequest {
  const elapsedMs = Date.now() - new Date(r.submittedAt).getTime();
  const slaHours = elapsedMs / (1000 * 60 * 60);
  const urgency: Urgency = slaHours > 48 ? 'urgent' : slaHours > 24 ? 'normal' : 'low';
  const waitingDays = Math.max(0, Math.floor(elapsedMs / 86400000));
  return {
    id: r.id,
    type: 'change_request',
    requester: {
      id: r.submittedBy.id,
      employeeId: r.employeeId,
      name: r.employeeName,
      position: 'คำขอลาออก',
      department: '',
    },
    description: `คำขอลาออก · ${r.employeeName}`,
    submittedAt: r.submittedAt,
    urgency,
    waitingDays,
    details: {},
    approvalTimeline: [
      { step: 1, approver: 'หัวหน้างาน', status: 'pending' },
      { step: 2, approver: 'SPD', status: 'pending' },
    ],
  };
}

/** True when an id belongs to a resignation (termination-approvals) record. */
export function isTerminationId(id: string): boolean {
  return useTerminationApprovals.getState().requests.some((r) => r.id === id);
}

function approvalActorToTerminationRole(role: string | undefined): TerminationActorRole {
  switch (role) {
    case 'employee':
    case 'manager':
    case 'hrbp':
    case 'spd':
    case 'hr_admin':
    case 'hr_manager':
    case 'hr':
      return role;
    default:
      return 'manager';
  }
}

// STA-168 — shift_assignment → shift-assignment store. A manager's submitted
// month-grid ShiftGroup collapses into ONE queue row exactly as the
// time_correction adapter collapses a multi-day correction into one row: the
// summary reads the group's month + member/shift counts (the "list of cells" at
// larger N). The routed approver is HRBP/HR, so the timeline's first step reads
// `ฝ่ายบุคคล (HRBP)`. Drill-in is special-cased (detailHref) to the review grid
// at /team/shift-assign?group=<id>&review=1.
export function shiftGroupToPendingRequest(g: ShiftGroup): PendingRequest {
  const submittedAt = g.submittedAt ?? g.createdAt;
  const elapsedMs = Date.now() - new Date(submittedAt).getTime();
  const slaHours = elapsedMs / (1000 * 60 * 60);
  const urgency: Urgency = slaHours > 48 ? 'urgent' : slaHours > 24 ? 'normal' : 'low';
  const waitingDays = Math.max(0, Math.floor(elapsedMs / 86400000));
  const managerId = g.managerIds[0] ?? '';
  return {
    id: g.id,
    type: 'shift_assignment',
    requester: {
      id: managerId,
      employeeId: managerId,
      name: resolveEmpName(managerId),
      position: 'จัดกะให้พนักงาน',
      department: '',
    },
    // Collapse the whole month grid into one summary line (month + N members · M shifts).
    description: `จัดกะ (${formatMonthLabel(g.month, 'th')}) — ${assignedMemberCount(g)} คน · ${filledCellCount(g)} กะ`,
    submittedAt,
    urgency,
    waitingDays,
    details: {},
    approvalTimeline: [{ step: 1, approver: 'ฝ่ายบุคคล (HRBP)', status: 'pending' }],
  };
}

// ── Shared queue-item shape for store records lacking a bespoke bridge ─────────
// leave / overtime / change_request stores expose simpler records; map them to a
// minimal PendingRequest so they interleave in the queue. (Full field mapping is
// PR-1b's concern; PR-1a just needs a total, type-correct adapter set.)
function genericToQueueItem(
  type: RequestType,
  record: { id: string; submittedAt?: string },
): PendingRequest {
  const submittedAt = record.submittedAt ?? new Date().toISOString();
  const elapsedMs = Date.now() - new Date(submittedAt).getTime();
  return {
    id: record.id,
    type,
    requester: { id: '', name: '', position: '', department: '' },
    description: '',
    submittedAt,
    urgency: 'normal',
    waitingDays: Math.max(0, Math.floor(elapsedMs / 86400000)),
    details: {},
    approvalTimeline: [],
  };
}

// ── Registry (stateless map) ───────────────────────────────────────────────────
// Typed as Record<RequestType, ApprovalAdapter> → totality is compile-enforced.
export const APPROVAL_REGISTRY: Record<RequestType, ApprovalAdapter> = {
  // leave → leave-approvals: native fit. approve({id,name}) / reject({id,name},reason).
  leave: {
    toQueueItem: (record) =>
      genericToQueueItem('leave', record as { id: string; submittedAt?: string }),
    approve: (id, actor) =>
      useLeaveApprovals.getState().approve(id, { id: actor.id ?? '', name: actor.name }),
    reject: (id, actor, reason) =>
      useLeaveApprovals.getState().reject(id, { id: actor.id ?? '', name: actor.name }, reason),
    seed: (fixtures = []) => useLeaveApprovals.getState().seedFromQueue(fixtures),
    labels: { th: 'ลา', en: 'Leave' },
    cancel: (id, actor) =>
      useLeaveApprovals.getState().cancel(id, { id: actor.id ?? '', name: actor.name }),
    isCancellable: (record) => {
      const r = record as LeaveRequest;
      // STA-183 — cycle-window rule (supersedes STA-157 first-approval gate).
      if (r.status === 'rejected' || r.status === 'cancelled') return false;
      return isCancellableByCycle(r.startDate, demoToday());
    },
  },

  // overtime → overtime-requests (single-step manager). Group B: OT now has its
  // OWN store (no more leave-store reuse + 'OT' reason hack). approve/reject by
  // {name}; seed converts the canonical queue rows into native OTRequests.
  overtime: {
    toQueueItem: (record) => otToPendingRequest(record as OTRequest),
    approve: (id, actor) =>
      useOvertimeRequests.getState().approve(id, { id: actor.id, name: actor.name }),
    reject: (id, actor, reason) =>
      useOvertimeRequests.getState().reject(id, { id: actor.id, name: actor.name }, reason),
    seed: (fixtures = []) =>
      useOvertimeRequests.getState().seedFromQueue(fixtures.map(queueRowToOTRequest)),
    labels: { th: 'โอที', en: 'Overtime' },
    cancel: (id, actor) =>
      useOvertimeRequests.getState().cancel(id, { id: actor.id, name: actor.name }),
    isCancellable: (record) => {
      const r = record as OTRequest;
      // STA-183 — cycle-window rule (supersedes the pending-only gate).
      if (r.status === 'rejected' || r.status === 'cancelled') return false;
      return isCancellableByCycle((r.startAt ?? '').slice(0, 10), demoToday());
    },
  },

  // claim → benefit-claims: managerApprove/managerSendBack return Promises — the
  // adapter MUST await them so approve(id) reaches a terminal state (AC-1a.3).
  claim: {
    toQueueItem: (record) => benefitClaimToPendingRequest(record as BenefitClaimRequest),
    approve: (id, actor) => useBenefitClaimsStore.getState().managerApprove(id, actor.name),
    reject: (id, actor, reason) =>
      useBenefitClaimsStore.getState().managerSendBack(id, actor.name, reason),
    seed: (fixtures = []) => useBenefitClaimsStore.getState().seedQueueClaims(fixtures),
    labels: { th: 'เบิก', en: 'Claim' },
    cancel: (id, actor) => useBenefitClaimsStore.getState().cancel(id, actor.name),
    isCancellable: (record) => {
      const c = record as BenefitClaimRequest;
      // First-approval (pre-manager) OR send_back (returned to the employee).
      return c.status === 'pending_manager_approval' || c.status === 'send_back';
    },
  },

  // transfer → dedicated `transfer-approvals` terminal-marker slice (plan R2). No
  // domain transfer schema exists, so approve/reject write a terminal marker
  // (id → 'approved'|'rejected', persisted) and `selectPendingApprovals()` reads it
  // to drop the row OUT of `pending` so it never re-renders approvable (AC-1c.3).
  transfer: {
    toQueueItem: (record) =>
      genericToQueueItem('transfer', record as { id: string; submittedAt?: string }),
    approve: (id, _actor) => useTransferApprovals.getState().markApproved(id),
    reject: (id, _actor, _reason) => useTransferApprovals.getState().markRejected(id),
    seed: (fixtures = []) => useTransferApprovals.getState().seedFromQueue(fixtures),
    labels: { th: 'ย้าย', en: 'Transfer' },
  },

  // change_request → workflow-approvals: approve({role,name}) + multi-step nextStep.
  // NOT cnext-requests-slice (which has only submit/setFilter). Default role 'spd'
  // since the canonical personal-info chain is the SPD single step (BRD #166).
  change_request: {
    toQueueItem: (record) =>
      genericToQueueItem('change_request', record as { id: string; submittedAt?: string }),
    // Resignations (BRD #172) ride this vehicle: a TR-* id dispatches to the
    // termination store's manager step (pending_manager → pending_spd) instead of
    // the workflow store. Everything else stays the personal-info SPD chain.
    approve: (id, actor) => {
      if (isTerminationId(id)) {
        useTerminationApprovals
          .getState()
          .approveByManager(id, { role: 'manager', name: actor.name });
        return;
      }
      useWorkflowApprovals
        .getState()
        .approve(id, { role: (actor.role as never) ?? ('spd' as never), name: actor.name });
    },
    reject: (id, actor, reason) => {
      if (isTerminationId(id)) {
        useTerminationApprovals
          .getState()
          .sendBack(id, reason, {
            role: approvalActorToTerminationRole(actor.role),
            name: actor.name,
          });
        return;
      }
      useWorkflowApprovals
        .getState()
        .reject(id, { role: (actor.role as never) ?? ('spd' as never), name: actor.name }, reason);
    },
    seed: (fixtures = []) => useWorkflowApprovals.getState().seedFromQueue(fixtures),
    labels: { th: 'เปลี่ยนข้อมูล', en: 'Change' },
  },

  // pay_rate → pay-rate-approvals: approve({role,name}) / reject({role,name},reason).
  // SPD-chain. Default role 'spd' (the routed pay-rate approver) when the neutral
  // actor omits one. Seed is a no-op: pay-rate records are created by the submit
  // form; ensureDemoSeed injects a few demo records directly into the store.
  pay_rate: {
    toQueueItem: (record) => payRateToPendingRequest(record as PayRateRequest),
    approve: (id, actor) =>
      usePayRateApprovals
        .getState()
        .approve(id, { role: (actor.role as never) ?? ('spd' as never), name: actor.name }),
    reject: (id, actor, reason) =>
      usePayRateApprovals
        .getState()
        .reject(id, { role: (actor.role as never) ?? ('spd' as never), name: actor.name }, reason),
    seed: () => {
      // No-op: pay-rate records originate from the submit form (admin/employees/
      // [id]/pay-rate-change). Demo rows are injected by ensureDemoSeed directly.
    },
    labels: { th: 'ปรับเงินเดือน', en: 'Pay rate' },
  },

  // tax_planning → benefit-tax-planning: an 8-state machine. The unified queue only
  // needs approve/reject; the store's transition guard requires the draft be under
  // Payroll review, so the adapter advances it through start_review first when it is
  // still `submitted_payroll` (mock dispatch — never throws). Seed is a no-op.
  tax_planning: {
    toQueueItem: (record) => taxPlanToPendingRequest(record as TaxPlanningDraft),
    approve: (id, actor) => {
      const store = useBenefitTaxPlanningStore.getState();
      const draft = store.drafts.find((d) => d.id === id);
      if (!draft) return;
      const payrollActor = { role: 'payroll' as const, name: actor.name };
      if (draft.status === 'submitted_payroll') store.startPayrollTaxPlanningReview(id, payrollActor);
      const fresh = useBenefitTaxPlanningStore.getState().drafts.find((d) => d.id === id);
      if (fresh && fresh.status === 'payroll_reviewing') {
        store.approvePayrollTaxPlanningReview(id, payrollActor);
      }
    },
    reject: (id, actor, reason) => {
      const store = useBenefitTaxPlanningStore.getState();
      const draft = store.drafts.find((d) => d.id === id);
      if (!draft) return;
      const payrollActor = { role: 'payroll' as const, name: actor.name };
      if (draft.status === 'submitted_payroll') store.startPayrollTaxPlanningReview(id, payrollActor);
      const fresh = useBenefitTaxPlanningStore.getState().drafts.find((d) => d.id === id);
      if (fresh && fresh.status === 'payroll_reviewing') {
        store.rejectPayrollTaxPlanningReview(id, payrollActor, reason || 'ไม่รับแผนภาษี');
      }
    },
    seed: () => {
      // No-op: tax-planning drafts originate from the employee tax-planning form.
      // Demo rows are injected by ensureDemoSeed directly into the store.
    },
    labels: { th: 'วางแผนภาษี', en: 'Tax planning' },
  },

  // time_correction → time-corrections: manager (first-line) approve/reject by
  // {name}. Native fit — the store's approve/reject already take an actor name and
  // flip status to approved/rejected. Seed is a no-op: records originate from the
  // employee /time/corrections form.
  time_correction: {
    toQueueItem: (record) => timeCorrectionToPendingRequest(record as TimeCorrectionRequest),
    approve: (id, actor) => useTimeCorrections.getState().approve(id, { name: actor.name }),
    reject: (id, actor, reason) =>
      useTimeCorrections.getState().reject(id, { name: actor.name }, reason),
    seed: () => {
      // No-op: time-correction records are created by the employee correction
      // form (/time/corrections). No demo rows are seeded into the unified queue.
    },
    labels: { th: 'แก้ไขเวลา', en: 'Time correction' },
    cancel: (id, actor) => useTimeCorrections.getState().cancel(id, { name: actor.name }),
    isCancellable: (record) => {
      const r = record as TimeCorrectionRequest;
      // STA-183 — cycle-window rule (supersedes the pending_manager-only gate).
      if (r.status === 'rejected' || r.status === 'cancelled') return false;
      return isCancellableByCycle(r.date, demoToday());
    },
  },

  // probation → probation-approvals: approveEvaluation(id,{name}) / rejectEvaluation.
  probation: {
    toQueueItem: (record) => probationToPendingRequest(record as ProbationCase),
    approve: (id, actor) =>
      useProbationApprovals.getState().approveEvaluation(id, { name: actor.name }),
    reject: (id, actor, reason) =>
      useProbationApprovals.getState().rejectEvaluation(id, { name: actor.name }, reason),
    seed: () => {
      // No-op: the 20 canonical queue rows contain ZERO probation rows, so there
      // is nothing to seed here. probation-approvals keeps its own empty init;
      // the manager queue surfaces probation via the existing use-probation cases
      // on the legacy page, not through the seeded unified inbox.
    },
    labels: { th: 'ทดลองงาน', en: 'Probation' },
  },

  // shift_assignment → shift-assignment: a manager's submitted month-grid. Mirrors
  // time_correction (multi-record → one row). approve flips the group pending →
  // approved; reject uses the `sent_back`-style returnForRevision(note). Seed is a
  // no-op: ShiftGroups originate from the store's own seed.
  shift_assignment: {
    toQueueItem: (record) => shiftGroupToPendingRequest(record as ShiftGroup),
    approve: (id) => useShiftAssignment.getState().approve(id, { name: '' }),
    reject: (id, _actor, reason) =>
      useShiftAssignment.getState().returnForRevision(id, reason || 'ส่งกลับเพื่อแก้ไข'),
    seed: () => {
      // No-op: ShiftGroups are seeded by the store itself (SHIFT_GROUP_SEED).
    },
    labels: { th: 'จัดกะ', en: 'Shift assignment' },
  },
};

// ── selectPendingApprovals — fan-IN from the seeded stores → queue view ─────────
// The live inbox derives from this selector instead of the static
// MOCK_PENDING_REQUESTS array (plan PR-1b). Each seeded source record carries a
// `queueSnapshot` (the canonical PendingRequest) so the rendered row is identical;
// the store's own status enum drives the collapse.

/** Collapsed 3-state status for the unified inbox's filter tabs (AC-1b.1). */
export type QueueStatus = 'pending' | 'approved' | 'rejected';

export interface QueueApproval {
  /** Canonical display row (verbatim from the seed). */
  row: PendingRequest;
  /** Collapsed status — pending_spd/pending_hr/pending_manager(_approval) → pending. */
  status: QueueStatus;
  /**
   * PR-1c (AC-1c.2/1c.3): true when the first approver has acted but a later step
   * is still pending (e.g. a benefit claim that the manager approved → now
   * `pending_spd`). The collapsed `status` stays `pending`, but the row renders an
   * explicit "awaiting next approver" chip instead of silently looking unactioned.
   */
  awaitingNext?: boolean;
}

/**
 * Collapse any store status enum to the 3-state queue status. Every pending_*
 * variant (pending_spd / pending_hr / pending_manager / pending_manager_approval)
 * folds to `pending`; approved/rejected pass through; anything else (e.g.
 * send_back) is treated as still-pending so the row stays actionable (AC-1b.1).
 */
export function collapseQueueStatus(raw: string | undefined): QueueStatus {
  if (raw === 'approved') return 'approved';
  if (raw === 'rejected') return 'rejected';
  return 'pending';
}

/**
 * STA-175 — a request the employee cancelled is terminal; it must drop out of the
 * approver queue. collapseQueueStatus's catch-all would otherwise re-tag a
 * 'cancelled' status as 'pending' and keep the row actionable in the inbox.
 * Centralizing the predicate keeps "miss one loop → that type's cancelled rows
 * silently stay in the inbox" to ONE site (invoked in every self-cancellable loop).
 */
const isCancelledStatus = (s: string | undefined): boolean => s === 'cancelled';

function claimAttachmentNames(claim: BenefitClaimRequest): string[] {
  return claim.attachments
    .map((file) => file.filename ?? file.name ?? '')
    .filter(Boolean);
}

function currentClaimDynamicFields(claim: BenefitClaimRequest, snapshotDetails: ClaimDetails) {
  return {
    ...(snapshotDetails.dynamicFields ?? {}),
    ...(claim.opdIpd ? { opdIpd: claim.opdIpd } : {}),
    ...(claim.hospitalType ? { hospitalType: claim.hospitalType } : {}),
    ...(claim.hospitalName ? { medicalHospitalName: claim.hospitalName } : {}),
    ...(claim.diseaseDetails ? { diseaseDetails: claim.diseaseDetails } : {}),
    ...(claim.dynamicFields ?? {}),
  };
}

function currentClaimDetails(claim: BenefitClaimRequest, snapshotDetails: ClaimDetails): ClaimDetails {
  return {
    ...snapshotDetails,
    amount: claim.totalClaimAmount,
    currency: claim.currency,
    category: claim.benefitName,
    merchant: claim.hospitalName ?? snapshotDetails.merchant,
    remainingAmount: claim.remainingAmount,
    receiptDate: claim.receiptDate,
    receiptNo: claim.receiptNo,
    receiptAmount: claim.receiptAmount,
    totalClaimAmount: claim.totalClaimAmount,
    remark: claim.remark,
    claimDate: claim.claimDate,
    benefitType: claim.benefitType,
    dynamicFields: currentClaimDynamicFields(claim, snapshotDetails),
  };
}

function claimQueueRow(claim: BenefitClaimRequest): PendingRequest | null {
  if (!claim.queueSnapshot) return null;
  const snapshotDetails = claim.queueSnapshot.details as ClaimDetails;
  const overlayCurrentFields = !isSeededQueueClaim(claim) || claim.version > 1;
  const attachments = claimAttachmentNames(claim);
  if (!overlayCurrentFields) return claim.queueSnapshot;
  const row: PendingRequest = {
    ...claim.queueSnapshot,
    requester: {
      ...claim.queueSnapshot.requester,
      id: claim.employeeId,
      employeeId: claim.employeeId,
      name: claim.employeeName,
      position: claim.personalGrade,
      department: claim.businessUnit,
      businessUnit: claim.businessUnit,
      company: claim.company,
      payGrade: claim.personalGrade,
    },
    submittedAt: claim.submittedAt,
    details: currentClaimDetails(claim, snapshotDetails),
    attachments: attachments.length > 0 ? attachments : claim.queueSnapshot.attachments,
  };
  return row;
}

/**
 * Fan IN from the seeded source stores into the queue's PendingRequest view.
 * Pure read — pass the store states in (caller subscribes via hooks/getState) so
 * this stays testable and SSR-safe. Returns the canonical 20 rows (or fewer if a
 * store was cleared), each tagged with its collapsed status.
 */
/**
 * Collapse the tax-planning 8-state machine to the 3-state queue status. Drafts
 * not yet submitted (`draft` / `estimated`) are NOT queue-eligible and are filtered
 * out before this is called; `cancelled` collapses to rejected (terminal).
 */
function collapseTaxPlanStatus(raw: string): QueueStatus {
  if (raw === 'approved') return 'approved';
  if (raw === 'rejected' || raw === 'cancelled') return 'rejected';
  return 'pending'; // submitted_payroll / payroll_reviewing / send_back
}

export function selectPendingApprovals(input: {
  leave: { id: string; status: string; queueSnapshot?: PendingRequest; awaitingNext?: boolean }[];
  workflow: { id: string; status: string; queueSnapshot?: PendingRequest }[];
  claims: BenefitClaimRequest[];
  transfers: { id: string; terminalStatus?: QueueStatus; snapshot: PendingRequest }[];
  payRates?: PayRateRequest[];
  taxPlans?: TaxPlanningDraft[];
  timeCorrections?: TimeCorrectionRequest[];
  overtime?: OTRequest[];
  terminations?: TerminationRequest[];
  shiftGroups?: ShiftGroup[];
  probationCases?: ProbationCase[];
}): QueueApproval[] {
  const out: QueueApproval[] = [];

  // leave rows live in the leave store. Group B: OT no longer rides this store —
  // it has its own `input.overtime` loop below.
  // Group A: a 2-level leave row carries `awaitingNext` once the manager approves;
  // it stays collapsed-`pending` but is now awaiting the HR step (currentStepIndex
  // reads awaitingNext to advance the chain — same idiom as the claim flow).
  for (const r of input.leave) {
    // STA-157 — a request the employee cancelled is terminal; drop it from the
    // approver queue (collapseQueueStatus's catch-all would otherwise re-tag it
    // 'pending' and keep it actionable).
    if (r.status === 'cancelled') continue;
    if (r.queueSnapshot)
      out.push({
        row: r.queueSnapshot,
        status: collapseQueueStatus(r.status),
        awaitingNext: r.awaitingNext,
      });
  }
  // change_request lives in the workflow store; only queueSnapshot rows are queue rows.
  for (const r of input.workflow) {
    if (r.queueSnapshot) out.push({ row: r.queueSnapshot, status: collapseQueueStatus(r.status) });
  }
  // claim rows are the benefit-claims records carrying a queueSnapshot. A claim
  // moves pending_manager_approval → pending_spd once the manager approves: it
  // stays collapsed-`pending`, but is now awaiting the NEXT approver (AC-1c.2).
  for (const r of input.claims) {
    if (isCancelledStatus(r.status)) continue;
    const row = claimQueueRow(r);
    if (row) {
      out.push({
        row,
        status: collapseQueueStatus(r.status),
        awaitingNext: r.status === 'pending_spd',
      });
    }
  }
  // transfer rows come from the dedicated terminal-marker slice (R2).
  for (const e of input.transfers) {
    out.push({ row: e.snapshot, status: e.terminalStatus ?? 'pending' });
  }
  // pay_rate rows derive natively from the pay-rate-approvals store (PayRateStep
  // already maps cleanly: pending_spd → pending, approved/rejected passthrough).
  for (const r of input.payRates ?? []) {
    out.push({
      row: APPROVAL_REGISTRY.pay_rate.toQueueItem(r),
      status: collapseQueueStatus(r.status),
    });
  }
  // tax_planning rows: only drafts that have been submitted for Payroll review are
  // queue-eligible (draft/estimated stay on the employee's own page).
  for (const d of input.taxPlans ?? []) {
    if (d.status === 'draft' || d.status === 'estimated') continue;
    out.push({
      row: APPROVAL_REGISTRY.tax_planning.toQueueItem(d),
      status: collapseTaxPlanStatus(d.status),
    });
  }

  // time_correction rows derive natively from the time-corrections store. Status
  // maps cleanly: pending_manager → pending, approved/rejected passthrough.
  for (const r of input.timeCorrections ?? []) {
    if (isCancelledStatus(r.status)) continue;
    out.push({
      row: APPROVAL_REGISTRY.time_correction.toQueueItem(r),
      status: collapseQueueStatus(r.status),
    });
  }

  // overtime rows derive natively from the overtime-requests store (Group B).
  // Status maps cleanly: pending → pending, approved/rejected passthrough.
  for (const r of input.overtime ?? []) {
    if (isCancelledStatus(r.status)) continue;
    out.push({
      row: APPROVAL_REGISTRY.overtime.toQueueItem(r),
      status: collapseQueueStatus(r.status),
    });
  }

  for (const r of input.terminations ?? []) {
    if (r.status !== 'pending_manager' && r.status !== 'pending_spd') continue;
    out.push({
      row: terminationToPendingRequest(r),
      status: 'pending',
      awaitingNext: r.status === 'pending_spd',
    });
  }

  // shift_assignment rows derive from the shift-assignment store. Only SUBMITTED
  // groups are queue-eligible: draft (not yet submitted) and returned (sent back
  // to the owning manager) stay off the approver's inbox — the same eligibility
  // rule tax-planning uses for draft/estimated. pending → pending; approved
  // passes through.
  for (const g of input.shiftGroups ?? []) {
    if (g.status === 'draft' || g.status === 'returned') continue;
    out.push({
      row: shiftGroupToPendingRequest(g),
      status: g.status === 'approved' ? 'approved' : 'pending',
    });
  }

  // probation rows derive from the use-probation MOCK_CASES (surfaced via the
  // reactive useProbationCases hook / non-reactive getProbationCases accessor).
  // Only cases awaiting the manager/HR are queue-eligible (isProbationPending).
  //
  // MOCKUP LIMITATION (STA-238): deciding a probation case on its review page
  // (/workflows/probation/[id]) mutates that page's EPHEMERAL local `useState`
  // (use-probation.ts useProbationCase) — NOT MOCK_CASES and NOT a shared store.
  // So an approved probation task will NOT reactively clear from this queue this
  // phase (3-store split, out of scope). Probation here = deep-link + review only;
  // demo the case-by-case CLEAR beat on a resignation row (its detail dispatches
  // approveByManager → useTerminationApprovals → the selector re-derives live).
  for (const c of input.probationCases ?? []) {
    if (!isProbationPending(c)) continue;
    out.push({ row: probationToPendingRequest(c), status: 'pending' });
  }

  // Stable order by submittedAt desc, then id, so the inbox renders deterministically.
  out.sort((a, b) => {
    const t = new Date(b.row.submittedAt).getTime() - new Date(a.row.submittedAt).getTime();
    return t !== 0 ? t : a.row.id.localeCompare(b.row.id);
  });
  return out;
}

/** Reactive hook — the live inbox subscribes to all four source stores. */
export function useSelectPendingApprovals(): QueueApproval[] {
  const leave = useLeaveApprovals((s) => s.requests);
  const workflow = useWorkflowApprovals((s) => s.requests);
  const claims = useBenefitClaimsStore((s) => s.claims);
  const transfers = useTransferApprovals((s) => s.entries);
  const payRates = usePayRateApprovals((s) => s.requests);
  const taxPlans = useBenefitTaxPlanningStore((s) => s.drafts);
  const timeCorrections = useTimeCorrections((s) => s.requests);
  const overtime = useOvertimeRequests((s) => s.requests);
  const terminations = useTerminationApprovals((s) => s.requests);
  const shiftGroups = useShiftAssignment((s) => s.groups);
  // Probation cases fill one render after mount (useProbationCases's setTimeout),
  // so the queue picks them up reactively as soon as they load.
  const { cases: probationCases } = useProbationCases();
  return selectPendingApprovals({ leave, workflow, claims, transfers, payRates, taxPlans, timeCorrections, overtime, terminations, shiftGroups, probationCases });
}

/** Non-reactive read (getState) — for one-shot lookups (e.g. detail route). */
export function getPendingApprovals(): QueueApproval[] {
  return selectPendingApprovals({
    leave: useLeaveApprovals.getState().requests,
    workflow: useWorkflowApprovals.getState().requests,
    claims: useBenefitClaimsStore.getState().claims,
    transfers: useTransferApprovals.getState().entries,
    payRates: usePayRateApprovals.getState().requests,
    taxPlans: useBenefitTaxPlanningStore.getState().drafts,
    timeCorrections: useTimeCorrections.getState().requests,
    overtime: useOvertimeRequests.getState().requests,
    terminations: useTerminationApprovals.getState().requests,
    shiftGroups: useShiftAssignment.getState().groups,
    probationCases: getProbationCases(),
  });
}

// ── STA-175: self-cancel modal field sourcing ──────────────────────────────────
// The /requests tracker projects a FLAT row (label + sub string) — insufficient
// for the cancel modal's 5 fields (period/reason/step/status live ONLY in the
// source stores). On cancel-click the page re-reads the source record by id via
// these thin per-type switches and builds the modal payload with exact, current
// values. Self-cancellable types only (leave / overtime / claim / time_correction).

/** The 5 modal fields, mirroring CancelRequestModalFields (kept decoupled here). */
export interface CancelModalFields {
  typeLabel: string;
  period: string;
  reason?: string;
  currentStep: string;
  currentStatus: string;
}

/**
 * Build the cancel-confirm modal payload by re-reading the source store by id.
 * Returns null when the id is not found in the type's store (already gone / wrong
 * type) so the caller can abort opening the modal. BE-formatted dates via formatDate.
 */
export function buildCancelModalFields(
  type: RequestType,
  id: string,
  locale: 'th' | 'en',
): CancelModalFields | null {
  const isTh = locale === 'th';
  const fmt = (d?: string) => formatDate(d, 'medium', locale);

  if (type === 'leave') {
    const r = useLeaveApprovals.getState().requests.find((x) => x.id === id);
    if (!r) return null;
    const def = getLeaveType(r.leaveCode ?? '');
    const typeLabel =
      (isTh ? def?.nameTh : def?.nameEn) ?? LEAVE_TYPE_LABEL[r.leaveType] ?? r.leaveType;
    const period =
      r.endDate && r.endDate !== r.startDate ? `${fmt(r.startDate)} – ${fmt(r.endDate)}` : fmt(r.startDate);
    return {
      typeLabel,
      period,
      reason: r.reason || undefined,
      currentStep: leaveStageLabel(r.status, r.awaitingNext, isTh),
      currentStatus: leaveStageLabel(r.status, r.awaitingNext, isTh),
    };
  }

  if (type === 'overtime') {
    const r = useOvertimeRequests.getState().requests.find((x) => x.id === id);
    if (!r) return null;
    const day = (r.startAt ?? '').slice(0, 10);
    const period = day ? `${fmt(day)} · ${r.hours} ${isTh ? 'ชม.' : 'h'}` : `${r.hours} ${isTh ? 'ชม.' : 'h'}`;
    const stepLabel = OT_STATUS_LABEL[r.status]?.[locale] ?? r.status;
    return {
      typeLabel: APPROVAL_REGISTRY.overtime.labels[locale],
      period,
      reason: r.reason || undefined,
      currentStep: stepLabel,
      currentStatus: stepLabel,
    };
  }

  if (type === 'time_correction') {
    const r = useTimeCorrections.getState().requests.find((x) => x.id === id);
    if (!r) return null;
    const span = r.days?.length
      ? `${fmt(r.date)} +${r.days.length} ${isTh ? 'วัน' : 'd'}`
      : fmt(r.date);
    const stepLabel = TIME_CORRECTION_STEP_LABEL[r.status]?.[locale] ?? r.status;
    return {
      typeLabel: APPROVAL_REGISTRY.time_correction.labels[locale],
      period: span,
      reason: r.reason || undefined,
      currentStep: stepLabel,
      currentStatus: stepLabel,
    };
  }

  if (type === 'claim') {
    const c = useBenefitClaimsStore.getState().claims.find((x) => x.id === id);
    if (!c) return null;
    const typeLabel = `${APPROVAL_REGISTRY.claim.labels[locale]} · ${BENEFIT_TYPE_LABEL[c.benefitType]}`;
    const amount = `฿${c.totalClaimAmount.toLocaleString('th-TH')}`;
    const period = `${fmt(c.claimDate || c.receiptDate)} · ${amount}`;
    const statusLabel = BENEFIT_STATUS_LABEL[c.status] ?? c.status;
    return {
      typeLabel,
      period,
      reason: c.remark || undefined,
      currentStep: statusLabel,
      currentStatus: statusLabel,
    };
  }

  return null;
}

// ── PR-2: cross-persona projections ────────────────────────────────────────────
// The unified queue is the canonical truth: when a manager approves/rejects in
// /quick-approve the source store flips, `selectPendingApprovals()` re-derives, and
// every employee/admin surface that PROJECTS from this selector reflects the new
// status LIVE in-session (StatePropagationVerified). These mappers stay pure so the
// page call sites stay dumb — same idiom as toQueueItem/selectPendingApprovals.

/**
 * Per-RequestType display labels for projected rows. Kept here so the projections
 * read one canonical label source (the registry adapters' own labels).
 */
function queueTypeLabel(type: RequestType, locale: 'th' | 'en'): string {
  return APPROVAL_REGISTRY[type].labels[locale];
}

/**
 * Project a QueueApproval into the /requests "my requests" row shape (MineRow in
 * requests/page.tsx). The collapsed QueueStatus is already a RequestStatus subset
 * (pending|approved|rejected — never `info`), so it maps 1:1.
 */
export interface QueueRequestRow {
  id: string;
  /** Localized display label (e.g. "ลา" / "Leave"). */
  type: string;
  /** STA-175 — raw RequestType, needed to look the source record up by id. */
  requestType: RequestType;
  /** STA-175 — owner of the request; the ownership gate compares it to the
   *  current user so Cancel never renders on another employee's pending row. */
  requesterId: string;
  /** STA-175 — true when the row is at its first approval stage (self-cancellable). */
  cancellable: boolean;
  sub: string;
  submitted: string;
  status: QueueStatus | 'info';
  approvalChain: {
    role: string;
    name: string;
    initials: string;
    tone: 'teal' | 'sage' | 'butter' | 'ink';
    status: 'approved' | 'pending' | 'rejected' | 'skipped';
    when?: string;
    note?: string;
  }[];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? '') + (parts[1][0] ?? '');
}

/**
 * STA-183 — cancellable flag for a queue row, aligned to the SAME cycle-window
 * rule the registry `isCancellable` uses. Re-reads the source record by type+id
 * (the queue projection alone carries no start date) and defers to the type's
 * `isCancellable` predicate so the /requests tracker and the My-Requests page can
 * never drift. Only the self-cancellable types resolve a record; others → false.
 */
function queueRowCancellable(type: RequestType, id: string): boolean {
  const adapter = APPROVAL_REGISTRY[type];
  if (!adapter.isCancellable) return false;
  let record: unknown;
  switch (type) {
    case 'leave':
      record = useLeaveApprovals.getState().requests.find((r) => r.id === id);
      break;
    case 'overtime':
      record = useOvertimeRequests.getState().requests.find((r) => r.id === id);
      break;
    case 'time_correction':
      record = useTimeCorrections.getState().requests.find((r) => r.id === id);
      break;
    case 'claim':
      record = useBenefitClaimsStore.getState().claims.find((c) => c.id === id);
      break;
    default:
      record = undefined;
  }
  return record ? adapter.isCancellable(record) : false;
}

/** Map a QueueApproval → /requests MineRow projection. */
export function queueApprovalToRequestRow(q: QueueApproval, locale: 'th' | 'en' = 'th'): QueueRequestRow {
  const submitted = new Date(q.row.submittedAt).toLocaleDateString(
    locale === 'th' ? 'th-TH' : 'en-US',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
  const stepStatus: 'approved' | 'pending' | 'rejected' =
    q.status === 'approved' ? 'approved' : q.status === 'rejected' ? 'rejected' : 'pending';
  return {
    id: q.row.id,
    type: queueTypeLabel(q.row.type, locale),
    requestType: q.row.type,
    requesterId: q.row.requester.id,
    // STA-183 — cycle-window cancellability, aligned to the registry rule by
    // re-reading the source record (the queue projection carries no start date).
    cancellable: queueRowCancellable(q.row.type, q.row.id),
    sub: q.row.description,
    submitted,
    status: q.status,
    approvalChain: [
      {
        role: locale === 'th' ? 'หัวหน้างาน' : 'Manager',
        name: q.row.requester.name,
        initials: initialsOf(q.row.requester.name),
        tone: 'teal',
        status: q.awaitingNext ? 'approved' : stepStatus,
        when:
          q.status === 'pending'
            ? locale === 'th'
              ? 'รอดำเนินการ'
              : 'Pending'
            : undefined,
      },
    ],
  };
}

function latestSendBackComment(request: TerminationRequest): string | undefined {
  return request.audit.findLast((entry) => entry.action === 'send_back')?.comment;
}

function terminationRequestStatus(request: TerminationRequest): QueueRequestRow['status'] {
  if (request.status === 'approved') return 'approved';
  if (request.status === 'rejected') return 'rejected';
  if (request.status === 'sent_back') return 'info';
  return 'pending';
}

function terminationRequestSub(request: TerminationRequest): string {
  if (request.status === 'sent_back') {
    return `คำขอสิ้นสุดสภาพ · ${request.employeeName} · ถูกส่งกลับ — แก้ไขได้ / Sent back — needs revision`;
  }
  return `คำขอสิ้นสุดสภาพ · ${request.employeeName}`;
}

function terminationRequestToRequestRow(
  request: TerminationRequest,
  locale: 'th' | 'en' = 'th',
): QueueRequestRow {
  const submitted = new Date(request.submittedAt).toLocaleDateString(
    locale === 'th' ? 'th-TH' : 'en-US',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
  const status = terminationRequestStatus(request);
  const managerStatus = request.status === 'pending_manager' || request.status === 'sent_back'
    ? 'pending'
    : 'approved';
  const spdStatus = request.status === 'approved'
    ? 'approved'
    : request.status === 'rejected'
      ? 'rejected'
      : 'pending';
  return {
    id: request.id,
    type: locale === 'th' ? 'สิ้นสุดสภาพ' : 'Termination',
    requestType: 'change_request',
    requesterId: request.submittedBy.id,
    cancellable: false,
    sub: terminationRequestSub(request),
    submitted,
    status,
    approvalChain: [
      {
        role: locale === 'th' ? 'หัวหน้างาน' : 'Manager',
        name: locale === 'th' ? 'หัวหน้างาน' : 'Manager',
        initials: locale === 'th' ? 'หง' : 'MG',
        tone: 'teal',
        status: managerStatus,
        when: request.status === 'pending_manager' ? locale === 'th' ? 'รอดำเนินการ' : 'Pending' : undefined,
        note: request.status === 'sent_back' ? latestSendBackComment(request) : undefined,
      },
      {
        role: 'SPD',
        name: 'SPD',
        initials: 'SP',
        tone: 'butter',
        status: spdStatus,
        when: request.status === 'pending_spd' ? locale === 'th' ? 'รอดำเนินการ' : 'Pending' : undefined,
      },
    ],
  };
}

/**
 * Reactive projection for /requests — the SAME canonical rows the manager queue
 * shows, in the employee tracker's row shape. Subscribing here means an approval
 * in /quick-approve flips the matching row's status with no refresh (AC-2.1).
 */
export function useQueueRequestRows(locale: 'th' | 'en' = 'th'): QueueRequestRow[] {
  const queue = useSelectPendingApprovals();
  const terminations = useTerminationApprovals((s) => s.requests);
  // pay_rate is an ADMIN-initiated change (not an employee self-service request),
  // and tax_planning already has its OWN domain projection on /requests
  // (selectTaxPlanningRequestSummaries). Exclude both here so the employee request
  // tracker neither double-renders the tax row nor surfaces an admin pay-rate row.
  return queue
    .filter(
      (q) =>
        q.row.type !== 'pay_rate' &&
        q.row.type !== 'tax_planning' &&
        // shift_assignment is a MANAGER-initiated group, not an employee self-
        // service request — keep it off the employee request tracker.
        q.row.type !== 'shift_assignment' &&
        !isTerminationId(q.row.id),
    )
    .map((q) => queueApprovalToRequestRow(q, locale))
    .concat(
      terminations
        .filter((request) => request.status !== 'withdrawn')
        .map((request) => terminationRequestToRequestRow(request, locale)),
    );
}

/**
 * Project a QueueApproval into the /workflows row shape (WorkflowItem in
 * use-workflows.ts). The 4-state workflow status maps from the collapsed queue
 * status; an awaitingNext claim stays `pending` (it is awaiting the next approver).
 */
export interface QueueWorkflowRow {
  id: string;
  type: RequestType;
  typeLabel: string;
  requesterName: string;
  requesterId: string;
  department: string;
  description: string;
  submittedDate: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'sent_back';
  currentStep: number;
  totalSteps: number;
  steps: {
    step: number;
    approverName: string;
    approverId: string;
    status: 'pending' | 'approved' | 'rejected' | 'sent_back' | 'skipped';
    actionDate?: string;
    comment?: string;
  }[];
}

const QUEUE_URGENCY_TO_WORKFLOW: Record<Urgency, 'low' | 'normal' | 'high'> = {
  low: 'low',
  normal: 'normal',
  urgent: 'high',
};

/** Map a QueueApproval → /workflows WorkflowItem projection. */
export function queueApprovalToWorkflowRow(q: QueueApproval, locale: 'th' | 'en' = 'en'): QueueWorkflowRow {
  const timeline = q.row.approvalTimeline ?? [];
  const total = Math.max(timeline.length, 1);
  // Derive step statuses from the collapsed queue status. Approved/rejected mark
  // the whole chain terminal; pending keeps the chain's own seeded step states.
  const steps = (timeline.length > 0 ? timeline : [{ step: 1, approver: q.row.requester.name, status: 'pending' as const }]).map((s) => {
    const stepStatus: 'pending' | 'approved' | 'rejected' =
      q.status === 'approved'
        ? 'approved'
        : q.status === 'rejected'
        ? 'rejected'
        : (s.status as 'pending' | 'approved' | 'rejected');
    return {
      step: s.step,
      approverName: s.approver,
      approverId: `APR-${s.step}`,
      status: stepStatus,
      actionDate: stepStatus === 'pending' ? undefined : new Date().toISOString(),
      comment: undefined,
    };
  });
  const approvedCount = steps.filter((s) => s.status === 'approved').length;
  return {
    id: q.row.id,
    type: q.row.type,
    typeLabel: queueTypeLabel(q.row.type, locale),
    requesterName: q.row.requester.name,
    requesterId: q.row.requester.id,
    department: q.row.requester.department,
    description: q.row.description,
    submittedDate: q.row.submittedAt,
    urgency: QUEUE_URGENCY_TO_WORKFLOW[q.row.urgency],
    status: q.status,
    currentStep: q.status === 'pending' ? Math.min(approvedCount + 1, total) : total,
    totalSteps: total,
    steps,
  };
}

/**
 * Reactive projection for /workflows — replaces the disconnected MOCK_WORKFLOWS
 * useState (7th parallel mock) with the canonical queue rows. An approval in
 * /quick-approve now flips the matching workflow row's status live (AC-2.1).
 */
export function useQueueWorkflowRows(locale: 'th' | 'en' = 'en'): QueueWorkflowRow[] {
  const queue = useSelectPendingApprovals();
  return queue.map((q) => queueApprovalToWorkflowRow(q, locale));
}
