// STA-254 — Team Timesheet batch shift edit + non-shift de-emphasis.
//   • DayCell: shift chip stays primary (ring + full weight); non-shift chips are
//     de-emphasized (transparent border + smaller text). (item 9)
//   • DayCell: batch mode turns the shift chip into a selection checkbox; only the
//     shift chip is selectable — never leave / OT / day-off. (item 7)
//   • WeeklyTimesheetGrid: select-day / select-row affordances + override re-render.
//   • ShiftTimeEditModal: batch mode surfaces the per-contract computed end and
//     hands back the edited payload; single-edit path is unchanged.
//   • BatchShiftEditBar: empty selection disables the edit + clear actions.

import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../messages/th.json';
import { DayCell } from '../DayCell';
import {
  WeeklyTimesheetGrid,
  POSITION_FILTER_ALL,
  cellKey,
  type TimesheetRow,
  type ShiftCell,
} from '../WeeklyTimesheetGrid';
import { ShiftTimeEditModal } from '../ShiftTimeEditModal';
import { BatchShiftEditBar } from '../BatchShiftEditBar';
import { defaultWeekWindow, toIsoDate, DEMO_TODAY } from '@/lib/time/week';
import type { DaySchedule } from '@/lib/time/schedule-template';

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages}>
      {node}
    </NextIntlClientProvider>,
  );
}

// A 9h shift (08:00–17:00) with a 1h break, on a plain working day.
const SHIFT_9H: DaySchedule = {
  date: '2026-06-02',
  dayOff: false,
  scheduledIn: '08:00',
  scheduledOut: '17:00',
  breakStart: '12:00',
  breakEnd: '13:00',
} as DaySchedule;

describe('DayCell — item 9 non-shift de-emphasis', () => {
  it('shift chip keeps full weight (ring + text-small); OT chip is de-emphasized (transparent border + text-xs)', () => {
    wrap(
      <DayCell
        isoDate="2026-06-02"
        schedule={SHIFT_9H}
        attendance={undefined}
        otHours={2}
        isHoliday={false}
        cutoffISO={DEMO_TODAY}
        isTh
        onEditShift={() => {}}
      />,
    );
    const shift = screen.getByTestId('chip-shift');
    // The shift chip keeps the larger inherited size (never shrunk to text-xs)
    // and carries the standing accent-alt ring affordance.
    expect(shift.className).not.toContain('text-xs');
    expect(shift.className).toMatch(/ring-\[var\(--color-accent-alt\)\]/);

    const ot = screen.getByTestId('chip-ot');
    // The de-emphasized chip is smaller, borderless, and has no standing ring.
    expect(ot.className).toContain('text-xs');
    expect(ot.className).toContain('border-transparent');
    expect(ot.className).not.toMatch(/ring-\[var\(--color-accent-alt\)\]/);
  });

  it('day-off chip is de-emphasized (transparent border, smaller text)', () => {
    wrap(
      <DayCell
        isoDate="2026-06-02"
        schedule={{ ...SHIFT_9H, dayOff: true, scheduledIn: null, scheduledOut: null } as DaySchedule}
        attendance={undefined}
        otHours={undefined}
        isHoliday={false}
        cutoffISO={DEMO_TODAY}
        isTh
      />,
    );
    const off = screen.getByTestId('chip-dayoff');
    expect(off.className).toContain('border-transparent');
    expect(off.className).toContain('text-xs');
  });
});

describe('DayCell — single-edit path (unchanged)', () => {
  it('outside batch mode the shift chip is a button that opens the edit modal', () => {
    const onEdit = vi.fn();
    wrap(
      <DayCell
        isoDate="2026-06-02"
        schedule={SHIFT_9H}
        attendance={undefined}
        otHours={undefined}
        isHoliday={false}
        cutoffISO={DEMO_TODAY}
        isTh
        onEditShift={onEdit}
      />,
    );
    const shift = screen.getByTestId('chip-shift');
    expect(shift.tagName).toBe('BUTTON');
    expect(screen.queryByTestId('shift-select-checkbox')).toBeNull();
    fireEvent.click(shift);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe('DayCell — item 7 batch selection', () => {
  it('batch mode turns the shift chip into a selectable checkbox; toggling calls onToggleSelect', () => {
    const onToggle = vi.fn();
    wrap(
      <DayCell
        isoDate="2026-06-02"
        schedule={SHIFT_9H}
        attendance={undefined}
        otHours={2}
        isHoliday={false}
        cutoffISO={DEMO_TODAY}
        isTh
        batchMode
        selected={false}
        onToggleSelect={onToggle}
      />,
    );
    const checkbox = screen.getByTestId('shift-select-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledTimes(1);

    // Only the shift cell is selectable — the OT chip carries no checkbox.
    const ot = screen.getByTestId('chip-ot');
    expect(within(ot).queryByRole('checkbox')).toBeNull();
  });

  it('a selected shift chip shows the selected ring', () => {
    wrap(
      <DayCell
        isoDate="2026-06-02"
        schedule={SHIFT_9H}
        attendance={undefined}
        otHours={undefined}
        isHoliday={false}
        cutoffISO={DEMO_TODAY}
        isTh
        batchMode
        selected
        onToggleSelect={() => {}}
      />,
    );
    const shift = screen.getByTestId('chip-shift');
    expect(shift.className).toContain('ring-2');
    expect((screen.getByTestId('shift-select-checkbox') as HTMLInputElement).checked).toBe(true);
  });
});

describe('WeeklyTimesheetGrid — batch selection wiring', () => {
  // EMP-0301 is a canonical seeded employee with shifts in the default week.
  const EMP: TimesheetRow = {
    id: 'EMP-0301',
    name: 'พิมพ์ชนก ศรีวัฒน์',
    roleTh: 'พนักงานแคชเชียร์',
    roleEn: 'Cashier',
    department: 'Store',
  };
  const week = defaultWeekWindow();

  it('batch mode renders select-day + select-row affordances and toggles a shift cell', () => {
    const onToggleCell = vi.fn();
    wrap(
      <WeeklyTimesheetGrid
        rows={[EMP]}
        week={week}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="all"
        positionFilter={POSITION_FILTER_ALL}
        isTh
        batchMode
        selectedKeys={new Set()}
        onToggleCell={onToggleCell}
        onToggleDay={() => {}}
        onToggleRow={() => {}}
      />,
    );
    // A select-row checkbox exists for the employee.
    expect(screen.getByTestId('select-row')).toBeInTheDocument();
    // At least one select-day checkbox (a day column with shift cells).
    expect(screen.getAllByTestId('select-day').length).toBeGreaterThan(0);

    // Clicking a shift chip's checkbox reports the cell (with the empId).
    const checkbox = screen.getAllByTestId('shift-select-checkbox')[0];
    fireEvent.click(checkbox);
    expect(onToggleCell).toHaveBeenCalledTimes(1);
    expect(onToggleCell.mock.calls[0][0]).toMatchObject({ employeeId: 'EMP-0301' });
  });

  it('select-day only collects SHIFT cells (day-off / holiday cells never included)', () => {
    const onToggleDay = vi.fn();
    wrap(
      <WeeklyTimesheetGrid
        rows={[EMP]}
        week={week}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="all"
        positionFilter={POSITION_FILTER_ALL}
        isTh
        batchMode
        selectedKeys={new Set()}
        onToggleCell={() => {}}
        onToggleDay={onToggleDay}
        onToggleRow={() => {}}
      />,
    );
    fireEvent.click(screen.getAllByTestId('select-day')[0]);
    const cells: ShiftCell[] = onToggleDay.mock.calls[0][0];
    expect(cells.length).toBeGreaterThan(0);
    // Every reported cell is a real shift (has both scheduled in + out).
    for (const c of cells) {
      expect(c.scheduledIn).toBeTruthy();
      expect(c.scheduledOut).toBeTruthy();
    }
  });

  it('a shiftOverride re-renders the cell with its new times (mock apply visible)', () => {
    const week0 = defaultWeekWindow();
    const monday = toIsoDate(week0.days[0]);
    const key = cellKey({ employeeId: 'EMP-0301', date: monday });
    wrap(
      <WeeklyTimesheetGrid
        rows={[EMP]}
        week={week0}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="all"
        positionFilter={POSITION_FILTER_ALL}
        isTh
        shiftOverrides={
          new Map([
            [key, { scheduledIn: '09:00', scheduledOut: '18:00', breakStart: '13:00', breakEnd: '14:00' }],
          ])
        }
      />,
    );
    // The overridden Monday shift renders 09:00–18:00 somewhere in the grid.
    const subs = screen.getAllByTestId('chip-shift');
    const texts = subs.map((el) => el.textContent ?? '');
    expect(texts.some((t) => t.includes('09:00–18:00'))).toBe(true);
  });
});

describe('ShiftTimeEditModal — batch mode (mixed contracts)', () => {
  const CELLS: ShiftCell[] = [
    {
      employeeId: 'EMP-A',
      employeeName: 'A',
      date: '2026-06-02',
      scheduledIn: '08:00',
      scheduledOut: '17:00', // 9h
      breakStart: '12:00',
      breakEnd: '13:00',
    },
    {
      employeeId: 'EMP-B',
      employeeName: 'B',
      date: '2026-06-02',
      scheduledIn: '08:00',
      scheduledOut: '16:00', // 8h
      breakStart: '12:00',
      breakEnd: '13:00',
    },
  ];

  it('shows the computed end for each unique contract span (17:00 for 9h, 16:00 for 8h)', () => {
    wrap(
      <ShiftTimeEditModal open batch cells={CELLS} isTh onClose={() => {}} onSave={() => {}} />,
    );
    const end = screen.getByTestId('shift-end-value');
    expect(end.textContent).toContain('17:00');
    expect(end.textContent).toContain('16:00');
    expect(screen.getByTestId('batch-modal-summary').textContent).toContain('2');
  });

  it('save hands back the edited start + break payload', () => {
    const onSave = vi.fn();
    wrap(
      <ShiftTimeEditModal open batch cells={CELLS} isTh onClose={() => {}} onSave={onSave} />,
    );
    fireEvent.change(screen.getByTestId('shift-start-input'), { target: { value: '09:00' } });
    fireEvent.click(screen.getByTestId('shift-time-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ start: '09:00' });
  });

  it('single mode still shows one end value and no batch summary', () => {
    wrap(
      <ShiftTimeEditModal
        open
        employeeName="A"
        date="2026-06-02"
        scheduledIn="08:00"
        scheduledOut="17:00"
        breakStart="12:00"
        breakEnd="13:00"
        isTh
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.queryByTestId('batch-modal-summary')).toBeNull();
    expect(screen.getByTestId('shift-end-value').textContent).toContain('17:00');
  });
});

describe('BatchShiftEditBar', () => {
  it('empty selection disables Edit selected + Clear', () => {
    wrap(
      <BatchShiftEditBar count={0} isTh onEditSelected={() => {}} onClear={() => {}} onExit={() => {}} />,
    );
    expect(screen.getByTestId('batch-edit-selected')).toBeDisabled();
    expect(screen.getByTestId('batch-clear')).toBeDisabled();
  });

  it('with a selection the actions are enabled and fire their handlers', () => {
    const onEdit = vi.fn();
    const onExit = vi.fn();
    wrap(
      <BatchShiftEditBar count={3} isTh onEditSelected={onEdit} onClear={() => {}} onExit={onExit} />,
    );
    const edit = screen.getByTestId('batch-edit-selected');
    expect(edit).not.toBeDisabled();
    expect(screen.getByTestId('batch-selected-count').textContent).toContain('3');
    fireEvent.click(edit);
    fireEvent.click(screen.getByTestId('batch-exit'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
