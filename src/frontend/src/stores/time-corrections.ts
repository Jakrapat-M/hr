import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCorrectionReason } from '@/lib/time/correction-reasons';
import { isCancellableByCycle, demoToday } from '@/lib/time/period';

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

export type TimeCorrectionStep = 'pending_manager' | 'approved' | 'rejected' | 'cancelled';

/** Which punch the correction targets: in (missing-in) / out (missing-out) / both. */
export type CorrectionType = 'in' | 'out' | 'both';

export type TimeCorrectionAuditEntry = {
  actorName: string;
  action: 'submit' | 'approve' | 'reject' | 'cancel';
  comment?: string;
  at: string; // ISO timestamp
};

/**
 * One additional correction day (days 1..n) carried by a multi-day request.
 *
 * First-day-mirror invariant (Convention X — PINNED): `days[]` holds days 1..n
 * ONLY; day 0 is the top-level TimeCorrectionRequest fields. The full day-set of
 * a request is `[{day0 from top-level}, ...(days ?? [])]`; the day count is
 * `1 + (days?.length ?? 0)`. A single-day request leaves `days` undefined → it is
 * byte-identical to the pre-multi-day shape. Any `r.date`-keyed consumer that asks
 * "is there a correction for THIS date?" must consult the full set, never `r.date`
 * alone (see latestCorrectionForDate, correction-overlay, the detail page, the
 * registry mapper, the status row, and the form's validate).
 */
export type CorrectionDay = {
  id?: string;
  /** Working day this entry applies to (ISO date YYYY-MM-DD). */
  date: string;
  correctionType: CorrectionType;
  reasonCode: string;
  /** System-recorded time (blank for missing punches). */
  originalTime?: string;
  /** Time the employee says is correct (HH:mm). */
  correctedTime: string;
  reason: string;
  /** Optional attachment filenames (mock — names only). */
  docs?: string[];
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
  /**
   * Additional correction days (days 1..n) when one submission corrects several
   * days. Convention X: day 0 lives in the top-level fields above; `days[]` is
   * days 1..n ONLY and NEVER duplicates day 0. Undefined for single-day requests.
   * Full set = `[{day0}, ...(days ?? [])]`; count = `1 + (days?.length ?? 0)`.
   */
  days?: CorrectionDay[];
  status: TimeCorrectionStep;
  submittedAt: string; // ISO timestamp
  audit: TimeCorrectionAuditEntry[];
};

export const TIME_CORRECTION_STEP_LABEL: Record<TimeCorrectionStep, { th: string; en: string }> = {
  pending_manager: { th: 'รอหัวหน้าอนุมัติ', en: 'Awaiting manager' },
  approved: { th: 'อนุมัติแล้ว', en: 'Approved' },
  rejected: { th: 'ถูกปฏิเสธ', en: 'Rejected' },
  cancelled: { th: 'ยกเลิกแล้ว', en: 'Cancelled' },
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
  /**
   * STA-183 — employee cancels their OWN correction under the cycle-window rule:
   * allowed while not terminal (rejected/cancelled) AND the correction day is in
   * the current or immediately-previous payroll cycle. Sets status 'cancelled' +
   * appends a 'cancel' audit entry. Drops out of the unified inbox via the
   * selector's cancelled guard.
   */
  cancel: (id: string, by: { name: string }) => void;
  clear: () => void;
}

/**
 * Latest NON-rejected correction for an employee on a given day — display only
 * (drives the inline row chip + the approved-overlay). This is deliberately
 * SEPARATE from the form's submit-time conflict guard (corrections/page.tsx),
 * which is left untouched. Pure over a passed-in list so it stays unit-testable.
 *
 * Convention X (multi-day): a request covers `date` when its top-level `date`
 * (day 0) matches OR any `days[]` entry (days 1..n) matches. The returned object
 * is PROJECTED onto the matching day — when a `days[]` entry matches, its
 * date/type/reason/time fields override the top-level (day-0) fields so the chip
 * reflects the right day — while keeping the request-level `id`/`status`/
 * `submittedAt`/`employee*` so callers read the same shape as before.
 */
export function latestCorrectionForDate(
  requests: TimeCorrectionRequest[],
  empId: string,
  date: string,
): TimeCorrectionRequest | undefined {
  const match = requests
    .filter(
      (r) =>
        r.employeeId === empId &&
        r.status !== 'rejected' &&
        (r.date === date || (r.days ?? []).some((d) => d.date === date)),
    )
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  if (!match) return undefined;
  if (match.date === date) return match;
  // A days[] entry matched — project the request onto that day for display.
  const day = (match.days ?? []).find((d) => d.date === date)!;
  return {
    ...match,
    date: day.date,
    correctionType: day.correctionType,
    reasonCode: day.reasonCode,
    originalTime: day.originalTime,
    correctedTime: day.correctedTime,
    reason: day.reason,
    docs: day.docs,
  };
}

/** The minimal projection of one correction day used by collision checks. */
export type CorrectionDayKey = {
  date: string;
  correctionType: CorrectionType;
  correctedTime: string;
};

/**
 * Materialize a stored request's FULL day-set, DAY-0-INCLUSIVE (Convention X):
 * `[{day0 from top-level}, ...days]`. NEVER `(r.days ?? [single])` — that returns
 * days 1..n for a multi-day request and silently drops day 0 from any check built
 * on it. Used by the form's submit-time collision guard (MF-5).
 */
export function materializeCorrectionDays(r: TimeCorrectionRequest): CorrectionDayKey[] {
  return [
    { date: r.date, correctionType: r.correctionType, correctedTime: r.correctedTime },
    ...(r.days ?? []).map((d) => ({
      date: d.date,
      correctionType: d.correctionType,
      correctedTime: d.correctedTime,
    })),
  ];
}

/** A new row collides with a stored day on (date+type) OR (date+same corrected time). */
export type CorrectionConflict = 'duplicate' | 'time_clash';

/**
 * Does the candidate day conflict with any day in `storedDays` (MF-5)? Returns the
 * conflict KIND so the caller can surface the right bilingual message, or null.
 * `storedDays` must be the materialized full day-set of every non-rejected request
 * (via materializeCorrectionDays) — day-0-inclusive so collisions are never missed.
 */
export function findCorrectionConflict(
  candidate: CorrectionDayKey,
  storedDays: CorrectionDayKey[],
): CorrectionConflict | null {
  if (
    storedDays.some(
      (sd) => sd.date === candidate.date && sd.correctionType === candidate.correctionType,
    )
  ) {
    return 'duplicate';
  }
  if (
    storedDays.some(
      (sd) => sd.date === candidate.date && sd.correctedTime === candidate.correctedTime,
    )
  ) {
    return 'time_clash';
  }
  return null;
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
      cancel: (id, by) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            // STA-183 — cycle-window rule (supersedes the pending_manager-only gate):
            // any non-terminal correction whose working day is in the current or
            // previous payroll cycle is self-cancellable, via the shared helper.
            r.id !== id ||
            r.status === 'rejected' ||
            r.status === 'cancelled' ||
            !isCancellableByCycle(r.date, demoToday())
              ? r
              : {
                  ...r,
                  status: 'cancelled' as TimeCorrectionStep,
                  audit: [
                    ...r.audit,
                    {
                      actorName: by.name,
                      action: 'cancel' as const,
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
