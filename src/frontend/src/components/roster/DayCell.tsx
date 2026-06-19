'use client';

// DayCell — STA-126 weekly Team Timesheet.
// Stacks the color-coded chips for one (employee, day): Shift (planned) / Clock
// (actual + classified state) / OT / Day Off / Holiday. Read-only this phase.
// Derives entirely from the existing time-domain seeds (schedule-template +
// attendance-seed + OT store + HUMI_TH_HOLIDAYS) — no parallel weekly mock.

import { cn } from '@/lib/utils';
import type { DaySchedule } from '@/lib/time/schedule-template';
import type { AttendanceDay } from '@/lib/time/attendance-math';
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
  isHoliday: boolean;
  /** Past/future cutoff (DEMO_TODAY) so absent vs not-yet-clocked is correct. */
  cutoffISO: string;
  isTh: boolean;
};

type Chip = { kind: ChipKind; label: string; sub?: string; testid: string };

const MAX_CHIPS = 3;

export function DayCell({
  schedule,
  attendance,
  otHours,
  isHoliday,
  cutoffISO,
  isTh,
}: DayCellProps) {
  const chips: Chip[] = [];

  // 1) Holiday — display precedence over Day Off / Shift.
  if (isHoliday) {
    chips.push({
      kind: 'holiday',
      label: isTh ? 'วันหยุด' : 'Holiday',
      testid: 'chip-holiday',
    });
  }

  // 2) Day Off (only when NOT a holiday — holiday already owns the cell intent).
  if (!isHoliday && schedule?.dayOff) {
    chips.push({
      kind: 'dayOff',
      label: isTh ? 'วันหยุดประจำ' : 'Day off',
      testid: 'chip-dayoff',
    });
  }

  // 3) Shift (planned) — only on a scheduled working day, hidden behind a holiday.
  if (!isHoliday && schedule && !schedule.dayOff && schedule.scheduledIn) {
    chips.push({
      kind: 'shift',
      label: isTh ? 'กะ' : 'Shift',
      sub: `${schedule.scheduledIn}–${schedule.scheduledOut}`,
      testid: 'chip-shift',
    });
  }

  // 4) Clock (actual) — classified sub-state from the attendance seed.
  if (attendance && !attendance.dayOff && attendance.scheduledIn) {
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

  // 5) OT — store-backed; only canonical seeded employees have rows.
  if (otHours && otHours > 0) {
    chips.push({
      kind: 'ot',
      label: `OT ${otHours}${isTh ? ' ชม.' : 'h'}`,
      testid: 'chip-ot',
    });
  }

  const visible = chips.slice(0, MAX_CHIPS);
  const overflow = chips.length - visible.length;

  return (
    <div
      data-testid="day-cell"
      className="flex min-h-[72px] flex-col gap-1.5 border-l border-hairline-soft px-2 py-2"
    >
      {visible.map((chip, i) => (
        <span
          key={`${chip.testid}-${i}`}
          data-testid={chip.testid}
          className={cn(
            'inline-flex flex-col rounded-[var(--radius-sm)] border px-2 py-1 text-left',
            'text-small font-medium leading-tight',
            CHIP_CLASS[chip.kind],
          )}
        >
          <span>{chip.label}</span>
          {chip.sub && (
            <span className="font-mono text-xs opacity-80">{chip.sub}</span>
          )}
        </span>
      ))}
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
