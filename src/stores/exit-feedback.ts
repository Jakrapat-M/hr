// exit-feedback.ts — standalone read-model for admin-initiated Exit Interview
// feedback (STA-124 — [EC] Termination feedback).
//
// WHY a separate store (plan decision B-b): the admin terminate form's real
// submit path is `useTimelines().append(empId, TerminateEvent)`. The shared
// `TerminateEvent` type lives in the legacy `services/shared` tree (out of
// scope to edit in mockup phase), so the structured exit-interview record is
// written here ALONGSIDE the timeline append — not folded into the timeline
// `notes` string. An HRBP-reachable read-only surface (/hrbp/dashboard) reads
// this store to render captured feedback per terminated employee.
//
// Mockup phase: in-memory + localStorage via the existing Zustand persist
// pattern (mirrors useTimelines). No backend.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/** One ranked part (Job / Compensation / Work Relationship) — codes are option `code`s. */
export interface RankedExitPart {
  rank1: string
  rank2: string
  rank3: string
  comment: string
}

export const EMPTY_RANKED_PART: RankedExitPart = {
  rank1: '',
  rank2: '',
  rank3: '',
  comment: '',
}

/** The full structured exit-interview record captured on the terminate form. */
export interface ExitInterviewRecord {
  job: RankedExitPart
  compensation: RankedExitPart
  workRelationship: RankedExitPart
  /** Part 4 — single select. */
  personalReason: { value: string }
  /** Part 5 — single select + conditional new-job-type sub-select. */
  newJob: { value: string; newJobType: string }
  /** Overall free-text comment. */
  overallComment: string
}

export const EMPTY_EXIT_INTERVIEW: ExitInterviewRecord = {
  job: { ...EMPTY_RANKED_PART },
  compensation: { ...EMPTY_RANKED_PART },
  workRelationship: { ...EMPTY_RANKED_PART },
  personalReason: { value: '' },
  newJob: { value: '', newJobType: '' },
  overallComment: '',
}

/** Persisted entry — record plus minimal employee/context metadata for the HRBP panel. */
export interface ExitFeedbackEntry {
  employeeId: string
  employeeNameTh: string
  employeeNameEn: string
  positionTitle: string
  /** Termination reason code (from termination-logic enum) for context. */
  reasonCode: string
  /** Resigned / last day (ISO date). */
  resignedDate: string
  /** ISO timestamp of capture. */
  recordedAt: string
  record: ExitInterviewRecord
}

/** True when at least one answer was provided (section is fully optional). */
export function isExitInterviewEmpty(r: ExitInterviewRecord): boolean {
  const parts: RankedExitPart[] = [r.job, r.compensation, r.workRelationship]
  const rankedTouched = parts.some(
    (p) => p.rank1 || p.rank2 || p.rank3 || p.comment.trim(),
  )
  return (
    !rankedTouched &&
    !r.personalReason.value &&
    !r.newJob.value &&
    !r.newJob.newJobType &&
    !r.overallComment.trim()
  )
}

interface ExitFeedbackState {
  byEmployee: Record<string, ExitFeedbackEntry>
  /** Write/overwrite the feedback for an employee (called on terminate submit). */
  record: (entry: ExitFeedbackEntry) => void
  /** Selector — undefined if none captured. */
  get: (empId: string) => ExitFeedbackEntry | undefined
  /** All captured entries, newest first. */
  list: () => ExitFeedbackEntry[]
}

export const useExitFeedback = create<ExitFeedbackState>()(
  persist(
    (set, get) => ({
      byEmployee: {},

      record: (entry) => {
        set((state) => ({
          byEmployee: { ...state.byEmployee, [entry.employeeId]: entry },
        }))
      },

      get: (empId) => get().byEmployee[empId],

      list: () =>
        Object.values(get().byEmployee).sort((a, b) =>
          b.recordedAt.localeCompare(a.recordedAt),
        ),
    }),
    {
      name: 'hr-exit-feedback',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
