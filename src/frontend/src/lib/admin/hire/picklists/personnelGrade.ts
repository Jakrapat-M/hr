// personnelGrade.ts — Personnel Grade picklist (STA-82 A1)
// BA: Job > Classification. Representative seed for UI mockup (full SF picklist tree-shaken
// per BA-EC-SUMMARY rule — only options used by Hire wizard surface).
import type { PicklistDefinition } from './types'

export const PERSONNEL_GRADE_OPTIONS: PicklistDefinition = [
  { id: 'PG_01', labelTh: 'พนักงานระดับ 1', labelEn: 'Personnel Grade 1' },
  { id: 'PG_02', labelTh: 'พนักงานระดับ 2', labelEn: 'Personnel Grade 2' },
  { id: 'PG_03', labelTh: 'พนักงานระดับ 3', labelEn: 'Personnel Grade 3' },
  { id: 'PG_04', labelTh: 'พนักงานระดับ 4', labelEn: 'Personnel Grade 4' },
  { id: 'PG_05', labelTh: 'พนักงานระดับ 5', labelEn: 'Personnel Grade 5' },
  { id: 'PG_06', labelTh: 'พนักงานระดับ 6', labelEn: 'Personnel Grade 6' },
  { id: 'PG_07', labelTh: 'พนักงานระดับ 7', labelEn: 'Personnel Grade 7' },
  { id: 'PG_M1', labelTh: 'หัวหน้าระดับ M1', labelEn: 'Manager M1' },
  { id: 'PG_M2', labelTh: 'หัวหน้าระดับ M2', labelEn: 'Manager M2' },
  { id: 'PG_M3', labelTh: 'หัวหน้าระดับ M3', labelEn: 'Manager M3' },
] as const
