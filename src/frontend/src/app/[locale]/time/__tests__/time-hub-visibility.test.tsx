/**
 * STA-66 — Time module role-specific discoverability.
 *
 * The /time hub surfaces the base tiles (timesheet/time-off/overtime/approvals)
 * to everyone, and the manager/HR "Timesheet Review" reporting tile only to
 * manager/hrbp+ tiers (remove-not-hide). These tests lock that role-specific
 * visibility per the ticket's "navigation tests cover role-specific visibility"
 * acceptance criterion.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

const h = vi.hoisted(() => ({ roles: [] as string[] }));
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[] }) => unknown) => selector({ roles: h.roles }),
}));

import TimeLandingPage from '../page';

const REVIEW_TILE = 'ตรวจสอบใบบันทึกเวลา';
const TIMESHEET_TILE = 'บันทึกเวลางาน';

describe('STA-66 — /time hub role-specific visibility', () => {
  it('employee sees the base Time tiles but NOT the manager review tile', () => {
    h.roles = ['employee'];
    render(<TimeLandingPage />);
    expect(screen.getByText(TIMESHEET_TILE)).toBeInTheDocument();
    expect(screen.queryByText(REVIEW_TILE)).not.toBeInTheDocument();
  });

  it('manager sees the Timesheet Review reporting tile linking to /time/review', () => {
    h.roles = ['manager'];
    render(<TimeLandingPage />);
    const tile = screen.getByText(REVIEW_TILE);
    expect(tile).toBeInTheDocument();
    expect(tile.closest('a')?.getAttribute('href')).toBe('/th/time/review');
  });

  it('hr_admin also sees the review tile (manager/hrbp+ tiers)', () => {
    h.roles = ['hr_admin'];
    render(<TimeLandingPage />);
    expect(screen.getByText(REVIEW_TILE)).toBeInTheDocument();
  });
});
