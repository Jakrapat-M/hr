// scholarship.ts — Scholarship picklist (STA-82 A1)
// BA: Job > Misc. Wraps YES_NO_IDS — drives DVT conditional section visibility.
import { YES_NO_IDS } from '@/lib/admin/validation/hireSchema'
import type { PicklistDefinition } from './types'

export const SCHOLARSHIP_OPTIONS: PicklistDefinition = [
  { id: YES_NO_IDS[0], labelTh: 'มีทุนการศึกษา', labelEn: 'Scholarship' },
  { id: YES_NO_IDS[1], labelTh: 'ไม่มีทุนการศึกษา', labelEn: 'No scholarship' },
] as const
