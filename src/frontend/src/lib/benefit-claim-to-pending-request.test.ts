import { describe, expect, it } from 'vitest';
import {
  benefitClaimToPendingRequest,
  claimAttachmentFilenames,
} from '@/lib/benefit-claim-to-pending-request';
import type { BenefitClaimRequest } from '@/stores/benefit-claims';
import type { PendingRequest } from '@/lib/quick-approve-api';

function makeClaim(overrides: Partial<BenefitClaimRequest> = {}): BenefitClaimRequest {
  return {
    id: 'CLM-1',
    workflowRequestId: 'REQ-BEN-001',
    employeeId: 'EMP001',
    employeeName: 'จงรักษ์ ทานากะ',
    company: 'Central Group',
    businessUnit: 'People Operations',
    employeeGroup: 'Monthly Staff',
    personalGrade: 'PG4',
    benefitType: 'medical',
    benefitCode: 'MED-OPD',
    benefitName: 'Medical reimbursement',
    remainingAmount: 24000,
    currency: 'THB',
    receiptNo: 'RX-4488',
    receiptDate: '2026-04-20',
    claimDate: '2026-04-21',
    receiptAmount: 1200,
    totalClaimAmount: 1200,
    remark: 'Migraine',
    status: 'pending_spd',
    submittedAt: '2026-04-21T09:20:00.000Z',
    updatedAt: '2026-04-21T09:20:00.000Z',
    hospitalName: 'BNH Hospital',
    attachments: [{ id: 'a1', filename: 'receipt.pdf', sizeMb: 1, mimeType: 'application/pdf' }],
    audit: [
      { at: '2026-04-21T09:20:00.000Z', actorRole: 'employee', actorName: 'จงรักษ์', action: 'submit', note: 'ส่งคำขอ' },
      { at: '2026-04-22T10:00:00.000Z', actorRole: 'manager', actorName: 'หัวหน้า', action: 'approve' },
    ],
    version: 1,
    previousVersions: [],
    ...overrides,
  };
}

describe('benefitClaimToPendingRequest — adapter invariants', () => {
  it('details.amount is a number equal to claim.totalClaimAmount', () => {
    const claim = makeClaim({ totalClaimAmount: 3200 });
    const req = benefitClaimToPendingRequest(claim);
    const details = req.details as { amount: number };
    expect(typeof details.amount).toBe('number');
    expect(details.amount).toBe(3200);
  });

  it('details.policyChecks always deep-equals [] (never a footnote)', () => {
    const req = benefitClaimToPendingRequest(makeClaim());
    const details = req.details as { policyChecks: unknown[] };
    expect(details.policyChecks).toEqual([]);
  });

  it('details.merchant / requester.position / requester.department are strings, never undefined', () => {
    const req = benefitClaimToPendingRequest(
      makeClaim({ hospitalName: undefined, personalGrade: '', businessUnit: '' }),
    );
    const details = req.details as { merchant: string };
    expect(typeof details.merchant).toBe('string');
    expect(typeof req.requester.position).toBe('string');
    expect(typeof req.requester.department).toBe('string');
    expect(details.merchant).toBe('');
  });

  it('derives approvalTimeline from audit when no queueSnapshot', () => {
    const req = benefitClaimToPendingRequest(makeClaim());
    expect(req.approvalTimeline).toHaveLength(2);
    expect(req.approvalTimeline[0]).toMatchObject({ step: 1, status: 'pending' });
    expect(req.approvalTimeline[1]).toMatchObject({ step: 2, status: 'approved' });
  });

  it('prefers queueSnapshot verbatim when present', () => {
    const snapshot = { id: 'SNAP', type: 'claim', approvalTimeline: [] } as unknown as PendingRequest;
    const req = benefitClaimToPendingRequest(makeClaim({ queueSnapshot: snapshot }));
    expect(req).toBe(snapshot);
  });
});

describe('claimAttachmentFilenames', () => {
  it('resolves name-only attachments and drops empty holes', () => {
    const claim = makeClaim({
      attachments: [
        { id: 'a1', name: 'legacy.pdf' },
        { id: 'a2', filename: 'modern.pdf' },
        { id: 'a3' },
      ],
    });
    expect(claimAttachmentFilenames(claim)).toEqual(['legacy.pdf', 'modern.pdf']);
  });

  it('returns [] when there are no attachments', () => {
    expect(claimAttachmentFilenames(makeClaim({ attachments: [] }))).toEqual([]);
  });
});
