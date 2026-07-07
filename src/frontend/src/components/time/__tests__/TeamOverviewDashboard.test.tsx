// TeamOverviewDashboard.test.tsx — STA-245 (Team Overview dashboard).
//
// Renders the dashboard against the seeded time-domain data for the pinned demo
// week. Uses the empIds override to pin a deterministic single-employee cohort
// (EMP-0301) and seeds its two 06-01 holiday OT rows into the store. Verifies the
// 5 KPI cards render seed-derived values, the period switcher re-aggregates, and
// an empty cohort falls back to the EmptyState.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Star } from 'lucide-react';
import enMessages from '../../../../messages/en.json';
import {
  TeamOverviewDashboard,
  DEFAULT_TEAM_OVERVIEW_CARDS,
  type TeamOverviewCard,
} from '../TeamOverviewDashboard';
import { useOvertimeRequests, type OTRequest } from '@/stores/overtime-requests';

const OT_ROWS: OTRequest[] = [
  {
    id: 'OT-TEST-0001',
    employeeId: 'EMP-0301',
    employeeName: 'พิมพ์ชนก ศรีวัฒน์',
    department: 'Store',
    otType: 'OT',
    startAt: '2026-06-01T18:00:00',
    endAt: '2026-06-01T21:00:00',
    hours: 3,
    reason: 'ปิดยอดขาย',
    docs: [],
    status: 'pending',
    submittedAt: '2026-06-06T08:00:00+07:00',
    audit: [],
  },
  {
    id: 'OT-TEST-0002',
    employeeId: 'EMP-0301',
    employeeName: 'พิมพ์ชนก ศรีวัฒน์',
    department: 'Store',
    otType: 'OT',
    startAt: '2026-06-01T23:00:00',
    endAt: '2026-06-02T02:00:00',
    hours: 3,
    reason: 'ตรวจนับสต็อก',
    docs: [],
    status: 'pending',
    submittedAt: '2026-06-06T09:00:00+07:00',
    audit: [],
  },
];

function renderDashboard(empIds?: string[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <TeamOverviewDashboard empIds={empIds} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useOvertimeRequests.getState().clear();
  useOvertimeRequests.getState().seedFromQueue(OT_ROWS);
});

describe('TeamOverviewDashboard — KPI cards from seeds', () => {
  it('renders the 5 summary cards with seed-derived attendance values', () => {
    renderDashboard(['EMP-0301']);
    expect(within(screen.getByTestId('kpi-on-time-rate')).getByText('83%')).toBeInTheDocument();
    // Late scans = 1, absences/missed = 0 for the pinned week.
    expect(within(screen.getByTestId('kpi-late-scans')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-absences')).getByText('0')).toBeInTheDocument();
  });

  it('renders the OT card with the X3 holiday bucket = 6h', () => {
    renderDashboard(['EMP-0301']);
    expect(within(screen.getByTestId('kpi-ot-hours')).getByText('6 h')).toBeInTheDocument();
    expect(within(screen.getByTestId('ot-mult-x3')).getByText('6h')).toBeInTheDocument();
  });

  it('shows the holiday premium note when the period has public holidays', () => {
    renderDashboard(['EMP-0301']);
    expect(screen.getByText('Holiday premium ×3')).toBeInTheDocument();
  });
});

describe('TeamOverviewDashboard — period switch re-aggregates', () => {
  it('switching to last week (no holidays, no OT) drops OT to 0 and hides the premium note', () => {
    renderDashboard(['EMP-0301']);
    fireEvent.click(screen.getByTestId('period-last-week'));
    expect(within(screen.getByTestId('kpi-ot-hours')).getByText('0 h')).toBeInTheDocument();
    expect(screen.queryByText('Holiday premium ×3')).not.toBeInTheDocument();
    expect(screen.getByTestId('period-last-week')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('TeamOverviewDashboard — empty cohort', () => {
  it('renders the EmptyState when the team has no members', () => {
    renderDashboard([]);
    expect(screen.getByText('No team members yet')).toBeInTheDocument();
    expect(screen.queryByTestId('team-overview-dashboard')).not.toBeInTheDocument();
  });
});

describe('TeamOverviewDashboard — extendable card registry', () => {
  it('renders one additional card when the registry is extended with a dummy config, with no other changes needed', () => {
    const dummyCard: TeamOverviewCard = {
      id: 'dummy-metric',
      testid: 'kpi-dummy-metric',
      icon: Star,
      tone: 'accent',
      label: () => 'Dummy metric',
      value: () => '42',
      sub: () => 'a future KPI, added with zero layout changes',
    };
    const extendedCards = [...DEFAULT_TEAM_OVERVIEW_CARDS, dummyCard];

    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TeamOverviewDashboard empIds={['EMP-0301']} cards={extendedCards} />
      </NextIntlClientProvider>,
    );

    // The 5 original cards are unaffected...
    expect(screen.getByTestId('kpi-on-time-rate')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-current-period')).toBeInTheDocument();
    // ...and the appended card renders alongside them, with its own content.
    expect(within(screen.getByTestId('kpi-dummy-metric')).getByText('Dummy metric')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-dummy-metric')).getByText('42')).toBeInTheDocument();
  });
});
