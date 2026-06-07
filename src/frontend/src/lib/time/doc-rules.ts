// lib/time/doc-rules.ts — Group 0 (Time-module ESS shared foundations)
//
// MOCK ONLY. The named supporting documents an ESS leave request must attach,
// keyed by leave code. Data-driven: a static map of unconditional requirements,
// plus the one days-conditional case (sick_leave needs a medical certificate
// only when the absence exceeds 3 days).

const MEDICAL_CERT = 'ใบรับรองแพทย์ / Medical certificate';

const REQUIRED_DOCS: Record<string, string[]> = {
  maternity_leave: [MEDICAL_CERT],
  maternity_leave_unpaid: [MEDICAL_CERT],
  priesthood_leave: ['หนังสือนิมนต์ / Ordination invitation'],
  priesthood_leave_unpaid: ['หนังสือนิมนต์ / Ordination invitation'],
  marriage_leave: ['ทะเบียนสมรส / Marriage certificate'],
  funeral_close_relatives: ['หลักฐานการเสียชีวิต / Death notice'],
  funeral_relatives: ['หลักฐานการเสียชีวิต / Death notice'],
  military_train_leave: ['หมายเรียก / Military notice'],
  education_leave: ['หนังสืออนุมัติหลักสูตร / Course approval'],
  accident_leave: ['บันทึกอุบัติเหตุ / Accident report'],
};

/**
 * Required attachments for a leave request of `code` lasting `days` days.
 * sick_leave is conditional (medical cert only when days > 3); all other
 * entries are unconditional; unknown codes require nothing.
 */
export function requiredDocsFor(code: string, days: number): string[] {
  if (code === 'sick_leave') {
    return days > 3 ? [MEDICAL_CERT] : [];
  }
  return REQUIRED_DOCS[code] ?? [];
}
