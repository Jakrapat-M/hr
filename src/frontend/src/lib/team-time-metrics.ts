/**
 * P3 — Manager team-time metrics (read-only mockup).
 *
 * Derives deterministic late / absence / OT figures per employee so the
 * /time/review "Team time" dashboard can scope to a manager's direct reports
 * (via filterEmployeesByPersona 'direct-reports' mode) without a backend.
 *
 * Numbers are seeded from each employee id so they are STABLE across renders
 * and across test runs (no Math.random, no Date.now). This is mock data — it
 * stands in for a real attendance feed during the UI-mockup phase.
 *
 * No write paths. No persistence. Pure functions only.
 */

import type { HumiEmployee } from './humi-mock-data';

export interface TeamTimeRow {
  readonly employeeId: string;
  readonly name: string;
  /** Late arrivals this month. */
  readonly lateCount: number;
  /** Unplanned absences this month. */
  readonly absenceCount: number;
  /** Overtime hours logged this month. */
  readonly otHours: number;
  /** True when late or absence breach the warning threshold (UI alert tint). */
  readonly hasAlert: boolean;
}

export interface OtTrendPoint {
  /** Short month label, e.g. 'Feb'. */
  readonly month: string;
  readonly hours: number;
}

export interface TeamTimeSummary {
  readonly headcount: number;
  readonly totalLate: number;
  readonly totalAbsence: number;
  readonly totalOtHours: number;
  readonly rows: ReadonlyArray<TeamTimeRow>;
  /** Last-4-months team OT total, oldest→newest, for the trend bars. */
  readonly otTrend: ReadonlyArray<OtTrendPoint>;
}

/** Late/absence over this counts as an alert (UI uses warning/pumpkin tint). */
export const LATE_ALERT_THRESHOLD = 3;
export const ABSENCE_ALERT_THRESHOLD = 1;

/** Stable non-negative hash of a string → small integer seed. */
function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 100000;
  }
  return h;
}

const TREND_MONTHS = ['Feb', 'Mar', 'Apr', 'May'] as const;

function displayName(e: HumiEmployee): string {
  const th = `${e.firstNameTh ?? ''} ${e.lastNameTh ?? ''}`.trim();
  return th || e.employeeCode || e.id;
}

/**
 * Build the scoped team-time summary from an already-scoped employee list
 * (i.e. the caller has run filterEmployeesByPersona and dropped self).
 */
export function buildTeamTimeSummary(
  employees: ReadonlyArray<HumiEmployee>,
): TeamTimeSummary {
  const rows: TeamTimeRow[] = employees.map((e) => {
    const s = seedFromId(e.id);
    const lateCount = s % 6; // 0..5
    const absenceCount = Math.floor(s / 7) % 3; // 0..2
    const otHours = (s % 9) + ((Math.floor(s / 11) % 2) ? 0.5 : 0); // 0..8.5
    const hasAlert = lateCount >= LATE_ALERT_THRESHOLD || absenceCount >= ABSENCE_ALERT_THRESHOLD;
    return {
      employeeId: e.id,
      name: displayName(e),
      lateCount,
      absenceCount,
      otHours,
      hasAlert,
    };
  });

  const totalLate = rows.reduce((sum, r) => sum + r.lateCount, 0);
  const totalAbsence = rows.reduce((sum, r) => sum + r.absenceCount, 0);
  const totalOtHours = rows.reduce((sum, r) => sum + r.otHours, 0);

  // Trend: spread the team OT total across 4 months with a deterministic
  // month-weighting so the bars vary but always sum near the current total.
  const otTrend: OtTrendPoint[] = TREND_MONTHS.map((month, i) => {
    const weight = 0.6 + ((seedFromId(month) + i) % 5) * 0.2; // 0.6..1.4
    return { month, hours: Math.round(totalOtHours * weight * 10) / 10 };
  });

  return {
    headcount: rows.length,
    totalLate,
    totalAbsence,
    totalOtHours: Math.round(totalOtHours * 10) / 10,
    rows,
    otTrend,
  };
}
