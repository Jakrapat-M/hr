/**
 * STA-189 — Time hub grouped self-service layout.
 *
 * The /time hub now presents the employee's self-service tiles in three labeled
 * groups — Daily / Requests / Reports (รายวัน / คำขอ / รายงาน) — with no
 * role-gated "For Managers" section. Every tile is open to everyone and maps to
 * an existing route. The manager review/shift tiles were removed from this hub;
 * their canonical entry points live under /quick-approve and the reviewer routes
 * themselves. These tests lock the grouped structure and the removal.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
}));

// STA-248 — the hub now renders TeamAttendanceSummary, which calls
// useTranslations('cnextHero'); this suite doesn't assert its copy, so a
// pass-through stub avoids requiring a NextIntlClientProvider here.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

const h = vi.hoisted(() => ({ roles: [] as string[] }));
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[]; userId: string }) => unknown) =>
    selector({ roles: h.roles, userId: 'EMP001' }),
}));
vi.mock('@/stores/leave-approvals', () => ({
  useLeaveApprovals: (selector: (s: { requests: unknown[] }) => unknown) => selector({ requests: [] }),
}));
vi.mock('@/stores/overtime-requests', () => ({
  useOvertimeRequests: (selector: (s: { requests: unknown[] }) => unknown) => selector({ requests: [] }),
}));
vi.mock('@/stores/time-corrections', () => ({
  useTimeCorrections: (selector: (s: { requests: unknown[] }) => unknown) => selector({ requests: [] }),
}));

import TimeLandingPage from '../page';

const GROUP_HEADINGS = ['รายวัน', 'คำขอ', 'รายงาน'];
const MANAGER_HEADING = 'สำหรับผู้จัดการ';
const REVIEW_TILE = 'ตรวจสอบใบบันทึกเวลา';
const SHIFT_TILE = 'ตารางกะทีม';

describe('STA-189 — /time hub grouped self-service layout', () => {
  it('renders the three group headings (Daily / Requests / Reports)', () => {
    h.roles = ['employee'];
    render(<TimeLandingPage />);
    // Group headings are <h2>; tile titles are <h3>, so level pins the heading.
    for (const heading of GROUP_HEADINGS) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    }
  });

  it('maps each card to its existing route', () => {
    h.roles = ['employee'];
    render(<TimeLandingPage />);
    // Tile titles are <h3> inside the card's <a>; level 3 avoids colliding with
    // the "รายงาน" group heading (<h2>).
    const hrefOf = (label: string) =>
      screen.getByRole('heading', { level: 3, name: label }).closest('a')?.getAttribute('href');
    // Daily
    expect(hrefOf('ลงเวลาเข้า-ออก')).toBe('/th/time/clock');
    expect(hrefOf('ตารางเวลาของฉัน')).toBe('/th/time/timesheet');
    // Requests
    expect(hrefOf('คำขอของฉัน')).toBe('/th/time/my-requests');
    expect(hrefOf('ขอลา')).toBe('/th/timeoff');
    expect(hrefOf('ขอทำโอที')).toBe('/th/overtime');
    expect(hrefOf('แก้ไขเวลา')).toBe('/th/time/corrections');
    // Reports — "Attendance history" reuses the existing workforce /reports route
    expect(hrefOf('รายงาน')).toBe('/th/reports');
  });

  it('no longer renders the "For Managers" section or its reviewer tiles, for any role', () => {
    for (const role of ['employee', 'manager', 'hr_admin']) {
      h.roles = [role];
      const { unmount } = render(<TimeLandingPage />);
      expect(screen.queryByText(MANAGER_HEADING)).not.toBeInTheDocument();
      expect(screen.queryByText(REVIEW_TILE)).not.toBeInTheDocument();
      expect(screen.queryByText(SHIFT_TILE)).not.toBeInTheDocument();
      unmount();
    }
  });

  it('shows the same self-service tiles regardless of role (no role gating)', () => {
    h.roles = ['manager'];
    render(<TimeLandingPage />);
    // A manager sees exactly the self-service set — including the leave/OT tiles.
    expect(screen.getByText('ขอลา')).toBeInTheDocument();
    expect(screen.getByText('ขอทำโอที')).toBeInTheDocument();
    expect(screen.getByText('คำขอของฉัน')).toBeInTheDocument();
  });
});
