// Roster & Shifts — mock seed (MOCKUP ONLY, no persistence / API).
// Mirrors the canonical reference (roster-ref-2026-05-25.png): 6 staff, a 24h
// hourly schedule with per-shift break windows, per-employee total hours, and a
// coverage summary. Shift positions are expressed in hours (0–24) so the Gantt
// can absolute-position each cell (left = start/24, width = duration/24).

/** Four shift archetypes — each maps to a tokenized class set in RosterGantt. */
export type ShiftType = 'manager' | 'partTime' | 'night' | 'regular';

/** Coverage status per hour — maps to a tokenized cov-cell class. */
export type CoverageStatus = 'ok' | 'gap' | 'over' | 'off';

/** Employment type chip shown in the employee meta line (mono, uppercase). */
export type EmploymentType = 'FT' | 'PT' | 'MOD';

export interface RosterShift {
  id: string;
  type: ShiftType;
  /** 0–24 — start hour of the shift. */
  start: number;
  /** 0–24 — end hour of the shift (always > start for these mocks). */
  end: number;
  /** Break window inside the shift [start,end] in hours, or null if none. */
  breakStart: number | null;
  breakEnd: number | null;
  labelTh: string;
  labelEn: string;
}

export interface RosterRow {
  id: string;
  /** Display name. */
  name: string;
  /** Avatar initials (2 chars). */
  initials: string;
  employmentType: EmploymentType;
  roleTh: string;
  roleEn: string;
  /** FOH / BOH / FLOOR — work area, shown in meta line. */
  location: string;
  /** Target hours for the period; under-target totals render in pumpkin. */
  targetHours: number;
  shifts: RosterShift[];
}

export const ROSTER_HOURS = 24;

/** "Now" marker — static demo time matching the reference (14:24). */
export const NOW_HOUR = 14;
export const NOW_MINUTE = 24;

/** Bilingual labels for each shift archetype (consumed by the legend). */
export const SHIFT_TYPE_LABELS: Record<ShiftType, { th: string; en: string }> = {
  manager: { th: 'กะหัวหน้า', en: 'Manager' },
  partTime: { th: 'พาร์ทไทม์', en: 'Part-time' },
  night: { th: 'กะกลางคืน', en: 'Night' },
  regular: { th: 'กะปกติ', en: 'Regular' },
};

function shift(
  id: string,
  type: ShiftType,
  start: number,
  end: number,
  breakStart: number | null = null,
  breakEnd: number | null = null,
): RosterShift {
  return {
    id,
    type,
    start,
    end,
    breakStart,
    breakEnd,
    labelTh: SHIFT_TYPE_LABELS[type].th,
    labelEn: SHIFT_TYPE_LABELS[type].en,
  };
}

// ── The reference's exact 6 staff ──────────────────────────────────────────
//   Somchai K.  FT  SHIFT LEAD         FOH   07:00–16:00  9.0h
//   Somsri P.   FT  CASHIER            FOH   09:00–18:00  9.0h
//   Panji Dwi   PT  FLOOR              —     13:00–17:00  4.0h
//   Anan S.     MOD MANAGER ON DUTY    —     10:00–19:00  9.0h
//   Mali T.     FT  BARISTA            FOH   06:00–14:00  8.0h
//   Krit J.     FT  STOCK              BOH   16:00–23:00  7.0h
export const ROSTER_ROWS: RosterRow[] = [
  {
    id: 'row-1',
    name: 'Somchai K.',
    initials: 'SK',
    employmentType: 'FT',
    roleTh: 'หัวหน้ากะ',
    roleEn: 'Shift Lead',
    location: 'FOH',
    targetHours: 9,
    shifts: [shift('s-1a', 'manager', 7, 16, 12, 13)],
  },
  {
    id: 'row-2',
    name: 'Somsri P.',
    initials: 'SP',
    employmentType: 'FT',
    roleTh: 'แคชเชียร์',
    roleEn: 'Cashier',
    location: 'FOH',
    targetHours: 9,
    shifts: [shift('s-2a', 'regular', 9, 18, 13, 14)],
  },
  {
    id: 'row-3',
    name: 'Panji Dwi',
    initials: 'PD',
    employmentType: 'PT',
    roleTh: 'พนักงานหน้าร้าน',
    roleEn: 'Floor',
    location: 'FLOOR',
    targetHours: 4,
    shifts: [shift('s-3a', 'partTime', 13, 17)],
  },
  {
    id: 'row-4',
    name: 'Anan S.',
    initials: 'AS',
    employmentType: 'MOD',
    roleTh: 'ผู้จัดการเวร',
    roleEn: 'Manager on Duty',
    location: 'FOH',
    targetHours: 9,
    shifts: [shift('s-4a', 'manager', 10, 19, 14, 15)],
  },
  {
    id: 'row-5',
    name: 'Mali T.',
    initials: 'MT',
    employmentType: 'FT',
    roleTh: 'บาริสต้า',
    roleEn: 'Barista',
    location: 'FOH',
    targetHours: 9, // under target (8.0h) -> renders pumpkin
    shifts: [shift('s-5a', 'regular', 6, 14, 10, 11)],
  },
  {
    id: 'row-6',
    name: 'Krit J.',
    initials: 'KJ',
    employmentType: 'FT',
    roleTh: 'คลังสินค้า',
    roleEn: 'Stock',
    location: 'BOH',
    targetHours: 9, // under target (7.0h) -> renders pumpkin
    shifts: [shift('s-6a', 'night', 16, 23, 19, 20)],
  },
];

// Displayed hours follow the reference: the cell + TOTAL show the GROSS shift
// span (end − start). Breaks are shown only as the hatch overlay, not deducted
// from the number (matches the ref's 9.0/9.0/4.0/9.0/8.0/7.0 per-row figures).
/** Gross hours for a shift (end − start). */
export function shiftHours(s: RosterShift): number {
  return s.end - s.start;
}

/** Total gross hours across a row's shifts. */
export function rowTotalHours(row: RosterRow): number {
  return row.shifts.reduce((n, s) => n + shiftHours(s), 0);
}

// 24-hour coverage row tuned to the reference summary: 12 gaps, peak 13–16,
// deficit −16 hrs. ok = adequately staffed, over = peak overlap, gap =
// understaffed against demand, off = no demand / closed.
export const COVERAGE: CoverageStatus[] = [
  'off', 'off', 'off', 'off', 'off', 'off', // 00–05 closed
  'gap', 'gap', 'gap', 'ok', 'ok', 'ok',    // 06–11 ramp, early gaps
  'gap', 'over', 'over', 'over', 'over', 'ok', // 12–17 afternoon peak 13–16
  'gap', 'gap', 'gap', 'gap', 'gap', 'gap', // 18–23 evening understaffed
];

/** Coverage summary shown in the strip label + total slot. */
export const COVERAGE_SUMMARY = {
  gaps: 12,
  peakStart: 13,
  peakEnd: 16,
  deficitHrs: -16,
};

/** Avatar background tokens (teal/indigo/pumpkin family — NO hex, NO red). */
export const AVATAR_BG: Record<string, string> = {
  'row-1': 'bg-accent',
  'row-2': 'bg-[var(--color-accent-alt)]',
  'row-3': 'bg-danger',
  'row-4': 'bg-[var(--color-accent-alt)]',
  'row-5': 'bg-accent',
  'row-6': 'bg-[var(--color-ink-soft)]',
};
