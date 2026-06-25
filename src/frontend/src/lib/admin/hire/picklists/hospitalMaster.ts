// hospitalMaster.ts — "E-Patient_MasterHospital" master list (STA-145 Phase B)
// Bucket: MEDICAL (Hospital Name select). BA-provided verbatim list (2026-06-25).
// The LAST option (`others`) reveals the conditional "Others" text field (≤100).
import type { PicklistDefinition } from './types'

/** The option id whose selection reveals the conditional "Others" text field. */
export const HOSPITAL_MASTER_OTHERS_ID = 'others'

export const HOSPITAL_MASTER_OPTIONS: PicklistDefinition = [
  { id: 'vibharam_pakkred', labelTh: 'โรงพยาบาลวิภาราม ปากเกร็ด', labelEn: 'Vibharam Pakkred Hospital' },
  { id: 'krungthai_pathum', labelTh: 'โรงพยาบาลกรุงไทย ปทุม', labelEn: 'Krungthai Pathum Hospital' },
  { id: 'chularat_rayong', labelTh: 'โรงพยาบาลจุฬารัตน์ระยอง', labelEn: 'Chularat Rayong Hospital' },
  { id: 'chularat_9_airport', labelTh: 'โรงพยาบาลจุฬารัตน์ 9 แอร์พอร์ต', labelEn: 'Chularat 9 Airport Hospital' },
  { id: 'kasemrad_saraburi', labelTh: 'โรงพยาบาลเกษมราษฎร์สระบุรี', labelEn: 'Kasemrad Saraburi Hospital' },
  { id: 'sikarin_hatyai', labelTh: 'โรงพยาบาลสิคริทร์ หาดใหญ่', labelEn: 'Sikarin Hat Yai Hospital' },
  { id: 'supamitr', labelTh: 'โรงพยาบาลศุภมิตร', labelEn: 'Supamitr Hospital' },
  { id: 'thai_inter_samui', labelTh: 'โรงพยาบาลไทยอินเตอร์', labelEn: 'Thai International Hospital Samui Hospital' },
  { id: 'bangkok_udon', labelTh: 'โรงพยาบาลกรุงเทพอุดร', labelEn: 'Bangkok Hospital Udon Hospital' },
  { id: 'northeastern_wattana', labelTh: 'โรงพยาบาลนอร์ทอีสเทอร์น-วัฒนา', labelEn: 'North-Eastern Wattana General Hospital' },
  { id: 'aek_udon', labelTh: 'โรงพยาบาลเอกอุดร', labelEn: 'Aek Udon International Hospital' },
  { id: 'bnh', labelTh: 'โรงพยาบาลบีเอ็นเอช', labelEn: 'BNH Hospital' },
  { id: 'mission', labelTh: 'โรงพยาบาลมิชชั่น', labelEn: 'Mission Hospital' },
  { id: 'srisawan_ratchaphruek', labelTh: 'โรงพยาบาลศรีสวรรค์ ราชพฤกษ์', labelEn: 'Srisawan Ratchaphruek Hospital' },
  { id: 'thai_inter_phangan', labelTh: 'โรงพยาบาลไทยอินเตอร์เนชั่นแนล เกาะพงัน', labelEn: 'Thai International Hospital Phangan Hospital' },
  { id: HOSPITAL_MASTER_OTHERS_ID, labelTh: 'อื่นๆ', labelEn: 'Others' },
] as const
