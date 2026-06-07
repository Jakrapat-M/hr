import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PendingRequest } from '@/lib/quick-approve-api';
import { levelsForLeaveType } from '@/lib/time/approval-rules';
import { getLeaveType, LEAVE_CODE_TO_BALANCE_KIND } from '@/lib/time/leave-types';
import { useLeaveBalances } from '@/stores/leave-balances';

// leave-approvals — Zustand+persist store for leave requests.
//
// Group A reconcile: widened to the 23 registry leave codes (via `leaveCode`),
// quota reserve/deduct/release against the SEPARATE leave-balances slice, and
// 2-level (Manager → HR) approval driven by the existing `awaitingNext` flag —
// NOT a new status. The 3-state `status` enum stays intact so the unified inbox
// (`selectPendingApprovals` filters `status==='pending'`) keeps showing the row
// while it advances to the HR step.
//
// The legacy 7-code `LeaveType` union remains for back-compat (seeded rows,
// queueRowToLeaveRequest). `leaveCode` carries the canonical 23-registry code.

export type LeaveType =
  | 'annual'
  | 'sick'
  | 'personal'
  | 'maternity'
  | 'paternity'
  | 'bereavement'
  | 'other'
  // Group A: also accept any of the 23 registry codes verbatim. Kept as a string
  // widen (not an exhaustive enum) so the registry stays the single source of
  // truth without duplicating its 23 codes here.
  | (string & {});

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type LeaveAuditEntry = {
  actorId: string;
  actorName: string;
  action: 'submit' | 'approve' | 'reject';
  comment?: string;
  at: string; // ISO timestamp
};

export type LeaveRequest = {
  id: string; // LV-YYYYMMDD-HHMMSS-<rand>
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;   // ISO date YYYY-MM-DD
  reason: string;
  status: LeaveStatus;
  submittedAt: string; // ISO timestamp
  audit: LeaveAuditEntry[];
  /**
   * PR-1b: canonical queue-row snapshot carried verbatim for the unified inbox.
   * Present only on rows seeded from APPROVAL_SEED_BY_TYPE so the live inbox can
   * reconstruct the SAME display row (incl. overtime rows routed to this store).
   */
  queueSnapshot?: PendingRequest;
  // ── Group A (Time-module ESS reconcile) ────────────────────────────────────
  /** Canonical 23-registry leave code (drives docs / quota / approval depth). */
  leaveCode?: string;
  /** Booking granularity from the leave type's minUnit. */
  unit?: '30min' | 'half-day' | '1-day';
  /** Computed leave-day count (weekend/holiday aware, half-day → 0.5). */
  days?: number;
  /** Attached supporting-document names (Doc-Rule satisfied at submit). */
  docs?: string[];
  /** Days soft-held against the quota bucket (quotaTracked types only). */
  reservedDays?: number;
  /** True for a single half-day booking (morning/afternoon slot). */
  halfDay?: boolean;
  /**
   * 2-level chain flag: set true after the FIRST (manager) approval on a
   * 2-level type so the row advances to the HR step while staying `pending`.
   * Read by `currentStepIndex` (approval-routing) to advance the chain — this is
   * the SAME signal the claim flow uses, not a new status.
   */
  awaitingNext?: boolean;
};

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  annual: 'ลาพักร้อน',
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
  maternity: 'ลาคลอด',
  paternity: 'ลาดูแลบุตร (บิดา)',
  bereavement: 'ลาฌาปนกิจ',
  other: 'ลาอื่น ๆ',
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: 'รอหัวหน้าอนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ถูกปฏิเสธ',
};

interface LeaveApprovalsState {
  requests: LeaveRequest[];
  addRequest: (
    r: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status' | 'audit'> & {
      /**
       * Optional STABLE id. Demo seeds (ensureDemoSeed) pass a deterministic id
       * (e.g. `LV-DEMO-MAT-0002`) so the record survives a rehydrate-and-reseed
       * with the SAME id every load — letting the detail route resolve it across
       * a full navigation. Idempotent: re-adding an existing id is a no-op.
       * Omitted by the ESS submit form, which falls back to a generated id.
       */
      id?: string;
    },
  ) => string;
  approve: (id: string, by: { id: string; name: string }, comment?: string) => void;
  reject: (id: string, by: { id: string; name: string }, reason: string) => void;
  /** PR-1b: init-overwrite-empties seed from the canonical queue rows (R1). */
  seedFromQueue: (rows: PendingRequest[]) => void;
  clear: () => void;
}

function generateLeaveId(): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LV-${ts}-${rand}`;
}

/**
 * Resolve the quota bucket for a request: returns the balance-kind + day count
 * when the request's leaveCode is a quotaTracked type, else null (no draw-down).
 */
function quotaBucketFor(
  req: Pick<LeaveRequest, 'leaveCode' | 'days' | 'reservedDays'>,
): { kind: string; days: number } | null {
  const code = req.leaveCode;
  if (!code) return null;
  const def = getLeaveType(code);
  if (!def?.quotaTracked) return null;
  const kind = LEAVE_CODE_TO_BALANCE_KIND[code];
  if (!kind) return null;
  const days = req.days ?? req.reservedDays ?? 0;
  if (days <= 0) return null;
  return { kind, days };
}

const LEAVE_TYPE_FROM_LABEL: Record<string, LeaveType> = {
  annual: 'annual',
  sick: 'sick',
  personal: 'personal',
  maternity: 'maternity',
  paternity: 'paternity',
  bereavement: 'bereavement',
  other: 'other',
};

/** Build a native LeaveRequest carrying its canonical queue snapshot. */
export function queueRowToLeaveRequest(row: PendingRequest): LeaveRequest {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const leaveType =
    typeof details.leaveType === 'string'
      ? LEAVE_TYPE_FROM_LABEL[details.leaveType] ?? 'other'
      : 'other';
  return {
    id: row.id,
    employeeId: row.requester.id,
    employeeName: row.requester.name,
    leaveType,
    startDate: typeof details.startDate === 'string' ? details.startDate : '',
    endDate: typeof details.endDate === 'string' ? details.endDate : '',
    reason: typeof details.reason === 'string' ? details.reason : row.description,
    status: 'pending',
    submittedAt: row.submittedAt,
    audit: [
      {
        actorId: row.requester.id,
        actorName: row.requester.name,
        action: 'submit',
        at: row.submittedAt,
      },
    ],
    queueSnapshot: row,
  };
}

export const useLeaveApprovals = create<LeaveApprovalsState>()(
  persist(
    (set) => ({
      requests: [],
      addRequest: (payload) => {
        const id = payload.id ?? generateLeaveId();
        // Idempotent on a stable id: a re-seed after rehydrate must not double-add
        // the row or double-reserve its quota. Return the existing id unchanged.
        if (payload.id && useLeaveApprovals.getState().requests.some((r) => r.id === id)) {
          return id;
        }
        const now = new Date().toISOString();
        const bucket = quotaBucketFor(payload);
        const req: LeaveRequest = {
          ...payload,
          id,
          submittedAt: now,
          status: 'pending',
          // quotaTracked → soft-hold the days against the balance bucket.
          reservedDays: bucket ? bucket.days : payload.reservedDays,
          audit: [
            {
              actorId: payload.employeeId,
              actorName: payload.employeeName,
              action: 'submit',
              at: now,
            },
          ],
        };
        if (bucket) {
          useLeaveBalances.getState().reserve(payload.employeeId, bucket.kind, bucket.days);
        }
        set((state) => ({ requests: [req, ...state.requests] }));
        return id;
      },
      approve: (id, by, comment) =>
        set((state) => {
          const target = state.requests.find((r) => r.id === id);
          if (!target || target.status !== 'pending') return state;
          const at = new Date().toISOString();
          const auditEntry = {
            actorId: by.id,
            actorName: by.name,
            action: 'approve' as const,
            comment,
            at,
          };

          const levels = target.leaveCode ? levelsForLeaveType(target.leaveCode) : 1;
          // 2-level type, first (manager) approval → advance to HR; stay pending.
          if (levels === 2 && !target.awaitingNext) {
            return {
              requests: state.requests.map((r) =>
                r.id !== id
                  ? r
                  : { ...r, awaitingNext: true, audit: [...r.audit, auditEntry] },
              ),
            };
          }

          // Final approval (1-level, or the 2nd-level HR act) → deduct quota.
          const bucket = quotaBucketFor(target);
          if (bucket) {
            useLeaveBalances.getState().deduct(target.employeeId, bucket.kind, bucket.days);
          }
          return {
            requests: state.requests.map((r) =>
              r.id !== id
                ? r
                : { ...r, status: 'approved' as LeaveStatus, audit: [...r.audit, auditEntry] },
            ),
          };
        }),
      reject: (id, by, reason) =>
        set((state) => {
          const target = state.requests.find((r) => r.id === id);
          if (!target || target.status !== 'pending') return state;
          // Release any reserved quota back to the bucket.
          const bucket = quotaBucketFor(target);
          if (bucket) {
            useLeaveBalances.getState().release(target.employeeId, bucket.kind, bucket.days);
          }
          return {
            requests: state.requests.map((r) =>
              r.id !== id
                ? r
                : {
                    ...r,
                    status: 'rejected' as LeaveStatus,
                    audit: [
                      ...r.audit,
                      {
                        actorId: by.id,
                        actorName: by.name,
                        action: 'reject' as const,
                        comment: reason,
                        at: new Date().toISOString(),
                      },
                    ],
                  },
            ),
          };
        }),
      seedFromQueue: (rows) =>
        set((state) =>
          // init-overwrite-empties: only seed when the store has no requests.
          state.requests.length === 0
            ? { requests: rows.map(queueRowToLeaveRequest) }
            : state,
        ),
      clear: () => set({ requests: [] }),
    }),
    {
      name: 'humi-leave-approvals',
      version: 1, // PR-1b: bumped alongside the rehydrate-to-seed persist contract.
      storage: createJSONStorage(() => localStorage),
      // PR-1b persist contract (DECISION: rehydrate-to-seed + init-overwrite-empties).
      // `merge` runs on EVERY rehydrate and drops the persisted `requests`, so the
      // store rehydrates empty; the single seed authority (ensureDemoSeed at AppShell
      // mount) then refills from the canonical queue rows. Net effect: "approve a row
      // → hard refresh" returns to the full seeded 20-row set (honors spec 'refresh
      // may reset to seed'). Other (non-seeded) fields persist normally.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<LeaveApprovalsState>;
        return { ...currentState, ...persisted, requests: [] };
      },
    },
  ),
);
