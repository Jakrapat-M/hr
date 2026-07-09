/**
 * pr5-external-stubs.test.tsx — PR-5 (clickable-HRMS) cleanup tests.
 *
 * AC-5.1 evidence (render-level):
 *  - performance / learning / recruiting external surfaces render a DISABLED
 *    "Open platform" control + an "external system" badge — no dead href="#".
 *  - data-migration validation surfaces an INLINE banner (role=alert/status)
 *    instead of a native alert().
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// next-intl mock: t(key) -> key, t.raw(key) -> array for list keys.
vi.mock('next-intl', () => {
  const t = (key: string) => key;
  t.raw = (key: string) => (key === 'hrmsExposesItems' ? ['item-a', 'item-b'] : key);
  return {
    useTranslations: () => t,
    useLocale: () => 'th',
  };
});

describe('PR-5 external-system surfaces — disabled CTA + external badge', () => {
  it.each([
    ['performance', () => import('@/app/[locale]/performance/page')],
    ['learning', () => import('@/app/[locale]/learning/page')],
    ['recruiting', () => import('@/app/[locale]/recruiting/page')],
  ])('%s page disables the Open-platform CTA and shows the external badge', async (_name, loader) => {
    const { default: Page } = await loader();
    const { container } = render(<Page />);

    // The CTA is a disabled button (not a dead anchor).
    const cta = screen.getByRole('button', { name: /openPlatform/i });
    expect(cta).toBeDisabled();

    // No bare href="#" remains.
    expect(container.querySelector('a[href="#"]')).toBeNull();

    // The "external system" note/badge is surfaced (externalNote key present at least once).
    expect(screen.getAllByText('externalNote').length).toBeGreaterThanOrEqual(1);
  });
});

describe('PR-5 data-migration — inline banner instead of alert()', () => {
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    alertSpy.mockClear();
  });

  it('shows an inline success banner on Validate (no native alert)', async () => {
    const { default: Page } = await import(
      '@/app/[locale]/admin/system/system-features/data-migration/page'
    );
    const { container } = render(<Page />);

    // Simulate a selected .csv file by firing change on the hidden input.
    const fileInput = container.querySelector('#csv-upload') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const file = new File(['col1,col2\n1,2'], 'employees.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Validate is now enabled — click it.
    const validateBtn = screen.getByRole('button', { name: 'Validate' });
    fireEvent.click(validateBtn);

    // Inline status banner appears; native alert is never called.
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
