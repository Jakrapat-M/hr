// partnerUniversity.ts — DVT Partner University picklist (STA-82 EC fields buildout SPINE)
// BA row 210, Picklist ID: DVT_PARTNER_UNIVERSITY. LOV column blank in V0.2.xlsx →
// seeded with representative Central Group DVT/dual-vocational partner institutions for UI mockup.
// Conditional on Scholarship = YES (DVT cluster, gated by shouldShowDvtSection).
import type { PicklistDefinition } from './types'

export const PARTNER_UNIVERSITY_OPTIONS: PicklistDefinition = [
  { id: 'PIM', labelTh: 'สถาบันการจัดการปัญญาภิวัฒน์ (PIM)', labelEn: 'Panyapiwat Institute of Management (PIM)' },
  { id: 'DPU', labelTh: 'มหาวิทยาลัยธุรกิจบัณฑิตย์ (DPU)', labelEn: 'Dhurakij Pundit University (DPU)' },
  { id: 'UTCC', labelTh: 'มหาวิทยาลัยหอการค้าไทย (UTCC)', labelEn: 'University of the Thai Chamber of Commerce (UTCC)' },
  { id: 'RMUTT', labelTh: 'มหาวิทยาลัยเทคโนโลยีราชมงคลธัญบุรี', labelEn: 'Rajamangala University of Technology Thanyaburi' },
  { id: 'KMUTNB', labelTh: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ', labelEn: 'King Mongkut’s University of Technology North Bangkok' },
  { id: 'SPU', labelTh: 'มหาวิทยาลัยศรีปทุม (SPU)', labelEn: 'Sripatum University (SPU)' },
  { id: 'OTHER', labelTh: 'สถาบันอื่น ๆ', labelEn: 'Other institution' },
] as const
