import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PendingRequest } from '@/lib/quick-approve-api';

// leave-approvals — Zustand+persist store for leave requests.
//
// Manager is the sole approver. Leave queue is separate from the ESS
// personal-info chain (BRD #166). Manager approves leave only; EC
// personal-info changes go to SPD per BRD #166.

export type LeaveType =
  | 'annual'
  | 'sick'
  | 'personal'
  | 'maternity'
  | 'paternity'
  | 'bereavement'
  | 'other';

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
    r: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status' | 'audit'>,
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
        const id = generateLeaveId();
        const now = new Date().toISOString();
        const req: LeaveRequest = {
          ...payload,
          id,
          submittedAt: now,
          status: 'pending',
          audit: [
            {
              actorId: payload.employeeId,
              actorName: payload.employeeName,
              action: 'submit',
              at: now,
            },
          ],
        };
        set((state) => ({ requests: [req, ...state.requests] }));
        return id;
      },
      approve: (id, by, comment) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id !== id
              ? r
              : {
                  ...r,
                  status: 'approved' as LeaveStatus,
                  audit: [
                    ...r.audit,
                    {
                      actorId: by.id,
                      actorName: by.name,
                      action: 'approve' as const,
                      comment,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      reject: (id, by, reason) =>
        set((state) => ({
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
        })),
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
