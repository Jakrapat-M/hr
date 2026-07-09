import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PendingRequest } from '@/lib/quick-approve-api';

// transfer-approvals — PR-1b: a tiny dedicated slice for the store-less `transfer`
// RequestType. No domain transfer schema exists, so this slice does two things:
//   1. holds the seeded canonical transfer queue rows (queueSnapshot) so the
//      unified inbox can render them like any other type;
//   2. records a terminal marker (id → 'approved' | 'rejected') so an approved/
//      rejected transfer row drops OUT of `pending` and never re-renders as
//      approvable (plan R2).
// The approve/reject WIRING from the inbox is PR-1c — PR-1b only provides the
// slice + the selector read so transfer rows can leave `pending`.

export type TransferTerminalStatus = 'approved' | 'rejected';

export interface TransferApprovalEntry {
  id: string;
  snapshot: PendingRequest;
  /** undefined → still pending; set → terminal (drops out of `pending`). */
  terminalStatus?: TransferTerminalStatus;
}

interface TransferApprovalsState {
  entries: TransferApprovalEntry[];
  /** PR-1b: init-overwrite-empties seed from the canonical transfer queue rows. */
  seedFromQueue: (rows: PendingRequest[]) => void;
  /** PR-1c will call these from the inbox; defined now so the slice is complete. */
  markApproved: (id: string) => void;
  markRejected: (id: string) => void;
  clear: () => void;
}

export const useTransferApprovals = create<TransferApprovalsState>()(
  persist(
    (set) => ({
      entries: [],
      seedFromQueue: (rows) =>
        set((state) =>
          state.entries.length === 0
            ? { entries: rows.map((snapshot) => ({ id: snapshot.id, snapshot })) }
            : state,
        ),
      markApproved: (id) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, terminalStatus: 'approved' as const } : e,
          ),
        })),
      markRejected: (id) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, terminalStatus: 'rejected' as const } : e,
          ),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'cnext-transfer-approvals',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // PR-1b rehydrate-to-seed: drop persisted entries on every rehydrate so
      // ensureDemoSeed refills from the canonical queue rows.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<TransferApprovalsState>;
        return { ...currentState, ...persisted, entries: [] };
      },
    },
  ),
);
