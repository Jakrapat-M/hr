import { beforeEach, describe, expect, it } from 'vitest';
import {
  selectBenefitRequestSummaries,
  useBenefitClaimsStore,
  validateBenefitAttachmentRules,
  type BenefitClaimInput,
} from '@/stores/benefit-claims';

describe('benefit deferred service domain boundaries', () => {
  beforeEach(() => {
    localStorage.clear();
    useBenefitClaimsStore.setState({ claims: [] });
  });

  it('keeps reimbursement request projections receipt-based and out of referral/tax copy', () => {
    const claim = useBenefitClaimsStore.getState().submitClaim({
      benefitType: 'medical',
      benefitCode: 'BEN-MED-OPD',
      receiptNo: 'MED-REF-001',
      receiptDate: '2026-04-30',
      receiptAmount: 1250,
      totalClaimAmount: 1250,
      hospitalName: 'Bangkok Hospital',
      patientTransferDocumentNo: 'PT-EXISTING-001',
      attachments: [{ id: 'att-1', filename: 'receipt.pdf', sizeMb: 1 }],
    });

    const [row] = selectBenefitRequestSummaries([claim]);

    expect(row.type).toBe('เบิกสวัสดิการ · ค่ารักษาพยาบาล');
    expect(row.sub).toContain('ใบเสร็จ MED-REF-001');
    expect(row.sub).toContain('฿1,250');
    // Fresh claim starts at pending_manager_approval: chain is manager (pending) → SPD (pending).
    expect(row.approvalChain).toEqual([
      expect.objectContaining({
        role: 'หัวหน้างาน',
        when: 'รออนุมัติจากหัวหน้า',
        status: 'pending',
      }),
      expect.objectContaining({
        role: 'SPD Benefits',
        when: 'รอ SPD อนุมัติ',
        status: 'pending',
      }),
    ]);
    expect(`${row.type} ${row.sub}`).not.toMatch(/ใบส่งตัว|ePatient|วางแผนภาษี|tax/i);
  });

  it('does not let referral-style metadata replace reimbursement receipt and attachment rules', () => {
    const input = {
      benefitType: 'medical',
      receiptNo: 'RCPT-STILL-REQUIRED',
      receiptDate: '2026-04-30',
      receiptAmount: 3200,
      totalClaimAmount: 3200,
      hospitalName: 'Samitivej',
      patientTransferDocumentNo: 'EPT-PLANNED-ONLY',
      serviceReason: 'Referral reason belongs to benefit-referrals, not benefit-claims',
      preferredDate: '2026-05-10',
      attachments: [],
    } satisfies BenefitClaimInput & { serviceReason: string; preferredDate: string };

    expect(validateBenefitAttachmentRules(input)).toContain('ค่ารักษาพยาบาลต้องแนบเอกสารอย่างน้อย 1 ไฟล์');

    const claim = useBenefitClaimsStore.getState().submitClaim({
      ...input,
      attachments: [{ id: 'att-1', filename: 'receipt.jpg', sizeMb: 0.5 }],
    });

    expect(claim.receiptNo).toBe('RCPT-STILL-REQUIRED');
    expect(claim.patientTransferDocumentNo).toBe('EPT-PLANNED-ONLY');
    expect(claim).not.toHaveProperty('serviceReason');
    expect(claim).not.toHaveProperty('preferredDate');
  });

  it('maps only reimbursement statuses into request statuses until referral/tax selectors exist', () => {
    const claim = useBenefitClaimsStore.getState().submitClaim({
      benefitType: 'mobile',
      receiptNo: 'MOB-DEFERRED-001',
      receiptDate: '2026-04-30',
      receiptAmount: 650,
      totalClaimAmount: 650,
    });

    expect(selectBenefitRequestSummaries([claim])[0].status).toBe('pending');

    useBenefitClaimsStore.getState().sendBackClaim(claim.id, { role: 'spd', name: 'SPD' }, 'ขอข้อมูลใบเสร็จเพิ่ม');
    expect(selectBenefitRequestSummaries(useBenefitClaimsStore.getState().claims)[0].status).toBe('info');

    useBenefitClaimsStore.getState().approveClaim(claim.id, { role: 'spd', name: 'SPD' });
    expect(selectBenefitRequestSummaries(useBenefitClaimsStore.getState().claims)[0].status).toBe('approved');
  });
});
