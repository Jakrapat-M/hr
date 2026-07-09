// WeeklyTimesheetGrid — STA-252 N2 position (ตำแหน่ง) filter tests.
//   • positionFilter narrows rows to the matching positionKey (roleTh)
//   • POSITION_FILTER_ALL (default) keeps every row
//   • composes with clockFilter (AND semantics)

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../messages/th.json';
import {
  WeeklyTimesheetGrid,
  POSITION_FILTER_ALL,
  positionKey,
  type TimesheetRow,
} from '../WeeklyTimesheetGrid';
import { defaultWeekWindow } from '@/lib/time/week';
import { DEMO_TODAY } from '@/lib/time/period';

const CASHIER: TimesheetRow = {
  id: 'EMP-0301',
  name: 'พิมพ์ชนก ศรีวัฒน์',
  roleTh: 'พนักงานแคชเชียร์',
  roleEn: 'Cashier',
  department: 'Store',
};

const STOCK: TimesheetRow = {
  id: 'EMP-9999',
  name: 'ทดสอบ สต๊อก',
  roleTh: 'พนักงานคลังสินค้า',
  roleEn: 'Stock associate',
  department: 'Store',
};

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe('WeeklyTimesheetGrid — position filter', () => {
  it('POSITION_FILTER_ALL (default) keeps every row', () => {
    wrap(
      <WeeklyTimesheetGrid
        rows={[CASHIER, STOCK]}
        week={defaultWeekWindow()}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="all"
        positionFilter={POSITION_FILTER_ALL}
        isTh
      />,
    );
    expect(screen.getAllByTestId('employee-link')).toHaveLength(2);
  });

  it('filtering by a positionKey keeps only the matching row', () => {
    wrap(
      <WeeklyTimesheetGrid
        rows={[CASHIER, STOCK]}
        week={defaultWeekWindow()}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="all"
        positionFilter={positionKey(CASHIER)}
        isTh
      />,
    );
    const links = screen.getAllByTestId('employee-link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent(CASHIER.name);
  });

  it('is locale-independent — filtering by roleTh key still matches when rendering EN labels', () => {
    wrap(
      <WeeklyTimesheetGrid
        rows={[CASHIER, STOCK]}
        week={defaultWeekWindow()}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="all"
        positionFilter={positionKey(STOCK)}
        isTh={false}
      />,
    );
    const links = screen.getAllByTestId('employee-link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent(STOCK.name);
  });

  it('composes with clockFilter — a position match with no leave is dropped under clockFilter="leave"', () => {
    // STOCK (EMP-9999) has no seeded leave (see timesheet-leave-filter.test.tsx),
    // so a position match alone must not be enough to keep it under 'leave'.
    wrap(
      <WeeklyTimesheetGrid
        rows={[STOCK]}
        week={defaultWeekWindow()}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="leave"
        positionFilter={positionKey(STOCK)}
        isTh
      />,
    );
    expect(screen.queryByTestId('employee-link')).toBeNull();
  });

  it('an unmatched position key drops all rows', () => {
    wrap(
      <WeeklyTimesheetGrid
        rows={[CASHIER, STOCK]}
        week={defaultWeekWindow()}
        otRequests={[]}
        cutoffISO={DEMO_TODAY}
        clockFilter="all"
        positionFilter="ไม่มีตำแหน่งนี้"
        isTh
      />,
    );
    expect(screen.queryByTestId('employee-link')).toBeNull();
  });
});
