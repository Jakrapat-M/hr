// addressType.ts — Address Type picklist (STA-82 A1)
// BA: Personal Information > Addresses row Type. SF: PerAddressDETHA.addressType.
import type { PicklistDefinition } from './types'

export const ADDRESS_TYPE_OPTIONS: PicklistDefinition = [
  { id: 'HOME', labelTh: 'ที่อยู่ตามทะเบียนบ้าน', labelEn: 'Home (registered)' },
  { id: 'CURRENT', labelTh: 'ที่อยู่ปัจจุบัน', labelEn: 'Current' },
  { id: 'WORK', labelTh: 'ที่อยู่ที่ทำงาน', labelEn: 'Work' },
  { id: 'MAIL', labelTh: 'ที่อยู่สำหรับติดต่อ', labelEn: 'Mailing' },
  { id: 'OTHER', labelTh: 'อื่น ๆ', labelEn: 'Other' },
] as const
