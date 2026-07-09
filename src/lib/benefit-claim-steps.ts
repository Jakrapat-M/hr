/**
 * Status-faithful claim/referral pipeline mapping for the benefits-hub
 * in-flight cards. Node count tracks the SOURCE's real states — never a
 * fictional uniform 5-step pipeline.
 *
 * - Referrals carry a genuine forward pipeline (mirrors benefits-hub:253):
 *   pending_spd → spd_reviewing → approved, surfaced as
 *   [รอ HRBP, SPD ตรวจ, รอออกใบ]. `send_back` is a rework/rejection, NOT
 *   progress to the final node, so it returns `rework: true` and the caller
 *   renders a "ส่งกลับแก้" chip instead of lighting the rightmost node.
 * - Reimbursement claims only have 3 real states (approved|pending|info), so
 *   they map to a 3-node [ยื่น, ตรวจ, อนุมัติ] treatment.
 *
 * Hardcoded TH (benefits-hub has no useTranslations — i18n-exempt per plan F2).
 */

export type ClaimPipelineSource = 'referral' | 'claim';

export interface ClaimPipeline {
  steps: string[];
  activeIndex: number;
  /** When true, the item was sent back for rework — render a chip, not a node. */
  rework?: boolean;
}

const REFERRAL_STEPS = ['รอ HRBP', 'SPD ตรวจ', 'รอออกใบ'] as const;
const CLAIM_STEPS = ['ยื่น', 'ตรวจ', 'อนุมัติ'] as const;

export function claimPipeline(source: ClaimPipelineSource, status: string): ClaimPipeline {
  if (source === 'referral') {
    switch (status) {
      case 'pending_spd':
        return { steps: [...REFERRAL_STEPS], activeIndex: 0 };
      case 'spd_reviewing':
        return { steps: [...REFERRAL_STEPS], activeIndex: 1 };
      case 'approved':
        return { steps: [...REFERRAL_STEPS], activeIndex: 2 };
      case 'send_back':
        // Rework — do NOT light the final node as if near-done.
        return { steps: [...REFERRAL_STEPS], activeIndex: 0, rework: true };
      default:
        return { steps: [...REFERRAL_STEPS], activeIndex: 0 };
    }
  }

  // source === 'claim' — only 3 real states.
  switch (status) {
    case 'pending':
      return { steps: [...CLAIM_STEPS], activeIndex: 1 };
    case 'info':
      return { steps: [...CLAIM_STEPS], activeIndex: 1 };
    case 'approved':
      return { steps: [...CLAIM_STEPS], activeIndex: 2 };
    default:
      return { steps: [...CLAIM_STEPS], activeIndex: 0 };
  }
}
