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

  // transfer → DISPLAY-ONLY no-throw adapter. No transfer store schema exists, so
  // approve/reject are no-throw stubs that simply resolve to a terminal status.
  // TODO(PR-1b/1c): replace with the dedicated `transfer-approvals` terminal-marker
  // slice (id → 'approved'|'rejected', persisted) so the row drops out of `pending`
  // and never re-renders approvable (plan R2). Do NOT wire UI here.
  transfer: {
    toQueueItem: (record) =>
      genericToQueueItem('transfer', record as { id: string; submittedAt?: string }),
    approve: (_id, _actor) => {
      // no-throw stub — approve/reject WIRING lands in PR-1c via markApproved/
      // markRejected on the transfer-approvals slice.
    },
    reject: (_id, _actor, _reason) => {
      // no-throw stub — see above.
    },
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
  // claim rows are the benefit-claims records carrying a queueSnapshot.
  for (const r of input.claims) {
    if (r.queueSnapshot) out.push({ row: r.queueSnapshot, status: collapseQueueStatus(r.status) });
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
