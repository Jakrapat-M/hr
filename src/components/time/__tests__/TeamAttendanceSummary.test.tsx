/**
 * STA-248 — TeamAttendanceSummary, extracted from the home dashboard onto the
 * /time hub. Locks the legend copy + counts sourced from HUMI_TODAY_PRESENCE.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../messages/th.json';
import { TeamAttendanceSummary } from '../TeamAttendanceSummary';

function renderCard() {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages as Record<string, unknown>}>
      <TeamAttendanceSummary />
    </NextIntlClientProvider>,
  );
}

describe('TeamAttendanceSummary (STA-248)', () => {
  it('renders the Present / On leave / Off-shift legend with counts', () => {
    renderCard();
    expect(screen.getByText('เข้างานแล้ว')).toBeInTheDocument();
    expect(screen.getByText('ลางาน')).toBeInTheDocument();
    expect(screen.getByText('นอกกะ/ประชุม')).toBeInTheDocument();
    // workingCount (ring) and present (legend) are both 1,147 → two matches.
    expect(screen.getAllByText('1,147')).toHaveLength(2);
    expect(screen.getByText('46')).toBeInTheDocument();
    expect(screen.getByText('91')).toBeInTheDocument();
  });

  it('renders the Live tag and title', () => {
    renderCard();
    expect(screen.getByText('สด')).toBeInTheDocument();
    expect(screen.getByText('ทีมพร้อมทำงาน')).toBeInTheDocument();
  });
});
