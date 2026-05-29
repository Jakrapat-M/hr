// otherTitleTh.ts — Other Title (TH) picklist (STA-82 A1)
// BA: Personal Information > Other Title TH. Used when standard salutation doesn't fit.
import type { PicklistDefinition } from './types'

export const OTHER_TITLE_TH_OPTIONS: PicklistDefinition = [
  { id: 'DR', labelTh: 'ดร.', labelEn: 'Dr.' },
  { id: 'PROF', labelTh: 'ศาสตราจารย์', labelEn: 'Professor' },
  { id: 'ASSOC_PROF', labelTh: 'รองศาสตราจารย์', labelEn: 'Associate Professor' },
  { id: 'ASST_PROF', labelTh: 'ผู้ช่วยศาสตราจารย์', labelEn: 'Assistant Professor' },
  { id: 'POLICE', labelTh: 'นายตำรวจ', labelEn: 'Police Officer' },
  { id: 'MILITARY', labelTh: 'นายทหาร', labelEn: 'Military Officer' },
  { id: 'MONK', labelTh: 'พระ', labelEn: 'Monk' },
  { id: 'OTHER', labelTh: 'อื่น ๆ', labelEn: 'Other' },
] as const
