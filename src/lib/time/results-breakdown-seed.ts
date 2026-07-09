// lib/time/results-breakdown-seed.ts — dedicated deterministic mock seed for the
// My Timesheet "Time Result" tab (STA-195).
//
// The BA mock shows a payroll-export wage-type breakdown whose codes (REG, 2531,
// OT_15, DAILY_RATE_OFF, SHIFT_PREMIUM, MEAL_ALLOWANCE, LATE_DEDUCT, …) have no
// producer in the time-domain math layer (results-math only emits REGULAR /
// HOLIDAY / 2700 / 2701). Rather than force those through computeResultsForPeriod,
// this file is a fixed, self-consistent mock of that breakdown — analogous to
// clock-log-seed.ts — so the tab renders the SF-parity codes exactly as the BA
// designed them. Wage/pay codes are user-facing SF-parity labels (allowed).
//
// MOCK ONLY. Pure + deterministic (no Math.random, no Date.now).

/** Semantic category of a breakdown line — drives amount + dot colour. */
export type PayKind =
  | 'reg'
  | 'ot'
  | 'late_deduct'
  | 'late_stat'
  | 'daily_off'
  | 'leave'
  | 'shift_premium'
  | 'meal'
  | 'holiday_premium';

/** Coloured-dot category (mirrors the mock's .d-* dot classes → Cnext tokens). */
export type DotKind = 'work' | 'ot' | 'late' | 'leave' | 'allow' | 'dayoff' | 'holiday';

export type RowTone = 'normal' | 'dayoff' | 'holiday' | 'leave' | 'today';

/** One wage-type line in the Time Result table. */
export type WageBreakdownRow = {
  /** Grouping key (illustrative period date). */
  date: string;
  /** First row of a day group → renders the date cell + a group border. */
  dayFirst: boolean;
  dateLabelTh: string;
  dateLabelEn: string;
  dateSubTh: string;
  dateSubEn: string;
  tone: RowTone;
  /** Payroll wage-type code (SF parity), e.g. 'REG', '2531', '2540'. */
  wageCode: string;
  /** Pay-code label (SF parity, identical in both locales). */
  payCode: string;
  payKind: PayKind;
  dot: DotKind;
  /** Base-10 decimal hours; null renders "—"; negative for deductions. */
  hours: number | null;
  days: number;
  /** Today's not-yet-computed row → renders a single "pending" spanning cell. */
  pending?: boolean;
};

type DayGroup = {
  date: string;
  dateLabelTh: string;
  dateLabelEn: string;
  dateSubTh: string;
  dateSubEn: string;
  tone: RowTone;
  rows: Array<Omit<WageBreakdownRow,
    'date' | 'dayFirst' | 'dateLabelTh' | 'dateLabelEn' | 'dateSubTh' | 'dateSubEn' | 'tone'>>;
};

const REG = { wageCode: 'REG', payCode: 'REG_EXPORT – Regular Export', payKind: 'reg' as const, dot: 'work' as const };
const SHIFT_PREMIUM = { wageCode: '2540', payCode: 'SHIFT_PREMIUM – Shift Premium', payKind: 'shift_premium' as const, dot: 'allow' as const };
const MEAL = { wageCode: '2599', payCode: 'MEAL_ALLOWANCE – Meal Allw.', payKind: 'meal' as const, dot: 'allow' as const };

// STA-233: dates pinned within the 21→20 payroll period containing DEMO_TODAY
// ('2026-06-07', see lib/time/period.ts) — 2026-05-21 → 2026-06-20 — so the Time
// Result rows fall inside the period the page header displays. Offsets from
// DEMO_TODAY are otherwise identical to the original STA-195 mock.
const GROUPS: DayGroup[] = [
  {
    date: '2026-05-29', dateLabelTh: 'ศ. 29 พ.ค.', dateLabelEn: 'Fri 29 May', dateSubTh: 'กะสาย', dateSubEn: 'Late shift', tone: 'normal',
    rows: [
      { ...REG, hours: 8.0, days: 1 },
      { wageCode: '2531', payCode: 'OT_15 – Overtime 1.5x', payKind: 'ot', dot: 'ot', hours: 2.0, days: 0 },
      { ...SHIFT_PREMIUM, hours: null, days: 0 },
      { ...MEAL, hours: null, days: 0 },
    ],
  },
  {
    date: '2026-05-30', dateLabelTh: 'ส. 30 พ.ค.', dateLabelEn: 'Sat 30 May', dateSubTh: 'กะสาย', dateSubEn: 'Late shift', tone: 'normal',
    rows: [
      { ...REG, hours: 7.5, days: 1 },
      { wageCode: '2510', payCode: 'LATE_DEDUCT – Late (หักสาย)', payKind: 'late_deduct', dot: 'late', hours: -0.5, days: 0 },
      { wageCode: '2515', payCode: 'LATE – Late Stat (สถิติการสาย)', payKind: 'late_stat', dot: 'late', hours: 0.5, days: 0 },
      { ...SHIFT_PREMIUM, hours: null, days: 0 },
      { ...MEAL, hours: null, days: 0 },
    ],
  },
  {
    date: '2026-05-31', dateLabelTh: 'อา. 31 พ.ค.', dateLabelEn: 'Sun 31 May', dateSubTh: 'กะสาย', dateSubEn: 'Late shift', tone: 'normal',
    rows: [
      { ...REG, hours: 8.0, days: 1 },
      { ...SHIFT_PREMIUM, hours: null, days: 0 },
      { ...MEAL, hours: null, days: 0 },
    ],
  },
  {
    date: '2026-06-01', dateLabelTh: 'จ. 1 มิ.ย.', dateLabelEn: 'Mon 1 Jun', dateSubTh: 'Day Off', dateSubEn: 'Day Off', tone: 'dayoff',
    rows: [
      { wageCode: '2507', payCode: 'DAILY_RATE_OFF – Daily Rate (วันหยุด)', payKind: 'daily_off', dot: 'dayoff', hours: 8.0, days: 1 },
    ],
  },
  {
    date: '2026-06-02', dateLabelTh: 'อ. 2 มิ.ย.', dateLabelEn: 'Tue 2 Jun', dateSubTh: 'Day Off', dateSubEn: 'Day Off', tone: 'dayoff',
    rows: [
      { wageCode: '2507', payCode: 'DAILY_RATE_OFF – Daily Rate (วันหยุด)', payKind: 'daily_off', dot: 'dayoff', hours: 8.0, days: 1 },
      { wageCode: '2530', payCode: 'OT_10 – Overtime 1.0x', payKind: 'ot', dot: 'ot', hours: 8.0, days: 0 },
      { ...SHIFT_PREMIUM, hours: null, days: 0 },
    ],
  },
  {
    date: '2026-06-03', dateLabelTh: 'พ. 3 มิ.ย.', dateLabelEn: 'Wed 3 Jun', dateSubTh: 'กะเช้า', dateSubEn: 'Morning', tone: 'leave',
    rows: [
      { wageCode: '2700', payCode: 'SICK_LEAVE – Sick Leave (ลาป่วย)', payKind: 'leave', dot: 'leave', hours: 8.0, days: 1 },
    ],
  },
  {
    date: '2026-06-04', dateLabelTh: 'พฤ. 4 มิ.ย.', dateLabelEn: 'Thu 4 Jun', dateSubTh: 'กะเช้า', dateSubEn: 'Morning', tone: 'leave',
    rows: [
      { wageCode: '2702', payCode: 'PERSONAL_LEAVE – Personal Leave (ลากิจ)', payKind: 'leave', dot: 'leave', hours: 8.0, days: 1 },
    ],
  },
  {
    date: '2026-06-05', dateLabelTh: 'ศ. 5 มิ.ย.', dateLabelEn: 'Fri 5 Jun', dateSubTh: 'กะเช้า', dateSubEn: 'Morning', tone: 'leave',
    rows: [
      { wageCode: '2701', payCode: 'ANNUAL_LEAVE – Annual Leave (ลาพักผ่อน)', payKind: 'leave', dot: 'leave', hours: 8.0, days: 1 },
    ],
  },
  {
    date: '2026-06-06', dateLabelTh: 'ส. 6 มิ.ย.', dateLabelEn: 'Sat 6 Jun', dateSubTh: 'กะเช้า', dateSubEn: 'Morning', tone: 'leave',
    rows: [
      { ...REG, hours: 4.0, days: 0 },
      { wageCode: '2700', payCode: 'SICK_LEAVE – Sick Leave ครึ่งวัน', payKind: 'leave', dot: 'leave', hours: 4.0, days: 0.5 },
    ],
  },
  {
    date: '2026-06-15', dateLabelTh: 'จ. 15 มิ.ย.', dateLabelEn: 'Mon 15 Jun', dateSubTh: 'วันหยุด (F)', dateSubEn: 'Holiday (F)', tone: 'holiday',
    rows: [
      { wageCode: '2507', payCode: 'DAILY_RATE_OFF – Daily Rate (วันหยุด)', payKind: 'daily_off', dot: 'holiday', hours: 8.0, days: 1 },
    ],
  },
  {
    date: '2026-06-16', dateLabelTh: 'อ. 16 มิ.ย.', dateLabelEn: 'Tue 16 Jun', dateSubTh: 'วันหยุด (F)', dateSubEn: 'Holiday (F)', tone: 'holiday',
    rows: [
      { wageCode: '2507', payCode: 'DAILY_RATE_OFF – Daily Rate (วันหยุด)', payKind: 'daily_off', dot: 'holiday', hours: 8.0, days: 1 },
      { wageCode: '2533', payCode: 'OT_30 – Overtime 3.0x', payKind: 'ot', dot: 'ot', hours: 8.0, days: 0 },
      { wageCode: '2540', payCode: 'SHIFT_PREMIUM – Shift Premium', payKind: 'holiday_premium', dot: 'allow', hours: null, days: 0 },
    ],
  },
  {
    date: '2026-06-07', dateLabelTh: 'อา. 7 มิ.ย.', dateLabelEn: 'Sun 7 Jun', dateSubTh: 'กะเช้า', dateSubEn: 'Morning', tone: 'today',
    rows: [
      { wageCode: '', payCode: '', payKind: 'reg', dot: 'work', hours: null, days: 0, pending: true },
    ],
  },
];

/**
 * The Time Result wage-type breakdown, flattened to rows with `dayFirst` set on
 * the first line of each day group. `empId` is accepted for signature parity with
 * the other seeds but the mock breakdown is fixed (deterministic across renders).
 */
export function getResultsBreakdown(_empId: string): WageBreakdownRow[] {
  const out: WageBreakdownRow[] = [];
  for (const g of GROUPS) {
    g.rows.forEach((r, i) => {
      out.push({
        date: g.date,
        dayFirst: i === 0,
        dateLabelTh: g.dateLabelTh,
        dateLabelEn: g.dateLabelEn,
        dateSubTh: g.dateSubTh,
        dateSubEn: g.dateSubEn,
        tone: g.tone,
        ...r,
      });
    });
  }
  return out;
}
