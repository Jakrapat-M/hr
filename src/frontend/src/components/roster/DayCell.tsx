'use client';

// DayCell — STA-126 weekly Team Timesheet (STA-235 Draft 2).
// Stacks the color-coded chips for one (employee, day): Shift (planned) / Clock
// (actual + classified state) / OT / Leave / Day Off / Holiday. Read-only except
// the SHIFT chip, which (STA-235) a manager may click to open the shift-time
// modal. Leave + OT stay read-only (employee uses Time Correction; OT is its own
// approval). Derives from the time-domain seeds + the leave overlay seed.

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
        const className = cn(
          'inline-flex flex-col rounded-[var(--radius-sm)] border px-2 py-1 text-left',
          'text-small font-medium leading-tight',
          CHIP_CLASS[chip.kind],
          chip.editable &&
            'cursor-pointer transition-shadow hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        );
        const body = (
          <>
            <span>{chip.label}</span>
            {chip.sub && (
              <span className="font-mono text-xs opacity-80">{chip.sub}</span>
            )}
            {chip.sub2 && (
              <span className="font-mono text-xs opacity-70">{chip.sub2}</span>
            )}
          </>
        );
        return chip.editable ? (
          <button
            key={`${chip.testid}-${i}`}
            type="button"
            data-testid={chip.testid}
            onClick={onEditShift}
            aria-label={isTh ? 'แก้ไขเวลากะ' : 'Edit shift time'}
            className={className}
          >
            {body}
          </button>
        ) : (
          <span key={`${chip.testid}-${i}`} data-testid={chip.testid} className={className}>
            {body}
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
    </div>
  );
}
