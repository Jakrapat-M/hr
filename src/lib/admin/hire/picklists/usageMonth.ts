// usageMonth.ts — Mobile reimbursement "Usage month" Jan–Dec LOV (STA-145)
// Bucket: MOBILE. Replaces the native <input type="month"> with a fixed
// Jan–Dec picklist per the gold field matrix.
import type { PicklistDefinition } from './types'

export const USAGE_MONTH_OPTIONS: PicklistDefinition = [
  { id: 'jan', labelTh: 'มกราคม', labelEn: 'January' },
  { id: 'feb', labelTh: 'กุมภาพันธ์', labelEn: 'February' },
  { id: 'mar', labelTh: 'มีนาคม', labelEn: 'March' },
  { id: 'apr', labelTh: 'เมษายน', labelEn: 'April' },
  { id: 'may', labelTh: 'พฤษภาคม', labelEn: 'May' },
  { id: 'jun', labelTh: 'มิถุนายน', labelEn: 'June' },
  { id: 'jul', labelTh: 'กรกฎาคม', labelEn: 'July' },
  { id: 'aug', labelTh: 'สิงหาคม', labelEn: 'August' },
  { id: 'sep', labelTh: 'กันยายน', labelEn: 'September' },
  { id: 'oct', labelTh: 'ตุลาคม', labelEn: 'October' },
  { id: 'nov', labelTh: 'พฤศจิกายน', labelEn: 'November' },
  { id: 'dec', labelTh: 'ธันวาคม', labelEn: 'December' },
] as const
