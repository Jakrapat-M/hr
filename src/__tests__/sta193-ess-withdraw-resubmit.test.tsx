/**
 * STA-193 — [EC] Submit Requests & Track Status
 * On the /requests "คำร้องของฉัน" tab, a sent-back ('info' / ขอข้อมูลเพิ่ม)
 * request can be WITHDRAWN or REVISED & RE-SUBMITTED by the employee.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { useEssRequestActions } from '@/stores/ess-request-actions';
import { useRequestsStore } from '@/stores/cnext-requests-slice';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';
import { useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/th/requests'),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// The single sent-back mock row (CNEXT_MY_REQUESTS, status 'info', no requesterId).
const SENT_BACK_ID = 'REQ-2442';

async function renderRequests() {
  const { default: RequestsPage } = await import('@/app/[locale]/requests/page');
  render(<RequestsPage />);
  // Scope to the sent-back status so the row is on-screen (default view caps at 8).
  fireEvent.click(screen.getByRole('button', { name: 'ขอข้อมูลเพิ่ม' }));
}

function sentBackRow() {
  return screen.getByText(new RegExp(SENT_BACK_ID)).closest('li') as HTMLElement;
}

beforeEach(() => {
  localStorage.clear();
  useEssRequestActions.getState().clear();
  useRequestsStore.setState({ filter: 'all' });
  useBenefitClaimsStore.getState().clear();
  useBenefitReferralsStore.getState().clear();
  useBenefitTaxPlanningStore.getState().clear();
  // Employee persona (no approver tab → 'รออนุมัติ' resolves to the filter chip only).
  useAuthStore.setState({
    userId: 'EMP001', username: 'จงรักษ์ ทานากะ', roles: ['employee'],
    isAuthenticated: true, _hasHydrated: true,
  } as Parameters<typeof useAuthStore.setState>[0]);
});

describe('STA-193 — ESS withdraw / revise-resubmit on sent-back requests', () => {
  it('shows Withdraw + Revise&resubmit on the sent-back row', async () => {
    await renderRequests();
    const row = sentBackRow();
    expect(within(row).getByRole('button', { name: 'ถอนคำขอ' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'แก้ไขและส่งใหม่' })).toBeInTheDocument();
  });

  it('withdraw → confirm removes the request from the tracker', async () => {
    await renderRequests();
    fireEvent.click(within(sentBackRow()).getByRole('button', { name: 'ถอนคำขอ' }));
    // Confirm in the modal.
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันถอนคำขอ' }));
    expect(screen.queryByText(new RegExp(SENT_BACK_ID))).not.toBeInTheDocument();
    // Store recorded the withdrawal.
    expect(useEssRequestActions.getState().actions[SENT_BACK_ID]).toBe('withdrawn');
  });

  it('revise & resubmit → confirm moves it out of the sent-back list (back to pending)', async () => {
    await renderRequests();
    fireEvent.click(within(sentBackRow()).getByRole('button', { name: 'แก้ไขและส่งใหม่' }));
    // Optional note + resubmit.
    fireEvent.click(screen.getByRole('button', { name: 'ส่งใหม่อีกครั้ง' }));
    // Row left the 'ขอข้อมูลเพิ่ม' filtered view because it is now 'pending'.
    expect(screen.queryByText(new RegExp(SENT_BACK_ID))).not.toBeInTheDocument();
    expect(useEssRequestActions.getState().actions[SENT_BACK_ID]).toBe('resubmitted');
  });

  it('resubmit flips the sent-back count to 0 and adds one to pending', async () => {
    // Read the two summary tiles from the un-capped `allMine` summary (independent
    // of the 8-row list preview cap).
    const tileValue = (label: string) => {
      const eyebrow = screen
        .getAllByText(label)
        .find((el) => el.closest('.cnext-stat-card'));
      return Number(eyebrow?.closest('.cnext-stat-card')?.querySelector('p')?.textContent ?? 'NaN');
    };
    await renderRequests();
    const infoBefore = tileValue('ขอข้อมูลเพิ่ม');
    const pendingBefore = tileValue('รออนุมัติ');
    expect(infoBefore).toBe(1);

    fireEvent.click(within(sentBackRow()).getByRole('button', { name: 'แก้ไขและส่งใหม่' }));
    fireEvent.click(screen.getByRole('button', { name: 'ส่งใหม่อีกครั้ง' }));

    expect(tileValue('ขอข้อมูลเพิ่ม')).toBe(0);
    expect(tileValue('รออนุมัติ')).toBe(pendingBefore + 1);
  });
});
