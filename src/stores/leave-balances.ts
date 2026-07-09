import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// leave-balances — Group A (Time-module ESS reconcile). Numeric leave-quota
// ledger keyed by employeeId × balanceKind (the 7 quotaTracked leave codes).
//
// PLAIN persist (mirrors time-corrections.ts) — NOT the leave-approvals
// merge-wipe contract. Balances MUST survive a rehydrate: they are the
// reserve/deduct/release ledger backing the leave reconcile, so wiping them on
// refresh would silently un-reserve in-flight requests. This is precisely why
// balances live in a SEPARATE slice from leave-approvals (which rehydrates empty
// and re-seeds).
//
// Bucket math (per employee × kind):
//   remaining = initial + credits − debits − reserved
//   reserve(days)  → reserved += days        (submit; soft-hold the quota)
//   release(days)  → reserved −= days        (reject/cancel; give it back)
//   deduct(days)   → reserved −= days; debits += days  (final approval)
//
// Phase: UI mockup. No backend. Synchronous, no setTimeout.

export interface LeaveBalanceBucket {
  initial: number;
  credits: number;
  debits: number;
  reserved: number;
}

function bucketKey(employeeId: string, kind: string): string {
  return `${employeeId}:${kind}`;
}

function emptyBucket(): LeaveBalanceBucket {
  return { initial: 0, credits: 0, debits: 0, reserved: 0 };
}

interface LeaveBalancesState {
  /** Keyed `${employeeId}:${kind}` → numeric bucket. */
  balances: Record<string, LeaveBalanceBucket>;
  /** Soft-hold `days` against the bucket (on submit). */
  reserve: (employeeId: string, kind: string, days: number) => void;
  /** Give back reserved `days` (on reject/cancel). */
  release: (employeeId: string, kind: string, days: number) => void;
  /** Move reserved `days` → debits (on final approval). */
  deduct: (employeeId: string, kind: string, days: number) => void;
  /**
   * STA-183 — reverse an ALREADY-APPROVED draw-down (on cancelling an approved
   * leave): mirror of `deduct` for the debits side, `debits -= days` (clamp ≥ 0).
   * Restores `remaining` to its pre-approval value so a cancelled approved leave
   * no longer shows depleted quota on the /timeoff cards. Only for prior-status
   * 'approved'; a still-pending (reserved) cancel uses `release`.
   */
  reverseApproved: (employeeId: string, kind: string, days: number) => void;
  /** Seed/overwrite buckets. Each entry is keyed by employeeId × kind. */
  seedBalances: (
    seeds: Array<{ employeeId: string; kind: string } & Partial<LeaveBalanceBucket>>,
  ) => void;
  clear: () => void;
}

function mutateBucket(
  state: LeaveBalancesState,
  employeeId: string,
  kind: string,
  fn: (b: LeaveBalanceBucket) => LeaveBalanceBucket,
): Record<string, LeaveBalanceBucket> {
  const key = bucketKey(employeeId, kind);
  const current = state.balances[key] ?? emptyBucket();
  return { ...state.balances, [key]: fn({ ...current }) };
}

export const useLeaveBalances = create<LeaveBalancesState>()(
  persist(
    (set) => ({
      balances: {},
      reserve: (employeeId, kind, days) =>
        set((state) => ({
          balances: mutateBucket(state, employeeId, kind, (b) => ({
            ...b,
            reserved: b.reserved + days,
          })),
        })),
      release: (employeeId, kind, days) =>
        set((state) => ({
          balances: mutateBucket(state, employeeId, kind, (b) => ({
            ...b,
            reserved: Math.max(0, b.reserved - days),
          })),
        })),
      deduct: (employeeId, kind, days) =>
        set((state) => ({
          balances: mutateBucket(state, employeeId, kind, (b) => ({
            ...b,
            reserved: Math.max(0, b.reserved - days),
            debits: b.debits + days,
          })),
        })),
      reverseApproved: (employeeId, kind, days) =>
        set((state) => ({
          balances: mutateBucket(state, employeeId, kind, (b) => ({
            ...b,
            debits: Math.max(0, b.debits - days),
          })),
        })),
      seedBalances: (seeds) =>
        set((state) => {
          const next = { ...state.balances };
          for (const seed of seeds) {
            const key = bucketKey(seed.employeeId, seed.kind);
            next[key] = {
              ...emptyBucket(),
              ...next[key],
              initial: seed.initial ?? next[key]?.initial ?? 0,
              credits: seed.credits ?? next[key]?.credits ?? 0,
              debits: seed.debits ?? next[key]?.debits ?? 0,
              reserved: seed.reserved ?? next[key]?.reserved ?? 0,
            };
          }
          return { balances: next };
        }),
      clear: () => set({ balances: {} }),
    }),
    {
      name: 'cnext-leave-balances',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Pure bucket → remaining: initial + credits − debits − reserved. */
function bucketRemaining(b: LeaveBalanceBucket | undefined): number {
  if (!b) return 0;
  return b.initial + b.credits - b.debits - b.reserved;
}

/**
 * Remaining quota for an employee × kind (non-reactive getState read — for the
 * store actions, registry adapter, and tests). UI components that must re-render
 * on a reserve/deduct should subscribe via `useRemainingFor`.
 */
export function remainingFor(employeeId: string, kind: string): number {
  return bucketRemaining(useLeaveBalances.getState().balances[bucketKey(employeeId, kind)]);
}

/** Reactive remaining quota — subscribes to the bucket so the form re-renders. */
export function useRemainingFor(employeeId: string, kind: string): number {
  return useLeaveBalances((s) => bucketRemaining(s.balances[bucketKey(employeeId, kind)]));
}
