// band.ts — Band picklist (STA-82 A1)
// BA: Job > Transfer-Band. SF Central Group bands A-G.
import type { PicklistDefinition } from './types'

export const BAND_OPTIONS: PicklistDefinition = [
  { id: 'A', labelTh: 'Band A', labelEn: 'Band A' },
  { id: 'B', labelTh: 'Band B', labelEn: 'Band B' },
  { id: 'C', labelTh: 'Band C', labelEn: 'Band C' },
  { id: 'D', labelTh: 'Band D', labelEn: 'Band D' },
  { id: 'E', labelTh: 'Band E', labelEn: 'Band E' },
  { id: 'F', labelTh: 'Band F', labelEn: 'Band F' },
  { id: 'G', labelTh: 'Band G', labelEn: 'Band G' },
] as const
