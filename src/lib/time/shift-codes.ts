// Shift-code catalog (subset) — wiki §3 "Time Module — Source Data": the real
// Central Group DWS catalog has 425 codes; this seeds a representative subset for
// the mockup. Code format <WorkingHrs><Break><StartHHMM> resolves a shift keyword
// into concrete IN/OUT + break times so the timesheet can compare clock-in vs shift.

export type ShiftCode = {
  code: string;
  workHrs: number;
  breakCode: string; // A / A1 / A2 / A3 / B / C  (wiki §2 break types)
  in: string; // 'HH:MM' scheduled clock-in
  out: string; // scheduled clock-out
  breakStart: string | null;
  breakEnd: string | null;
  nameTh: string;
  nameEn: string;
};

export const SHIFT_CODES: Record<string, ShiftCode> = {
  '8A0800': { code: '8A0800', workHrs: 8, breakCode: 'A', in: '08:00', out: '17:00', breakStart: '12:00', breakEnd: '13:00', nameTh: 'กะปกติ 08:00–17:00', nameEn: 'Standard 08:00–17:00' },
  '8.5A30800': { code: '8.5A30800', workHrs: 8.5, breakCode: 'A3', in: '08:00', out: '17:30', breakStart: '13:00', breakEnd: '14:00', nameTh: 'กะ 08:00–17:30', nameEn: 'Shift 08:00–17:30' },
  '9A0700': { code: '9A0700', workHrs: 9, breakCode: 'A', in: '07:00', out: '16:00', breakStart: '11:00', breakEnd: '12:00', nameTh: 'กะเช้า 07:00–16:00', nameEn: 'Early 07:00–16:00' },
  '8A1000': { code: '8A1000', workHrs: 8, breakCode: 'A', in: '10:00', out: '19:00', breakStart: '14:00', breakEnd: '15:00', nameTh: 'กะสาย 10:00–19:00', nameEn: 'Late 10:00–19:00' },
  // STA-137 — Morning shift (06:00 start). NON-WRAPPING (out > in): the timesheet
  // worked-hours math (results-math.workedHours) clamps out<in to 0h, so every
  // code MUST be same-day. 06:00–15:00, break 10:00–11:00.
  '9A0600': { code: '9A0600', workHrs: 8, breakCode: 'A', in: '06:00', out: '15:00', breakStart: '10:00', breakEnd: '11:00', nameTh: 'กะเช้า 06:00–15:00', nameEn: 'Morning 06:00–15:00' },
  // STA-137 — Afternoon/evening shift (14:00 start). NON-WRAPPING (out > in).
  // 14:00–23:00, break 18:00–19:00. Also doubles as the "Night/กะดึก" DISPLAY
  // label backer — no real cross-midnight block is ever seeded (a 22:00→07:00
  // code would read 0h in results-math and fabricate a plan-vs-actual variance).
  '9A1400': { code: '9A1400', workHrs: 8, breakCode: 'A', in: '14:00', out: '23:00', breakStart: '18:00', breakEnd: '19:00', nameTh: 'กะบ่าย 14:00–23:00', nameEn: 'Afternoon 14:00–23:00' },
  '4C0800': { code: '4C0800', workHrs: 4, breakCode: 'C', in: '08:00', out: '12:00', breakStart: null, breakEnd: null, nameTh: 'พาร์ทไทม์ 08:00–12:00', nameEn: 'Part-time 08:00–12:00' },
};

/** DWS day-off marker (wiki §2 — `F` = weekly rest / special weekly holiday). */
export const DAY_OFF_CODE = 'F';

export function getShiftCode(code: string | null): ShiftCode | null {
  return code ? SHIFT_CODES[code] ?? null : null;
}
