// degreeLevel.ts — DVT Degree Level picklist (STA-82 EC fields buildout SPINE)
// BA row 212, Picklist ID: DVT_DEGREE_LEVEL. LOV column blank in V0.2.xlsx →
// seeded with the standard Thai education levels for UI mockup.
// Conditional on Scholarship = YES (DVT cluster, gated by shouldShowDvtSection).
import type { PicklistDefinition } from './types'

export const DEGREE_LEVEL_OPTIONS: PicklistDefinition = [
  { id: 'VOCATIONAL', labelTh: 'ประกาศนียบัตรวิชาชีพ (ปวช.)', labelEn: 'Vocational Certificate' },
  { id: 'DIPLOMA', labelTh: 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)', labelEn: 'High Vocational Diploma' },
  { id: 'BACHELOR', labelTh: 'ปริญญาตรี', labelEn: 'Bachelor’s Degree' },
  { id: 'MASTER', labelTh: 'ปริญญาโท', labelEn: 'Master’s Degree' },
  { id: 'DOCTORATE', labelTh: 'ปริญญาเอก', labelEn: 'Doctorate' },
] as const
