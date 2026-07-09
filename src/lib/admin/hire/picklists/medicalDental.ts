// medicalDental.ts — Medical / Dental claim selector (STA-119)
// Bucket: MEDICAL & DENTAL. Distinguishes a medical vs dental claim.
import type { PicklistDefinition } from './types'

export const MEDICAL_DENTAL_OPTIONS: PicklistDefinition = [
  { id: 'medical', labelTh: 'การแพทย์', labelEn: 'Medical' },
  { id: 'dental', labelTh: 'ทันตกรรม', labelEn: 'Dental' },
] as const
