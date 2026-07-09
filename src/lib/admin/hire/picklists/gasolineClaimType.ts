// gasolineClaimType.ts — Gasoline / travel claim type (STA-119)
// Bucket: GASOLINE. 9 options incl. 3 Fleet-Card "(Info only)" rows (OQ-7 pending;
// rendered as display-only labels for now — see infoOnlyOptionIds in claim-field-config).
import type { PicklistDefinition } from './types'

export const GASOLINE_CLAIM_TYPE_OPTIONS: PicklistDefinition = [
  { id: 'gasoline', labelTh: 'น้ำมัน', labelEn: 'Gasoline' },
  { id: 'expressway_toll', labelTh: 'ทางด่วน', labelEn: 'Expressway Toll' },
  { id: 'car_parking', labelTh: 'ค่าจอดรถ', labelEn: 'Car Parking Fee' },
  { id: 'bts_mrt_brt', labelTh: 'BTS/MRT/BRT', labelEn: 'BTS/MRT/BRT' },
  { id: 'grab_taxi', labelTh: 'แท็กซี่/Grab', labelEn: 'Grab/Taxi' },
  { id: 'ev_charging', labelTh: 'ค่าชาร์จ EV', labelEn: 'EV Charging Fee' },
  { id: 'fleet_card_shell', labelTh: 'Fleet Card Shell (ข้อมูลเท่านั้น)', labelEn: 'Fleet Card Shell (Info only)' },
  { id: 'fleet_card_bangchak', labelTh: 'Fleet Card Bangchak (ข้อมูลเท่านั้น)', labelEn: 'Fleet Card Bangchak (Info only)' },
  { id: 'fleet_card_cpn', labelTh: 'Fleet Card CPN (ข้อมูลเท่านั้น)', labelEn: 'Fleet Card CPN (Info only)' },
] as const
