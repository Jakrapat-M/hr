// lib/time/correction-reasons.ts — Group 0 (Time-module ESS shared foundations)
//
// MOCK ONLY. The 15 canonical time-correction reasons (verified from
// list-of-value.xlsx). Each carries the payroll pay-code that the correction
// posts under, plus bilingual labels for the ESS correction form.

export type CorrectionReasonDef = {
  reasonEn: string;
  reasonTh: string;
  payCode: string;
};

export const CORRECTION_REASONS: CorrectionReasonDef[] = [
  { payCode: 'TRAINING', reasonEn: 'Training', reasonTh: 'ฝึกอบรมนอกสถานที่' },
  { payCode: 'OFF_SITE_WORK', reasonEn: 'Off-Site Work', reasonTh: 'ปฏิบัติงานนอกสถานที่' },
  { payCode: 'OFF_SITE_MEETING', reasonEn: 'Off-Site Meeting', reasonTh: 'ประชุม/กิจกรรมนอกสถานที่' },
  { payCode: 'BUSINESS_TRIP', reasonEn: 'Business Trip', reasonTh: 'ปฏิบัติงานต่างประเทศ' },
  { payCode: 'UNABLE_TO_SCAN', reasonEn: 'Unable to scan', reasonTh: 'สแกนไม่ผ่าน' },
  { payCode: 'MACHINE_BROKE', reasonEn: 'A card machine out of order', reasonTh: 'เครื่องสแกนชำรุด/เสีย' },
  { payCode: 'CARD_DEFECTIVE', reasonEn: 'Card defective', reasonTh: 'บัตรชำรุด/สูญหาย' },
  { payCode: 'FORGET_ID_TYPE', reasonEn: 'Forget to identify clocking type', reasonTh: 'ลืมกด in หรือ out' },
  { payCode: 'ELECTION', reasonEn: 'Election', reasonTh: 'ไปเลือกตั้ง' },
  { payCode: 'TRANSFER_BRANCH', reasonEn: 'New Hire/Transfer to a new branch', reasonTh: 'เริ่มงานใหม่/ย้ายสาขา' },
  { payCode: 'EMER_SHUTDOWN', reasonEn: 'Emergency Shutdown', reasonTh: 'ปิดศูนย์ฉุกเฉิน' },
  { payCode: 'FORGET_CARD', reasonEn: 'Forget card', reasonTh: 'ลืมบันทึกเวลา/ลืมบัตร' },
  { payCode: 'LEAVE_BEF', reasonEn: 'Company allows to leave before work', reasonTh: 'บ. อนุญาตให้กลับก่อน' },
  { payCode: 'INCIDENT', reasonEn: 'Incident', reasonTh: 'ภัยธรรมชาติ' },
  { payCode: 'WFA', reasonEn: 'Work from Home/ Work from Anywhere', reasonTh: 'ทำงานนอกสถานที่ (WFH/WFA)' },
];

const REASON_BY_PAY_CODE: Record<string, CorrectionReasonDef> = Object.fromEntries(
  CORRECTION_REASONS.map((r) => [r.payCode, r]),
);

/** Lookup a correction reason by its pay-code (undefined when unknown). */
export function getCorrectionReason(payCode: string): CorrectionReasonDef | undefined {
  return REASON_BY_PAY_CODE[payCode];
}
