// TeamOverviewShortcuts.test.tsx — STA-249 (Team Overview shortcuts).
//
// Verifies the four shortcut groupings render with their exact items, that
// linked items are locale-preserving anchors to real routes, that the sole
// missing-route item (Holiday Assign) degrades to a disabled "Coming soon" chip
// (never a dead link, never a ticket number), and that the quick-jump buttons
// render one per grouping.

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../../messages/en.json';
import { TeamOverviewShortcuts } from '../TeamOverviewShortcuts';

function renderShortcuts(locale: 'en' | 'th' = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={enMessages}>
      <TeamOverviewShortcuts />
    </NextIntlClientProvider>,
  );
}

const LINKED_ITEMS: Array<[string, string, string]> = [
  ['team-requests', 'Team Requests', '/en/quick-approve'],
  ['team-timesheet', 'Team Timesheet', '/en/roster'],
  ['leave-request', 'Leave Request', '/en/timeoff'],
  ['ot-plan', 'OT Plan', '/en/overtime'],
  ['time-correction', 'Time Correction', '/en/time/corrections'],
  ['shift-assignments', 'Shift Assignments', '/en/team/shift-assign'],
  ['work-schedule', 'Work Schedule', '/en/time/shift-schedule'],
  ['report', 'Report', '/en/reports'],
];

describe('TeamOverviewShortcuts — groupings + items', () => {
  it('renders the four groupings', () => {
    renderShortcuts();
    for (const key of ['dashboard', 'submit-on-behalf', 'schedule', 'reports']) {
      expect(screen.getByTestId(`shortcut-group-${key}`)).toBeInTheDocument();
    }
  });

  it('renders every linked item as a locale-preserving anchor to its real route', () => {
    renderShortcuts('en');
    for (const [id, label, href] of LINKED_ITEMS) {
      const el = screen.getByTestId(`shortcut-item-${id}`);
      expect(el.tagName).toBe('A');
      expect(el).toHaveAttribute('href', href);
      expect(el).toHaveTextContent(label);
    }
  });

  it('degrades the missing-route item (Holiday Assign) to a disabled Coming soon chip', () => {
    renderShortcuts('en');
    const el = screen.getByTestId('shortcut-item-holiday-assign');
    // Not a link — a disabled chip.
    expect(el.tagName).not.toBe('A');
    expect(el).toHaveAttribute('aria-disabled', 'true');
    expect(el).toHaveTextContent('Coming soon');
    expect(el).toHaveTextContent('Holiday Assign');
  });
});

describe('TeamOverviewShortcuts — quick-jump', () => {
  it('renders one quick-jump button per grouping', () => {
    renderShortcuts();
    const nav = screen.getByTestId('shortcut-quickjump');
    for (const key of ['dashboard', 'submit-on-behalf', 'schedule', 'reports']) {
      expect(within(nav).getByTestId(`quickjump-${key}`)).toBeInTheDocument();
    }
  });
});

describe('TeamOverviewShortcuts — locale preservation', () => {
  it('prefixes item hrefs with the active locale (th)', () => {
    renderShortcuts('th');
    expect(screen.getByTestId('shortcut-item-team-requests')).toHaveAttribute(
      'href',
      '/th/quick-approve',
    );
  });
});
