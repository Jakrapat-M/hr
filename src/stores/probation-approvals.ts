import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// probation-approvals — Zustand+persist store for probation evaluation requests.
// Manager submits evaluation → routes to admin probation queue (HR Admin reviews).
// Outcomes: pass | no_pass | extend

export type ProbationOutcome = 'pass' | 'no_pass' | 'extend';
export type ProbationEvalStatus = 'pending_hr' | 'approved' | 'rejected';

export interface ProbationEvaluation {
  id: string; // PE-YYYYMMDD-HHMMSS-<rand>
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;
  outcome: ProbationOutcome;
  rating: number; // 1-5
  strengths: string;
  areasToImprove: string;
  recommendation: string;
  extendUntil?: string; // ISO date — only when outcome=extend
  extensionReason?: string; // only when outcome=extend
  status: ProbationEvalStatus;
  submittedAt: string; // ISO timestamp
}

interface ProbationApprovalsState {
  evaluations: ProbationEvaluation[];
  addEvaluation: (
    e: Omit<ProbationEvaluation, 'id' | 'submittedAt' | 'status'>,
  ) => string;
  approveEvaluation: (id: string, by: { name: string }) => void;
  rejectEvaluation: (id: string, by: { name: string }, reason: string) => void;
  clear: () => void;
}

function generateProbationEvalId(): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PE-${ts}-${rand}`;
}

export const useProbationApprovals = create<ProbationApprovalsState>()(
  persist(
    (set) => ({
      evaluations: [],
      addEvaluation: (payload) => {
        const id = generateProbationEvalId();
        const now = new Date().toISOString();
        const evaluation: ProbationEvaluation = {
          ...payload,
          id,
          submittedAt: now,
          status: 'pending_hr',
        };
        set((state) => ({ evaluations: [evaluation, ...state.evaluations] }));
        return id;
      },
      approveEvaluation: (id, _by) =>
        set((state) => ({
          evaluations: state.evaluations.map((e) =>
            e.id !== id ? e : { ...e, status: 'approved' as ProbationEvalStatus },
          ),
        })),
      rejectEvaluation: (id, _by, _reason) =>
        set((state) => ({
          evaluations: state.evaluations.map((e) =>
            e.id !== id ? e : { ...e, status: 'rejected' as ProbationEvalStatus },
          ),
        })),
      clear: () => set({ evaluations: [] }),
    }),
    {
      name: 'cnext-probation-approvals',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
