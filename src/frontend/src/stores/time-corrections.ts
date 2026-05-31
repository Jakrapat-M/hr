import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// time-corrections — P3 Zustand+persist store for employee timesheet/attendance
// correction requests, surfaced as a NEW row type in the unified /quick-approve
// queue (type 'time_correction', detail at /workflows/time-correction/[id]).
//
// Mirrors the pay-rate-approvals store shape (Omit-payload addRequest, audit
// trail, approve/reject by actor, persisted to localStorage). Manager (first-line)
// approver chain — the bridge in approval-registry sets the first timeline step to
// `หัวหน้างาน` so canActOn() lets a team manager act.
//
// Phase: UI mockup. No backend. setTimeout-free synchronous mock dispatch.

export type TimeCorrectionStep = 'pending_manager' | 'approved' | 'rejected';

export type TimeCorrectionKind =
  | 'missing-checkin'
  | 'missing-checkout'
  | 'wrong-time'
  | 'forgot-clock';

export type TimeCorrectionAuditEntry = {
  actorName: string;
  action: 'submit' | 'approve' | 'reject';
  comment?: string;
  at: string; // ISO timestamp
};

export type TimeCorrectionRequest = {
  id: string; // TCR-YYYYMMDDHHMMSS-<rand>
  employeeId: string;
  employeeName: string;
  department: string;
  /** Working day the correction applies to (ISO date YYYY-MM-DD). */
  date: string;
  kind: TimeCorrectionKind;
  /** System-recorded time (blank for missing punches). */
  originalTime?: string;
  /** Time the employee says is correct (HH:mm). */
  correctedTime: string;
  reason: string;
  status: TimeCorrectionStep;
  submittedAt: string; // ISO timestamp
  audit: TimeCorrectionAuditEntry[];
};

export const TIME_CORRECTION_STEP_LABEL: Record<TimeCorrectionStep, { th: string; en: string }> = {
  pending_manager: { th: 'รอหัวหน้าอนุมัติ', en: 'Awaiting manager' },
  approved: { th: 'อนุมัติแล้ว', en: 'Approved' },
  rejected: { th: 'ถูกปฏิเสธ', en: 'Rejected' },
};

export const TIME_CORRECTION_KIND_LABEL: Record<TimeCorrectionKind, { th: string; en: string }> = {
  'missing-checkin': { th: 'ลืมบันทึกเข้างาน', en: 'Missing check-in' },
  'missing-checkout': { th: 'ลืมบันทึกออกงาน', en: 'Missing check-out' },
  'wrong-time': { th: 'เวลาผิดพลาด', en: 'Wrong time' },
  'forgot-clock': { th: 'ลืมลงเวลา', en: 'Forgot to clock' },
};

interface TimeCorrectionsState {
  requests: TimeCorrectionRequest[];
  addRequest: (
    r: Omit<TimeCorrectionRequest, 'id' | 'submittedAt' | 'status' | 'audit'>,
  ) => string;
  approve: (id: string, by: { name: string }, comment?: string) => void;
  reject: (id: string, by: { name: string }, reason: string) => void;
  clear: () => void;
}

function generateTimeCorrectionId(): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TCR-${ts}-${rand}`;
}

export const useTimeCorrections = create<TimeCorrectionsState>()(
  persist(
    (set) => ({
      requests: [],
      addRequest: (payload) => {
        const id = generateTimeCorrectionId();
        const now = new Date().toISOString();
        const req: TimeCorrectionRequest = {
          ...payload,
          id,
          submittedAt: now,
          status: 'pending_manager',
          audit: [
            {
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
                  status: 'approved' as TimeCorrectionStep,
                  audit: [
                    ...r.audit,
                    {
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
                  status: 'rejected' as TimeCorrectionStep,
                  audit: [
                    ...r.audit,
                    {
                      actorName: by.name,
                      action: 'reject' as const,
                      comment: reason,
                      at: new Date().toISOString(),
                    },
                  ],
                },
          ),
        })),
      clear: () => set({ requests: [] }),
    }),
    {
      name: 'humi-time-corrections',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
