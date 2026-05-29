// specialBenefitGroup.ts — Special Benefit Group picklist (STA-82 A1)
// BA: Job > Misc. Drives benefit-plan eligibility (executive / outsource / etc.)
import type { PicklistDefinition } from './types'

export const SPECIAL_BENEFIT_GROUP_OPTIONS: PicklistDefinition = [
  { id: 'NONE', labelTh: 'ไม่มี (ใช้สิทธิ์มาตรฐาน)', labelEn: 'None (standard benefits)' },
  { id: 'EXECUTIVE', labelTh: 'ผู้บริหาร', labelEn: 'Executive' },
  { id: 'EXPAT', labelTh: 'พนักงานต่างชาติ (Expat)', labelEn: 'Expatriate' },
  { id: 'OUTSOURCE', labelTh: 'พนักงานเอาท์ซอร์ส', labelEn: 'Outsource' },
  { id: 'CONTRACT_FT', labelTh: 'สัญญาจ้างพิเศษ', labelEn: 'Special contract' },
  { id: 'INTERN', labelTh: 'นักศึกษาฝึกงาน', labelEn: 'Intern' },
] as const
