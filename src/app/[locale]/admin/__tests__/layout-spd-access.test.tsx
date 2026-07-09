import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AdminLayout from '@/app/[locale]/admin/layout';
import type { Role } from '@/lib/rbac';
import { useAuthStore } from '@/stores/auth-store';

let pathname = '/th/admin/employees';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useParams: () => ({ locale: 'th' }),
  usePathname: () => pathname,
}));

function signIn(roles: Role[]) {
  const auth = useAuthStore.getState();
  auth.clearUser();
  auth.setUser({
    id: 'SPD001',
    name: 'SPD QA',
    email: 'spd@humi.test',
    roles,
  });
  auth.setHasHydrated(true);
}

describe('AdminLayout SPD employee-data access', () => {
  beforeEach(() => {
    pathname = '/th/admin/employees/EMP-0001/edit';
    signIn(['spd']);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('allows SPD to access employee admin routes', () => {
    render(
      <AdminLayout>
        <div>employee edit form</div>
      </AdminLayout>,
    );

    expect(screen.getByText('employee edit form')).toBeInTheDocument();
    expect(screen.queryByText(/Access Denied/)).toBeNull();
  });

  it('still blocks SPD from non-employee admin routes', () => {
    pathname = '/th/admin/system';

    render(
      <AdminLayout>
        <div>system admin</div>
      </AdminLayout>,
    );

    expect(screen.queryByText('system admin')).toBeNull();
    expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
  });
});
