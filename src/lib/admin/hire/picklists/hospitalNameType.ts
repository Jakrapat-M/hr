// hospitalNameType.ts — Type of hospital / clinic (STA-119)
// Buckets: MEDICAL (Type of Hospital) + PHYSICAL (Hospital Name LOV). Shared.
import type { PicklistDefinition } from './types'

export const HOSPITAL_NAME_TYPE_OPTIONS: PicklistDefinition = [
  { id: 'clinic', labelTh: 'คลินิก', labelEn: 'Clinic' },
  { id: 'public', labelTh: 'รัฐ', labelEn: 'Public' },
  { id: 'private', labelTh: 'เอกชน', labelEn: 'Private' },
] as const
