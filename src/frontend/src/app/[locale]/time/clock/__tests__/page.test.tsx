/**
 * STA-169 — Clock In/Out with simulated geofence.
 * Vitest + jsdom + RTL, real next-intl messages (th). The demo geofence
 * selector is admin-gated; the 3 cases drive the 3 popup variants.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../../../messages/th.json';
import type { Role } from '@/lib/rbac';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
}));

// Injectable auth state (per test). Unknown empId → clocking default.
let mockRoles: Role[] = ['hr_admin'];
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: Role[]; userId: string | null; email: string | null }) => unknown) =>
    selector({ roles: mockRoles, userId: 'EMP-CLK-1', email: null }),
}));

import ClockInOutPage from '../page';
import { useClockPunches } from '@/stores/clock-punches';

function renderPage() {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages as Record<string, unknown>}>
      <ClockInOutPage />
    </NextIntlClientProvider>,
  );
}

function todaysPunches() {
  return useClockPunches.getState().punches.filter((p) => p.empId === 'EMP-CLK-1');
}

beforeEach(() => {
  useClockPunches.getState().clear();
  mockRoles = ['hr_admin'];
});
afterEach(() => cleanup());

describe('demo geofence selector — admin-gated (remove, not hide)', () => {
  it('is present for a Tier A admin (hr_admin)', () => {
    mockRoles = ['hr_admin'];
    renderPage();
    expect(screen.queryByTestId('geo-sim-selector')).not.toBeNull();
  });

  it('is absent for an employee', () => {
    mockRoles = ['employee'];
    renderPage();
    expect(screen.queryByTestId('geo-sim-selector')).toBeNull();
  });

  it('is absent for a manager', () => {
    mockRoles = ['manager'];
    renderPage();
    expect(screen.queryByTestId('geo-sim-selector')).toBeNull();
  });
});

describe('punch handler — the 3 geofence cases drive the 3 popups', () => {
  it('within (default) → records a punch + success popup', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('punch-button'));
    // Success popup title (clock in).
    expect(screen.getByText('ลงเวลาเข้าสำเร็จ')).toBeInTheDocument();
    expect(todaysPunches()).toHaveLength(1);
    expect(todaysPunches()[0].geo?.withinRadius).toBe(true);
  });

  it('outside → records a punch (supervisor notified) + warning popup + row tag', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('geo-sim-outside'));
    fireEvent.click(screen.getByTestId('punch-button'));
    expect(screen.getByText('ลงเวลาสำเร็จ — อยู่นอกพื้นที่ที่กำหนด')).toBeInTheDocument();
    expect(screen.getByText('ระบบได้แจ้งหัวหน้างานแล้ว')).toBeInTheDocument();
    const punches = todaysPunches();
    expect(punches).toHaveLength(1);
    expect(punches[0].geo?.withinRadius).toBe(false);
    expect(punches[0].geo?.notifiedSupervisor).toBe(true);
    // The outside tag renders on the punch row.
    expect(screen.getByTestId('punch-outside-tag')).toBeInTheDocument();
  });

  it('disabled → blocks the punch (no record) + error popup with Try Again', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('geo-sim-disabled'));
    fireEvent.click(screen.getByTestId('punch-button'));
    expect(screen.getByText('ไม่สามารถลงเวลาได้')).toBeInTheDocument();
    expect(screen.getByTestId('clock-retry')).toBeInTheDocument();
    // No punch was recorded.
    expect(todaysPunches()).toHaveLength(0);
  });

  it('button label flips from Clock in to Clock out after a successful pair', () => {
    renderPage();
    const btn = () => screen.getByTestId('punch-button');
    expect(btn().textContent).toContain('ลงเวลาเข้า');
    fireEvent.click(btn());
    // Dismiss the success popup so the button is enabled again.
    fireEvent.click(screen.getByTestId('clock-result-close'));
    expect(btn().textContent).toContain('ลงเวลาออก');
  });
});
