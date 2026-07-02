'use client';

// STA-168 — month-scoped shift-assignment grid (rows = team members, cols = days
// of the month). Layout idiom borrowed from the roster weekly grid, but month-
// scoped and editable (the roster's WeeklyTimesheetGrid is week-scoped read-only).
//
// One renderer, two modes: `editable` gates cell interaction. Read-only is
// enforced HERE (the renderer), never by the `?review=1` URL param (D3).

import { useMemo } from 'react';
import type { HolidayLabel } from '@/lib/time/holiday-calendar';
import { cellKey, isoWeekday, monthDays, type ShiftCell, type ShiftGroup } from '@/lib/shift-groups';
import type { ShiftWarning } from '@/lib/shift-assign/validation';
import { ShiftAssignCell } from './ShiftAssignCell';

export interface GridMember {
  id: string;
  name: string;
  role: string;
}

export interface ShiftAssignmentGridProps {
  group: ShiftGroup;
  members: GridMember[];
  editable: boolean;
  holidays: Map<string, HolidayLabel>;
  selected: Set<string>;
  warnings: Record<string, ShiftWarning>;
  onToggleCell: (empId: string, date: string) => void;
  isTh: boolean;
}

const WEEKDAY_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const WEEKDAY_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function ShiftAssignmentGrid({
  group,
  members,
  editable,
  holidays,
  selected,
  warnings,
  onToggleCell,
  isTh,
}: ShiftAssignmentGridProps) {
  const days = useMemo(() => monthDays(group.month), [group.month]);
  const cellByKey = useMemo(() => {
    const map = new Map<string, ShiftCell>();
    for (const c of group.cells) map.set(cellKey(c.empId, c.date), c);
    return map;
  }, [group.cells]);

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-hairline bg-surface">
      <table
        className="border-collapse"
        style={{ minWidth: 'max-content' }}
        aria-label={isTh ? 'ตารางจัดกะรายเดือน' : 'Monthly shift grid'}
        data-testid="shift-assign-grid"
      >
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 bg-canvas-soft text-left text-ink-soft"
              style={{ minWidth: 180, padding: '8px 12px', fontSize: 12, borderBottom: '1px solid var(--color-hairline)' }}
            >
              {isTh ? 'พนักงาน' : 'Employee'}
            </th>
            {days.map((date) => {
              const wd = isoWeekday(date);
              const isHoliday = holidays.has(date);
              const isWeekend = wd === 0 || wd === 6;
              const dayNum = Number(date.slice(-2));
              return (
                <th
                  key={date}
                  scope="col"
                  style={{
                    minWidth: 58,
                    padding: '4px 2px',
                    fontSize: 10,
                    textAlign: 'center',
                    borderBottom: '1px solid var(--color-hairline)',
                    background: isHoliday
                      ? 'var(--color-accent-alt-soft)'
                      : isWeekend
                        ? 'var(--color-canvas-soft)'
                        : undefined,
                    color: isHoliday ? 'var(--color-accent-alt)' : 'var(--color-ink-muted)',
                  }}
                  title={isHoliday ? (isTh ? holidays.get(date)!.nameTh : holidays.get(date)!.nameEn) : undefined}
                >
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-ink)' }}>{dayNum}</div>
                  <div>{(isTh ? WEEKDAY_TH : WEEKDAY_EN)[wd]}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} data-testid={`sa-row-${m.id}`}>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface text-left"
                style={{ minWidth: 180, padding: '6px 12px', borderBottom: '1px solid var(--color-hairline-soft)' }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>{m.role}</div>
              </th>
              {days.map((date) => {
                const key = cellKey(m.id, date);
                return (
                  <td key={date} style={{ padding: 2, verticalAlign: 'middle', borderBottom: '1px solid var(--color-hairline-soft)' }}>
                    <ShiftAssignCell
                      empId={m.id}
                      date={date}
                      cell={cellByKey.get(key)}
                      isHoliday={holidays.has(date)}
                      holidayLabel={holidays.get(date) ? (isTh ? holidays.get(date)!.nameTh : holidays.get(date)!.nameEn) : undefined}
                      editable={editable}
                      selected={selected.has(key)}
                      warning={Boolean(warnings[key])}
                      isTh={isTh}
                      onToggle={() => onToggleCell(m.id, date)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
