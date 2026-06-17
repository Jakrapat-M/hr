// Time Off balance ledger (wiki §6 WFS "Time Off" tab): per leave bucket, in days,
// Initial Balance · Credits · Debits · Ending Balance. Ending = Initial + Credits −
// Debits. PURE: the page feeds live per-bucket numbers from the leave-balances
// store (via useTimeOffLedger); this module only shapes them into labelled rows
// over the 7 quota-tracked leave codes.

import { quotaTrackedTypes } from './leave-types';

export type LeaveLedgerRow = {
  kind: string;
  nameTh: string;
  nameEn: string;
  initial: number;
  credits: number;
  debits: number;
};

/** Per-bucket settled numbers for a leave code (from the leave-balances store). */
export type LedgerBucketInput = { initial: number; credits: number; debits: number };

/**
 * Build the Time-Off ledger rows over the 7 quota-tracked leave codes, in the
 * registry order, with bilingual labels from LEAVE_TYPES (kind = code, since the
 * balance buckets key on the leave code). Codes missing from `buckets` render as
 * an all-zero row so the tab always shows all 7 buckets. PURE → unit-testable.
 */
export function buildTimeOffLedger(
  buckets: Record<string, LedgerBucketInput>,
): LeaveLedgerRow[] {
  return quotaTrackedTypes().map((t) => {
    const b = buckets[t.code] ?? { initial: 0, credits: 0, debits: 0 };
    return {
      kind: t.code,
      nameTh: t.nameTh,
      nameEn: t.nameEn,
      initial: b.initial,
      credits: b.credits,
      debits: b.debits,
    };
  });
}

export function endingBalance(r: LeaveLedgerRow): number {
  return r.initial + r.credits - r.debits;
}

export type LeaveBalanceCard = {
  /** Total available this period (initial + credits). */
  entitled: number;
  /** Days taken (debits). */
  used: number;
  /** Days left (ending balance). */
  remaining: number;
  /** Used as a 0..100 share of entitlement (0 when nothing is entitled). */
  percentUsed: number;
};

/** At-a-glance metrics for a leave-balance progress card. Pure → unit-testable. */
export function leaveBalanceCard(r: LeaveLedgerRow): LeaveBalanceCard {
  const entitled = r.initial + r.credits;
  const used = r.debits;
  const remaining = endingBalance(r);
  const percentUsed = entitled > 0 ? Math.round((used / entitled) * 100) : 0;
  return { entitled, used, remaining, percentUsed };
}
