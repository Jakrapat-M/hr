// use-time-off-ledger — thin selector hook feeding the PURE buildTimeOffLedger.
//
// Subscribes to the leave-balances store as a TOP-LEVEL Zustand selector (NOT
// getState()) so the Time-Off tab re-renders the moment a leave is approved
// (deduct moves reserved → debits). Feeds ONLY the settled numbers
// (initial/credits/debits) — never `reserved` — so the ledger Ending stays
// settled and agrees with the at-a-glance card (do-not-regress).

import { useMemo } from 'react';
import { useLeaveBalances } from '@/stores/leave-balances';
import { quotaTrackedTypes } from '@/lib/time/leave-types';
import { buildTimeOffLedger, type LeaveLedgerRow } from '@/lib/time/time-off-ledger';

/** Live Time-Off ledger rows for an employee (7 quota-tracked buckets). */
export function useTimeOffLedger(empId: string): LeaveLedgerRow[] {
  const balances = useLeaveBalances((s) => s.balances);

  return useMemo(() => {
    const buckets: Record<string, { initial: number; credits: number; debits: number }> = {};
    for (const t of quotaTrackedTypes()) {
      const b = balances[`${empId}:${t.code}`];
      if (b) {
        // Settled-only: deliberately drop `reserved` so Ending = initial+credits−debits.
        buckets[t.code] = { initial: b.initial, credits: b.credits, debits: b.debits };
      }
    }
    return buildTimeOffLedger(buckets);
  }, [balances, empId]);
}
