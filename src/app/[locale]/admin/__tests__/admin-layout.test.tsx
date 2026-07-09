/**
 * AC-3.1 — admin/layout.tsx role guard (PR-1 Item 3).
 *   - ['hr_manager'] → children render (regression of the literal-includes bug:
 *     hr_manager is top of hierarchy and must inherit hr_admin access).
 *   - ['hr_admin']   → children render.
 *   - ['employee']   → <AccessDenied> rendered IN PLACE (NOT a redirect / NOT null).
 */

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { useAuthStore } from '@/stores/auth-store';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  useParams: () => ({ locale: 'th' }),
}));

function setRoles(
  roles: Array<'employee' | 'manager' | 'hrbp' | 'spd' | 'hr_admin' | 'hr_manager'>,
) {
  useAuthStore.setState({
    userId: 'TEST',
    username: 'tester',
    email: 'tester@humi.test',
    roles,
    isAuthenticated: true,
    originalUser: null,
    _hasHydrated: true,
  } as never);
}

async function renderLayout() {
  const { default: AdminLayout } = await import('@/app/[locale]/admin/layout');
  return render(
    <AdminLayout>
      <div data-testid="admin-children">admin content</div>
    </AdminLayout>,
  );
}

beforeEach(() => {
  replace.mockClear();
});

describe('AC-3.1 — admin/layout guard', () => {
  test('hr_manager renders children (hierarchy fix — top role inherits hr_admin)', async () => {
    setRoles(['hr_manager']);
    await renderLayout();
    expect(screen.getByTestId('admin-children')).toBeInTheDocument();
    expect(screen.queryByText(/Access Denied/)).toBeNull();
  });

  test('hr_admin renders children', async () => {
    setRoles(['hr_admin']);
    await renderLayout();
    expect(screen.getByTestId('admin-children')).toBeInTheDocument();
  });

  test('employee → AccessDenied rendered in place (no redirect, not null)', async () => {
    setRoles(['employee']);
    await renderLayout();
    // denial surface present
    expect(screen.getByText(/ไม่มีสิทธิ์เข้าถึง/)).toBeInTheDocument();
    expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
    // children NOT rendered
    expect(screen.queryByTestId('admin-children')).toBeNull();
    // NOT a redirect to /home (the not-admin branch was removed)
    expect(replace).not.toHaveBeenCalled();
  });
});
