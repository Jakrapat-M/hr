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
import { getScheduleForPeriod, type DaySchedule } from '@/lib/time/schedule-template';
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

/** Position filter sentinel — 'all' keeps every row regardless of ตำแหน่ง. */
export const POSITION_FILTER_ALL = 'all';

/**
 * Stable position key for a row (STA-252 N2). `roleTh` is always populated
 * (sourced from `HumiEmployee.position`, a Thai string) and is a 1:1 stand-in
 * for the underlying ตำแหน่ง, unlike `roleEn`/`roleTh` display text which
 * differs per locale — filter on this, not on the locale-rendered label.
 */
export function positionKey(row: Pick<TimesheetRow, 'roleTh'>): string {
  return row.roleTh;
}

// STA-235 Draft 2 — attendance filter reduced to exactly: all / absent / leave / late.
export type ClockFilter = 'all' | 'absent' | 'leave' | 'late';

/**
 * One editable SHIFT cell — the (employee, day) unit the shift-time modal edits
 * and the batch-select model tracks. `employeeId` keys it uniquely (two people
 * can share a display name); the times seed the modal + drive the auto end-time.
 */
export type ShiftCell = {
  employeeId: string;
  employeeName: string;
  date: string;
  scheduledIn: string;
  scheduledOut: string;
  breakStart: string | null;
  breakEnd: string | null;
};

/** Back-compat alias — the single-cell edit context is one ShiftCell. */
export type ShiftEditContext = ShiftCell;

/** STA-254 — a mockup-local override of a cell's shift times (no backend). */
export type ShiftOverride = {
  scheduledIn: string;
  scheduledOut: string;
  breakStart: string | null;
  breakEnd: string | null;
};

/** Stable selection key for a shift cell — `${employeeId}__${date}`. */
export function cellKey(c: { employeeId: string; date: string }): string {
  return `${c.employeeId}__${c.date}`;
}

export type WeeklyTimesheetGridProps = {
  rows: ReadonlyArray<TimesheetRow>;
  week: WeekWindow;
  /** OT store rows (passed in so the grid stays a pure render of given data). */
  otRequests: ReadonlyArray<OTRequest>;
  cutoffISO: string;
  clockFilter: ClockFilter;
  /** STA-252 N2 — ตำแหน่ง filter (a `positionKey(row)` value, or `POSITION_FILTER_ALL`). */
  positionFilter?: string;
  isTh: boolean;
  /** STA-235 — open the shift-time modal for a clicked shift cell (manager only). */
  onEditShift?: (ctx: ShiftEditContext) => void;
  /** STA-254 — mockup-local edits merged onto the seed schedule so the grid re-renders. */
  shiftOverrides?: ReadonlyMap<string, ShiftOverride>;
  /** STA-254 — batch shift-edit selection mode. */
  batchMode?: boolean;
  /** STA-254 — keys (`cellKey`) of currently selected shift cells. */
  selectedKeys?: ReadonlySet<string>;
  /** STA-254 — toggle a single shift cell's selection. */
  onToggleCell?: (cell: ShiftCell) => void;
  /** STA-254 — toggle every shift cell in a day column (select-all-day). */
  onToggleDay?: (cells: ShiftCell[]) => void;
  /** STA-254 — toggle every shift cell in an employee row (select-all-row). */
  onToggleRow?: (cells: ShiftCell[]) => void;
};

/** Build the editable ShiftCell for a (row, day), or null when not a shift day. */
function shiftCellFor(
  rowId: string,
  name: string,
  key: string,
  sched: DaySchedule | undefined,
): ShiftCell | null {
  if (!sched || sched.dayOff || !sched.scheduledIn || !sched.scheduledOut) return null;
  return {
    employeeId: rowId,
    employeeName: name,
    date: key,
    scheduledIn: sched.scheduledIn,
    scheduledOut: sched.scheduledOut,
    breakStart: sched.breakStart,
    breakEnd: sched.breakEnd,
  };
}

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
const EMPTY_SELECTION: ReadonlySet<string> = new Set();

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
  positionFilter = POSITION_FILTER_ALL,
  isTh,
  onEditShift,
  shiftOverrides,
  batchMode = false,
  selectedKeys,
  onToggleCell,
  onToggleDay,
  onToggleRow,
}: WeeklyTimesheetGridProps) {
  const locale = useLocale();
  const dayKeys = useMemo(() => week.days.map(toIsoDate), [week]);
  const selected = selectedKeys ?? EMPTY_SELECTION;

  // STA-254 — merge a mockup-local override onto a cell's seed schedule so an
  // edited shift re-renders with its new times (no backend).
  const mergedSchedule = (
    rowId: string,
    key: string,
    base: DaySchedule | undefined,
  ): DaySchedule | undefined => {
    if (!base) return base;
    const ov = shiftOverrides?.get(cellKey({ employeeId: rowId, date: key }));
    return ov ? { ...base, ...ov } : base;
  };

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
  // Composed with the STA-252 N2 position filter (both must pass — AND).
  const visibleRows = useMemo(() => {
    const byPosition =
      positionFilter === POSITION_FILTER_ALL
        ? rows
        : rows.filter((row) => positionKey(row) === positionFilter);
    if (clockFilter === 'all') return byPosition;
    return byPosition.filter((row) => {
      const data = rowData.get(row.id);
      if (!data) return false;
      return dayKeys.some((key) => {
        if (clockFilter === 'leave') return data.leaveByDate.has(key);
        const att = data.attendanceByDate.get(key);
        return att ? classifyClock(att, cutoffISO) === clockFilter : false;
      });
    });
  }, [rows, rowData, dayKeys, clockFilter, positionFilter, cutoffISO]);

  // STA-254 — the editable shift cells per day column and per employee row, used
  // by the select-all-day / select-all-row affordances (only SHIFT cells count;
  // day-off / leave / holiday cells are never selectable). Merges any override.
  const { cellsByDay, cellsByRow } = useMemo(() => {
    const byDay = new Map<string, ShiftCell[]>();
    const byRow = new Map<string, ShiftCell[]>();
    for (const row of visibleRows) {
      const data = rowData.get(row.id);
      const rowCells: ShiftCell[] = [];
      for (const key of dayKeys) {
        const sched = mergedSchedule(row.id, key, data?.scheduleByDate.get(key));
        const cell = shiftCellFor(row.id, row.name, key, sched);
        if (!cell) continue;
        rowCells.push(cell);
        const arr = byDay.get(key);
        if (arr) arr.push(cell);
        else byDay.set(key, [cell]);
      }
      byRow.set(row.id, rowCells);
    }
    return { cellsByDay: byDay, cellsByRow: byRow };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mergedSchedule reads shiftOverrides
  }, [visibleRows, rowData, dayKeys, shiftOverrides]);

  const allSelected = (cells: ShiftCell[]) =>
    cells.length > 0 && cells.every((c) => selected.has(cellKey(c)));
  const someSelected = (cells: ShiftCell[]) => cells.some((c) => selected.has(cellKey(c)));

  return (
    <div data-testid="weekly-timesheet-grid" className="overflow-x-auto">
      <div className="grid min-w-[920px] grid-cols-[200px_repeat(7,minmax(120px,1fr))]">
        {/* ── Header row ── */}
        <div className="sticky left-0 z-10 border-b border-hairline bg-surface px-4 py-3 text-small font-semibold text-ink-muted">
          {isTh ? 'พนักงาน' : 'Employee'}
        </div>
        {week.days.map((d, i) => {
          const dayKey = toIsoDate(d);
          const isHolidayCol = HOLIDAY_SET.has(dayKey);
          const dayCells = cellsByDay.get(dayKey) ?? [];
          return (
            <div
              key={dayKey}
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
              {/* STA-254 — select whole day (its SHIFT cells only). */}
              {batchMode && dayCells.length > 0 && (
                <label className="mt-2 inline-flex items-center justify-center gap-1 text-xs text-ink-soft">
                  <SelectAllCheckbox
                    testid="select-day"
                    checked={allSelected(dayCells)}
                    indeterminate={someSelected(dayCells) && !allSelected(dayCells)}
                    ariaLabel={isTh ? 'เลือกทั้งวัน' : 'Select whole day'}
                    onToggle={() => onToggleDay?.(dayCells)}
                  />
                  {isTh ? 'ทั้งวัน' : 'Day'}
                </label>
              )}
            </div>
          );
        })}

        {/* ── Body rows ── */}
        {visibleRows.map((row) => {
          const data = rowData.get(row.id);
          const rowCells = cellsByRow.get(row.id) ?? [];
          return (
            <div key={row.id} className="contents" data-testid="timesheet-row">
              {/* Sticky employee column — name links to the employee detail page. */}
              <div className="sticky left-0 z-10 flex items-center gap-3 border-b border-hairline-soft bg-surface px-4 py-3">
                {/* STA-254 — select whole employee row (its SHIFT cells only). */}
                {batchMode && rowCells.length > 0 && (
                  <SelectAllCheckbox
                    testid="select-row"
                    checked={allSelected(rowCells)}
                    indeterminate={someSelected(rowCells) && !allSelected(rowCells)}
                    ariaLabel={
                      isTh ? `เลือกทั้งแถวของ ${row.name}` : `Select whole row for ${row.name}`
                    }
                    onToggle={() => onToggleRow?.(rowCells)}
                  />
                )}
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
                const schedule = mergedSchedule(row.id, key, data?.scheduleByDate.get(key));
                const cell = shiftCellFor(row.id, row.name, key, schedule);
                const isSelected = cell ? selected.has(cellKey(cell)) : false;
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
                      batchMode={batchMode}
                      selected={isSelected}
                      onToggleSelect={
                        batchMode && cell && onToggleCell ? () => onToggleCell(cell) : undefined
                      }
                      onEditShift={
                        !batchMode && cell && onEditShift ? () => onEditShift(cell) : undefined
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

/** Tri-state select-all checkbox (drives select-day / select-row). */
function SelectAllCheckbox({
  testid,
  checked,
  indeterminate,
  ariaLabel,
  onToggle,
}: {
  testid: string;
  checked: boolean;
  indeterminate: boolean;
  ariaLabel: string;
  onToggle: () => void;
}) {
  return (
    <input
      type="checkbox"
      data-testid={testid}
      aria-label={ariaLabel}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onChange={onToggle}
      className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
    />
  );
}

export { WEEKDAY_SHORT };
