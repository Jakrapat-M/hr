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
  '4C0800': { code: '4C0800', workHrs: 4, breakCode: 'C', in: '08:00', out: '12:00', breakStart: null, breakEnd: null, nameTh: 'พาร์ทไทม์ 08:00–12:00', nameEn: 'Part-time 08:00–12:00' },
};

/** DWS day-off marker (wiki §2 — `F` = weekly rest / special weekly holiday). */
export const DAY_OFF_CODE = 'F';

export function getShiftCode(code: string | null): ShiftCode | null {
  return code ? SHIFT_CODES[code] ?? null : null;
}
