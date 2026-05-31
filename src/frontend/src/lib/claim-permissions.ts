// lib/claim-permissions.ts — P2 Item 2 (DEFAULT SCOPE = view-only + honest-count)
//
// canActOn(row, roles): can the current persona ACT (approve/reject) on this
// approval row, or only VIEW it? This is the DEFAULT-SCOPE predicate for the
// unified /quick-approve inbox — NOT the full per-claim approver-routing matrix
// (that real routing is deferred per the handoff decision gate).
//
// Rule (mockup phase):
//   • Approver-capable roles are those in MODULE_ACCESS['quick-approve']:
//     manager, hrbp, spd, hr_admin, hr_manager.
//   • Senior approvers (hrbp / spd / hr_admin / hr_manager) can act on EVERY row
//     — they sit above the manager in the routing chain (hasRole inheritance).
//   • A plain manager can act ONLY on rows they are the routed first-line approver
//     for — i.e. rows still `pending` whose first approval step is the manager
//     step (`หัวหน้างาน` / Manager). A manager viewing a claim already past the
//     manager step (awaiting SPD/HR) sees it VIEW-ONLY.
//   • Everyone else → view-only.
//
// View-only rows are NEVER hidden (transparency) — they render without
// approve/reject. The honest count = rows where canActOn is true.

import type { Role } from '@/lib/rbac';
import { hasRole, hasAnyRole } from '@/lib/rbac';
import type { PendingRequest } from '@/lib/quick-approve-api';
import type { QueueApproval } from '@/lib/approval-registry';

/** Roles that sit ABOVE the manager in the approval chain — act on every row. */
const SENIOR_APPROVER_ROLES: Role[] = ['hrbp', 'spd', 'hr_admin', 'hr_manager'];

/**
 * Is the FIRST approval step on this row the manager (first-line) step?
 * The seeded timelines label the manager step `หัวหน้างาน` (see
 * benefitClaimToPendingRequest / probationToPendingRequest). A row with no
 * timeline (generic leave/overtime/transfer/change rows) is treated as a
 * manager first-line step so a manager can act on their team's basics.
 */
function firstStepIsManager(row: PendingRequest): boolean {
  const timeline = row.approvalTimeline ?? [];
  if (timeline.length === 0) return true;
  const first = timeline[0];
  return first.approver === 'หัวหน้างาน' || /manager/i.test(first.approver);
}

/**
 * canActOn — DEFAULT-SCOPE action predicate for the unified inbox.
 *
 * @param item  the queue row (carries collapsed status + awaitingNext)
 * @param roles the acting persona's roles
 */
export function canActOn(item: QueueApproval, roles: Role[]): boolean {
  // Only pending rows are ever actionable; approved/rejected are terminal.
  if (item.status !== 'pending') return false;

  // Must be an approver-capable persona at all.
  if (!hasRole(roles, 'manager')) return false;

  // Senior approvers act on everything in the queue.
  if (hasAnyRole(roles, SENIOR_APPROVER_ROLES)) return true;

  // Plain manager: only the routed first-line approver. A row already past the
  // manager step (awaitingNext → awaiting SPD/HR) is view-only for the manager.
  if (item.awaitingNext) return false;
  return firstStepIsManager(item.row);
}

/** Count of rows the persona can actually act on (honest workload count). */
export function countActionable(items: QueueApproval[], roles: Role[]): number {
  return items.reduce((n, item) => (canActOn(item, roles) ? n + 1 : n), 0);
}
