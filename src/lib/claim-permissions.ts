// lib/claim-permissions.ts — P2 Item 2 + P4 Item 1 (STEP-AWARE approver routing)
//
// canActOn(row, roles): can the current persona ACT (approve/reject) on this
// approval row, or only VIEW it? This is the action predicate for the unified
// /quick-approve inbox.
//
// P4: this now consults the per-type approver-routing matrix (lib/approval-routing.ts)
// so ONLY the CURRENT step's approver role(s) can act; everyone else who can see
// the row is view-only.
//
// Rule (mockup phase):
//   • Approver-capable roles are those in MODULE_ACCESS['quick-approve']:
//     manager, hrbp, spd, hr_admin, hr_manager.
//   • Senior approvers (hrbp / spd / hr_admin / hr_manager) sit ABOVE the manager
//     in the chain and, through role-hierarchy inheritance (hasAnyRole), satisfy
//     the routed role at every step — so they still act on EVERY queue row.
//   • A plain manager can act ONLY where the manager IS the current routed step
//     — i.e. a row still `pending` whose CURRENT routing step grants the manager
//     role AND that the row has not already advanced past (awaitingNext). A
//     manager viewing a claim already past the manager step (awaiting SPD/HR)
//     sees it VIEW-ONLY.
//   • Everyone else → view-only.
//
// View-only rows are NEVER hidden (transparency) — they render without
// approve/reject. The honest count = rows where canActOn is true.

import type { Role } from '@/lib/rbac';
import { hasRole, hasAnyRole } from '@/lib/rbac';
import type { QueueApproval } from '@/lib/approval-registry';
import { rolesActAtCurrentStep, currentStepRoles } from '@/lib/approval-routing';

/** Roles that sit ABOVE the manager in the approval chain — act on every row. */
const SENIOR_APPROVER_ROLES: Role[] = ['hrbp', 'spd', 'hr_admin', 'hr_manager'];

/**
 * canActOn — STEP-AWARE action predicate for the unified inbox.
 *
 * @param item  the queue row (carries collapsed status + awaitingNext)
 * @param roles the acting persona's roles
 */
export function canActOn(item: QueueApproval, roles: Role[]): boolean {
  // Only pending rows are ever actionable; approved/rejected are terminal.
  if (item.status !== 'pending') return false;

  // Must be an approver-capable persona at all.
  if (!hasRole(roles, 'manager')) return false;

  // Senior approvers act on everything in the queue (role-hierarchy inheritance
  // makes them satisfy every routed step). Kept as an explicit short-circuit so
  // a row already past its in-matrix steps (awaitingNext on a single-step chain)
  // still lets a senior approver act.
  if (hasAnyRole(roles, SENIOR_APPROVER_ROLES)) return true;

  // A row already advanced past its first approver (awaitingNext → awaiting the
  // NEXT step) is view-only for a plain manager — the manager step is done.
  if (item.awaitingNext) return false;

  // Otherwise the persona may act only when its role satisfies the CURRENT routed
  // step. For a plain manager this is true exactly when the manager is the
  // current routing approver (the per-type matrix decides this).
  const stepRoles = currentStepRoles(item);
  // No routing defined (defensive) → fall back to the previous first-line-manager
  // default so generic rows stay actionable for a manager.
  if (stepRoles.length === 0) return true;
  return rolesActAtCurrentStep(item, roles);
}

/** Count of rows the persona can actually act on (honest workload count). */
export function countActionable(items: QueueApproval[], roles: Role[]): number {
  return items.reduce((n, item) => (canActOn(item, roles) ? n + 1 : n), 0);
}
