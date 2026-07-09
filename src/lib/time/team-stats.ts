// lib/time/team-stats.ts — STA-245 (Team Overview dashboard)
//
// MOCK ONLY. Pure team-level roll-up selector for the manager Team Overview page.
// Aggregates the canonical time-domain seeds (schedule + attendance + leave + OT +
// holidays) across a cohort of employees, scoped to a period WINDOW and pinned to
// DEMO_TODAY — never wall-clock. Deterministic so SSR + unit tests are stable.
//
// The three attendance figures (on-time rate / late scans / absences + missed
// scans) are the SAME classifyClock roll-up the Home strip (AttendanceKpiCards)
// shows — this page is the full dashboard that adds leave, OT, and holiday context.
//
// NO multiplier field exists on OTRequest (STA-235 deliberately hides X-rates on
// the roster grid), so the OT X1/X1.5/X2/X3 breakdown is DERIVED per OT day from
// that day's schedule context: public holiday → x3, weekly rest day → x2, a normal
// working day → x1.5, otherwise → x1. Documented mockup heuristic, not payroll.

import type { OTRequest } from '@/stores/overtime-requests';
import { getAttendanceForPeriod } from './attendance-seed';
import { getScheduleForPeriod } from './schedule-template';
import { getLeaveForPeriod } from './leave-seed';
import { classifyClock } from './clock-state';
import { getHolidaysForPeriod } from './holiday-calendar';
import { otDisplayHours } from './ot-math';
import { DEMO_TODAY } from './period';
import { toIsoDate, type WeekWindow } from './week';

export type OtMultiplier = 'x1' | 'x1.5' | 'x2' | 'x3';

export const OT_MULTIPLIERS: readonly OtMultiplier[] = ['x1', 'x1.5', 'x2', 'x3'];

export type TeamStats = {
  /** Distinct employees in the aggregated cohort. */
  headcount: number;
  onTime: number;
  late: number;
  /** Incomplete punches (clock-in without clock-out). */
  mismatch: number;
  absent: number;
  /** absent + incomplete — the "การขาดงาน / ไม่แสกนนิ้ว" figure the BA card shows. */
  missedScans: number;
  /** on-time + late + mismatch + absent scheduled working days in the window. */
  scheduledDays: number;
  onTimeRatePct: number;
  /** Approved-leave day-blocks falling inside the window. */
  leaveCount: number;
  otHours: number;
  otHoursByMultiplier: Record<OtMultiplier, number>;
  /** Public holidays inside the window (drives the current-period card). */
  holidayCount: number;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Derive the OT pay-multiplier bucket for one OT day from its schedule context.
 * Mockup heuristic (OTRequest carries no rate): a public holiday pays 3×, the
 * weekly rest day 2×, a normal working day's overtime 1.5×; anything else falls
 * back to 1× (an unscheduled, non-rest day — rare in the seeds).
 */
export function otMultiplierForDay(
  daySchedule: { dayOff: boolean; scheduledIn: string | null } | undefined,
  isHoliday: boolean,
): OtMultiplier {
  if (isHoliday) return 'x3';
  if (daySchedule?.dayOff) return 'x2';
  if (daySchedule?.scheduledIn) return 'x1.5';
  return 'x1';
}

/**
 * Roll up a cohort's attendance / leave / OT / holiday stats for a window.
 *
 * @param window   any WeekWindow-shaped period (week or the whole payroll period).
 * @param empIds   the persona-scoped cohort (empId namespace, e.g. `EMP-0301`).
 * @param otRequests the live OT store rows (defaults empty for a pure/SSR pass).
 */
export function teamStats(
  window: WeekWindow,
  empIds: readonly string[],
  otRequests: readonly OTRequest[] = [],
): TeamStats {
  const startISO = toIsoDate(window.start);
  const endISO = toIsoDate(window.end);
  const dayKeys = new Set(window.days.map(toIsoDate));
  const holidays = getHolidaysForPeriod(startISO, endISO);

  const uniqueIds = Array.from(new Set(empIds));

  let onTime = 0;
  let late = 0;
  let mismatch = 0;
  let absent = 0;
  let leaveCount = 0;

  for (const id of uniqueIds) {
    for (const day of getAttendanceForPeriod(id)) {
      if (!dayKeys.has(day.date)) continue;
      const state = classifyClock(day, DEMO_TODAY);
      if (state === 'on-time') onTime += 1;
      else if (state === 'late') late += 1;
      else if (state === 'mismatch') mismatch += 1;
      else if (state === 'absent') absent += 1;
    }
    for (const lv of getLeaveForPeriod(id)) {
      if (lv.date >= startISO && lv.date <= endISO) leaveCount += 1;
    }
  }

  // OT — per request, per in-window day; bucket by derived multiplier. Schedules
  // are memoized per employee so a multi-row cohort resolves each once.
  const idSet = new Set(uniqueIds);
  const scheduleCache = new Map<string, Map<string, { dayOff: boolean; scheduledIn: string | null }>>();
  const scheduleFor = (id: string) => {
    let m = scheduleCache.get(id);
    if (!m) {
      m = new Map();
      for (const s of getScheduleForPeriod(id)) {
        m.set(s.date, { dayOff: s.dayOff, scheduledIn: s.scheduledIn });
      }
      scheduleCache.set(id, m);
    }
    return m;
  };

  const otByMultiplier: Record<OtMultiplier, number> = { x1: 0, 'x1.5': 0, x2: 0, x3: 0 };

  for (const r of otRequests) {
    if (!idSet.has(r.employeeId)) continue;
    if (r.status === 'rejected' || r.status === 'cancelled') continue;
    // A multi-day request carries per-day hours; a single-day one is one window
    // anchored on its startAt date (cross-midnight hours via otDisplayHours).
    const parts = r.days?.length
      ? r.days.map((d) => ({ date: d.date, hours: d.hours }))
      : [{ date: (r.startAt ?? '').slice(0, 10), hours: otDisplayHours(r) }];
    const sched = scheduleFor(r.employeeId);
    for (const p of parts) {
      if (!dayKeys.has(p.date) || p.hours <= 0) continue;
      const mult = otMultiplierForDay(sched.get(p.date), holidays.has(p.date));
      otByMultiplier[mult] = round2(otByMultiplier[mult] + p.hours);
    }
  }

  const otHours = round2(
    otByMultiplier.x1 + otByMultiplier['x1.5'] + otByMultiplier.x2 + otByMultiplier.x3,
  );
  const scheduledDays = onTime + late + mismatch + absent;
  const onTimeRatePct = scheduledDays > 0 ? Math.round((onTime / scheduledDays) * 100) : 0;

  return {
    headcount: uniqueIds.length,
    onTime,
    late,
    mismatch,
    absent,
    missedScans: absent + mismatch,
    scheduledDays,
    onTimeRatePct,
    leaveCount,
    otHours,
    otHoursByMultiplier: otByMultiplier,
    holidayCount: holidays.size,
  };
}

/** STA-249 — one employee's in-window attendance/OT/leave roll-up, for the
 *  expandable Team Overview detail layer (the granular per-person breakdown the
 *  collapsed KPI cards summarize). Same seeds and window semantics as teamStats. */
export type EmployeeDetail = {
  empId: string;
  onTime: number;
  late: number;
  mismatch: number;
  absent: number;
  /** absent + incomplete — mirrors the aggregate "missed scans" figure. */
  missedScans: number;
  otHours: number;
  /** Approved-leave day-blocks inside the window for this employee. */
  leaveDays: number;
};

/**
 * Per-employee breakdown of the same window teamStats aggregates — one row per
 * distinct employee, in `empIds` order. The Team Overview expanded view filters
 * and caps these (late/absent list, OT-by-employee list, leave detail) so the
 * granular layer stays data-driven off the canonical lib/time seeds. OT is the
 * plain in-window hour sum (no multiplier split — that lives on the aggregate card).
 */
export function teamDetail(
  window: WeekWindow,
  empIds: readonly string[],
  otRequests: readonly OTRequest[] = [],
): EmployeeDetail[] {
  const startISO = toIsoDate(window.start);
  const endISO = toIsoDate(window.end);
  const dayKeys = new Set(window.days.map(toIsoDate));
  const uniqueIds = Array.from(new Set(empIds));
  const idSet = new Set(uniqueIds);

  // OT hours per employee — approved/pending rows, in-window days only.
  const otByEmp = new Map<string, number>();
  for (const r of otRequests) {
    if (!idSet.has(r.employeeId)) continue;
    if (r.status === 'rejected' || r.status === 'cancelled') continue;
    const parts = r.days?.length
      ? r.days.map((d) => ({ date: d.date, hours: d.hours }))
      : [{ date: (r.startAt ?? '').slice(0, 10), hours: otDisplayHours(r) }];
    for (const p of parts) {
      if (!dayKeys.has(p.date) || p.hours <= 0) continue;
      otByEmp.set(r.employeeId, round2((otByEmp.get(r.employeeId) ?? 0) + p.hours));
    }
  }

  return uniqueIds.map((id) => {
    let onTime = 0;
    let late = 0;
    let mismatch = 0;
    let absent = 0;
    let leaveDays = 0;
    for (const day of getAttendanceForPeriod(id)) {
      if (!dayKeys.has(day.date)) continue;
      const state = classifyClock(day, DEMO_TODAY);
      if (state === 'on-time') onTime += 1;
      else if (state === 'late') late += 1;
      else if (state === 'mismatch') mismatch += 1;
      else if (state === 'absent') absent += 1;
    }
    for (const lv of getLeaveForPeriod(id)) {
      if (lv.date >= startISO && lv.date <= endISO) leaveDays += 1;
    }
    return {
      empId: id,
      onTime,
      late,
      mismatch,
      absent,
      missedScans: absent + mismatch,
      otHours: otByEmp.get(id) ?? 0,
      leaveDays,
    };
  });
}
