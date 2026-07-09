// STA-235 Draft 2 — weekly Team Timesheet leave overlay + filter tests.
//   • getLeaveForPeriod seeds a read-only leave with an hour range in the demo week
//   • clockFilter='leave' keeps rows that HAVE leave and drops rows that don't
//   • the leave chip renders its hour range (read-only, no edit affordance)

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../messages/th.json';
import { WeeklyTimesheetGrid, type TimesheetRow } from '../WeeklyTimesheetGrid';
import { defaultWeekWindow } from '@/lib/time/week';
import { DEMO_TODAY } from '@/lib/time/period';
import { getLeaveForPeriod } from '@/lib/time/leave-seed';

const LEAVE_ROW: TimesheetRow = {
  id: 'EMP-0301',
  name: 'พิมพ์ชนก ศรีวัฒน์',
  roleTh: 'พนักงานหน้าร้าน',
  roleEn: 'Store associate',
  department: 'Store',
};

const NO_LEAVE_ROW: TimesheetRow = {
  id: 'EMP-9999',
  name: 'ทดสอบ ไม่มีลา',
  roleTh: 'พนักงาน',
  roleEn: 'Staff',
  department: 'Store',
};

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe('getLeaveForPeriod', () => {
  it('seeds a read-only leave with an hour range in the demo week for EMP-0301', () => {
    const leave = getLeaveForPeriod('EMP-0301');
    expect(leave.length).toBeGreaterThanOrEqual(1);
    const sick = leave.find((l) => l.date === '2026-06-04');
    expect(sick).toBeDefined();
    expect(sick?.startTime).toBe('10:00');
    expect(sick?.endTime).toBe('14:00');
  });

  it('returns no leave for an employee with none seeded', () => {
    expect(getLeaveForPeriod('EMP-9999')).toEqual([]);
  });
});

describe('WeeklyTimesheetGrid — leave filter', () => {
  it("clockFilter='leave' keeps a row that has leave and shows its hour range", () => {
    wrap(
      <WeeklyTimesheetGrid
        rows={[LEAVE_ROW]}
        week={defaultWeekWindow()}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="leave"
        isTh
      />,
    );
    expect(screen.getByTestId('employee-link')).toBeInTheDocument();
    const chips = screen.getAllByTestId('chip-leave');
    expect(chips.length).toBeGreaterThanOrEqual(1);
    // The chip renders the leave block hour range.
    expect(screen.getByText('10:00–14:00')).toBeInTheDocument();
    // Read-only: the leave chip is not a button.
    chips.forEach((c) => expect(c.tagName).not.toBe('BUTTON'));
  });

  it("clockFilter='leave' drops a row with no leave", () => {
    wrap(
      <WeeklyTimesheetGrid
        rows={[NO_LEAVE_ROW]}
        week={defaultWeekWindow()}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="leave"
        isTh
      />,
    );
    expect(screen.queryByTestId('employee-link')).toBeNull();
  });

  it("clockFilter='all' keeps rows regardless of leave", () => {
    wrap(
      <WeeklyTimesheetGrid
        rows={[NO_LEAVE_ROW]}
        week={defaultWeekWindow()}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="all"
        isTh
      />,
    );
    expect(screen.getByTestId('employee-link')).toBeInTheDocument();
  });
});
