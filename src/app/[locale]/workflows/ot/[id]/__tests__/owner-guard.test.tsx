/**
 * STA-192 — owner guard on the OT approval detail page (BLOCKING AC T5).
 * An owner-approver (userId === request.employeeId, actionable manager step) must
 * NOT see Approve/Reject. A non-owner approver at the same actionable step DOES.
 */
import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import OTDetailPage from '../page';
import { useOvertimeRequests } from '@/stores/overtime-requests';

let mockRoles: string[] = ['manager'];
let mockUserId: string | null = 'EMP-OWNER';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));
vi.mock('next-intl', () => ({
  useLocale: () => 'th',
}));
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[]; userId: string | null }) => unknown) =>
    selector({ roles: mockRoles, userId: mockUserId }),
}));

async function renderDetail(id: string) {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <OTDetailPage params={Promise.resolve({ id, locale: 'th' })} />
      </Suspense>,
    );
  });
}

/** Seed a pending, manager-actionable OT request owned by EMP-OWNER. */
function seedGuardRequest() {
  return useOvertimeRequests.getState().addRequest({
    id: 'OT-GUARD',
    employeeId: 'EMP-OWNER',
    employeeName: 'เจ้าของคำขอ',
    department: 'คลังสินค้า',
    otType: 'OT',
    startAt: '2026-07-01T18:00:00',
    endAt: '2026-07-01T21:00:00',
    hours: 3,
    reason: 'guard',
    docs: [],
  });
}

beforeEach(() => {
  mockRoles = ['manager'];
  mockUserId = 'EMP-OWNER';
  useOvertimeRequests.getState().clear();
});
afterEach(() => cleanup());

describe('OTDetailPage — owner action guard (STA-192)', () => {
  it('hides Approve/Reject when the approver IS the request owner', async () => {
    const id = seedGuardRequest();
    mockUserId = 'EMP-OWNER';
    await renderDetail(id);
    expect(screen.queryByRole('button', { name: /อนุมัติ|Approve/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /ปฏิเสธ|Reject/ })).toBeNull();
  });

  it('shows Approve/Reject for a non-owner approver at the same actionable step', async () => {
    const id = seedGuardRequest();
    mockUserId = 'MGR-OTHER';
    await renderDetail(id);
    expect(screen.getByRole('button', { name: /อนุมัติ|Approve/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ปฏิเสธ|Reject/ })).toBeInTheDocument();
  });
});
