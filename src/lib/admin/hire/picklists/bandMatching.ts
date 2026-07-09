// bandMatching.ts — Band Matching picklist (STA-82 A1)
// BA: Job > Transfer-Band. Indicates how the candidate's band aligns with the new role.
import type { PicklistDefinition } from './types'

export const BAND_MATCHING_OPTIONS: PicklistDefinition = [
  { id: 'MATCH', labelTh: 'ตรงกับ Band ปัจจุบัน', labelEn: 'Matches current band' },
  { id: 'PROMOTION', labelTh: 'เลื่อน Band', labelEn: 'Promotion (band up)' },
  { id: 'LATERAL', labelTh: 'ย้ายระดับเดียวกัน', labelEn: 'Lateral move' },
  { id: 'DEMOTION', labelTh: 'ลด Band', labelEn: 'Demotion (band down)' },
] as const
