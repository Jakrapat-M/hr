// use-time-off-ledger — thin selector hook feeding the PURE buildTimeOffLedger.
//
// Subscribes to the leave-balances store as a TOP-LEVEL Zustand selector (NOT
// getState()) so the Time-Off tab re-renders the moment a leave is approved
// (deduct moves reserved → debits). Surfaces the store's in-flight `reserved`
// days as the ledger's `pending` column, so Ending = initial − (pending + debits)
// and the tab agrees with the at-a-glance card and the /timeoff remaining math.

import { useMemo } from 'react';
import { useLeaveBalances } from '@/stores/leave-balances';
import { quotaTrackedTypes } from '@/lib/time/leave-types';
import { buildTimeOffLedger, type LeaveLedgerRow } from '@/lib/time/time-off-ledger';

/** Live Time-Off ledger rows for an employee (7 quota-tracked buckets). */
export function useTimeOffLedger(empId: string): LeaveLedgerRow[] {
  const balances = useLeaveBalances((s) => s.balances);

  return useMemo(() => {
    const buckets: Record<string, { initial: number; pending: number; debits: number }> = {};
    for (const t of quotaTrackedTypes()) {
      const b = balances[`${empId}:${t.code}`];
      if (b) {
        // Surface the store's in-flight `reserved` as `pending` so the ledger
        // Ending = initial − (pending + debits) agrees with /timeoff remaining.
        buckets[t.code] = { initial: b.initial, pending: b.reserved, debits: b.debits };
      }
    }
    return buildTimeOffLedger(buckets);
  }, [balances, empId]);
}
