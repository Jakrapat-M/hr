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

/** Coloured-dot category (mirrors the mock's .d-* dot classes → Humi tokens). */
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

const GROUPS: DayGroup[] = [
  {
    date: '2026-07-01', dateLabelTh: 'อ. 1 ก.ค.', dateLabelEn: 'Tue 1 Jul', dateSubTh: 'กะสาย', dateSubEn: 'Late shift', tone: 'normal',
    rows: [
      { ...REG, hours: 8.0, days: 1 },
      { wageCode: '2531', payCode: 'OT_15 – Overtime 1.5x', payKind: 'ot', dot: 'ot', hours: 2.0, days: 0 },
      { ...SHIFT_PREMIUM, hours: null, days: 0 },
      { ...MEAL, hours: null, days: 0 },
    ],
  },
  {
    date: '2026-07-02', dateLabelTh: 'พ. 2 ก.ค.', dateLabelEn: 'Wed 2 Jul', dateSubTh: 'กะสาย', dateSubEn: 'Late shift', tone: 'normal',
    rows: [
      { ...REG, hours: 7.5, days: 1 },
      { wageCode: '2510', payCode: 'LATE_DEDUCT – Late (หักสาย)', payKind: 'late_deduct', dot: 'late', hours: -0.5, days: 0 },
      { wageCode: '2515', payCode: 'LATE – Late Stat (สถิติการสาย)', payKind: 'late_stat', dot: 'late', hours: 0.5, days: 0 },
      { ...SHIFT_PREMIUM, hours: null, days: 0 },
      { ...MEAL, hours: null, days: 0 },
    ],
  },
  {
    date: '2026-07-03', dateLabelTh: 'พฤ. 3 ก.ค.', dateLabelEn: 'Thu 3 Jul', dateSubTh: 'กะสาย', dateSubEn: 'Late shift', tone: 'normal',
    rows: [
      { ...REG, hours: 8.0, days: 1 },
      { ...SHIFT_PREMIUM, hours: null, days: 0 },
      { ...MEAL, hours: null, days: 0 },
    ],
  },
  {
    date: '2026-07-04', dateLabelTh: 'ศ. 4 ก.ค.', dateLabelEn: 'Fri 4 Jul', dateSubTh: 'Day Off', dateSubEn: 'Day Off', tone: 'dayoff',
    rows: [
      { wageCode: '2507', payCode: 'DAILY_RATE_OFF – Daily Rate (วันหยุด)', payKind: 'daily_off', dot: 'dayoff', hours: 8.0, days: 1 },
    ],
  },
  {
    date: '2026-07-05', dateLabelTh: 'ส. 5 ก.ค.', dateLabelEn: 'Sat 5 Jul', dateSubTh: 'Day Off', dateSubEn: 'Day Off', tone: 'dayoff',
    rows: [
      { wageCode: '2507', payCode: 'DAILY_RATE_OFF – Daily Rate (วันหยุด)', payKind: 'daily_off', dot: 'dayoff', hours: 8.0, days: 1 },
      { wageCode: '2530', payCode: 'OT_10 – Overtime 1.0x', payKind: 'ot', dot: 'ot', hours: 8.0, days: 0 },
      { ...SHIFT_PREMIUM, hours: null, days: 0 },
    ],
  },
  {
    date: '2026-07-06', dateLabelTh: 'อา. 6 ก.ค.', dateLabelEn: 'Sun 6 Jul', dateSubTh: 'กะเช้า', dateSubEn: 'Morning', tone: 'leave',
    rows: [
      { wageCode: '2700', payCode: 'SICK_LEAVE – Sick Leave (ลาป่วย)', payKind: 'leave', dot: 'leave', hours: 8.0, days: 1 },
    ],
  },
  {
    date: '2026-07-07', dateLabelTh: 'จ. 7 ก.ค.', dateLabelEn: 'Mon 7 Jul', dateSubTh: 'กะเช้า', dateSubEn: 'Morning', tone: 'leave',
    rows: [
      { wageCode: '2702', payCode: 'PERSONAL_LEAVE – Personal Leave (ลากิจ)', payKind: 'leave', dot: 'leave', hours: 8.0, days: 1 },
    ],
  },
  {
    date: '2026-07-08', dateLabelTh: 'อ. 8 ก.ค.', dateLabelEn: 'Tue 8 Jul', dateSubTh: 'กะเช้า', dateSubEn: 'Morning', tone: 'leave',
    rows: [
      { wageCode: '2701', payCode: 'ANNUAL_LEAVE – Annual Leave (ลาพักผ่อน)', payKind: 'leave', dot: 'leave', hours: 8.0, days: 1 },
    ],
  },
  {
    date: '2026-07-09', dateLabelTh: 'พ. 9 ก.ค.', dateLabelEn: 'Wed 9 Jul', dateSubTh: 'กะเช้า', dateSubEn: 'Morning', tone: 'leave',
    rows: [
      { ...REG, hours: 4.0, days: 0 },
      { wageCode: '2700', payCode: 'SICK_LEAVE – Sick Leave ครึ่งวัน', payKind: 'leave', dot: 'leave', hours: 4.0, days: 0.5 },
    ],
  },
  {
    date: '2026-07-18', dateLabelTh: 'ศ. 18 ก.ค.', dateLabelEn: 'Fri 18 Jul', dateSubTh: 'วันหยุด (F)', dateSubEn: 'Holiday (F)', tone: 'holiday',
    rows: [
      { wageCode: '2507', payCode: 'DAILY_RATE_OFF – Daily Rate (วันหยุด)', payKind: 'daily_off', dot: 'holiday', hours: 8.0, days: 1 },
    ],
  },
  {
    date: '2026-07-19', dateLabelTh: 'ส. 19 ก.ค.', dateLabelEn: 'Sat 19 Jul', dateSubTh: 'วันหยุด (F)', dateSubEn: 'Holiday (F)', tone: 'holiday',
    rows: [
      { wageCode: '2507', payCode: 'DAILY_RATE_OFF – Daily Rate (วันหยุด)', payKind: 'daily_off', dot: 'holiday', hours: 8.0, days: 1 },
      { wageCode: '2533', payCode: 'OT_30 – Overtime 3.0x', payKind: 'ot', dot: 'ot', hours: 8.0, days: 0 },
      { wageCode: '2540', payCode: 'SHIFT_PREMIUM – Shift Premium', payKind: 'holiday_premium', dot: 'allow', hours: null, days: 0 },
    ],
  },
  {
    date: '2026-07-10', dateLabelTh: 'พฤ. 10 ก.ค.', dateLabelEn: 'Thu 10 Jul', dateSubTh: 'กะสาย', dateSubEn: 'Late shift', tone: 'today',
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
