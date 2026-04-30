import type { BenefitReferralRequest } from '@/stores/benefit-referrals';

export const REFERRAL_LETTER_VALID_DAYS = 30;

export function normalizeHospitalLabel(hospital: { name: string; branch?: string; province?: string }) {
  return [hospital.name, hospital.branch, hospital.province].filter(Boolean).join(' · ');
}

export function addReferralValidityWindow(issuedAtIso: string) {
  const validFrom = issuedAtIso.slice(0, 10);
  const until = new Date(issuedAtIso);
  until.setDate(until.getDate() + REFERRAL_LETTER_VALID_DAYS);
  return { validFrom, validUntil: until.toISOString().slice(0, 10) };
}

export function buildMockEPatientLetterPayload(referral: BenefitReferralRequest) {
  return {
    referralId: referral.id,
    workflowRequestId: referral.workflowRequestId,
    employeeId: referral.employeeId,
    coveredPersonName: referral.coveredPersonName,
    hospital: normalizeHospitalLabel(referral.hospital),
    reason: referral.serviceReason,
    preferredVisitDate: referral.preferredVisitDate,
    referralNumber: referral.letter?.referralNumber,
    ePatientReference: referral.letter?.ePatientReference,
    integrationStatus: referral.letter ? 'พร้อมใช้อ้างอิง ePatient' : 'รอ SPD ออกใบส่งตัว',
  };
}
