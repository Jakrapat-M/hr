import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PendingRequest } from '@/lib/quick-approve-api';
import type { OtTypeCode } from '@/lib/time/ot-types';
import { isCancellableByCycle, demoToday } from '@/lib/time/period';

// overtime-requests — Group B Zustand+persist store for employee OT (overtime)
// requests, surfaced as the 'overtime' row type in the unified /quick-approve
// queue (detail at /workflows/ot/[id]).
//
// Mirrors the time-corrections store shape (plain persist, NO merge-wipe, audit
// trail, approve/reject by actor, persisted to localStorage). Manager
// (first-line) approver chain — the registry bridge sets the first timeline step
// to `หัวหน้างาน` so canActOn() lets a team manager act.
//
// Group 0 → Group B reconcile: OT used to ride the leave-approvals store with an
// 'OT' reason hack. It now has its OWN store. The taxonomy is the 2-code OT type
// set from lib/time/ot-types (OT | OT_BREAK) — NOT the old weekday/weekend union.
//
// Phase: UI mockup. No backend. Synchronous mock dispatch.

export type OTStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type OTAuditEntry = {
  actorId: string;
  actorName: string;
  action: 'submit' | 'approve' | 'reject' | 'cancel';
  comment?: string;
  at: string; // ISO timestamp
};

/** One day's OT window inside a multi-day request (STA-164). */
export type OtDay = { date: string; startAt: string; endAt: string; hours: number };

export type OTRequest = {
  id: string; // OT-YYYYMMDDHHMMSS-<rand> (or a stable demo id)
  employeeId: string;
  employeeName: string;
  department: string;
  otType: OtTypeCode;
  startAt: string; // ISO datetime
  endAt: string; // ISO datetime
  /** Authoritative TOTAL OT hours. For a multi-day request (days?.length),
   *  startAt..endAt is the SPAN (earliest start … latest end), NOT the duration —
   *  never derive hours from the span; read display hours via otDisplayHours()
   *  from lib/time/ot-math. */
  hours: number; // computed OT hours (cross-midnight aware)
  /** Per-day breakdown for a multi-day OT request (STA-164). Undefined for a
   *  single-day request → byte-identical to the legacy single-window shape. */
  days?: OtDay[];
  reason: string;
  docs: string[];
  status: OTStatus;
  submittedAt: string; // ISO timestamp
  audit: OTAuditEntry[];
};

export const OT_STATUS_LABEL: Record<OTStatus, { th: string; en: string }> = {
  pending: { th: 'รอหัวหน้าอนุมัติ', en: 'Awaiting manager' },
  approved: { th: 'อนุมัติแล้ว', en: 'Approved' },
  rejected: { th: 'ถูกปฏิเสธ', en: 'Rejected' },
  cancelled: { th: 'ยกเลิกแล้ว', en: 'Cancelled' },
};

interface OvertimeRequestsState {
  requests: OTRequest[];
  addRequest: (
    r: Omit<OTRequest, 'id' | 'submittedAt' | 'status' | 'audit'> & {
      /** Optional STABLE id (demo seeds pass a deterministic id; idempotent). */
      id?: string;
    },
  ) => string;
  approve: (id: string, by: { id?: string; name: string }, comment?: string) => void;
  reject: (id: string, by: { id?: string; name: string }, reason: string) => void;
  /**
   * STA-183 — employee cancels their OWN OT request under the cycle-window rule:
   * allowed while not terminal (rejected/cancelled) AND the OT date is in the
   * current or immediately-previous payroll cycle. Sets status 'cancelled' +
   * appends a 'cancel' audit entry. Drops out of the unified inbox via the
   * selector's cancelled guard.
   */
  cancel: (id: string, by: { id?: string; name: string }) => void;
  /** Seed deterministic demo rows, preserving row.id (idempotent per id). */
  seedFromQueue: (rows: OTRequest[]) => void;
  clear: () => void;
}

function generateOTId(): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OT-${ts}-${rand}`;
}

export const useOvertimeRequests = create<OvertimeRequestsState>()(
  persist(
    (set, get) => ({
      requests: [],
      addRequest: (payload) => {
        const id = payload.id ?? generateOTId();
        // Idempotent on a stable id: a re-seed after rehydrate must not double-add.
        if (payload.id && get().requests.some((r) => r.id === id)) {
          return id;
        }
        const now = new Date().toISOString();
        const req: OTRequest = {
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
            r.id !== id || r.status !== 'pending'
              ? r
              : {
                  ...r,
                  status: 'approved' as OTStatus,
                  audit: [
                    ...r.audit,
                    {
                      actorId: by.id ?? '',
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
            r.id !== id || r.status !== 'pending'
              ? r
              : {
                  ...r,
                  status: 'rejected' as OTStatus,
                  audit: [
                    ...r.audit,
                    {
                      actorId: by.id ?? '',
                      actorName: by.name,
                      action: 'reject' as const,
                      comment: reason,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      cancel: (id, by) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            // STA-183 — cycle-window rule (supersedes the pending-only gate): any
            // non-terminal row whose OT date is in the current or previous payroll
            // cycle is self-cancellable, enforced via the shared helper.
            r.id !== id ||
            r.status === 'rejected' ||
            r.status === 'cancelled' ||
            !isCancellableByCycle((r.startAt ?? '').slice(0, 10), demoToday())
              ? r
              : {
                  ...r,
                  status: 'cancelled' as OTStatus,
                  audit: [
                    ...r.audit,
                    {
                      actorId: by.id ?? '',
                      actorName: by.name,
                      action: 'cancel' as const,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      seedFromQueue: (rows) =>
        set((state) => {
          // Preserve each row.id deterministically; skip any id already present.
          const existing = new Set(state.requests.map((r) => r.id));
          const fresh = rows.filter((r) => !existing.has(r.id));
          return fresh.length === 0 ? state : { requests: [...fresh, ...state.requests] };
        }),
      clear: () => set({ requests: [] }),
    }),
    {
      name: 'humi-overtime-requests',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Build a native OTRequest from a canonical queue row (PendingRequest). Used by
 * the registry/demo-seed so the 4 canonical OT seed rows populate THIS store
 * (they used to ride the leave-approvals store). The OvertimeDetails snapshot
 * (date/hours/reason) is read off `row.details`; startAt/endAt are reconstructed
 * from the date + an 18:00 default window of `hours` length.
 */
export function queueRowToOTRequest(row: PendingRequest): OTRequest {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const date = typeof details.date === 'string' ? details.date : row.submittedAt.slice(0, 10);
  const hours = typeof details.hours === 'number' ? details.hours : 0;
  const reason =
    typeof details.reason === 'string' && details.reason ? details.reason : row.description;
  // Default OT window: 18:00 → +hours (snapshot rows have no explicit times).
  const startAt = `${date}T18:00:00`;
  const endHour = 18 + Math.floor(hours);
  const endMin = Math.round((hours - Math.floor(hours)) * 60);
  const endAt = `${date}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
  return {
    id: row.id,
    employeeId: row.requester.id,
    employeeName: row.requester.name,
    department: row.requester.department,
    otType: 'OT',
    startAt,
    endAt,
    hours,
    reason,
    docs: row.attachments ?? [],
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
  };
}
