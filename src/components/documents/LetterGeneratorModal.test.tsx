/**
 * LetterGeneratorModal.test.tsx — employee self-service "Generate Document".
 * Framework: Vitest + jsdom + React Testing Library.
 *
 * Covers the SF ESS instant-generate contract:
 *  - selecting a curated letter renders a merged preview containing the
 *    logged-in employee's OWN name (self-service, own data only),
 *  - switching letters re-merges the preview,
 *  - the instant Download control is present and wired (no queue/approval).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import { LetterGeneratorModal } from './LetterGeneratorModal';
import { GENERATABLE_LETTERS } from '@/data/documents/templates';
import { ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';
import enMessages from '@/../messages/en.json';
import thMessages from '@/../messages/th.json';

// Stub lucide icons to keep jsdom rendering light.
vi.mock('lucide-react', () => ({
  FileText: () => null,
  Download: () => null,
  Printer: () => null,
  X: () => null,
  Loader2: () => null,
}));

const SELF = ALL_PORTED_EMPLOYEES[0];

function renderModal(locale: 'th' | 'en' = 'en', employee = SELF) {
  const messages = locale === 'th' ? thMessages : enMessages;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages as any}>
      <LetterGeneratorModal open onClose={vi.fn()} employee={employee} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe('LetterGeneratorModal — self-service instant generate', () => {
  it('renders the generator with all curated letters as pickable options', () => {
    renderModal();
    expect(screen.getByTestId('letter-generator')).toBeInTheDocument();
    GENERATABLE_LETTERS.forEach((letter) => {
      expect(screen.getByTestId(`generator-letter-${letter.id}`)).toBeInTheDocument();
    });
  });

  it('shows a merged preview containing the logged-in employee OWN name', () => {
    renderModal('en');
    const preview = screen.getByTestId('generator-preview');
    const fullName = `${SELF.firstNameEn || SELF.firstNameTh} ${SELF.lastNameEn || SELF.lastNameTh}`.trim();
    expect(preview.textContent).toContain(fullName);
    // The self badge / name chip confirms own-data scoping (no picker).
    expect(screen.getByTestId('generator-self-name').textContent).toContain(fullName);
  });

  it('re-merges the preview when a different letter is selected', () => {
    renderModal('en');
    // Default = first letter (employment-cert). Switch to the salary cert.
    fireEvent.click(screen.getByTestId('generator-letter-salary-cert'));
    const preview = screen.getByTestId('generator-preview');
    // Salary certificate body has a distinctive heading + merged salary value.
    expect(preview.textContent).toMatch(/SALARY CERTIFICATE/i);
    // Merged THB salary (formatCurrency) — currency marker present.
    expect(preview.textContent).toMatch(/THB|฿/);
  });

  it('exposes an instant Download control (no approval / queue)', () => {
    renderModal('en');
    const dl = screen.getByTestId('generator-download');
    expect(dl).toBeInTheDocument();
    // Wired click goes through downloadLetter → Blob URL (jsdom lacks
    // createObjectURL, so stub it to prove the click triggers the download).
    const createSpy = vi.fn(() => 'blob:mock');
    (URL as any).createObjectURL = createSpy;
    (URL as any).revokeObjectURL = vi.fn();
    fireEvent.click(dl);
    expect(createSpy).toHaveBeenCalled();
  });

  it('renders Thai letter names when locale is th', () => {
    renderModal('th');
    const btn = screen.getByTestId('generator-letter-salary-cert');
    expect(within(btn).getByText('หนังสือรับรองเงินเดือน')).toBeInTheDocument();
  });

  it('disables generation when no employee record is resolved', () => {
    renderModal('en', null as any);
    expect(screen.getByTestId('generator-no-employee')).toBeInTheDocument();
    expect(screen.queryByTestId('generator-preview')).toBeNull();
    expect(screen.queryByTestId('generator-download')).toBeNull();
  });
});
