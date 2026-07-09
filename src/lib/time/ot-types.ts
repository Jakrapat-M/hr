// lib/time/ot-types.ts — Group 0 (Time-module ESS shared foundations)
//
// MOCK ONLY. The two OT request types offered in the ESS OT flow.

export type OtTypeCode = 'OT' | 'OT_BREAK';

export const OT_TYPES: { code: OtTypeCode; nameEn: string; nameTh: string }[] = [
  { code: 'OT', nameEn: 'OT Request', nameTh: 'ขออนุมัติเวลาการทำ OT' },
  { code: 'OT_BREAK', nameEn: 'OT Request – Break', nameTh: 'ขออนุมัติ OT ช่วงพัก' },
];
