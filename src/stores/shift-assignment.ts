import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { cellKey, type ShiftCell, type ShiftGroup } from '@/lib/shift-groups';

// STA-168 — shift-assignment Zustand+persist store.
//
// Holds the manager month-grid ShiftGroups. Lifecycle mirrors the claim/
// change-request `sent_back` idiom (NOT probation): draft → pending →
// { approved | returned }; a returned group re-opens to its owning manager.
//
// A submitted (pending) group surfaces as ONE row in the unified /quick-approve
// inbox via the `shift_assignment` adapter (approval-registry.ts) — the same
// multi-record→one-row collapse the time_correction adapter ships.
//
// Phase: UI mockup. No backend. Synchronous mock dispatch.

/** Patch applied to a cell by an edit / bulk-apply. */
export type CellPatch = {
  shiftCode?: string;
  dayOff?: boolean;
  otStart?: string;
  otEnd?: string;
};

interface ShiftAssignmentState {
  groups: ShiftGroup[];
  /** Set (or clear) one employee×day cell in a group. Only mutates draft/returned. */
  upsertCell: (groupId: string, empId: string, date: string, patch: CellPatch) => void;
  /** Apply the same patch to a set of (empId,date) cells at once (bulk panel). */
  bulkApply: (groupId: string, targets: { empId: string; date: string }[], patch: CellPatch) => void;
  /** Clear a set of (empId,date) cells (bulk panel "Clear"). */
  clearCells: (groupId: string, targets: { empId: string; date: string }[]) => void;
  /** Submit for review: draft/returned → pending. */
  submit: (groupId: string) => void;
  /** Approver approves: pending → approved. */
  approve: (groupId: string, by: { name: string }) => void;
  /** Approver returns for revision: pending → returned, captures the note. */
  returnForRevision: (groupId: string, note: string, by?: { name: string }) => void;
  /** Owner re-opens a returned group back to draft (optional). */
  reopen: (groupId: string) => void;
  getGroup: (groupId: string) => ShiftGroup | undefined;
  clear: () => void;
}

/** Normalize a cell after a patch — a day off clears the worked shift + OT. */
function applyPatch(cell: ShiftCell, patch: CellPatch): ShiftCell {
  const next: ShiftCell = { ...cell, ...patch };
  if (next.dayOff) {
    next.shiftCode = '';
    next.otStart = undefined;
    next.otEnd = undefined;
  }
  return next;
}

function upsertGroupCell(group: ShiftGroup, empId: string, date: string, patch: CellPatch): ShiftGroup {
  const key = cellKey(empId, date);
  const idx = group.cells.findIndex((c) => cellKey(c.empId, c.date) === key);
  if (idx === -1) {
    return { ...group, cells: [...group.cells, applyPatch({ empId, date, shiftCode: '' }, patch)] };
  }
  const cells = group.cells.slice();
  cells[idx] = applyPatch(cells[idx], patch);
  return { ...group, cells };
}

/** Editable states — mutations no-op on approved/pending groups. */
function isMutable(group: ShiftGroup): boolean {
  return group.status === 'draft' || group.status === 'returned';
}

export const useShiftAssignment = create<ShiftAssignmentState>()(
  persist(
    (set, get) => ({
      // Empty by default; the demo groups are injected by the single seed
      // authority (ensureDemoSeed → SHIFT_GROUP_SEED), init-overwrite-empties,
      // mirroring every other queue store. A fresh store (tests) stays empty.
      groups: [],

      upsertCell: (groupId, empId, date, patch) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id !== groupId || !isMutable(g) ? g : upsertGroupCell(g, empId, date, patch),
          ),
        })),

      bulkApply: (groupId, targets, patch) =>
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId || !isMutable(g)) return g;
            let next = g;
            for (const t of targets) next = upsertGroupCell(next, t.empId, t.date, patch);
            return next;
          }),
        })),

      clearCells: (groupId, targets) =>
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId || !isMutable(g)) return g;
            const keys = new Set(targets.map((t) => cellKey(t.empId, t.date)));
            return {
              ...g,
              cells: g.cells.map((c) =>
                keys.has(cellKey(c.empId, c.date))
                  ? { empId: c.empId, date: c.date, shiftCode: '' }
                  : c,
              ),
            };
          }),
        })),

      submit: (groupId) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id !== groupId || !isMutable(g)
              ? g
              : { ...g, status: 'pending', returnNote: undefined, submittedAt: new Date().toISOString() },
          ),
        })),

      approve: (groupId) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id !== groupId || g.status !== 'pending' ? g : { ...g, status: 'approved' },
          ),
        })),

      returnForRevision: (groupId, note) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id !== groupId || g.status !== 'pending'
              ? g
              : { ...g, status: 'returned', returnNote: note },
          ),
        })),

      reopen: (groupId) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id !== groupId || g.status !== 'returned' ? g : { ...g, status: 'draft' },
          ),
        })),

      getGroup: (groupId) => get().groups.find((g) => g.id === groupId),

      clear: () => set({ groups: [] }),
    }),
    {
      name: 'cnext-shift-assignment',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
