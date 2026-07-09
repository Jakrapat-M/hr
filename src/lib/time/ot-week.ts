// lib/time/ot-week.ts — STA-126 (Team Timesheet weekly grid)
//
// MOCK ONLY. OT is store-backed (NOT a getOtForPeriod fn): the useOvertimeRequests
// Zustand store holds OTRequest rows {employeeId, startAt ISO, endAt, status}. This
// selector filters a given employee's rows whose startAt date falls inside a 7-day
// window and sums their hours via computeOtHours — returning a per-date OT-hours
// map. Most grid rows have NO OT rows (only canonical seeded employees do).

import type { OTRequest } from '@/stores/overtime-requests';
import { otDisplayHours } from './ot-math';
import { toIsoDate, type WeekWindow } from './week';

/** Per-date OT hours for one employee, keyed by ISO 'YYYY-MM-DD'. */
export type OtByDate = Record<string, number>;

/**
 * Sum an employee's OT hours per day within `win`. A row is counted on the
 * calendar date of its `startAt` (cross-midnight OT belongs to the day it began,
 * matching ot-math's date-in-period filter). Approved + pending rows count;
 * rejected rows are ignored.
 */
export function otHoursByDateForWeek(
  requests: ReadonlyArray<OTRequest>,
  employeeId: string,
  win: WeekWindow,
): OtByDate {
  const dayKeys = new Set(win.days.map(toIsoDate));
  const out: OtByDate = {};

  for (const r of requests) {
    if (r.employeeId !== employeeId) continue;
    if (r.status === 'rejected') continue;
    const day = (r.startAt ?? '').slice(0, 10);
    if (!dayKeys.has(day)) continue;
    // Display hours via the centralized read: stored total for multi-day rows,
    // recomputed from the window for single-day rows (keeps the span≠duration
    // rule in one place — see otDisplayHours).
    const hours = otDisplayHours(r);
    if (hours <= 0) continue;
    out[day] = Math.round(((out[day] ?? 0) + hours) * 100) / 100;
  }

  return out;
}
