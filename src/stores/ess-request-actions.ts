import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// STA-193 — [EC] Submit Requests & Track Status.
//
// When HRBP sends a request BACK to the employee (status 'info' / "ขอข้อมูลเพิ่ม"),
// the employee can either WITHDRAW it, or REVISE & RE-SUBMIT it. In the mockup
// phase there is no backend, and the sent-back rows on /requests come from several
// read-only sources (static mocks + queue projections). So instead of mutating
// each source, we keep a tiny id-keyed override the /requests page applies on top
// of its merged row list:
//   'withdrawn'   → the row is dropped from the active list
//   'resubmitted' → the row's status flips back to 'pending' (รออนุมัติ)
// Persisted so the state transition survives navigation within a demo session.
export type EssRequestAction = 'withdrawn' | 'resubmitted';

interface EssRequestActionsState {
  /** requestId → the self-service action the employee took on a sent-back row. */
  actions: Record<string, EssRequestAction>;
  withdraw: (id: string) => void;
  resubmit: (id: string) => void;
  clear: () => void;
}

export const useEssRequestActions = create<EssRequestActionsState>()(
  persist(
    (set) => ({
      actions: {},
      withdraw: (id) =>
        set((s) => ({ actions: { ...s.actions, [id]: 'withdrawn' } })),
      resubmit: (id) =>
        set((s) => ({ actions: { ...s.actions, [id]: 'resubmitted' } })),
      clear: () => set({ actions: {} }),
    }),
    { name: 'cnext-ess-request-actions' },
  ),
);
