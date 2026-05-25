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

import type { PendingRequest, RequestType, Urgency } from '@/lib/quick-approve-api';
import type { ProbationCase } from '@/hooks/use-probation';
import {
  useBenefitClaimsStore,
  type BenefitClaimRequest,
} from '@/stores/benefit-claims';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import { useProbationApprovals } from '@/stores/probation-approvals';
import { useTransferApprovals } from '@/stores/transfer-approvals';

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
}

// ── Lifted helpers (from quick-approve-page.tsx) ───────────────────────────────
// Lifted verbatim so the registry owns the bridge logic. Re-exported from the
// original location for back-compat (quick-approve-page.tsx useMemos at ~:317/:327).

// Probation cases live in their own mock store (PR #135) — adapt the pending
// ones into PendingRequest shape so they interleave with the other workflow
// approvals. Drill-in is special-cased to /workflows/probation/<id>.
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
    : c.status === 'pending_hr' || c.status === 'escalated_ceo' || c.status === 'approved' ? 'approved'
    : 'pending';
  const hrStatus =
    c.status === 'pending_hr' || c.status === 'escalated_ceo' ? 'pending'
    : c.status === 'approved' ? 'approved'
    : 'pending';
  return {
    id: c.id,
    type: 'probation',
    requester: {
      id: c.employeeId,
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
      name: c.employeeName,
      position: c.benefitName,
      department: c.businessUnit,
    },
    description: `เบิกสวัสดิการ ${c.benefitName} — ฿${c.totalClaimAmount.toLocaleString('th-TH')}`,
    submittedAt: c.submittedAt,
    urgency,
    waitingDays,
    details: {},
    approvalTimeline: [
      { step: 1, approver: 'หัวหน้างาน', status: 'pending' },
      { step: 2, approver: 'SPD Benefits', status: 'pending' },
    ],
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
  },

  // overtime → leave-approvals (single-step). OT has no dedicated store; reuse
  // leave's manager approve and mark OT in the reason so it stays distinguishable.
  overtime: {
    toQueueItem: (record) =>
      genericToQueueItem('overtime', record as { id: string; submittedAt?: string }),
    approve: (id, actor) =>
      useLeaveApprovals.getState().approve(id, { id: actor.id ?? '', name: actor.name }, 'OT'),
    reject: (id, actor, reason) =>
      useLeaveApprovals
        .getState()
        .reject(id, { id: actor.id ?? '', name: actor.name }, `OT: ${reason}`),
    seed: () => {
      // No-op: overtime shares the leave-approvals store, which has a single
      // init-overwrite-empties guard. ensureDemoSeed() seeds leave+overtime rows
      // TOGETHER via the `leave` adapter to avoid the guard skipping the 2nd call.
    },
    labels: { th: 'โอที', en: 'Overtime' },
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
  // NOT humi-requests-slice (which has only submit/setFilter). Default role 'spd'
  // since the canonical personal-info chain is the SPD single step (BRD #166).
  change_request: {
    toQueueItem: (record) =>
      genericToQueueItem('change_request', record as { id: string; submittedAt?: string }),
    approve: (id, actor) =>
      useWorkflowApprovals
        .getState()
        .approve(id, { role: (actor.role as never) ?? ('spd' as never), name: actor.name }),
    reject: (id, actor, reason) =>
      useWorkflowApprovals
        .getState()
        .reject(id, { role: (actor.role as never) ?? ('spd' as never), name: actor.name }, reason),
    seed: (fixtures = []) => useWorkflowApprovals.getState().seedFromQueue(fixtures),
    labels: { th: 'เปลี่ยนข้อมูล', en: 'Change' },
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
 * Fan IN from the seeded source stores into the queue's PendingRequest view.
 * Pure read — pass the store states in (caller subscribes via hooks/getState) so
 * this stays testable and SSR-safe. Returns the canonical 20 rows (or fewer if a
 * store was cleared), each tagged with its collapsed status.
 */
export function selectPendingApprovals(input: {
  leave: { id: string; status: string; queueSnapshot?: PendingRequest }[];
  workflow: { id: string; status: string; queueSnapshot?: PendingRequest }[];
  claims: { id: string; status: string; queueSnapshot?: PendingRequest }[];
  transfers: { id: string; terminalStatus?: QueueStatus; snapshot: PendingRequest }[];
}): QueueApproval[] {
  const out: QueueApproval[] = [];

  // leave + overtime both live in the leave store; queueSnapshot.type distinguishes.
  for (const r of input.leave) {
    if (r.queueSnapshot) out.push({ row: r.queueSnapshot, status: collapseQueueStatus(r.status) });
  }
  // change_request lives in the workflow store; only queueSnapshot rows are queue rows.
  for (const r of input.workflow) {
    if (r.queueSnapshot) out.push({ row: r.queueSnapshot, status: collapseQueueStatus(r.status) });
  }
  // claim rows are the benefit-claims records carrying a queueSnapshot. A claim
  // moves pending_manager_approval → pending_spd once the manager approves: it
  // stays collapsed-`pending`, but is now awaiting the NEXT approver (AC-1c.2).
  for (const r of input.claims) {
    if (r.queueSnapshot) {
      out.push({
        row: r.queueSnapshot,
        status: collapseQueueStatus(r.status),
        awaitingNext: r.status === 'pending_spd',
      });
    }
  }
  // transfer rows come from the dedicated terminal-marker slice (R2).
  for (const e of input.transfers) {
    out.push({ row: e.snapshot, status: e.terminalStatus ?? 'pending' });
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
  return selectPendingApprovals({ leave, workflow, claims, transfers });
}

/** Non-reactive read (getState) — for one-shot lookups (e.g. detail route). */
export function getPendingApprovals(): QueueApproval[] {
  return selectPendingApprovals({
    leave: useLeaveApprovals.getState().requests,
    workflow: useWorkflowApprovals.getState().requests,
    claims: useBenefitClaimsStore.getState().claims,
    transfers: useTransferApprovals.getState().entries,
  });
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
  type: string;
  sub: string;
  submitted: string;
  status: QueueStatus;
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

/**
 * Reactive projection for /requests — the SAME canonical rows the manager queue
 * shows, in the employee tracker's row shape. Subscribing here means an approval
 * in /quick-approve flips the matching row's status with no refresh (AC-2.1).
 */
export function useQueueRequestRows(locale: 'th' | 'en' = 'th'): QueueRequestRow[] {
  const queue = useSelectPendingApprovals();
  return queue.map((q) => queueApprovalToRequestRow(q, locale));
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
