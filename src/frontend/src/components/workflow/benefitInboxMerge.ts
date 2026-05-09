// Adapter + merge helpers for BenefitClaimsInbox.
// The inbox renders rows from two backends:
//   - source 'mock'    : legacy Zustand store (useBenefitClaimsStore) — the
//                        seeded historical mock claims that pre-date Camunda.
//   - source 'camunda' : live PendingTaskSummary objects fetched from the
//                        hr-workflow Fastify gateway (Camunda 7 user tasks).
//
// Keeping the adapter in its own module avoids bloating BenefitClaimsInbox.tsx
// and gives the merge logic a clean unit-test seam.

import type { BenefitClaimRequest } from '@/stores/benefit-claims';
import type { PendingTaskSummary } from '@/lib/workflow-api';

export type BenefitInboxRowSource = 'mock' | 'camunda';

/** Discriminated union of the two row shapes the inbox can render. */
export type BenefitInboxRow =
  | { source: 'mock'; key: string; claim: BenefitClaimRequest }
  | { source: 'camunda'; key: string; task: PendingTaskSummary };

/**
 * Adapt a Camunda PendingTaskSummary into the inbox row shape. Pure function;
 * no side effects, no formatting — formatting stays in the component.
 */
export function pendingTaskToInboxRow(task: PendingTaskSummary): BenefitInboxRow {
  return { source: 'camunda', key: `camunda:${task.id}`, task };
}

/**
 * Merge legacy mock claims (only those still pending SPD review) with the
 * live Camunda task list. Camunda rows surface first because they reflect
 * live workflow state; legacy mock rows follow.
 */
export function mergeBenefitInboxRows(
  pendingClaims: BenefitClaimRequest[],
  camundaTasks: PendingTaskSummary[],
): BenefitInboxRow[] {
  const camundaRows: BenefitInboxRow[] = camundaTasks.map(pendingTaskToInboxRow);
  const mockRows: BenefitInboxRow[] = pendingClaims.map((claim) => ({
    source: 'mock',
    key: `mock:${claim.id}`,
    claim,
  }));
  return [...camundaRows, ...mockRows];
}
