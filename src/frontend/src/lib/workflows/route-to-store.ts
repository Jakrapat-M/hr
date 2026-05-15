/**
 * ADR-lite: routeToStore — dual-store routing shim (STA-24, PR-A)
 *
 * Context:
 *   The codebase currently has two separate Zustand+persist stores:
 *   - promotion-approvals  (usePromotionApprovals)  — handles PRCHG_PROMO workflow
 *   - pay-rate-approvals   (usePayRateApprovals)    — handles salary/adjust workflows
 *
 *   Store consolidation is deferred to PR-B pending BRD alignment.
 *   This shim is the ONLY place that maps an EventReason code to a store name.
 *   useTimelines write ownership is unchanged (approval handlers call it internally).
 *
 * Usage:
 *   const store = routeToStore(eventReason);
 *   // store === 'promotion-approvals' | 'pay-rate-approvals'
 *
 * When PR-B lands, delete this file and update the single call-site in pay-rate-change/page.tsx.
 */

// EventReason union: verbatim PRCHG codes from ReasonPicker (event=5587).
// Source: src/frontend/src/components/admin/lifecycle/ReasonPicker.tsx — EVENT_REASONS['5587']
// If @/types/workflows ships EventReason in a future PR, replace this colocated declaration.
export type EventReason =
  | 'PRCHG_PROMO'
  | 'PRCHG_MERINC'
  | 'PRCHG_ADJPOS'
  | 'PRCHG_SALADJ'
  | 'PRCHG_SALCUT';

export type ApprovalStore = 'promotion-approvals' | 'pay-rate-approvals';

/**
 * Map an EventReason code to its approval store.
 *
 * Routing logic (STA-24 spec):
 *   PRCHG_PROMO  → promotion-approvals  (position + title change workflow)
 *   all others   → pay-rate-approvals   (salary / pay component change workflow)
 *
 * Exhaustive switch: TypeScript will error if a new EventReason is added without
 * updating this function.
 */
export function routeToStore(reason: EventReason): ApprovalStore {
  switch (reason) {
    case 'PRCHG_PROMO':
      return 'promotion-approvals';
    case 'PRCHG_MERINC':
    case 'PRCHG_ADJPOS':
    case 'PRCHG_SALADJ':
    case 'PRCHG_SALCUT':
      return 'pay-rate-approvals';
    default: {
      // Exhaustiveness guard — TS narrows `reason` to `never` here.
      // At runtime, throw to surface unmapped codes immediately rather than silently.
      const _exhaustive: never = reason;
      throw new Error(`routeToStore: unhandled EventReason "${String(_exhaustive)}"`);
    }
  }
}
