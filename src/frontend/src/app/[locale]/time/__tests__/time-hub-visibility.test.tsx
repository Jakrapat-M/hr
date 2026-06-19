/**
 * STA-66 — Time module role-specific discoverability.
 *
 * The /time hub surfaces the self-service tiles (timesheet/time-off/overtime/
 * correction) to everyone, and the manager/HR tiles — "Team Approvals"
 * (/quick-approve) and "Timesheet Review" (/time/review) — only to manager/hrbp+
 * tiers (remove-not-hide). The approval inbox is reviewer-gated server-side, so
 * showing its tile to an employee would dead-end them in AccessDenied; it lives
 * in the manager section, never in the base list. These tests lock that
 * role-specific visibility per the ticket's "navigation tests cover role-specific
 * visibility" acceptance criterion.
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
const APPROVALS_TILE = 'อนุมัติทีม';
const TIMESHEET_TILE = 'บันทึกเวลางาน';

describe('STA-66 — /time hub role-specific visibility', () => {
  it('employee sees the self-service tiles but NOT the manager approvals/review tiles', () => {
    h.roles = ['employee'];
    render(<TimeLandingPage />);
    expect(screen.getByText(TIMESHEET_TILE)).toBeInTheDocument();
    // remove-not-hide: the reviewer-gated tiles must not render for an employee
    // (clicking them would dead-end in AccessDenied at /quick-approve & /time/review).
    expect(screen.queryByText(REVIEW_TILE)).not.toBeInTheDocument();
    expect(screen.queryByText(APPROVALS_TILE)).not.toBeInTheDocument();
  });

  it('manager no longer sees the Team Approvals tile (approval lives only in /quick-approve)', () => {
    h.roles = ['manager'];
    render(<TimeLandingPage />);
    // STA-129: the duplicate อนุมัติทีม shortcut was removed from the Time hub;
    // the canonical approval entry point is the /quick-approve umbrella module.
    expect(screen.queryByText(APPROVALS_TILE)).not.toBeInTheDocument();
  });

  it('manager sees the Timesheet Review reporting tile linking to /time/review', () => {
    h.roles = ['manager'];
    render(<TimeLandingPage />);
    const tile = screen.getByText(REVIEW_TILE);
    expect(tile).toBeInTheDocument();
    expect(tile.closest('a')?.getAttribute('href')).toBe('/th/time/review');
  });

  it('hr_admin sees the review tile but NOT the removed approvals tile (manager/hrbp+ tiers)', () => {
    h.roles = ['hr_admin'];
    render(<TimeLandingPage />);
    expect(screen.queryByText(APPROVALS_TILE)).not.toBeInTheDocument();
    expect(screen.getByText(REVIEW_TILE)).toBeInTheDocument();
  });
});
