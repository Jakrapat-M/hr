/**
 * P2 Item 1 — /hrbp/employees BU-scoped read-only registry RBAC + scope.
 *
 * Two-layer check:
 *  - Layout guard (./layout.tsx): People-Partner (+ above) pass; 'employee'
 *    persona gets <AccessDenied> IN PLACE (URL unchanged, no redirect).
 *  - Page (./page.tsx): renders a scoped DataTable + scope-line for an HRBP
 *    persona, driven by filterEmployeesByPersona over ALL_PORTED_EMPLOYEES.
 */

import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import { useAuthStore } from '@/stores/auth-store';
import enMessages from '@/../messages/en.json';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  useParams: () => ({ locale: 'en' }),
  usePathname: () => '/en/hrbp/employees',
}));

type AppRole = 'employee' | 'manager' | 'hrbp' | 'spd' | 'hr_admin' | 'hr_manager';

function setPersona(roles: AppRole[], email: string) {
  useAuthStore.setState({
    userId: 'TEST',
    username: 'tester',
    email,
    roles,
    isAuthenticated: true,
    originalUser: null,
    _hasHydrated: true,
  } as any);
}

function withIntl(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages as any}>
      {node}
    </NextIntlClientProvider>
  );
}

async function renderGuarded() {
  const { default: Layout } = await import('@/app/[locale]/hrbp/employees/layout');
  const { default: Page } = await import('@/app/[locale]/hrbp/employees/page');
  return render(
    withIntl(
      <Layout>
        <Page />
      </Layout>,
    ),
  );
}

describe('P2 — /hrbp/employees RBAC + BU scope', () => {
  test('HRBP persona renders a scoped employee table (no AccessDenied)', async () => {
    // hrbp@cnext.test → emp-007 (BU-PEOPLE head) — resolves a non-empty BU cohort.
    setPersona(['hrbp'], 'hrbp@cnext.test');
    await renderGuarded();

    // Guard passed — denial surface absent.
    expect(screen.queryByText(/Access Denied/i)).toBeNull();

    // Scope line present (count text) + a real data table rendered.
    const scopeLine = screen.getByTestId('hrbp-employees-scope-line');
    expect(scopeLine).toBeInTheDocument();
    expect(scopeLine.textContent).toMatch(/people/i);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  test('employee persona is denied IN PLACE (AccessDenied, no redirect)', async () => {
    setPersona(['employee'], 'employee@cnext.test');
    await renderGuarded();

    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    // Denial is rendered in place — never a router redirect.
    expect(replace).not.toHaveBeenCalled();
    // The scoped table must NOT leak through the guard.
    expect(screen.queryByRole('table')).toBeNull();
  });
});
