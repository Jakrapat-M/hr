/**
 * STA-192 — owner guard on the time-correction approval detail page (BLOCKING AC T5).
 * time-correction's canAct = hasRole(roles,'manager'), so the owner guard is
 * especially load-bearing: an owner who is ALSO a manager must NOT see
 * Approve/Reject; a non-owner manager at the same actionable step DOES.
 */
import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import TimeCorrectionDetailPage from '../page';
import { useTimeCorrections } from '@/stores/time-corrections';

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
        <TimeCorrectionDetailPage params={Promise.resolve({ id, locale: 'th' })} />
      </Suspense>,
    );
  });
}

/** Seed a pending, manager-actionable time-correction owned by EMP-OWNER. */
function seedGuardRequest() {
  return useTimeCorrections.getState().addRequest({
    employeeId: 'EMP-OWNER',
    employeeName: 'เจ้าของคำขอ',
    department: 'คลังสินค้า',
    date: '2026-07-01',
    correctionType: 'in',
    reasonCode: 'forgot_clock_in',
    correctedTime: '09:00',
    reason: 'guard',
  });
}

beforeEach(() => {
  mockRoles = ['manager'];
  mockUserId = 'EMP-OWNER';
  useTimeCorrections.getState().clear();
});
afterEach(() => cleanup());

describe('TimeCorrectionDetailPage — owner action guard (STA-192)', () => {
  it('hides Approve/Reject when the manager IS the request owner', async () => {
    const id = seedGuardRequest();
    mockUserId = 'EMP-OWNER';
    await renderDetail(id);
    expect(screen.queryByRole('button', { name: /อนุมัติ|Approve/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /ปฏิเสธ|Reject/ })).toBeNull();
  });

  it('shows Approve/Reject for a non-owner manager at the same actionable step', async () => {
    const id = seedGuardRequest();
    mockUserId = 'MGR-OTHER';
    await renderDetail(id);
    expect(screen.getByRole('button', { name: /อนุมัติ|Approve/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ปฏิเสธ|Reject/ })).toBeInTheDocument();
  });
});
