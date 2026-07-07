// STA-233 — Time Result tab: base-60 hours must render dotted (`X.XX`), never
// colon-separated (`X:XX`); base-10 stays `X.XX` too.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeResultTab } from '../TimeResultTab';

describe('TimeResultTab', () => {
  it('renders base-60 hour cells dotted, never colon-separated', () => {
    render(<TimeResultTab empId="EMP101" isTh={false} />);
    const table = screen.getByRole('table');

    // Header no longer implies a colon (was "HH:mm").
    expect(table.textContent).not.toContain('HH:mm');

    // Every populated hour cell (base-10 and base-60) reads as dotted X.XX.
    const hourCells = table.querySelectorAll('td.tabular-nums');
    const populated = Array.from(hourCells)
      .map((el) => el.textContent?.trim() ?? '')
      .filter((text) => /^-?\d+\.\d{2}$/.test(text) || /^-?\d+:\d{2}$/.test(text));
    expect(populated.length).toBeGreaterThan(0);
    for (const text of populated) {
      expect(text).toMatch(/^-?\d+\.\d{2}$/);
      expect(text).not.toMatch(/:/);
    }
  });

  it('renders the Total row net hours dotted', () => {
    render(<TimeResultTab empId="EMP101" isTh={false} />);
    const totalRow = screen.getByText('Total').closest('tr')!;
    expect(totalRow.textContent).toMatch(/\d+\.\d{2}/);
    expect(totalRow.textContent).not.toContain(':');
  });

  it('renders the Thai "ฐาน 60" header label', () => {
    render(<TimeResultTab empId="EMP101" isTh />);
    expect(screen.getByText('ฐาน 60')).toBeInTheDocument();
  });
});
