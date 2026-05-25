// RosterGantt tests — aligned to roster-ref-2026-05-25.png:
//   AC1.1 rows × 24 hour cols, >=1 shift/employee
//   AC1.2 falsifiable token scan (NO red/rose/pink class, NO inline hex);
//         each shift type carries its mapped token class
//   TOTAL column present; shift cell shows TIME-RANGE + DURATION, NOT type name
//   NOW line present; break stripe rendered for shifts with a break window
//   AC1.8 night cell uses light canvas-soft text, NOT text-ink

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../messages/th.json';
import enMessages from '../../../../messages/en.json';
import { RosterGantt, SHIFT_TYPE_CLASS } from '../RosterGantt';
import {
  ROSTER_ROWS,
  ROSTER_HOURS,
  SHIFT_TYPE_LABELS,
} from '@/data/roster/mock';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/th/roster',
}));

function renderGantt(locale: 'th' | 'en' = 'th') {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'th' ? thMessages : enMessages}
    >
      <RosterGantt rows={ROSTER_ROWS} />
    </NextIntlClientProvider>,
  );
}

// Forbidden patterns — the falsifiable scan (AC1.2 / AC1.8). Pumpkin = danger
// token, NOT a Tailwind red/rose/pink class, so it must pass.
const RED_CLASS = /(^|\s)(bg|text|border)-(red|rose|pink)-\d/;
const HEX = /#([0-9a-fA-F]{3,8})\b/;

describe('RosterGantt — AC1.1 grid + shifts', () => {
  it('renders all employee rows', () => {
    renderGantt();
    expect(screen.getAllByTestId('roster-row')).toHaveLength(ROSTER_ROWS.length);
  });

  it('renders 24 hour columns labeled 01..24', () => {
    renderGantt();
    const cols = screen.getAllByTestId('hour-col');
    expect(cols).toHaveLength(ROSTER_HOURS);
    expect(cols[0]).toHaveTextContent('01');
    expect(cols[ROSTER_HOURS - 1]).toHaveTextContent('24');
  });

  it('renders a shift cell for every shift in the mock', () => {
    renderGantt();
    const cells = screen.getAllByTestId('shift-cell');
    const totalShifts = ROSTER_ROWS.reduce((n, r) => n + r.shifts.length, 0);
    expect(cells.length).toBe(totalShifts);
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });
});

describe('RosterGantt — TOTAL column', () => {
  it('renders a TOTAL cell per row showing hours', () => {
    renderGantt();
    const totals = screen.getAllByTestId('total-cell');
    expect(totals).toHaveLength(ROSTER_ROWS.length);
    totals.forEach((t) => expect(t.textContent).toMatch(/\d+\.\d+h/));
  });

  it('marks under-target totals in pumpkin (text-danger), on-target in ink', () => {
    renderGantt();
    const totals = screen.getAllByTestId('total-cell');
    const underCells = totals.filter((t) => t.getAttribute('data-under') === 'true');
    // Mali (8h) and Krit (7h) are under their 9h target in the ref mock
    expect(underCells.length).toBeGreaterThan(0);
    underCells.forEach((t) => expect(t.className).toContain('text-danger'));
  });
});

describe('RosterGantt — shift cell shows time-range + duration, not type name', () => {
  it('shows the time range and duration', () => {
    renderGantt();
    // Somchai 07:00–16:00 9.0h
    expect(screen.getByText('07:00 – 16:00')).toBeInTheDocument();
    const cell = screen.getByText('07:00 – 16:00').closest('[data-testid="shift-cell"]')!;
    expect(cell.textContent).toContain('9.0h');
  });

  it('does NOT render the shift-type name text inside cells', () => {
    renderGantt();
    const cells = screen.getAllByTestId('shift-cell');
    const allTypeNames = Object.values(SHIFT_TYPE_LABELS).flatMap((l) => [l.th, l.en]);
    cells.forEach((c) => {
      allTypeNames.forEach((name) => {
        expect(c.textContent).not.toContain(name);
      });
    });
  });
});

describe('RosterGantt — NOW line + break stripe', () => {
  it('renders the NOW line marker', () => {
    renderGantt();
    const now = screen.getByTestId('now-line');
    expect(now).toBeInTheDocument();
    expect(now.className).toContain('bg-danger');
  });

  it('renders a break stripe for shifts that have a break window', () => {
    renderGantt();
    const stripes = screen.getAllByTestId('break-stripe');
    const withBreak = ROSTER_ROWS.flatMap((r) => r.shifts).filter(
      (s) => s.breakStart != null && s.breakEnd != null,
    );
    expect(stripes.length).toBe(withBreak.length);
    expect(stripes.length).toBeGreaterThan(0);
  });
});

describe('RosterGantt — AC1.2 token scan (falsifiable)', () => {
  it('no descendant uses a Tailwind red/rose/pink color class', () => {
    const { container } = renderGantt();
    container.querySelectorAll('*').forEach((el) => {
      expect(el.className.toString()).not.toMatch(RED_CLASS);
    });
  });

  it('no descendant uses an inline hex color', () => {
    const { container } = renderGantt();
    container.querySelectorAll('*').forEach((el) => {
      const style = el.getAttribute('style') || '';
      expect(style).not.toMatch(HEX);
    });
  });

  it('each shift type carries its mapped token class', () => {
    renderGantt();
    (Object.keys(SHIFT_TYPE_CLASS) as Array<keyof typeof SHIFT_TYPE_CLASS>).forEach(
      (type) => {
        const cells = screen
          .getAllByTestId('shift-cell')
          .filter((c) => c.getAttribute('data-shift-type') === type);
        expect(cells.length).toBeGreaterThan(0);
        cells.forEach((c) => {
          SHIFT_TYPE_CLASS[type].split(/\s+/).forEach((cls) => {
            expect(c.className).toContain(cls);
          });
        });
      },
    );
  });
});

describe('RosterGantt — AC1.8 night cell text token', () => {
  it('night cells use light canvas-soft text and NOT text-ink', () => {
    renderGantt();
    const nightCells = screen
      .getAllByTestId('shift-cell')
      .filter((c) => c.getAttribute('data-shift-type') === 'night');
    expect(nightCells.length).toBeGreaterThan(0);
    nightCells.forEach((c) => {
      expect(c.className).toContain('text-[var(--color-canvas-soft)]');
      // must NOT carry the dark ink text token (would be invisible on navy)
      expect(c.className).not.toMatch(/(^|\s)text-ink(\s|$)/);
    });
  });
});
