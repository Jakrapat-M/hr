// otFlag.ts — OT (Overtime) Flag picklist (STA-82 A1)
// BA: Time. Wraps YES_NO_IDS — single-source-of-truth.
import { YES_NO_IDS } from '@/lib/admin/validation/hireSchema'
import type { PicklistDefinition } from './types'

export const OT_FLAG_OPTIONS: PicklistDefinition = [
  { id: YES_NO_IDS[0], labelTh: 'มีสิทธิ์ OT', labelEn: 'Eligible for OT' },
  { id: YES_NO_IDS[1], labelTh: 'ไม่มีสิทธิ์ OT', labelEn: 'Not eligible for OT' },
] as const
