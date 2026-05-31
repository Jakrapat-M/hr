import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// next-intl: EmptyState reads useLocale(). Default to 'th'.
vi.mock('next-intl', () => ({
  useLocale: () => 'th',
}));

import PerformanceFormPage from '../page';

describe('PerformanceFormPage — honest external-system state', () => {
  it('states Performance Management is external, not a fake form', () => {
    render(<PerformanceFormPage />);

    // Honest TH copy: external system, this is only a menu shortcut.
    expect(
      screen.getByText('การประเมินผลงานอยู่ในระบบภายนอก'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ไม่ได้เป็นส่วนหนึ่งของระบบ HR นี้/),
    ).toBeInTheDocument();

    // It is NOT a "coming soon" fake — that copy must be gone.
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sprint 2/i)).not.toBeInTheDocument();

    // No form controls are rendered (it is not a form).
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
