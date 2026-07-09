/**
 * P4 PR-4 — /hrbp/doc-review SPD document-review surface RBAC.
 *
 * The doc-review queue was split out of /admin/documents (which admin/layout
 * gates to hr_admin+) so SPD can actually reach it. The route's own layout
 * guard admits spd + hr_admin + hr_manager and renders <AccessDenied> IN PLACE
 * (URL unchanged, no redirect) for anyone else.
 *
 *  - SPD persona      → review queue renders (no AccessDenied).
 *  - employee persona → <AccessDenied> in place, no redirect, table absent.
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
  usePathname: () => '/en/hrbp/doc-review',
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
  const { default: Layout } = await import('@/app/[locale]/hrbp/doc-review/layout');
  const { default: Page } = await import('@/app/[locale]/hrbp/doc-review/page');
  return render(
    withIntl(
      <Layout>
        <Page />
      </Layout>,
    ),
  );
}

describe('P4 — /hrbp/doc-review RBAC (SPD reaches it)', () => {
  test('SPD persona reaches the review queue (no AccessDenied)', async () => {
    setPersona(['spd'], 'spd@humi.test');
    await renderGuarded();

    // Guard passed — denial surface absent.
    expect(screen.queryByText(/Access Denied/i)).toBeNull();
    // The review queue table rendered.
    expect(screen.getByTestId('doc-review-table')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  test('employee persona is denied IN PLACE (AccessDenied, no redirect)', async () => {
    setPersona(['employee'], 'employee@humi.test');
    await renderGuarded();

    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    // Denial is rendered in place — never a router redirect.
    expect(replace).not.toHaveBeenCalled();
    // The review queue must NOT leak through the guard.
    expect(screen.queryByTestId('doc-review-table')).toBeNull();
  });
});
