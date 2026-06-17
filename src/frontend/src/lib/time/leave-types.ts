// lib/time/leave-types.ts — Group 0 (Time-module ESS shared foundations)
//
// MOCK ONLY. The 23 canonical leave types (verified from list-of-value.xlsx).
// Drives the ESS leave-request form: bilingual labels, paid/unpaid badge, quota
// tracking, minimum booking unit, document requirement, day-count mode, and the
// store-only flag (special_leave is only offered to Store-calendar employees).

export type LeaveTypeDef = {
  code: string;
  nameEn: string;
  nameTh: string;
  paid: boolean;
  quotaTracked: boolean;
  minUnit: '30min' | 'half-day' | '1-day';
  docRequired: boolean;
  dayCountMode: 'CalendarDay' | 'WorkingDay';
  storeOnly?: boolean;
};

export const LEAVE_TYPES: LeaveTypeDef[] = [
  { code: 'sick_leave', nameEn: 'Sick Leave', nameTh: 'ลาป่วย', paid: true, quotaTracked: true, minUnit: '1-day', docRequired: true, dayCountMode: 'WorkingDay' },
  { code: 'annual_leave', nameEn: 'Annual Leave', nameTh: 'ลาพักผ่อนประจำปี', paid: true, quotaTracked: true, minUnit: 'half-day', docRequired: false, dayCountMode: 'WorkingDay' },
  { code: 'personnel_leave', nameEn: 'Personnel Leave', nameTh: 'ลากิจ', paid: true, quotaTracked: true, minUnit: 'half-day', docRequired: false, dayCountMode: 'WorkingDay' },
  { code: 'maternity_leave', nameEn: 'Maternity Leave', nameTh: 'ลาคลอดบุตร', paid: true, quotaTracked: true, minUnit: '1-day', docRequired: true, dayCountMode: 'CalendarDay' },
  { code: 'sterilization_leave', nameEn: 'Sterilization Leave', nameTh: 'ลาเพื่อทำหมัน', paid: true, quotaTracked: false, minUnit: '1-day', docRequired: true, dayCountMode: 'WorkingDay' },
  { code: 'priesthood_leave', nameEn: 'Priesthood Leave', nameTh: 'ลาอุปสมบท', paid: true, quotaTracked: false, minUnit: '1-day', docRequired: true, dayCountMode: 'CalendarDay' },
  { code: 'investigation', nameEn: 'Investigation', nameTh: 'พักงานเพื่อการสอบสวน', paid: false, quotaTracked: false, minUnit: '1-day', docRequired: false, dayCountMode: 'CalendarDay' },
  { code: 'military_train_leave', nameEn: 'Military Train Leave', nameTh: 'ลาฝึกอบรมทหาร', paid: true, quotaTracked: false, minUnit: '1-day', docRequired: true, dayCountMode: 'CalendarDay' },
  { code: 'marriage_leave', nameEn: 'Marriage Leave', nameTh: 'ลาสมรส', paid: true, quotaTracked: false, minUnit: '1-day', docRequired: false, dayCountMode: 'WorkingDay' },
  { code: 'funeral_close_relatives', nameEn: 'Funeral close relatives', nameTh: 'ลาพิธีศพญาติใกล้ชิด', paid: true, quotaTracked: false, minUnit: '1-day', docRequired: true, dayCountMode: 'WorkingDay' },
  { code: 'funeral_relatives', nameEn: 'Funeral relatives', nameTh: 'ลาพิธีศพญาติ', paid: true, quotaTracked: false, minUnit: '1-day', docRequired: true, dayCountMode: 'WorkingDay' },
  { code: 'accident_leave', nameEn: 'Accident Leave', nameTh: 'ลาอุบัติเหตุจากการทำงาน', paid: true, quotaTracked: false, minUnit: '1-day', docRequired: true, dayCountMode: 'CalendarDay' },
  { code: 'other_leave_paid', nameEn: 'Other Leave', nameTh: 'ลาอื่น ๆ ได้รับค่าจ้าง', paid: true, quotaTracked: false, minUnit: '1-day', docRequired: false, dayCountMode: 'WorkingDay' },
  { code: 'education_leave', nameEn: 'Education Leave', nameTh: 'ลาไปศึกษาระหว่างวัน', paid: true, quotaTracked: false, minUnit: 'half-day', docRequired: true, dayCountMode: 'WorkingDay' },
  { code: 'sick_leave_unpaid', nameEn: 'Sick Leave (Unpaid)', nameTh: 'ลาป่วยไม่รับเงิน', paid: false, quotaTracked: false, minUnit: '1-day', docRequired: true, dayCountMode: 'WorkingDay' },
  { code: 'personnel_leave_unpaid', nameEn: 'Personnel Leave (Unpaid)', nameTh: 'ลากิจไม่รับเงิน', paid: false, quotaTracked: false, minUnit: 'half-day', docRequired: false, dayCountMode: 'WorkingDay' },
  { code: 'maternity_leave_unpaid', nameEn: 'Maternity Leave (Unpaid)', nameTh: 'ลาคลอดบุตรไม่รับเงิน', paid: false, quotaTracked: true, minUnit: '1-day', docRequired: true, dayCountMode: 'CalendarDay' },
  { code: 'priesthood_leave_unpaid', nameEn: 'Priesthood Leave (Unpaid)', nameTh: 'ลาอุปสมบทไม่รับเงิน', paid: false, quotaTracked: false, minUnit: '1-day', docRequired: true, dayCountMode: 'CalendarDay' },
  { code: 'punishment_unpaid', nameEn: 'Punishment (Unpaid)', nameTh: 'พักงานลงโทษ', paid: false, quotaTracked: false, minUnit: '1-day', docRequired: false, dayCountMode: 'CalendarDay' },
  { code: 'other_leave_unpaid', nameEn: 'Other Leave (Unpaid)', nameTh: 'ลาอื่น ๆ ไม่รับค่าจ้าง', paid: false, quotaTracked: false, minUnit: '1-day', docRequired: false, dayCountMode: 'WorkingDay' },
  { code: 'maternity_risk_case', nameEn: 'Maternity Leave Risk Case', nameTh: 'ลาดูแลบุตรหลังคลอดที่มีสภาวะเสี่ยง', paid: true, quotaTracked: true, minUnit: '1-day', docRequired: true, dayCountMode: 'CalendarDay' },
  { code: 'maternity_spouse', nameEn: 'Maternity Leave Spouse', nameTh: 'ลาช่วยเหลือคู่สมรสซึ่งคลอดบุตร', paid: true, quotaTracked: true, minUnit: '1-day', docRequired: false, dayCountMode: 'WorkingDay' },
  { code: 'special_leave', nameEn: 'Special Leave', nameTh: 'ลาพิเศษในเดือนเมษา', paid: true, quotaTracked: false, minUnit: '1-day', docRequired: false, dayCountMode: 'WorkingDay', storeOnly: true },
];

const LEAVE_TYPE_BY_CODE: Record<string, LeaveTypeDef> = Object.fromEntries(
  LEAVE_TYPES.map((t) => [t.code, t]),
);

/** Lookup a leave type by code (undefined when unknown). */
export function getLeaveType(code: string): LeaveTypeDef | undefined {
  return LEAVE_TYPE_BY_CODE[code];
}

/** The quota-tracked leave types (the 7 that draw down a balance bucket). */
export function quotaTrackedTypes(): LeaveTypeDef[] {
  return LEAVE_TYPES.filter((t) => t.quotaTracked);
}

/**
 * Map each quota-tracked leave code to its balance-bucket key. The new balances
 * slice keys buckets by the leave code itself, so the mapping is identity over
 * the 7 quota-tracked codes.
 */
export const LEAVE_CODE_TO_BALANCE_KIND: Record<string, string> = Object.fromEntries(
  quotaTrackedTypes().map((t) => [t.code, t.code]),
);

/**
 * Map the leave codes with a KNOWN payroll wage type to that code (wiki §5).
 * Only Annual (2701) and Sick (2700) are documented by WFS; every other leave
 * code renders its own bilingual label on Results instead of a numeric wage code
 * (see results-math `wageLabel`), until BA supplies the full wage-type table.
 */
export const LEAVE_CODE_TO_WAGE_TYPE: Record<string, '2700' | '2701'> = {
  annual_leave: '2701',
  sick_leave: '2700',
};
