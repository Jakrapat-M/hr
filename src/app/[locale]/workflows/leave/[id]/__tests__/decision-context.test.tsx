import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import LeaveDetailPage from '../page';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useLeaveBalances } from '@/stores/leave-balances';

// Audit P2-2 — the leave approval detail page must surface decision context
// (team-absence overlap, requester remaining quota, leave-taken-this-year)
// without leaving the page. This test seeds the live store and asserts the
// three context cards render with the derived values.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'th',
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[] }) => unknown) =>
    selector({ roles: ['manager'] }),
}));

function makeParams(id: string) {
  return Promise.resolve({ id, locale: 'th' });
}

async function renderDetail(id: string) {
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(
      <Suspense fallback={null}>
        <LeaveDetailPage params={makeParams(id)} />
      </Suspense>,
    );
  });
  return result!;
}

const REQUESTER = 'EMP-CTX-1';
const TEAMMATE = 'EMP-CTX-2';

beforeEach(() => {
  useLeaveApprovals.getState().clear();
  useLeaveBalances.getState().clear();
  useLeaveBalances
    .getState()
    .seedBalances([{ employeeId: REQUESTER, kind: 'maternity_leave', initial: 98 }]);
});

describe('LeaveDetailPage — decision context panel (P2-2)', () => {
  it('renders quota, leave-this-year, and team-overlap cards', async () => {
    // Requester's own request (under review).
    const id = useLeaveApprovals.getState().addRequest({
      id: 'LV-CTX-MAIN',
      employeeId: REQUESTER,
      employeeName: 'แม่ ทดสอบ',
      leaveType: 'maternity_leave',
      leaveCode: 'maternity_leave',
      startDate: '2026-06-10',
      endDate: '2026-06-19',
      reason: 'maternity context',
      days: 10,
    });

    // A teammate on leave during the SAME range → must show in overlap card.
    useLeaveApprovals.getState().addRequest({
      id: 'LV-CTX-OVERLAP',
      employeeId: TEAMMATE,
      employeeName: 'เพื่อนร่วมทีม',
      leaveType: 'annual_leave',
      leaveCode: 'annual_leave',
      startDate: '2026-06-12',
      endDate: '2026-06-15',
      reason: 'overlap',
      days: 4,
    });

    await renderDetail(id);

    // Card headings (Thai locale)
    expect(screen.getByText('สิทธิ์คงเหลือ')).toBeTruthy();
    expect(screen.getByText('ลาในปีนี้')).toBeTruthy();
    expect(screen.getByText('ทีมที่ลาช่วงเดียวกัน')).toBeTruthy();

    // Overlapping teammate appears by name.
    expect(screen.getByText('เพื่อนร่วมทีม')).toBeTruthy();

    // Remaining quota = 98 − 10 reserved = 88.
    expect(screen.getByText('88')).toBeTruthy();
  });

  it('shows "no overlap" when nobody else is off in the range', async () => {
    const id = useLeaveApprovals.getState().addRequest({
      id: 'LV-CTX-SOLO',
      employeeId: REQUESTER,
      employeeName: 'แม่ ทดสอบ',
      leaveType: 'maternity_leave',
      leaveCode: 'maternity_leave',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      reason: 'solo',
      days: 5,
    });

    await renderDetail(id);
    expect(screen.getByText('ไม่มีใครลาช่วงนี้')).toBeTruthy();
  });
});
