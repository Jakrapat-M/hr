// okToRehire.ts — OK to Rehire picklist (STA-82 A1)
// BA: Job > Misc. Wraps YES_NO_IDS from validation/hireSchema so codes stay single-source-of-truth.
import { YES_NO_IDS } from '@/lib/admin/validation/hireSchema'
import type { PicklistDefinition } from './types'

export const OK_TO_REHIRE_OPTIONS: PicklistDefinition = [
  { id: YES_NO_IDS[0], labelTh: 'ได้', labelEn: 'Yes' },
  { id: YES_NO_IDS[1], labelTh: 'ไม่ได้', labelEn: 'No' },
] as const
