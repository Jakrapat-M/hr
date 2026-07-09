import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

// ── Next.js mocks ──────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
}));

// ── Auth store mock — injectable per test ──────────────────
import type { Role } from '@/lib/rbac';

let mockRoles: Role[] = ['hr_admin'];

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector?: (s: { roles: Role[] }) => unknown) => {
    const state = { roles: mockRoles };
    return selector ? selector(state) : state;
  },
}));

// ── Component import (after mocks) ─────────────────────────
import AdminDashboardPage from '../page';

describe('AdminDashboardPage — Quick-Links access filter (remove-not-hide)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoles = ['hr_admin'];
  });

  it('hr_admin sees every Quick-Link tile (all destinations reachable)', () => {
    render(<AdminDashboardPage />);
    // All 7 section titles render for a full admin.
    for (const title of [
      'การจ้างพนักงาน',
      'ข้อมูลพนักงาน',
      'ตั้งค่า Self-Service',
      'ผู้ใช้และสิทธิ์',
      'จัดการระบบ',
      'รายงาน',
      'โครงสร้างองค์กร',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('builds locale-aware hrefs from the route param (no hardcoded /th/)', () => {
    render(<AdminDashboardPage />);
    const hireLink = screen.getByText('การจ้างพนักงาน').closest('a');
    expect(hireLink).toHaveAttribute('href', '/th/admin/hire');
  });

  it('removes tiles whose destination module a narrower persona cannot reach', () => {
    // A plain employee can reach `profile` (employees tile) but NOT the
    // settings/positions/reports/onboarding admin modules → those tiles vanish.
    mockRoles = ['employee'];
    render(<AdminDashboardPage />);

    // Reachable: employees (module 'profile' admits employee).
    expect(screen.getByText('ข้อมูลพนักงาน')).toBeInTheDocument();

    // Removed (not rendered locked/disabled): admin-only modules.
    expect(screen.queryByText('ตั้งค่า Self-Service')).not.toBeInTheDocument();
    expect(screen.queryByText('ผู้ใช้และสิทธิ์')).not.toBeInTheDocument();
    expect(screen.queryByText('จัดการระบบ')).not.toBeInTheDocument();
    expect(screen.queryByText('โครงสร้างองค์กร')).not.toBeInTheDocument();
    expect(screen.queryByText('การจ้างพนักงาน')).not.toBeInTheDocument();
  });

  it('renders the section grid as links only for visible tiles', () => {
    mockRoles = ['employee'];
    const { container } = render(<AdminDashboardPage />);
    const grid = container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2');
    expect(grid).not.toBeNull();
    // Only the single reachable tile is a child link in the grid.
    const tiles = within(grid as HTMLElement).getAllByRole('link');
    expect(tiles).toHaveLength(1);
  });
});
