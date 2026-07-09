// STA-159 — adapter: BenefitClaimRequest → the canonical approver PendingRequest
// so the read-only ClaimDetailModal can reuse the quick-approve claim row body
// (ClaimDetails/ClaimPayload) without forking a second layout.
//
// Hard invariants (crash-avoidance, NOT cosmetic): RequestPayload consumes
// `details.amount.toLocaleString()` and `details.policyChecks.map()`
// UNCONDITIONALLY. The adapter therefore builds a TYPED ClaimDetails literal so
// the compiler enforces every non-optional, never a runtime guard at the consumer.

import {
  BENEFIT_TYPE_LABEL,
  type BenefitClaimRequest,
  type BenefitClaimAuditEntry,
} from '@/stores/benefit-claims';
import type {
  PendingRequest,
  ClaimDetails,
  ApprovalStep,
} from '@/lib/quick-approve-api';

// Re-export the canonical claim payload type so the modal's single import site
// can pull both the adapter and the shape it produces from one module.
export type { ClaimDetails, PendingRequest } from '@/lib/quick-approve-api';

const AUDIT_ROLE_LABEL: Record<BenefitClaimAuditEntry['actorRole'], string> = {
  employee: 'พนักงาน',
  manager: 'หัวหน้างาน',
  spd: 'SPD',
  hrbp: 'HRBP',
  system: 'ระบบ',
};

function auditStatus(action: BenefitClaimAuditEntry['action']): ApprovalStep['status'] {
  if (action === 'approve') return 'approved';
  if (action === 'reject') return 'rejected';
  // submit / send_back / resubmit → still in-flight
  return 'pending';
}

/** Filenames seeded on the claim, resolved under /sample-claims by the viewer.
 * `BenefitAttachment.filename` is optional with a `name` compat fallback; drop
 * any hole so the viewer never builds `/sample-claims/undefined`. */
export function claimAttachmentFilenames(claim: BenefitClaimRequest): string[] {
  return (claim.attachments ?? [])
    .map((a) => a.filename ?? a.name ?? '')
    .filter(Boolean);
}

function auditToTimeline(audit: BenefitClaimAuditEntry[]): ApprovalStep[] {
  return (audit ?? []).map((entry, index) => ({
    step: index + 1,
    approver: AUDIT_ROLE_LABEL[entry.actorRole] ?? entry.actorName,
    status: auditStatus(entry.action),
    date: entry.at,
    comment: entry.note,
  }));
}

/**
 * Build a canonical PendingRequest from a benefit claim.
 *
 * Preference order: when `claim.queueSnapshot` is present it is ALREADY a
 * canonical PendingRequest (1:1 with /quick-approve), so return it directly.
 * Only when absent do we synthesize one and derive the approval timeline from
 * `claim.audit` as a fallback.
 */
export function benefitClaimToPendingRequest(claim: BenefitClaimRequest): PendingRequest {
  if (claim.queueSnapshot) return claim.queueSnapshot;

  const filenames = claimAttachmentFilenames(claim);

  const details: ClaimDetails = {
    // ── hard invariants (consumed unguarded downstream) ──
    amount: claim.totalClaimAmount,
    policyChecks: [],
    merchant: claim.hospitalName ?? '',
    currency: claim.currency,
    category: BENEFIT_TYPE_LABEL[claim.benefitType] ?? claim.benefitName,
    // ── optional mirrors / pass-throughs ──
    remainingAmount: claim.remainingAmount,
    receiptDate: claim.receiptDate,
    receiptNo: claim.receiptNo,
    receiptAmount: claim.receiptAmount,
    totalClaimAmount: claim.totalClaimAmount,
    remark: claim.remark,
    claimDate: claim.claimDate,
    benefitType: claim.benefitType,
    dynamicFields: claim.dynamicFields ?? {},
    receiptUrl: filenames[0] ? `/sample-claims/${filenames[0]}` : undefined,
  };

  return {
    id: claim.workflowRequestId || claim.id,
    type: 'claim',
    requester: {
      id: claim.employeeId,
      name: claim.employeeName,
      position: claim.personalGrade ?? '',
      department: claim.businessUnit ?? '',
      employeeId: claim.employeeId,
      businessUnit: claim.businessUnit,
      company: claim.company,
      payGrade: claim.personalGrade,
    },
    description: claim.benefitName,
    submittedAt: claim.submittedAt,
    submitDate: claim.submittedAt,
    urgency: 'normal',
    waitingDays: 0,
    attachments: filenames,
    details,
    approvalTimeline: auditToTimeline(claim.audit),
  };
}
