/**
 * HR Admin "Generate for an employee" surface on /admin/documents.
 *
 * SF "Document Generation" admin path: HR Admin picks an EMPLOYEE + a curated
 * letter → mergeLetter fills it with that employee's data → preview → download.
 * It lives alongside the existing request queue behind a view toggle; the queue
 * (MOCK_DOC_REQUESTS) stays fully intact and is never written to.
 *
 *  - hr_admin → toggle to Generate, pick employee + letter → merged preview.
 *  - employee → admin/layout denies IN PLACE (AccessDenied, no generator).
 */

import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import { useAuthStore } from '@/stores/auth-store';
import enMessages from '@/../messages/en.json';
import { ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  useParams: () => ({ locale: 'en' }),
  usePathname: () => '/en/admin/documents',
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
  const { default: Layout } = await import('@/app/[locale]/admin/layout');
  const { default: Page } = await import('@/app/[locale]/admin/documents/page');
  return render(
    withIntl(
      <Layout>
        <Page />
      </Layout>,
    ),
  );
}

describe('HR Admin generate-for-employee on /admin/documents', () => {
  test('hr_admin can pick an employee + letter and see a merged preview', async () => {
    setPersona(['hr_admin'], 'admin@cnext.test');
    await renderGuarded();

    // Queue is the default view and stays intact.
    expect(screen.getByTestId('admin-docs-table')).toBeInTheDocument();

    // Toggle to the generate surface.
    fireEvent.click(screen.getByTestId('docs-view-generate'));
    expect(screen.getByTestId('letter-generator')).toBeInTheDocument();
    // Queue table is hidden while generating.
    expect(screen.queryByTestId('admin-docs-table')).toBeNull();

    // Empty until an employee is chosen.
    expect(screen.getByTestId('lg-preview-empty')).toBeInTheDocument();

    // Pick the first employee from the default result list.
    const emp = ALL_PORTED_EMPLOYEES[0];
    fireEvent.click(screen.getByTestId(`lg-emp-${emp.id}`));

    // A merged preview now renders containing the employee's name + code.
    // Rendered locale is EN, so the EN name (with TH fallback) is merged in.
    const preview = screen.getByTestId('lg-preview');
    expect(preview).toBeInTheDocument();
    const expectedLast = emp.lastNameEn || emp.lastNameTh;
    expect(preview.textContent).toContain(expectedLast);
    expect(preview.textContent).toContain(emp.employeeCode);

    // Switching the letter re-merges (salary cert shows a salary line, not blank).
    fireEvent.click(screen.getByTestId('lg-letter-salary-cert'));
    expect(screen.getByTestId('lg-preview').textContent).toMatch(/THB|฿|\d/);

    // Download + print actions are enabled.
    expect(screen.getByTestId('lg-download-btn')).not.toBeDisabled();
    expect(screen.getByTestId('lg-print-btn')).not.toBeDisabled();

    expect(replace).not.toHaveBeenCalled();
  });

  test('employee persona is denied IN PLACE — no generator, no queue', async () => {
    setPersona(['employee'], 'employee@cnext.test');
    await renderGuarded();

    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    expect(screen.queryByTestId('letter-generator')).toBeNull();
    expect(screen.queryByTestId('admin-docs-table')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  test('employee search narrows the result list', async () => {
    setPersona(['hr_admin'], 'admin@cnext.test');
    await renderGuarded();
    fireEvent.click(screen.getByTestId('docs-view-generate'));

    const target = ALL_PORTED_EMPLOYEES[0];
    fireEvent.change(screen.getByTestId('lg-employee-search'), {
      target: { value: target.employeeCode },
    });
    const results = within(screen.getByTestId('lg-employee-results'));
    expect(results.getByTestId(`lg-emp-${target.id}`)).toBeInTheDocument();
  });
});
