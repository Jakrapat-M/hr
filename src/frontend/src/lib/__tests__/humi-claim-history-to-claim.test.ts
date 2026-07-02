// STA-182 — the Benefits-Hub "more detail" action feeds this adapter's output into
// the shared read-only ClaimDetailModal, so the adapter must produce a valid
// BenefitClaimRequest with a status-faithful approval trail + an attachment.
import { describe, expect, it } from 'vitest';
import { humiClaimHistoryToClaimRequest } from '@/lib/humi-claim-history-to-claim';
import { benefitClaimToPendingRequest } from '@/lib/benefit-claim-to-pending-request';
import type { HumiClaimHistoryItem } from '@/lib/humi-mock-data';

const approvedRow: HumiClaimHistoryItem = {
  id: 'cl-1',
  date: '15 เม.ย. 2569',
  submittedAt: '2026-04-15T00:00:00.000Z',
  type: 'ค่ารักษาพยาบาล',
  desc: 'รพ.บำรุงราษฎร์ · ใบเสร็จ #RX-3381',
  amount: '฿4,820',
  status: 'approved',
};

const pendingRow: HumiClaimHistoryItem = { ...approvedRow, id: 'cl-2', status: 'pending' };

describe('STA-182 — humiClaimHistoryToClaimRequest adapter', () => {
  it('carries the row identity + parses the amount string to a number', () => {
    const claim = humiClaimHistoryToClaimRequest(approvedRow);
    expect(claim.id).toBe('cl-1');
    expect(claim.benefitName).toBe('ค่ารักษาพยาบาล');
    expect(claim.totalClaimAmount).toBe(4820);
    expect(claim.receiptAmount).toBe(4820);
  });

  it('maps an approved row to an approved claim with a full approval trail', () => {
    const claim = humiClaimHistoryToClaimRequest(approvedRow);
    expect(claim.status).toBe('approved');
    // submit → manager approve → spd approve
    expect(claim.audit.map((a) => a.action)).toEqual(['submit', 'approve', 'approve']);
  });

  it('maps a pending row to a pending claim with just the submit entry', () => {
    const claim = humiClaimHistoryToClaimRequest(pendingRow);
    expect(claim.status).toBe('pending_spd');
    expect(claim.audit.map((a) => a.action)).toEqual(['submit']);
  });

  it('seeds one real sample attachment so the attachment view renders', () => {
    const claim = humiClaimHistoryToClaimRequest(approvedRow);
    expect(claim.attachments).toHaveLength(1);
    expect(claim.attachments[0].filename).toBe('opd-receipt.pdf');
  });

  it('produces a PendingRequest the ClaimDetailModal can render (timeline + attachment)', () => {
    const request = benefitClaimToPendingRequest(humiClaimHistoryToClaimRequest(approvedRow));
    expect(request.type).toBe('claim');
    expect(request.approvalTimeline.length).toBe(3);
    expect(request.attachments).toContain('opd-receipt.pdf');
    // hard invariant consumed unguarded downstream
    expect(typeof request.details.amount).toBe('number');
  });
});
