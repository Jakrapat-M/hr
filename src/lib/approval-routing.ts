// lib/approval-routing.ts — P4 Item 1 (MOCK approver-routing matrix)
//
// SINGLE SOURCE OF TRUTH for WHO approves WHAT, and at WHICH step, in the unified
// /quick-approve queue. This consolidates the previously-scattered per-type
// approver policy (rbac.ts MODULE_ACCESS, admin/change-requests APPROVER_ROLES,
// pay-rate-approvals `pending_spd`, demo-seed `pending_spd` rows, and the
// approval-registry dispatch defaults) into one ordered table.
//
// MOCK ONLY (no backend): the table is static; acting (approve) advances the row
// to the next step (or terminal) and reject terminates — all via the existing
// Zustand stores / registry adapters. No event engine, no persistence layer.
//
// Derivation (does NOT invent new policy — it mirrors what the stores already do):
//   • leave / overtime / time_correction → first-line MANAGER, single step.
//   • claim → MANAGER then SPD Benefits (benefitClaimToPendingRequest timeline).
//   • change_request → SPD personal-info final approver (BRD #166).
//   • probation → MANAGER then HR Director (probationToPendingRequest timeline).
//   • pay_rate → HRBP/SPD pay-rate-change chain (MODULE_ACCESS['pay-rate-change']
//     minus the pure-admin tiers; the routed approver is SPD — `pending_spd`).
//   • tax_planning → SPD-tier Payroll review.
//   • transfer → MANAGER → HRBP → SPD (the seeded transfer timelines).
//
// canActOn (claim-permissions.ts) consults this matrix so ONLY the CURRENT step's
// approver role(s) can act; senior approvers still act on every row through the
// role hierarchy (hasAnyRole + ROLE_HIERARCHY inheritance), so existing
// honest-count behavior is preserved.

import type { Role } from '@/lib/rbac';
import { hasAnyRole } from '@/lib/rbac';
import type { RequestType } from '@/lib/quick-approve-api';
import type { ApproverStage } from '@/data/benefits/plan-registry';
import type { QueueApproval } from '@/lib/approval-registry';

/** One ordered approval step in a request type's routing chain. */
export interface RoutingStep {
  /** Roles that may act AT THIS step (the routed approver for the step). */
  roles: Role[];
  /** Localized approver label (TH). */
  labelTh: string;
  /** Localized approver label (EN). */
  labelEn: string;
  /**
   * Presentational stage for ApprovalChain.tsx (role-pill chain). Optional —
   * steps whose approver has no ApproverStage pill fall back to the first role.
   */
  stage: ApproverStage;
}

/**
 * APPROVAL_ROUTING — per-RequestType ordered approver chain. Total over every
 * RequestType so `tsc --noEmit` fails if a new request type forgets its routing.
 */
export const APPROVAL_ROUTING: Record<RequestType, RoutingStep[]> = {
  leave: [
    { roles: ['manager'], labelTh: 'หัวหน้างาน', labelEn: 'Manager', stage: 'manager' },
    { roles: ['hr_admin'], labelTh: 'ฝ่ายบุคคล', labelEn: 'HR', stage: 'hr_admin' },
  ],
  overtime: [
    { roles: ['manager'], labelTh: 'หัวหน้างาน', labelEn: 'Manager', stage: 'manager' },
  ],
  time_correction: [
    { roles: ['manager'], labelTh: 'หัวหน้างาน', labelEn: 'Manager', stage: 'manager' },
  ],
  claim: [
    { roles: ['manager'], labelTh: 'หัวหน้างาน', labelEn: 'Manager', stage: 'manager' },
    { roles: ['spd'], labelTh: 'SPD สวัสดิการ', labelEn: 'SPD Benefits', stage: 'spd' },
  ],
  change_request: [
    { roles: ['spd'], labelTh: 'SPD', labelEn: 'SPD', stage: 'spd' },
  ],
  probation: [
    { roles: ['manager'], labelTh: 'หัวหน้างาน', labelEn: 'Manager', stage: 'manager' },
    { roles: ['hr_manager'], labelTh: 'ผู้อำนวยการ HR', labelEn: 'HR Director', stage: 'hr_admin' },
  ],
  pay_rate: [
    { roles: ['hrbp', 'spd'], labelTh: 'SPD', labelEn: 'SPD', stage: 'spd' },
  ],
  tax_planning: [
    { roles: ['spd'], labelTh: 'ฝ่ายเงินเดือน', labelEn: 'Payroll', stage: 'spd' },
  ],
  transfer: [
    { roles: ['manager'], labelTh: 'หัวหน้างาน', labelEn: 'Manager', stage: 'manager' },
    { roles: ['hrbp'], labelTh: 'HRBP', labelEn: 'HRBP', stage: 'hrbp' },
    { roles: ['spd'], labelTh: 'SPD', labelEn: 'SPD', stage: 'spd' },
  ],
  // shift_assignment → manager submits a month grid; HRBP/HR admin reviews it.
  shift_assignment: [
    { roles: ['hrbp', 'hr_admin'], labelTh: 'ฝ่ายบุคคล (HRBP)', labelEn: 'HR / HRBP', stage: 'hrbp' },
  ],
};

/** The ordered routing chain for a request type (empty-safe). */
export function routingChainFor(type: RequestType): RoutingStep[] {
  return APPROVAL_ROUTING[type] ?? [];
}

/** The ordered ApproverStage pills for ApprovalChain.tsx (plan-level chain UI). */
export function routingStagesFor(type: RequestType): ApproverStage[] {
  return routingChainFor(type).map((s) => s.stage);
}

/**
 * Index of the CURRENT (awaiting-action) step for a queue row.
 *
 * Step advancement is derived from the row's own collapsed status + awaitingNext
 * flag + seeded timeline — the SAME signals canActOn already reads — so the matrix
 * stays in lockstep with the stores without a second source of mutable state:
 *   • terminal (approved / rejected) → -1 (no current step).
 *   • awaitingNext === true → the first step is decided; current = next step
 *     (clamped to the last index for single-step chains that lack a 2nd step).
 *   • otherwise → count the leading DECIDED (non-pending) timeline steps; the
 *     current step is the first still-pending one.
 */
export function currentStepIndex(item: QueueApproval): number {
  if (item.status !== 'pending') return -1;
  const chain = routingChainFor(item.row.type);
  if (chain.length === 0) return -1;

  if (item.awaitingNext) {
    return Math.min(1, chain.length - 1);
  }

  // Count leading decided steps in the seeded timeline (Manager approved → step 2).
  const timeline = item.row.approvalTimeline ?? [];
  let decided = 0;
  for (const step of timeline) {
    if (step.status === 'pending') break;
    decided += 1;
  }
  return Math.min(decided, chain.length - 1);
}

/** The current (awaiting-action) routing step, or undefined when terminal. */
export function currentStep(item: QueueApproval): RoutingStep | undefined {
  const idx = currentStepIndex(item);
  if (idx < 0) return undefined;
  return routingChainFor(item.row.type)[idx];
}

/** Roles entitled to act AT THE CURRENT STEP (empty when terminal). */
export function currentStepRoles(item: QueueApproval): Role[] {
  return currentStep(item)?.roles ?? [];
}

/**
 * Does this persona satisfy the CURRENT routing step? Uses hasAnyRole so the
 * role hierarchy applies — a senior approver (e.g. hr_admin / hr_manager) inherits
 * every lower role and therefore acts on every step, preserving the prior
 * "senior approvers act on the whole queue" behavior.
 */
export function rolesActAtCurrentStep(item: QueueApproval, roles: Role[]): boolean {
  const stepRoles = currentStepRoles(item);
  if (stepRoles.length === 0) return false;
  return hasAnyRole(roles, stepRoles);
}

/** Localized label of the NEXT approver (the current awaiting step), or null. */
export function nextApproverLabel(item: QueueApproval, locale: string): string | null {
  const step = currentStep(item);
  if (!step) return null;
  return locale === 'en' ? step.labelEn : step.labelTh;
}
