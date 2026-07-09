// opdIpd.ts — OPD / IPD admission type (STA-119)
// Bucket: MEDICAL.
import type { PicklistDefinition } from './types'

export const OPD_IPD_OPTIONS: PicklistDefinition = [
  { id: 'OPD', labelTh: 'ผู้ป่วยนอก (OPD)', labelEn: 'Outpatient (OPD)' },
  { id: 'IPD', labelTh: 'ผู้ป่วยใน (IPD)', labelEn: 'Inpatient (IPD)' },
] as const
