// diseaseDetails.ts — Disease Details master list (STA-145 Phase B)
// Bucket: MEDICAL (Disease Details select). BA-provided verbatim list (2026-06-25).
// Selecting one of DISEASE_DETAIL_REQUIRES_DETAIL_IDS reveals a mandatory
// "Details" text field (≤100) — Tan: "pop up 'detail' as a mandatory field".
import type { PicklistDefinition } from './types'

/** Disease ids that require the conditional "Details" free-text field. */
export const DISEASE_DETAIL_REQUIRES_DETAIL_IDS = [
  'workplace_accident',
  'general_emergency_accident',
  'other_specify',
] as const

export const DISEASE_DETAILS_OPTIONS: PicklistDefinition = [
  { id: 'cold_fever', labelTh: 'ไข้หวัด', labelEn: 'Cold/Fever' },
  { id: 'influenza', labelTh: 'ไข้หวัดใหญ่', labelEn: 'Influenza' },
  { id: 'gastritis_gerd', labelTh: 'โรคกระเพาะอาหาร/ภาวะกรดไหลย้อน', labelEn: 'Gastritis and Gastroesophageal Reflux disease' },
  { id: 'gastrointestinal', labelTh: 'โรคทางเดินอาหาร/ช่องท้อง', labelEn: 'Gastrointestinal diseases' },
  { id: 'eye_ear_nose_throat', labelTh: 'โรคตา หู คอ จมูก', labelEn: 'Eye, Ear, Nose and Throat diseases' },
  { id: 'headache_migraine', labelTh: 'ปวดหัว/ไมเกรน', labelEn: 'Headache, Migraine' },
  { id: 'stress', labelTh: 'โรคเครียด', labelEn: 'Stress' },
  { id: 'office_syndrome', labelTh: 'โรคออฟฟิศซินโดรม', labelEn: 'Office Syndrome' },
  { id: 'musculoskeletal', labelTh: 'โรคระบบกล้ามเนื้อ เส้นเอ็น กระดูกและข้อ', labelEn: 'Musculoskeletal diseases' },
  { id: 'skin', labelTh: 'โรคผิวหนัง', labelEn: 'Skin disease' },
  { id: 'allergic', labelTh: 'ภูมิแพ้', labelEn: 'Allergic Reaction' },
  { id: 'dengue', labelTh: 'ไข้เลือดออก', labelEn: 'Dengue Fever' },
  { id: 'tuberculosis', labelTh: 'วัณโรค', labelEn: 'Tuberculosis' },
  { id: 'obstetrics_gynecology', labelTh: 'โรคเฉพาะทางสูตินรีเวช', labelEn: 'Obstetrics and Gynecology' },
  { id: 'tumor', labelTh: 'เนื้องอก ก้อนเนื้อ ซีส', labelEn: 'Tumor' },
  { id: 'hypertension', labelTh: 'โรคความดันโลหิตสูง', labelEn: 'Hypertension' },
  { id: 'diabetes_dyslipidemia', labelTh: 'โรคเบาหวาน ไขมันในเลือด', labelEn: 'Diabetes and Dyslipidemia' },
  { id: 'heart', labelTh: 'โรคหัวใจ', labelEn: 'Heart diseases' },
  { id: 'workplace_accident', labelTh: 'อุบัติเหตุในสถานที่ทำงาน', labelEn: 'Workplace accidents' },
  { id: 'general_emergency_accident', labelTh: 'อุบัติเหตุทั่วไป ฉุกเฉิน', labelEn: 'General and Emergency accidents' },
  { id: 'other_specify', labelTh: 'อื่นๆ...กรุณาระบุชื่อโรค', labelEn: 'Other, please specify diseases' },
  { id: 'covid_19', labelTh: 'โควิด-19', labelEn: 'COVID-19' },
  { id: 'vaccine_company_approved', labelTh: 'วัคซีน-อนุมัติโดยบริษัทเท่านั้น', labelEn: 'Vaccine-Company Approved Only' },
] as const
