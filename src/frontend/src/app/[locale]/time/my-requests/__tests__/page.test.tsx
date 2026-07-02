/**
 * STA-183 — My-Requests page + /time landing card.
 * Vitest + jsdom + React Testing Library, real next-intl messages (th).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../../../messages/th.json';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[]; userId: string | null; username: string | null }) => unknown) =>
    selector({ roles: ['employee'], userId: 'EMP001', username: 'สมชาย ใจดี' }),
}));
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const stub = () => React.createElement('span', { 'data-testid': 'icon' });
  const mocked: Record<string, unknown> = {};
  for (const k of Object.keys(actual)) mocked[k] = stub;
  return mocked;
});

import MyRequestsPage from '@/app/[locale]/time/my-requests/page';
import TimeLandingPage from '@/app/[locale]/time/page';
import { ensureDemoSeed, resetEnsureDemoSeedForTests } from '@/lib/demo-seed';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useOvertimeRequests } from '@/stores/overtime-requests';
import { useTimeCorrections } from '@/stores/time-corrections';
import { currentPeriod, previousPeriod, demoToday } from '@/lib/time/period';
import { formatDate } from '@/lib/date';

function renderPage() {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages as Record<string, unknown>}>
      <MyRequestsPage />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useLeaveApprovals.getState().clear();
  useOvertimeRequests.getState().clear();
  useTimeCorrections.getState().clear();
  resetEnsureDemoSeedForTests();
  ensureDemoSeed();
});
afterEach(() => cleanup());

describe('/time landing card (STA-183)', () => {
  it('shows the My Request card linking to /th/time/my-requests', () => {
    render(<TimeLandingPage />);
    const link = screen.getByRole('link', { name: /คำขอของฉัน/ });
    expect(link).toHaveAttribute('href', '/th/time/my-requests');
  });
});

describe('/time/my-requests page (STA-183)', () => {
  it('renders the page heading + the period-note banner with BE ranges from the helpers', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'คำขอของฉัน' })).toBeInTheDocument();
    const cur = currentPeriod(demoToday());
    const prev = previousPeriod(demoToday());
    const banner = screen.getByText(/ยกเลิกได้เฉพาะคำขอที่เริ่ม/);
    expect(banner.textContent).toContain(formatDate(cur.start, 'medium', 'th'));
    expect(banner.textContent).toContain(formatDate(prev.start, 'medium', 'th'));
  });

  it('lists only EMP001 rows and shows Cancel only for the cancellable ones', () => {
    renderPage();
    const table = screen.getByRole('table');
    // EMP001 seeds: approved annual (cancellable), pending marriage (cancellable),
    // rejected funeral (not), OT cancelled (not), TC cancelled (not).
    const cancelButtons = within(table).getAllByRole('button', { name: 'ยกเลิก' });
    expect(cancelButtons).toHaveLength(2);
    // Terminal statuses render, but without a Cancel action.
    expect(within(table).getByText('ไม่อนุมัติ')).toBeInTheDocument(); // rejected leave
    expect(within(table).getAllByText('ยกเลิกแล้ว').length).toBeGreaterThanOrEqual(2); // cancelled OT + TC
  });

  it('View Detail links to the read-only /time/my-requests/[id] detail (never the approval workflows route)', () => {
    renderPage();
    const table = screen.getByRole('table');
    const links = within(table).getAllByRole('link', { name: 'ดูรายละเอียด' });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(href).toMatch(/^\/th\/time\/my-requests\/.+/);
      expect(href).not.toContain('/workflows/');
    }
  });

  it('the type filter narrows the table to a single request type', () => {
    renderPage();
    const typeSelect = screen.getByLabelText('ประเภทคำขอ');
    fireEvent.change(typeSelect, { target: { value: 'ot' } });
    const table = screen.getByRole('table');
    // Only the one EMP001 OT row remains → exactly one "ล่วงเวลา" type badge in-table.
    expect(within(table).getAllByText('ล่วงเวลา')).toHaveLength(1);
    expect(within(table).queryByText('ไม่อนุมัติ')).not.toBeInTheDocument(); // rejected LEAVE filtered out
  });

  it('cancel → confirm flips the row to cancelled and removes its Cancel button', () => {
    renderPage();
    const table = screen.getByRole('table');
    const before = within(table).getAllByRole('button', { name: 'ยกเลิก' });
    expect(before).toHaveLength(2);
    fireEvent.click(before[0]);
    // Modal confirm (portalled to body).
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิกคำขอ' }));
    const after = within(screen.getByRole('table')).getAllByRole('button', { name: 'ยกเลิก' });
    expect(after).toHaveLength(1);
  });
});
