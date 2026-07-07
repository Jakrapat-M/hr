// RosterPage — STA-252 re-issue page-level regression tests:
//   • N3 the hourly view is gone (no toggle, ?view=hourly renders the weekly grid)
//   • AC1.5 regression — ?panel=swap still mounts the swap modal (now unconditional,
//     no longer gated behind the removed hourly view)
//   • N2 the ตำแหน่ง (position) filter select is present and defaults to "ทั้งหมด"

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../messages/th.json';

let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  usePathname: () => '/th/roster',
}));

function wrap(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages}>
      {node}
    </NextIntlClientProvider>,
  );
}

async function renderPage() {
  const { default: RosterPage } = await import('@/app/[locale]/roster/page');
  return wrap(<RosterPage />);
}

beforeEach(() => {
  searchParams = new URLSearchParams();
});

describe('RosterPage — STA-252 N3: hourly view removed', () => {
  it('renders no hourly-view toggle and no "มุมมองรายชั่วโมง" copy', async () => {
    await renderPage();
    expect(screen.queryByTestId('view-toggle')).toBeNull();
    expect(screen.queryByText('มุมมองรายชั่วโมง')).toBeNull();
    expect(screen.queryByText('Hourly view')).toBeNull();
    // Only the weekly grid renders, regardless of a stale ?view=hourly param.
    expect(screen.getByTestId('weekly-timesheet-grid')).toBeInTheDocument();
  });

  it('a stale ?view=hourly query param has no effect — weekly grid still renders', async () => {
    searchParams = new URLSearchParams('view=hourly');
    await renderPage();
    expect(screen.getByTestId('weekly-timesheet-grid')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ตารางรายชั่วโมง' })).toBeNull();
  });
});

describe('RosterPage — AC1.5 regression: swap modal deep-link', () => {
  it('?panel=swap mounts the swap modal open (no longer gated behind the hourly view)', async () => {
    searchParams = new URLSearchParams('panel=swap');
    await renderPage();
    expect(screen.getByTestId('shift-swap-modal')).toBeInTheDocument();
  });

  it('without ?panel=swap the swap modal is not mounted', async () => {
    await renderPage();
    expect(screen.queryByTestId('shift-swap-modal')).toBeNull();
  });
});

describe('RosterPage — STA-252 N2: position filter', () => {
  it('renders a ตำแหน่ง filter select defaulting to "ทั้งหมด"', async () => {
    await renderPage();
    const select = screen.getByLabelText('กรองตำแหน่ง') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('all');
  });

  it('the clock-state filter still exposes exactly 4 options', async () => {
    await renderPage();
    const select = screen.getByLabelText('กรองสถานะการตอกบัตร') as HTMLSelectElement;
    expect(select.options.length).toBe(4);
  });
});
