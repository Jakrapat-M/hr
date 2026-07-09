'use client';

// DayCell — STA-126 weekly Team Timesheet (STA-235 Draft 2).
// Stacks the color-coded chips for one (employee, day): Shift (planned) / Clock
// (actual + classified state) / OT / Leave / Day Off / Holiday. Read-only except
// the SHIFT chip, which (STA-235) a manager may click to open the shift-time
// modal. Leave + OT stay read-only (employee uses Time Correction; OT is its own
// approval). Derives from the time-domain seeds + the leave overlay seed.

import type { ReactNode } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DaySchedule } from '@/lib/time/schedule-template';
import type { AttendanceDay } from '@/lib/time/attendance-math';
import type { LeaveDay } from '@/lib/time/leave-seed';
import {
  classifyClock,
  clockChipKind,
  CLOCK_STATE_LABEL,
  CHIP_CLASS,
  type ChipKind,
} from '@/lib/time/clock-state';

// STA-254 item 9 — de-emphasized token classes for the NON-shift chips so the
// shift chip reads as the primary interactive element. Softer bg, transparent
// border (no standing outline), smaller text applied at render. Danger states
// keep pumpkin (--color-danger) so late/incomplete punches stay legible; NO-RED.
const CHIP_CLASS_MUTED: Record<ChipKind, string> = {
  shift: CHIP_CLASS.shift, // shift never renders muted; kept for type completeness
  clockOnTime: 'bg-accent-soft/50 text-ink-soft border-transparent',
  clockLate: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent',
  clockMismatch: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent',
  clockAbsent: 'bg-canvas-soft text-ink-muted border-transparent',
  ot: 'bg-warning-soft/60 text-warning border-transparent',
  leave: 'bg-[var(--color-sage-soft)]/60 text-ink-soft border-transparent',
  dayOff: 'bg-canvas-soft text-ink-faint border-transparent',
  holiday: 'bg-warning-soft/60 text-warning border-transparent',
};

export type DayCellProps = {
  isoDate: string;
  schedule: DaySchedule | undefined;
  attendance: AttendanceDay | undefined;
  /** OT hours for this employee on this date (0 / undefined = none). */
  otHours: number | undefined;
  /** Approved leave for this employee on this date (read-only, shows hour range). */
  leave?: LeaveDay;
  isHoliday: boolean;
  /** Past/future cutoff (DEMO_TODAY) so absent vs not-yet-clocked is correct. */
  cutoffISO: string;
  isTh: boolean;
  /** STA-235 — when set, the SHIFT chip becomes a button that opens the edit modal. */
  onEditShift?: () => void;
  /** STA-254 — batch shift-edit selection mode (turns the shift chip into a checkbox). */
  batchMode?: boolean;
  /** STA-254 — whether this cell's shift is currently selected in batch mode. */
  selected?: boolean;
  /** STA-254 — toggle this cell's batch selection (only set when it's a shift cell). */
  onToggleSelect?: () => void;
  /** STA-260 — open the +OverTime popup for this (employee, day). */
  onAddOt?: () => void;
  /** STA-260 — the OT chip becomes clickable and opens the popup prefilled. */
  onEditOt?: () => void;
};

type Chip = {
  kind: ChipKind;
  label: string;
  sub?: string;
  sub2?: string;
  testid: string;
  editable?: boolean;
};

// 4 so a worked-holiday cell can stack Shift + Clock + OT + Holiday-pay (STA-137).
const MAX_CHIPS = 4;

export function DayCell({
  schedule,
  attendance,
  otHours,
  leave,
  isHoliday,
  cutoffISO,
  isTh,
  onEditShift,
  batchMode = false,
  selected = false,
  onToggleSelect,
  onAddOt,
  onEditOt,
}: DayCellProps) {
  const chips: Chip[] = [];

  // STA-137 — does the employee actually WORK this holiday? (a scheduled shift or
  // an actual punch). A worked holiday must keep its Shift / Clock / OT chips
  // instead of being suppressed behind the Holiday chip; an UNWORKED holiday
  // (day-off-on-holiday) still reads as a clean Holiday cell.
  const worksHoliday =
    isHoliday &&
    ((!!schedule && !schedule.dayOff && !!schedule.scheduledIn) ||
      (!!attendance && !attendance.dayOff && !!attendance.actualIn));
  const suppressForHoliday = isHoliday && !worksHoliday;

  // 1) Holiday — display precedence over Day Off / Shift, EXCEPT on a worked
  //    holiday where the work chips win and a holiday-pay indicator is added.
  if (suppressForHoliday) {
    chips.push({
      kind: 'holiday',
      label: isTh ? 'วันหยุด' : 'Holiday',
      testid: 'chip-holiday',
    });
  }

  // 2) Day Off (only when NOT a suppressed holiday — holiday owns the cell intent).
  if (!suppressForHoliday && schedule?.dayOff) {
    chips.push({
      kind: 'dayOff',
      label: isTh ? 'วันหยุดประจำ' : 'Day off',
      testid: 'chip-dayoff',
    });
  }

  // 3) Shift (planned) — on a scheduled working day; shown even on a worked holiday.
  //    STA-235: shows the break time range and is the ONLY editable chip.
  if (!suppressForHoliday && schedule && !schedule.dayOff && schedule.scheduledIn) {
    const breakRange =
      schedule.breakStart && schedule.breakEnd
        ? `${isTh ? 'เบรค' : 'Break'} ${schedule.breakStart}–${schedule.breakEnd}`
        : undefined;
    chips.push({
      kind: 'shift',
      label: isTh ? 'กะ' : 'Shift',
      sub: `${schedule.scheduledIn}–${schedule.scheduledOut}`,
      sub2: breakRange,
      testid: 'chip-shift',
      editable: !!onEditShift,
    });
  }

  // 4) Leave (STA-235) — READ-ONLY approved leave with its hour range. Takes the
  //    clock slot for the day (an employee on leave has no punch to classify).
  if (!suppressForHoliday && leave) {
    chips.push({
      kind: 'leave',
      label: isTh ? leave.nameTh : leave.nameEn,
      sub: `${leave.startTime}–${leave.endTime}`,
      testid: 'chip-leave',
    });
  }

  // 5) Clock (actual) — classified sub-state from the attendance seed. Suppressed
  //    when the employee is on leave that day (no contradictory punch chip).
  if (!suppressForHoliday && !leave && attendance && !attendance.dayOff && attendance.scheduledIn) {
    const state = classifyClock(attendance, cutoffISO);
    const kind = clockChipKind(state);
    if (kind && state !== 'none') {
      const label = CLOCK_STATE_LABEL[state];
      const punch =
        attendance.actualIn && attendance.actualOut
          ? `${attendance.actualIn}–${attendance.actualOut}`
          : attendance.actualIn
            ? `${attendance.actualIn}–?`
            : undefined;
      chips.push({
        kind,
        label: `${isTh ? 'ตอก' : 'Clock'} · ${isTh ? label.th : label.en}`,
        sub: punch,
        testid: `chip-clock-${state}`,
      });
    }
  }

  // 6) OT — store-backed; only canonical seeded employees have rows. On a holiday
  //    OT is all-day (STA-235: no X1/X1.5/X2/X3 multiplier is ever shown).
  if (otHours && otHours > 0) {
    chips.push({
      kind: 'ot',
      label: isHoliday
        ? isTh ? 'OT ทั้งวัน' : 'OT all day'
        : `OT ${otHours}${isTh ? ' ชม.' : 'h'}`,
      testid: 'chip-ot',
    });
  }

  // 7) STA-137 — worked-holiday pay indicator. DISPLAY ONLY: no rate, no number,
  //    no calc (payroll is another team's). Amber `holiday` token (NO-RED).
  if (worksHoliday) {
    chips.push({
      kind: 'holiday',
      label: isTh ? 'ค่าทำงานวันหยุด' : 'Holiday pay',
      testid: 'chip-holiday-pay',
    });
  }

  const visible = chips.slice(0, MAX_CHIPS);
  const overflow = chips.length - visible.length;

  return (
    <div
      data-testid="day-cell"
      className="flex min-h-[72px] flex-col gap-1.5 border-l border-hairline-soft px-2 py-2"
    >
      {visible.map((chip, i) => {
        const isShift = chip.kind === 'shift';
        // STA-254 item 9 — only the shift chip keeps full weight; every other
        // chip renders muted (transparent border, softer bg, smaller text).
        const base = cn(
          'inline-flex flex-col rounded-[var(--radius-sm)] border px-2 py-1 text-left leading-tight',
          isShift
            ? cn('text-small font-medium', CHIP_CLASS.shift)
            : cn('text-xs font-medium', CHIP_CLASS_MUTED[chip.kind]),
        );

        const body = (labelExtra?: ReactNode) => (
          <>
            <span className="inline-flex items-center gap-1">
              {labelExtra}
              {chip.label}
            </span>
            {chip.sub && (
              <span className="font-mono text-xs opacity-80">{chip.sub}</span>
            )}
            {chip.sub2 && (
              <span className="font-mono text-xs opacity-70">{chip.sub2}</span>
            )}
          </>
        );

        // STA-254 item 7 — in batch mode the shift chip becomes a selection
        // toggle (checkbox + selected ring) instead of the single-edit button.
        if (isShift && batchMode && onToggleSelect) {
          return (
            <label
              key={`${chip.testid}-${i}`}
              data-testid={chip.testid}
              className={cn(
                base,
                'cursor-pointer ring-inset transition-all focus-within:ring-2 focus-within:ring-accent',
                selected
                  ? 'ring-2 ring-[var(--color-accent-alt)] shadow-[var(--shadow-card)]'
                  : 'ring-1 ring-[var(--color-accent-alt)]/40 hover:ring-2 hover:ring-[var(--color-accent-alt)]',
              )}
            >
              {body(
                <input
                  type="checkbox"
                  data-testid="shift-select-checkbox"
                  checked={selected}
                  onChange={onToggleSelect}
                  aria-label={isTh ? 'เลือกกะนี้' : 'Select this shift'}
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--color-accent)]"
                />,
              )}
            </label>
          );
        }

        // STA-252 N1 — single-edit: the shift chip is a clearly-clickable button
        // (standing accent-alt ring + Pencil icon, strengthening on hover/focus).
        if (isShift && chip.editable) {
          return (
            <button
              key={`${chip.testid}-${i}`}
              type="button"
              data-testid={chip.testid}
              onClick={onEditShift}
              aria-label={isTh ? 'แก้ไขเวลากะ' : 'Edit shift time'}
              className={cn(
                base,
                'cursor-pointer ring-1 ring-inset ring-[var(--color-accent-alt)]/50 transition-all hover:shadow-[var(--shadow-card)] hover:ring-2 hover:ring-[var(--color-accent-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              {body(<Pencil size={11} aria-hidden className="shrink-0 opacity-80" />)}
            </button>
          );
        }

        // STA-260 item 4 — an assigned OT card is EDITABLE: clicking it opens
        // the OT popup prefilled. Clickable affordance mirrors the shift chip
        // (standing ring + pencil, strengthening on hover) in the warning tone.
        if (chip.kind === 'ot' && onEditOt && !batchMode) {
          return (
            <button
              key={`${chip.testid}-${i}`}
              type="button"
              data-testid={chip.testid}
              onClick={onEditOt}
              aria-label={isTh ? 'แก้ไขโอที' : 'Edit overtime'}
              className={cn(
                base,
                'cursor-pointer ring-1 ring-inset ring-warning/50 transition-all hover:shadow-[var(--shadow-card)] hover:ring-2 hover:ring-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              {body(<Pencil size={11} aria-hidden className="shrink-0 opacity-80" />)}
            </button>
          );
        }

        return (
          <span key={`${chip.testid}-${i}`} data-testid={chip.testid} className={base}>
            {body()}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          data-testid="chip-overflow"
          className="text-xs font-medium text-ink-muted"
        >
          +{overflow}
        </span>
      )}
      {/* STA-260 item 2 — small +OverTime button UNDER the stacked info cards
          (every day, keyboard focusable; hidden while batch-select is active). */}
      {onAddOt && !batchMode && (
        <button
          type="button"
          data-testid="add-ot-button"
          onClick={onAddOt}
          className="mt-auto inline-flex w-fit items-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-hairline px-1.5 py-0.5 text-xs font-medium text-ink-faint transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus size={11} aria-hidden />
          {isTh ? 'ล่วงเวลา' : 'OverTime'}
        </button>
      )}
    </div>
  );
}
