import { beforeEach, describe, expect, it } from 'vitest';
import {
  BENEFIT_REFERRAL_STATUS_LABEL,
  selectBenefitReferralRequestSummaries,
  useBenefitReferralsStore,
  validateBenefitReferralInput,
} from '@/stores/benefit-referrals';

const validInput = {
  coveredPersonId: 'EMP001',
  hospitalId: 'HOSP-BNH',
  serviceReason: 'พบแพทย์เฉพาะทาง',
  preferredVisitDate: '2026-05-10',
  contactPhone: '080-123-4567',
  documentNote: 'ใช้บัตรพนักงานยืนยันสิทธิ์',
};

describe('benefit referral store', () => {
  beforeEach(() => {
    useBenefitReferralsStore.getState().clear();
  });

  it('creates and submits a referral without reimbursement receipt or amount fields', () => {
    const referral = useBenefitReferralsStore.getState().createReferral(validInput);

    expect(referral.id).toMatch(/^BEN-REF-/);
    expect(referral.workflowRequestId).toMatch(/^REQ-REF-/);
    expect(referral.status).toBe('draft');
    expect(referral.contactPhone).toBe('080-123-4567');
    expect(referral.documentNote).toBe('ใช้บัตรพนักงานยืนยันสิทธิ์');
    expect('receiptNo' in referral).toBe(false);
    expect('totalClaimAmount' in referral).toBe(false);

    useBenefitReferralsStore.getState().submitReferral(referral.id);
    const [row] = selectBenefitReferralRequestSummaries(useBenefitReferralsStore.getState().referrals);
    expect(row.type).toBe('ขอใบส่งตัว · ePatient referral');
    expect(row.sub).toContain('โรงพยาบาลบีเอ็นเอช');
    expect(row.status).toBe('pending');
    expect(JSON.stringify(row)).not.toMatch(/receiptNo|totalClaimAmount|tax/i);
  });

  it('enforces referral-specific validation and SPD letter lifecycle', () => {
    expect(validateBenefitReferralInput({ ...validInput, hospitalId: '', serviceReason: '' })).toEqual([
      'กรุณาเลือกโรงพยาบาลในเครือข่าย',
      'กรุณาระบุเหตุผลหรือบริการที่ต้องการพบแพทย์',
    ]);

    const referral = useBenefitReferralsStore.getState().createReferral(validInput);
    useBenefitReferralsStore.getState().submitReferral(referral.id);
    useBenefitReferralsStore.getState().startReferralReview(referral.id, { role: 'spd', name: 'SPD' });
    expect(useBenefitReferralsStore.getState().referrals[0].status).toBe('spd_reviewing');
    useBenefitReferralsStore.getState().approveReferral(referral.id, { role: 'spd', name: 'SPD' });
    expect(selectBenefitReferralRequestSummaries(useBenefitReferralsStore.getState().referrals)[0].status).toBe('pending');
    useBenefitReferralsStore.getState().issueReferralLetter(referral.id, { role: 'spd', name: 'SPD' });
    expect(selectBenefitReferralRequestSummaries(useBenefitReferralsStore.getState().referrals)[0].status).toBe('approved');

    const issued = useBenefitReferralsStore.getState().referrals[0];
    expect(issued.status).toBe('letter_issued');
    expect(issued.letter?.referralNumber).toMatch(/^EP-/);
    expect(issued.letter?.ePatientReference).toContain('EP-BNH-SILOM-REQ-REF-');
    expect(issued.audit.map((entry) => entry.action)).toEqual(['create', 'submit', 'start_review', 'approve', 'issue_letter']);
    expect(BENEFIT_REFERRAL_STATUS_LABEL.letter_issued).toBe('ออกใบส่งตัวแล้ว');
  });

  it('send-back and reject require domain reasons without touching reimbursement selectors', () => {
    const referral = useBenefitReferralsStore.getState().createReferral(validInput);
    useBenefitReferralsStore.getState().submitReferral(referral.id);
    expect(() => useBenefitReferralsStore.getState().sendBackReferral(referral.id, { role: 'spd', name: 'SPD' }, '')).toThrow(/กรุณาระบุเหตุผล/);
    useBenefitReferralsStore.getState().sendBackReferral(referral.id, { role: 'spd', name: 'SPD' }, 'เลือกวันที่ใหม่');

    let updated = useBenefitReferralsStore.getState().referrals[0];
    expect(updated.status).toBe('send_back');
    expect(updated.correctionReason).toBe('เลือกวันที่ใหม่');

    useBenefitReferralsStore.getState().resubmitReferral(referral.id, { preferredVisitDate: '2026-05-11' });
    useBenefitReferralsStore.getState().rejectReferral(referral.id, { role: 'spd', name: 'SPD' }, 'ไม่อยู่ในเครือข่าย');
    updated = useBenefitReferralsStore.getState().referrals[0];
    expect(updated.status).toBe('rejected');
    expect(updated.rejectionReason).toBe('ไม่อยู่ในเครือข่าย');
  });
});
