import { create } from 'zustand';

// STA-88 — per-row "assign to me" state for the unified approval queue.
// Keyed by request id. Mockup phase: in-session only (no backend persistence).
// A row with no entry here falls back to its seeded `assignedApprover`; an
// explicit `null` entry means a previously-assigned row was unassigned.

export interface Assignee {
  id: string;
  name: string;
}

interface QuickApproveAssignmentsState {
  /** request id → assignee, or null when explicitly unassigned in-session. */
  assignments: Record<string, Assignee | null>;
  assignToMe: (requestId: string, me: Assignee) => void;
  unassign: (requestId: string) => void;
}

export const useQuickApproveAssignments = create<QuickApproveAssignmentsState>((set) => ({
  assignments: {},
  assignToMe: (requestId, me) =>
    set((s) => ({ assignments: { ...s.assignments, [requestId]: me } })),
  unassign: (requestId) =>
    set((s) => ({ assignments: { ...s.assignments, [requestId]: null } })),
}));
