// TeamOverviewDashboard.test.tsx — STA-245 + STA-249 (Team Overview dashboard).
//
// Renders the dashboard against the seeded time-domain data for the pinned demo
// period. Uses the empIds override to pin a deterministic single-employee cohort
// (EMP-0301) and seeds its two 06-01 holiday OT rows into the store. Verifies the
// 5 KPI cards render seed-derived values for the DEFAULT current pay period, the
// period DROPDOWN re-aggregates, the expandable detail layer reveals per-employee
// granular rows, and an empty cohort falls back to the EmptyState.

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

describe('TeamOverviewDashboard — KPI cards from seeds (default = current period)', () => {
  it('defaults to the current pay period and renders seed-derived attendance values', () => {
    renderDashboard(['EMP-0301']);
    // Default selection is the current pay period (21 May → 20 Jun 2026).
    expect(screen.getByTestId('period-range')).toHaveTextContent('21 May–20 Jun 2026');
    expect(within(screen.getByTestId('kpi-on-time-rate')).getByText('87%')).toBeInTheDocument();
    // Late scans = 2, absences/missed = 0 across the current period.
    expect(within(screen.getByTestId('kpi-late-scans')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-absences')).getByText('0')).toBeInTheDocument();
  });

  it('renders the OT card compact; expanding it reveals the X3 holiday bucket = 6h', () => {
    renderDashboard(['EMP-0301']);
    const otCard = screen.getByTestId('kpi-ot-hours');
    expect(within(otCard).getByText('6 h')).toBeInTheDocument();
    // STA-255 compact-first: multiplier chips only appear once the card expands.
    expect(screen.queryByTestId('ot-mult-x3')).not.toBeInTheDocument();
    fireEvent.click(within(otCard).getByRole('button'));
    expect(within(screen.getByTestId('ot-mult-x3')).getByText('6h')).toBeInTheDocument();
  });

  it('shows the holiday premium note inside the expanded period card', () => {
    renderDashboard(['EMP-0301']);
    const periodCard = screen.getByTestId('kpi-current-period');
    fireEvent.click(within(periodCard).getByRole('button'));
    expect(screen.getByText('Holiday premium ×3')).toBeInTheDocument();
  });
});

describe('TeamOverviewDashboard — period dropdown (STA-255 Safari-proof CustomSelect)', () => {
  it('offers 16 bounded pay-period options (−1yr … +3mo), current period default, via a custom listbox (no native select)', () => {
    const { container } = renderDashboard(['EMP-0301']);
    // Safari fix: no native <select> anywhere — the dropdown is a div/button listbox.
    expect(container.querySelector('select')).toBeNull();
    const trigger = screen.getByRole('button', { name: 'Select period' });
    expect(trigger.textContent).toContain('21 May–20 Jun 2026');
    expect(trigger.textContent).toContain('Current');
    fireEvent.click(trigger);
    const opts = screen.getAllByRole('option');
    expect(opts).toHaveLength(16);
    expect(opts[0].textContent).toContain('21 May–20 Jun 2025'); // one year back
    expect(opts[15].textContent).toContain('21 Aug–20 Sep 2026'); // +3 months ahead
  });

  it('re-aggregates when a different period is selected (previous period drops OT to 0)', () => {
    renderDashboard(['EMP-0301']);
    fireEvent.click(screen.getByRole('button', { name: 'Select period' }));
    fireEvent.click(screen.getByRole('option', { name: /21 Apr–20 May 2026/ }));
    expect(screen.getByTestId('period-range')).toHaveTextContent('21 Apr–20 May 2026');
    expect(within(screen.getByTestId('kpi-ot-hours')).getByText('0 h')).toBeInTheDocument();
  });
});

describe('TeamOverviewDashboard — STA-255 isolated per-card expansion', () => {
  it('cards start compact; clicking one expands ONLY that card, and it collapses back', () => {
    renderDashboard(['EMP-0301']);
    // Compact by default — no per-employee detail anywhere.
    expect(screen.queryByTestId('detail-late')).not.toBeInTheDocument();
    expect(screen.queryByTestId('detail-ot')).not.toBeInTheDocument();

    // Expand the late-scans card → its detail appears, others stay compact.
    const lateToggle = within(screen.getByTestId('kpi-late-scans')).getByRole('button');
    fireEvent.click(lateToggle);
    expect(lateToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('detail-late')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-ot')).not.toBeInTheDocument();

    // Expanding the OT card closes the late card (isolated accordion).
    const otToggle = within(screen.getByTestId('kpi-ot-hours')).getByRole('button');
    fireEvent.click(otToggle);
    expect(within(screen.getByTestId('detail-ot')).getByText('6 h')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-late')).not.toBeInTheDocument();
    expect(lateToggle).toHaveAttribute('aria-expanded', 'false');

    // Clicking the open card again collapses it.
    fireEvent.click(otToggle);
    expect(screen.queryByTestId('detail-ot')).not.toBeInTheDocument();
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
