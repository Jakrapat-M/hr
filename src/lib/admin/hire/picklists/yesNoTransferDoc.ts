// yesNoTransferDoc.ts — Use patient transfer document? Yes/No (STA-119)
// Bucket: MEDICAL.
import type { PicklistDefinition } from './types'

export const YES_NO_TRANSFER_DOC_OPTIONS: PicklistDefinition = [
  { id: 'yes', labelTh: 'ใช่', labelEn: 'Yes' },
  { id: 'no', labelTh: 'ไม่ใช่', labelEn: 'No' },
] as const
