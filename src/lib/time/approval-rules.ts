// lib/time/approval-rules.ts — Group 0 (Time-module ESS shared foundations)
//
// MOCK ONLY. A PURE SELECTOR over the canonical routing chain in
// approval-routing.ts — it does NOT declare its own approver roles. It only
// decides HOW MANY steps of the (already-defined) chain apply to a given leave
// type, then slices the chain to that depth.

import { routingChainFor, type RoutingStep } from '@/lib/approval-routing';
import type { RequestType } from '@/lib/quick-approve-api';

/**
 * Leave types that escalate to a 2-step (Manager → HR) chain:
 *   • any unpaid leave (code contains 'unpaid'), OR
 *   • the explicitly-listed maternity / disciplinary / investigation cases.
 * Everything else is a single-step (Manager-only) approval.
 */
const TWO_LEVEL_LEAVE_CODES = new Set<string>([
  'maternity_leave',
  'maternity_leave_unpaid',
  'maternity_risk_case',
  'investigation',
  'punishment_unpaid',
]);

/** Approval depth for a leave type: 2 for escalated types, else 1. */
export function levelsForLeaveType(code: string): 1 | 2 {
  if (code.includes('unpaid') || TWO_LEVEL_LEAVE_CODES.has(code)) return 2;
  return 1;
}

/**
 * The applied routing chain for a request. For 'leave' the maximal Manager→HR
 * chain is sliced to the leave-type's depth (default 1 when no code given);
 * every other request type returns its full canonical chain unchanged.
 */
export function appliedChainFor(type: RequestType, leaveCode?: string): RoutingStep[] {
  if (type === 'leave') {
    const depth = leaveCode ? levelsForLeaveType(leaveCode) : 1;
    return routingChainFor('leave').slice(0, depth);
  }
  return routingChainFor(type);
}
