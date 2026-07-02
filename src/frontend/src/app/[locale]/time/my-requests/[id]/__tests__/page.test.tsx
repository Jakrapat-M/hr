/**
 * STA-192 — read-only "My Request" detail page.
 * (a) Owner sees status + approval chain, NO Approve/Reject action buttons.
 * (b) A non-owner userId resolves to the not-found state (never another
 *     employee's data), because buildMyRequests strict-owner-filters.
 * Vitest + jsdom + RTL, real next-intl messages (th).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import React, { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../../../../messages/th.json';

let mockUserId = 'EMP001';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[]; userId: string | null; username: string | null }) => unknown) =>
    selector({ roles: ['employee'], userId: mockUserId, username: 'สมชาย ใจดี' }),
}));
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const stub = () => React.createElement('span', { 'data-testid': 'icon' });
  const mocked: Record<string, unknown> = {};
  for (const k of Object.keys(actual)) mocked[k] = stub;
  return mocked;
});

import MyRequestDetailPage from '@/app/[locale]/time/my-requests/[id]/page';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useOvertimeRequests } from '@/stores/overtime-requests';
import { useTimeCorrections } from '@/stores/time-corrections';

async function renderDetail(id: string) {
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(
      <NextIntlClientProvider locale="th" messages={thMessages as Record<string, unknown>}>
        <Suspense fallback={null}>
          <MyRequestDetailPage params={Promise.resolve({ id, locale: 'th' })} />
        </Suspense>
      </NextIntlClientProvider>,
    );
  });
  return result!;
}

function seedOwnedLeave(id: string) {
  useLeaveApprovals.getState().addRequest({
    id,
    employeeId: 'EMP001',
    employeeName: 'สมชาย ใจดี',
    leaveType: 'annual_leave',
    leaveCode: 'annual_leave',
    startDate: '2026-07-01',
    endDate: '2026-07-02',
    reason: 'พักผ่อนประจำปี',
    days: 2,
    docs: [],
  });
}

beforeEach(() => {
  mockUserId = 'EMP001';
  useLeaveApprovals.getState().clear();
  useOvertimeRequests.getState().clear();
  useTimeCorrections.getState().clear();
});
afterEach(() => cleanup());

describe('/time/my-requests/[id] read-only detail (STA-192)', () => {
  it('renders the owner status detail with NO Approve/Reject action buttons', async () => {
    seedOwnedLeave('LV-OWN-1');
    await renderDetail('LV-OWN-1');

    // Detail page rendered (breadcrumb + reason), not the not-found state.
    expect(screen.getByText('LV-OWN-1')).toBeInTheDocument();
    expect(screen.getByText('พักผ่อนประจำปี')).toBeInTheDocument();
    // Status is surfaced (approval chain heading present).
    expect(screen.getByText('เส้นทางอนุมัติ')).toBeInTheDocument();

    // No approve/reject BUTTONS anywhere on this employee-only surface.
    expect(screen.queryByRole('button', { name: /อนุมัติ|Approve/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /ปฏิเสธ|Reject/ })).toBeNull();
  });

  it('a non-owner userId resolves to not-found (never another employee data)', async () => {
    seedOwnedLeave('LV-OWN-2');
    mockUserId = 'EMP-OTHER';
    await renderDetail('LV-OWN-2');

    expect(screen.getByText('ไม่พบคำขอ')).toBeInTheDocument();
    // The owner's reason must NOT leak to a non-owner.
    expect(screen.queryByText('พักผ่อนประจำปี')).toBeNull();
  });
});
