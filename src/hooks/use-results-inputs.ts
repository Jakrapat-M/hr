// use-results-inputs — thin selector hook feeding the PURE computeResultsForPeriod.
//
// Keeps results-math.ts pure: the holiday calendar + approved-leave overlay are
// derived HERE and passed in. Subscribes to the leave-approvals store as a
// TOP-LEVEL Zustand selector (NOT getState()) so the Results tab re-renders the
// moment a leave is approved in /quick-approve — mirroring the working precedent
// at timesheet/page.tsx (`useTimeCorrections((s) => s.requests)`).

import { useMemo } from 'react';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { getAttendanceForPeriod } from '@/lib/time/attendance-seed';
import { getHolidaysForPeriod } from '@/lib/time/holiday-calendar';
import type { ResultsInputs } from '@/lib/time/results-math';

/** Inclusive list of ISO dates from `startISO` to `endISO`. */
export function expandRange(startISO: string, endISO: string): string[] {
  if (!startISO || !endISO || startISO > endISO) return [];
  const out: string[] = [];
  const d = new Date(startISO + 'T00:00:00Z');
  const end = new Date(endISO + 'T00:00:00Z');
  for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** A date is "working" when it has a scheduled (non-day-off) attendance day and
 *  is not a holiday — so leave never lands on a day off or a public holiday. */
export function isWorkingDay(
  dateISO: string,
  workingDates: Set<string>,
  holidays: Map<string, unknown>,
): boolean {
  return workingDates.has(dateISO) && !holidays.has(dateISO);
}

/**
 * Build the {holidays, approvedLeaveByDate} inputs for an employee × period.
 * Reactive: re-derives whenever the leave-approvals requests change.
 */
export function useResultsInputs(
  empId: string,
  period: { start: string; end: string },
): ResultsInputs {
  const requests = useLeaveApprovals((s) => s.requests);

  return useMemo(() => {
    const holidays = getHolidaysForPeriod(period.start, period.end);

    // Working days = scheduled, non-day-off attendance days in the period.
    const workingDates = new Set(
      getAttendanceForPeriod(empId)
        .filter((d) => !d.dayOff)
        .map((d) => d.date),
    );

    const approvedLeaveByDate = new Map<string, { leaveCode: string; days: number }>();
    for (const r of requests) {
      if (r.status !== 'approved') continue;
      if (r.employeeId !== empId) continue;
      const code = r.leaveCode;
      if (!code) continue;
      for (const date of expandRange(r.startDate, r.endDate)) {
        if (date < period.start || date > period.end) continue;
        if (!isWorkingDay(date, workingDates, holidays)) continue;
        // Whole-day is the common case; carry req.days so a half-day shows 0.5.
        approvedLeaveByDate.set(date, { leaveCode: code, days: r.days ?? 1 });
      }
    }

    return { holidays, approvedLeaveByDate };
  }, [requests, empId, period.start, period.end]);
}
