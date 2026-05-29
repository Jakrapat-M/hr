// dvtType.ts — DVT (ทุนการศึกษา) Type picklist (STA-82 A1)
// BA: Job > DVT cluster. Conditional on Scholarship = YES.
// SF: cust_DVT_Type. Representative seed for UI mockup.
import type { PicklistDefinition } from './types'

export const DVT_TYPE_OPTIONS: PicklistDefinition = [
  { id: 'CG_SCHOLARSHIP', labelTh: 'ทุนการศึกษา CG', labelEn: 'CG Scholarship' },
  { id: 'INTERN', labelTh: 'นักศึกษาฝึกงาน (Intern)', labelEn: 'Internship' },
  { id: 'DUAL_VOCATIONAL', labelTh: 'อาชีวศึกษาทวิภาคี (DVE)', labelEn: 'Dual Vocational Education' },
  { id: 'COOP_EDU', labelTh: 'สหกิจศึกษา (Co-op)', labelEn: 'Cooperative Education' },
  { id: 'CG_TRAINEE', labelTh: 'CG Trainee Program', labelEn: 'CG Trainee Program' },
] as const
