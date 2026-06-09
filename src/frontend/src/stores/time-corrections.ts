import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCorrectionReason } from '@/lib/time/correction-reasons';

// time-corrections — P3 Zustand+persist store for employee timesheet/attendance
// correction requests, surfaced as a NEW row type in the unified /quick-approve
// queue (type 'time_correction', detail at /workflows/time-correction/[id]).
//
// Mirrors the pay-rate-approvals store shape (Omit-payload addRequest, audit
// trail, approve/reject by actor, persisted to localStorage). Manager (first-line)
// approver chain — the bridge in approval-registry sets the first timeline step to
// `หัวหน้างาน` so canActOn() lets a team manager act.
//
// Group C reshape: the punch the correction targets is now `correctionType`
// (in / out / both) and the WHY is a `reasonCode` drawn from the 15-row
// CORRECTION_REASONS registry (each row carries a payroll payCode). The store
// derives + stores `payCode` from the reasonCode so projections never re-look-up.
//
// Phase: UI mockup. No backend. setTimeout-free synchronous mock dispatch.

export type TimeCorrectionStep = 'pending_manager' | 'approved' | 'rejected';

/** Which punch the correction targets: in (missing-in) / out (missing-out) / both. */
export type CorrectionType = 'in' | 'out' | 'both';

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
  /** Which clock punch is being corrected. */
  correctionType: CorrectionType;
  /** payCode of the chosen CORRECTION_REASONS row (the "why"). */
  reasonCode: string;
  /** Derived from reasonCode — the payroll pay-code the correction posts under. */
  payCode: string;
  /** System-recorded time (blank for missing punches). */
  originalTime?: string;
  /** Time the employee says is correct (HH:mm). */
  correctedTime: string;
  /** Free-text note from the employee. */
  reason: string;
  /** Optional attachment filenames (mock — names only). */
  docs?: string[];
  status: TimeCorrectionStep;
  submittedAt: string; // ISO timestamp
  audit: TimeCorrectionAuditEntry[];
};

export const TIME_CORRECTION_STEP_LABEL: Record<TimeCorrectionStep, { th: string; en: string }> = {
  pending_manager: { th: 'รอหัวหน้าอนุมัติ', en: 'Awaiting manager' },
  approved: { th: 'อนุมัติแล้ว', en: 'Approved' },
  rejected: { th: 'ถูกปฏิเสธ', en: 'Rejected' },
};

/** Bilingual labels for the in/out/both punch selector + detail display. */
export const CORRECTION_TYPE_LABEL: Record<CorrectionType, { th: string; en: string }> = {
  in: { th: 'เวลาเข้า (ลืมกดเข้า)', en: 'Time in (missing in)' },
  out: { th: 'เวลาออก (ลืมกดออก)', en: 'Time out (missing out)' },
  both: { th: 'เข้า-ออก', en: 'In & out' },
};

interface TimeCorrectionsState {
  requests: TimeCorrectionRequest[];
  addRequest: (
    r: Omit<TimeCorrectionRequest, 'id' | 'submittedAt' | 'status' | 'audit' | 'payCode'>,
  ) => string;
  approve: (id: string, by: { name: string }, comment?: string) => void;
  reject: (id: string, by: { name: string }, reason: string) => void;
  clear: () => void;
}

/**
 * Latest NON-rejected correction for an employee on a given day — display only
 * (drives the inline row chip + the approved-overlay). This is deliberately
 * SEPARATE from the form's submit-time conflict guard (corrections/page.tsx),
 * which is left untouched. Pure over a passed-in list so it stays unit-testable.
 */
export function latestCorrectionForDate(
  requests: TimeCorrectionRequest[],
  empId: string,
  date: string,
): TimeCorrectionRequest | undefined {
  return requests
    .filter((r) => r.employeeId === empId && r.date === date && r.status !== 'rejected')
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
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
        // Derive the payroll pay-code from the chosen reason (falls back to the
        // raw reasonCode when the registry has no matching row).
        const payCode = getCorrectionReason(payload.reasonCode)?.payCode ?? payload.reasonCode;
        const req: TimeCorrectionRequest = {
          ...payload,
          payCode,
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
