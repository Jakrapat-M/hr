/**
 * STA-239 — My Timesheet Summary Draft-2 rebuild:
 *   • period selector dropdown (−12 … +3 cycles, current pre-selected)
 *   • column renames: สาย (was สายตามสถิติ) · ขาด (was สายแบบหักเงิน) + โอที · ลา
 *   • hour cells in decimal X.XX (never X:XX)
 *   • expandable multi-punch row (chevron → in/out pair list)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../../../messages/th.json';

import TimesheetPage from '../page';
import { useAuthStore } from '@/stores/auth-store';
import { getAttendanceForPeriod } from '@/lib/time/attendance-seed';

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

function openSummary() {
  fireEvent.click(screen.getByRole('tab', { name: 'สรุป' }));
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

describe('STA-239 Summary Draft-2', () => {
  it('renders the renamed column set (สาย · ขาด · โอที · ลา, no combined สาย/ขาด header)', () => {
    renderTh();
    openSummary();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(
      expect.arrayContaining(['วันที่', 'กะเข้า', 'กะออก', 'บันทึกเข้า', 'บันทึกออก', 'ชั่วโมงงาน', 'สาย', 'ขาด', 'โอที', 'ลา']),
    );
    expect(headers).not.toContain('สาย/ขาด');
    expect(headers).not.toContain('สายตามสถิติ');
    expect(headers).not.toContain('สายแบบหักเงิน');
  });

  it('hour figures render as decimal X.XX ชม. (never H:MM) in สาย/ขาด pills', () => {
    // EMP001's seed carries BOTH late patterns: 12 min (→ สาย) and 23 min (→ ขาด).
    useAuthStore.setState({ userId: 'EMP001', email: null });
    renderTh();
    openSummary();
    expect(screen.getAllByText(/^0\.20 ชม\.$/).length).toBeGreaterThan(0); // 12 min → สาย (statistical)
    expect(screen.getAllByText(/^0\.38 ชม\.$/).length).toBeGreaterThan(0); // 23 min → ขาด (deducted)
  });

  it('the seeded multi-punch day expands to list each in/out pair', () => {
    renderTh();
    openSummary();
    const multiDay = getAttendanceForPeriod('EMP101').find((d) => (d.punchPairs?.length ?? 0) > 1);
    expect(multiDay).toBeDefined();
    const toggle = screen.getByTestId(`expand-${multiDay!.date}`);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    const detail = screen.getByTestId(`punches-${multiDay!.date}`);
    expect(within(detail).getAllByText('เข้า')).toHaveLength(2);
    expect(within(detail).getAllByText('ออก')).toHaveLength(2);
    fireEvent.click(toggle);
    expect(screen.queryByTestId(`punches-${multiDay!.date}`)).toBeNull();
  });

  it('period selector lists 16 cycles (−12 … +3) with the current one selected', () => {
    renderTh();
    const trigger = screen.getByRole('button', { name: 'เลือกกะ/รอบเวลา' });
    // Current demo period 21 พ.ค. – 20 มิ.ย. 2569 shows as the selected label.
    expect(trigger.textContent).toContain('21 พ.ค. – 20 มิ.ย. 2569');
    fireEvent.click(trigger);
    expect(screen.getAllByRole('option')).toHaveLength(16);
  });

  it('selecting a past period empties the summary table (no seeded data outside the demo period)', () => {
    renderTh();
    openSummary();
    const trigger = screen.getByRole('button', { name: 'เลือกกะ/รอบเวลา' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getAllByRole('option')[0]); // oldest cycle
    expect(screen.getByText('ไม่มีข้อมูลในรอบนี้')).toBeInTheDocument();
  });
});
