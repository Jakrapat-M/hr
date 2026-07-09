/**
 * STA-195 — My Timesheet 5-tab render test. Switches all 5 tabs, toggles a Summary
 * filter chip, and opens the Clock Log map modal. jsdom returns a null 2D canvas
 * context, so drawMap is a no-op here — the modal must still open without throwing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../../../messages/th.json';

import TimesheetPage from '../page';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
}));

function renderTh() {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages}>
      <TimesheetPage />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({
    userId: 'EMP101',
    username: 'ทดสอบ พนักงาน',
    email: 'test@example.com',
    roles: ['employee'],
    isAuthenticated: true,
  });
});

describe('STA-195 My Timesheet tabs', () => {
  // gps/messages tabs carry a noti-badge whose count is appended to the tab's
  // accessible name, so match those two by regex.
  const TAB_NAMES = [/^ตารางกะ$/, /^สรุป$/, /^ผลเวลา$/, /บันทึกการลงเวลา/, /ข้อความ/];

  it('renders the 5 tabs with Schedule as default', () => {
    renderTh();
    for (const name of TAB_NAMES) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('tab', { name: /^ตารางกะ$/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches through every tab without throwing', () => {
    renderTh();
    for (const name of [/^สรุป$/, /^ผลเวลา$/, /บันทึกการลงเวลา/, /ข้อความ/, /^ตารางกะ$/]) {
      fireEvent.click(screen.getByRole('tab', { name }));
      expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
    }
  });

  it('toggles a Summary filter chip', () => {
    renderTh();
    fireEvent.click(screen.getByRole('tab', { name: 'สรุป' }));
    const chip = screen.getByRole('button', { name: 'มีสาย/ขาด' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens the Clock Log map modal', () => {
    renderTh();
    fireEvent.click(screen.getByRole('tab', { name: /บันทึกการลงเวลา/ }));
    const mapButtons = screen.getAllByRole('button', { name: /ดูแผนที่/ });
    expect(mapButtons.length).toBeGreaterThan(0);
    fireEvent.click(mapButtons[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
