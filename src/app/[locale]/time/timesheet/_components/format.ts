// Shared UTC-safe date formatters for the My Timesheet tabs (STA-195). Pinned to
// UTC (the time-domain seeds are UTC) so labels never drift by a day in tests.

const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TH_WEEKDAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const EN_WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parts(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return { d, day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear(), dow: d.getUTCDay() };
}

/** 'อ. 1 ก.ค.' / 'Tue 1 Jul' — weekday + day + short month. */
export function fmtDayShort(iso: string, isTh: boolean): string {
  const p = parts(iso);
  const wd = isTh ? TH_WEEKDAYS_SHORT[p.dow] : EN_WEEKDAYS_SHORT[p.dow];
  const mon = isTh ? TH_MONTHS_SHORT[p.month] : EN_MONTHS_SHORT[p.month];
  return `${wd} ${p.day} ${mon}`;
}

/** '21 มิ.ย. – 20 ก.ค. 2569' — the payroll-period chip (BE year for TH). */
export function fmtPeriodChip(startIso: string, endIso: string, isTh: boolean): string {
  const s = parts(startIso);
  const e = parts(endIso);
  const sMon = isTh ? TH_MONTHS_SHORT[s.month] : EN_MONTHS_SHORT[s.month];
  const eMon = isTh ? TH_MONTHS_SHORT[e.month] : EN_MONTHS_SHORT[e.month];
  const year = isTh ? e.year + 543 : e.year;
  return `${s.day} ${sMon} – ${e.day} ${eMon} ${year}`;
}
