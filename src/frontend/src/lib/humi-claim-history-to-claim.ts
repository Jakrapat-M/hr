// STA-182 — adapter: HumiClaimHistoryItem (the Benefits-Hub claim-history preview
// row) → BenefitClaimRequest, so the "more detail" action can reuse the existing
// read-only ClaimDetailModal (STA-159) instead of a bespoke modal. The modal wants
// a full claim (request detail + approval history + attachment view), so we
// synthesise the audit trail from the row status and seed one real sample receipt.

import type { HumiClaimHistoryItem } from '@/lib/humi-mock-data';
import type {
  BenefitClaimRequest,
  BenefitClaimStatus,
  BenefitClaimAuditEntry,
} from '@/stores/benefit-claims';

const STATUS_MAP: Record<HumiClaimHistoryItem['status'], BenefitClaimStatus> = {
  approved: 'approved',
  pending: 'pending_spd',
  info: 'pending_manager_approval',
};

function amountToNumber(amount: string): number {
  return Number(amount.replace(/[^0-9.-]/g, '')) || 0;
}

/** Build a status-faithful approval trail so HistoryTimeline renders real steps. */
function buildAudit(
  status: HumiClaimHistoryItem['status'],
  at: string,
  employeeName: string,
): BenefitClaimAuditEntry[] {
  const audit: BenefitClaimAuditEntry[] = [
    { at, actorRole: 'employee', actorName: employeeName, action: 'submit', note: 'ยื่นคำขอเบิก' },
  ];
  if (status === 'approved') {
    audit.push({ at, actorRole: 'manager', actorName: 'หัวหน้างาน', action: 'approve', note: 'อนุมัติโดยหัวหน้างาน' });
    audit.push({ at, actorRole: 'spd', actorName: 'SPD', action: 'approve', note: 'อนุมัติโดย SPD' });
  }
  return audit;
}

/**
 * Map a Benefits-Hub claim-history preview row to a BenefitClaimRequest suitable
 * for the read-only ClaimDetailModal. Mockup-only: fills approver-facing fields
 * with representative demo values (no backend this phase).
 */
export function humiClaimHistoryToClaimRequest(item: HumiClaimHistoryItem): BenefitClaimRequest {
  const amount = amountToNumber(item.amount);
  const receiptDate = item.submittedAt.slice(0, 10);
  const status = STATUS_MAP[item.status];
  const employeeName = 'สมชาย ใจดี';

  return {
    id: item.id,
    workflowRequestId: `WF-BEN-${item.id}`,
    employeeId: 'EMP001',
    employeeName,
    company: 'Central Group',
    businessUnit: 'สำนักงานใหญ่',
    employeeGroup: 'Monthly',
    personalGrade: 'PG4',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: item.type,
    remainingAmount: Math.max(0, 20000 - amount),
    originalRemainingAmount: 20000,
    currency: 'THB',
    receiptNo: `RCPT-${item.id}`,
    receiptDate,
    claimDate: receiptDate,
    receiptAmount: amount,
    totalClaimAmount: amount,
    remark: item.desc,
    status,
    submittedAt: item.submittedAt,
    updatedAt: item.submittedAt,
    hospitalName: item.desc,
    attachments: [
      { id: `att-${item.id}`, filename: 'opd-receipt.pdf', extension: 'pdf', sizeMb: 0.4, mimeType: 'application/pdf' },
    ],
    audit: buildAudit(item.status, item.submittedAt, employeeName),
    version: 1,
    previousVersions: [],
  };
}
