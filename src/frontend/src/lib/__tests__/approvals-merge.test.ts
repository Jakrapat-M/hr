import { describe, it, expect } from 'vitest';
import {
  mergeApprovalRows,
  filterApprovalRows,
  countByDomain,
  type MergeInput,
} from '../approvals-merge';
import type { BenefitClaimRequest, BenefitClaimStatus } from '@/stores/benefit-claims';
import type { ApprovalRequest, ApprovalStep } from '@/stores/workflow-approvals';
import type { TerminationRequest, TerminationStep } from '@/stores/termination-approvals';
import type { PromotionRequest, PromotionStep } from '@/stores/promotion-approvals';
import type { BenefitReferralRequest, BenefitReferralStatus } from '@/stores/benefit-referrals';
import type { PendingTaskSummary } from '@/lib/workflow-api';

// Minimal fixture builders — only fields the merge actually reads.

function claim(id: string, submittedAt: string, status: BenefitClaimStatus = 'pending_spd'): BenefitClaimRequest {
  return {
    id,
    workflowRequestId: `WF-${id}`,
    employeeId: 'EMP1',
    employeeName: 'Alice',
    company: 'CO',
    businessUnit: 'BU',
    employeeGroup: 'EG',
    personalGrade: 'P1',
    benefitType: 'medical',
    benefitCode: 'B1',
    benefitName: 'Medical',
    remainingAmount: 1000,
    currency: 'THB',
    receiptNo: 'R1',
    receiptDate: '2026-04-01',
    receiptAmount: 500,
    totalClaimAmount: 500,
    status,
    submittedAt,
    updatedAt: submittedAt,
    attachments: [],
    audit: [],
    version: 1,
    previousVersions: [],
    workflowInstanceId: null,
    workflowStatus: 'pending',
  };
}

function camunda(id: string, created: string): PendingTaskSummary {
  return {
    id,
    name: 'Manager Approval',
    created,
    assignee: 'demo',
    instanceId: `inst-${id}`,
    processDefinitionKey: 'benefit-request',
    variables: { requesterId: 'demo', managerId: 'mgr', benefitType: 'medical', amount: 1200, description: '' },
  };
}

function personalInfo(id: string, submittedAt: string, status: ApprovalStep = 'pending_spd'): ApprovalRequest {
  return {
    id,
    type: 'personal_info_change',
    employeeId: 'EMP2',
    employeeName: 'Bob',
    submittedBy: { id: 'EMP2', name: 'Bob', role: 'employee' },
    submittedAt,
    status,
    diffs: [{ path: 'a', label: 'A', before: '', after: 'x' }],
    audit: [],
  };
}

function termination(id: string, submittedAt: string, status: TerminationStep = 'pending_spd'): TerminationRequest {
  return {
    id,
    employeeId: 'EMP3',
    employeeName: 'Carol',
    requestedLastDay: '2026-06-30',
    reasonCode: 'TERM_RESIGN',
    status,
    submittedAt,
    submittedBy: { id: 'EMP3', name: 'Carol', role: 'employee' },
    audit: [],
  };
}

function promotion(id: string, submittedAt: string, status: PromotionStep = 'pending_spd'): PromotionRequest {
  return {
    id,
    employeeId: 'EMP4',
    employeeName: 'Dave',
    fromPosition: 'Junior',
    toPosition: 'Senior',
    effectiveDate: '2026-07-01',
    status,
    submittedAt,
    submittedBy: { id: 'HR', name: 'HR', role: 'hr_admin' },
    audit: [],
  };
}

function referral(id: string, submittedAt: string, status: BenefitReferralStatus = 'pending_spd'): BenefitReferralRequest {
  return {
    id,
    workflowRequestId: `WF-${id}`,
    employeeId: 'EMP5',
    employeeName: 'Eve',
    coveredPersonId: 'CP1',
    coveredPersonName: 'Eve',
    serviceReason: 'OPD',
    hospital: { code: 'H1', name: 'BNH', branch: 'main', province: 'BKK', ePatientCode: 'EP1' },
    preferredVisitDate: '2026-05-10',
    status,
    submittedAt,
    updatedAt: submittedAt,
    audit: [],
  } as unknown as BenefitReferralRequest;
}

const labels = {
  benefitClaimStatusLabels: { pending_spd: 'รอ', send_back: 'ส่งกลับ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ' } as Record<BenefitClaimStatus, string>,
  referralStatusLabels: {
    draft: 'ร่าง', pending_spd: 'รอ SPD', spd_reviewing: 'กำลังตรวจ', send_back: 'ส่งกลับ',
    approved: 'อนุมัติ', rejected: 'ปฏิเสธ', letter_issued: 'ออกใบแล้ว', cancelled: 'ยกเลิก',
  } as Record<BenefitReferralStatus, string>,
  personalInfoStatusLabels: { pending_spd: 'รอ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ' } as Record<ApprovalStep, string>,
  terminationStatusLabels: { pending_manager: 'รอ Manager', pending_spd: 'รอ SPD', approved: 'อนุมัติ', rejected: 'ปฏิเสธ' } as Record<TerminationStep, string>,
  terminationReasonLabels: { TERM_RESIGN: 'ลาออก' },
  promotionStatusLabels: { pending_spd: 'รอ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ' } as Record<PromotionStep, string>,
};

function buildInput(partial: Partial<MergeInput> = {}): MergeInput {
  return {
    benefitClaims: [],
    camundaTasks: [],
    referrals: [],
    personalInfo: [],
    terminations: [],
    promotions: [],
    ...labels,
    ...partial,
  };
}

describe('mergeApprovalRows', () => {
  it('returns empty array on empty input', () => {
    expect(mergeApprovalRows(buildInput())).toEqual([]);
  });

  it('sorts cross-domain rows newest first by submittedAt', () => {
    const input = buildInput({
      benefitClaims: [claim('B1', '2026-04-01T10:00:00Z')],
      personalInfo: [personalInfo('P1', '2026-04-05T10:00:00Z')],
      promotions: [promotion('PR1', '2026-04-03T10:00:00Z')],
    });
    const rows = mergeApprovalRows(input);
    expect(rows.map((r) => r.rawId)).toEqual(['P1', 'PR1', 'B1']);
  });

  it('normalises domain-specific status into pending|approved|rejected', () => {
    const input = buildInput({
      benefitClaims: [
        claim('B1', '2026-04-01T10:00:00Z', 'send_back'),
        claim('B2', '2026-04-02T10:00:00Z', 'approved'),
      ],
      referrals: [referral('R1', '2026-04-03T10:00:00Z', 'spd_reviewing')],
      terminations: [termination('T1', '2026-04-04T10:00:00Z', 'pending_manager')],
    });
    const rows = mergeApprovalRows(input);
    const byId = Object.fromEntries(rows.map((r) => [r.rawId, r.status]));
    expect(byId).toEqual({ B1: 'pending', B2: 'approved', R1: 'pending', T1: 'pending' });
  });
});

describe('filterApprovalRows', () => {
  const fullInput = buildInput({
    benefitClaims: [claim('B1', '2026-04-05T10:00:00Z'), claim('B2', '2026-04-04T10:00:00Z', 'approved')],
    camundaTasks: [camunda('C1', '2026-04-06T10:00:00Z')],
    personalInfo: [personalInfo('P1', '2026-04-03T10:00:00Z')],
    terminations: [termination('T1', '2026-04-02T10:00:00Z', 'rejected')],
    promotions: [promotion('PR1', '2026-04-01T10:00:00Z')],
  });

  it('"benefit" domain filter includes both mock and Camunda lanes', () => {
    const rows = mergeApprovalRows(fullInput);
    const filtered = filterApprovalRows(rows, { domain: 'benefit', status: 'all' });
    expect(filtered.map((r) => r.rawId).sort()).toEqual(['B1', 'B2', 'C1']);
  });

  it('status=pending hides approved + rejected rows', () => {
    const rows = mergeApprovalRows(fullInput);
    const filtered = filterApprovalRows(rows, { domain: 'all', status: 'pending' });
    const ids = filtered.map((r) => r.rawId);
    expect(ids).toContain('B1');
    expect(ids).toContain('C1');
    expect(ids).toContain('P1');
    expect(ids).toContain('PR1');
    expect(ids).not.toContain('B2');   // approved
    expect(ids).not.toContain('T1');   // rejected
  });

  it('query matches requesterName case-insensitively', () => {
    const rows = mergeApprovalRows(fullInput);
    const filtered = filterApprovalRows(rows, { domain: 'all', status: 'all', query: 'caRoL' });
    expect(filtered.map((r) => r.rawId)).toEqual(['T1']);
  });
});

describe('countByDomain', () => {
  it('counts only pending rows, grouped by domain', () => {
    const rows = mergeApprovalRows(
      buildInput({
        benefitClaims: [
          claim('B1', '2026-04-05T10:00:00Z'),
          claim('B2', '2026-04-04T10:00:00Z', 'approved'),
        ],
        camundaTasks: [camunda('C1', '2026-04-06T10:00:00Z')],
        promotions: [promotion('PR1', '2026-04-01T10:00:00Z', 'rejected')],
      }),
    );
    const counts = countByDomain(rows);
    expect(counts.benefit).toBe(1);
    expect(counts.benefitCamunda).toBe(1);
    expect(counts.promotion).toBe(0);   // rejected, not pending
    expect(counts.termination).toBe(0);
  });
});
