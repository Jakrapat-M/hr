'use client';

// WeeklyTimesheetGrid — STA-126 Team Timesheet.
// Employees × 7 days (Mon→Sun) matrix. Sticky first column (Avatar + name +
// role/dept); 7 day columns with BE date headers; each (employee, day) cell is a
// DayCell that stacks Shift / Clock / OT / Day Off / Holiday chips.
//
// Derives every cell from the canonical time-domain seeds (getScheduleForPeriod
// = planned, getAttendanceForPeriod = actuals, the OT store, HUMI_TH_HOLIDAYS) —
// no parallel weekly mock. Rows are keyed on the empId namespace those seeds use.

import { useMemo } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Avatar, type AvatarProps } from '@/components/humi';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date';
import { getScheduleForPeriod } from '@/lib/time/schedule-template';
import { getAttendanceForPeriod } from '@/lib/time/attendance-seed';
import { getLeaveForPeriod, type LeaveDay } from '@/lib/time/leave-seed';
import { classifyClock } from '@/lib/time/clock-state';
import { otHoursByDateForWeek, type OtByDate } from '@/lib/time/ot-week';
import { toIsoDate, type WeekWindow } from '@/lib/time/week';
import { HUMI_TH_HOLIDAYS } from '@/lib/humi-mock-data';
import type { OTRequest } from '@/stores/overtime-requests';
import { DayCell } from './DayCell';

/** A timesheet row — id MUST be in the empId namespace the time seeds key on. */
export type TimesheetRow = {
  id: string;
  name: string;
  roleTh: string;
  roleEn: string;
  department: string;
  avatarTone?: AvatarProps['tone'];
};

// STA-235 Draft 2 — attendance filter reduced to exactly: all / absent / leave / late.
export type ClockFilter = 'all' | 'absent' | 'leave' | 'late';

/** Context handed up when a manager clicks a SHIFT chip to edit its time. */
export type ShiftEditContext = {
  employeeName: string;
  date: string;
  scheduledIn: string;
  scheduledOut: string;
  breakStart: string | null;
  breakEnd: string | null;
};

export type WeeklyTimesheetGridProps = {
  rows: ReadonlyArray<TimesheetRow>;
  week: WeekWindow;
  /** OT store rows (passed in so the grid stays a pure render of given data). */
  otRequests: ReadonlyArray<OTRequest>;
  cutoffISO: string;
  clockFilter: ClockFilter;
  isTh: boolean;
  /** STA-235 — open the shift-time modal for a clicked shift cell (manager only). */
  onEditShift?: (ctx: ShiftEditContext) => void;
};

const WEEKDAY_SHORT: { th: string; en: string }[] = [
  { th: 'จันทร์', en: 'Mon' },
  { th: 'อังคาร', en: 'Tue' },
  { th: 'พุธ', en: 'Wed' },
  { th: 'พฤหัส', en: 'Thu' },
  { th: 'ศุกร์', en: 'Fri' },
  { th: 'เสาร์', en: 'Sat' },
  { th: 'อาทิตย์', en: 'Sun' },
];

const HOLIDAY_SET = new Set(HUMI_TH_HOLIDAYS);

/** Per-employee derivation: indexed schedule + attendance + OT + leave for the week. */
type RowData = {
  scheduleByDate: Map<string, ReturnType<typeof getScheduleForPeriod>[number]>;
  attendanceByDate: Map<string, ReturnType<typeof getAttendanceForPeriod>[number]>;
  otByDate: OtByDate;
  leaveByDate: Map<string, LeaveDay>;
};

export function WeeklyTimesheetGrid({
  rows,
  week,
  otRequests,
  cutoffISO,
  clockFilter,
  isTh,
  onEditShift,
}: WeeklyTimesheetGridProps) {
  const locale = useLocale();
  const dayKeys = useMemo(() => week.days.map(toIsoDate), [week]);

  const rowData = useMemo(() => {
    const map = new Map<string, RowData>();
    for (const row of rows) {
      const scheduleByDate = new Map(
        getScheduleForPeriod(row.id).map((s) => [s.date, s]),
      );
      const attendanceByDate = new Map(
        getAttendanceForPeriod(row.id).map((a) => [a.date, a]),
      );
      const otByDate = otHoursByDateForWeek(otRequests, row.id, week);
      const leaveByDate = new Map(getLeaveForPeriod(row.id).map((l) => [l.date, l]));
      map.set(row.id, { scheduleByDate, attendanceByDate, otByDate, leaveByDate });
    }
    return map;
  }, [rows, otRequests, week]);

  // Attendance filter (STA-235: all / absent / leave / late) — keep only rows with
  // at least one matching day in the visible week. 'all' keeps everyone; 'leave'
  // matches the leave overlay; 'absent'/'late' match the classified clock state.
  const visibleRows = useMemo(() => {
    if (clockFilter === 'all') return rows;
    return rows.filter((row) => {
      const data = rowData.get(row.id);
      if (!data) return false;
      return dayKeys.some((key) => {
        if (clockFilter === 'leave') return data.leaveByDate.has(key);
        const att = data.attendanceByDate.get(key);
        return att ? classifyClock(att, cutoffISO) === clockFilter : false;
      });
    });
  }, [rows, rowData, dayKeys, clockFilter, cutoffISO]);

  return (
    <div data-testid="weekly-timesheet-grid" className="overflow-x-auto">
      <div className="grid min-w-[920px] grid-cols-[200px_repeat(7,minmax(120px,1fr))]">
        {/* ── Header row ── */}
        <div className="sticky left-0 z-10 border-b border-hairline bg-surface px-4 py-3 text-small font-semibold text-ink-muted">
          {isTh ? 'พนักงาน' : 'Employee'}
        </div>
        {week.days.map((d, i) => {
          const isHolidayCol = HOLIDAY_SET.has(toIsoDate(d));
          return (
            <div
              key={toIsoDate(d)}
              data-testid="day-header"
              className="border-b border-l border-hairline-soft bg-surface px-2 py-3 text-center"
            >
              <div className="text-small font-semibold text-ink">
                {isTh ? WEEKDAY_SHORT[i].th : WEEKDAY_SHORT[i].en}
              </div>
              <div className="font-mono text-xs text-ink-muted">
                {formatDate(d, 'medium', isTh ? 'th' : 'en')}
              </div>
              {/* STA-137 — amber "(Holiday)" pill beneath the date on a public-
                  holiday column (HUMI_TH_HOLIDAYS). NO-RED: warning-soft amber. */}
              {isHolidayCol && (
                <div
                  data-testid="header-holiday-pill"
                  className="mt-1 inline-flex rounded-[var(--radius-sm)] border border-warning bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning"
                >
                  {isTh ? 'วันหยุดนักขัตฤกษ์' : 'Holiday'}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Body rows ── */}
        {visibleRows.map((row) => {
          const data = rowData.get(row.id);
          return (
            <div key={row.id} className="contents" data-testid="timesheet-row">
              {/* Sticky employee column — name links to the employee detail page. */}
              <div className="sticky left-0 z-10 flex items-center gap-3 border-b border-hairline-soft bg-surface px-4 py-3">
                <Avatar
                  name={row.name}
                  tone={row.avatarTone ?? 'teal'}
                  size="sm"
                />
                <div className="min-w-0">
                  <Link
                    href={`/${locale}/admin/employees/${row.id}`}
                    data-testid="employee-link"
                    className="block truncate text-small font-semibold text-ink hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[var(--radius-xs)]"
                  >
                    {row.name}
                  </Link>
                  {/* ตำแหน่ง · แผนก (role = e.position; no legacy "บทบาท" label exists). */}
                  <div className="truncate text-xs text-ink-muted">
                    {(isTh ? row.roleTh : row.roleEn)} · {row.department}
                  </div>
                </div>
              </div>
              {/* 7 day cells */}
              {dayKeys.map((key) => {
                const schedule = data?.scheduleByDate.get(key);
                return (
                  <div
                    key={key}
                    className="border-b border-hairline-soft bg-surface"
                  >
                    <DayCell
                      isoDate={key}
                      schedule={schedule}
                      attendance={data?.attendanceByDate.get(key)}
                      otHours={data?.otByDate[key]}
                      leave={data?.leaveByDate.get(key)}
                      isHoliday={HOLIDAY_SET.has(key)}
                      cutoffISO={cutoffISO}
                      isTh={isTh}
                      onEditShift={
                        onEditShift && schedule && !schedule.dayOff && schedule.scheduledIn && schedule.scheduledOut
                          ? () =>
                              onEditShift({
                                employeeName: row.name,
                                date: key,
                                scheduledIn: schedule.scheduledIn!,
                                scheduledOut: schedule.scheduledOut!,
                                breakStart: schedule.breakStart,
                                breakEnd: schedule.breakEnd,
                              })
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { WEEKDAY_SHORT };
