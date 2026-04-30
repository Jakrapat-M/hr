import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('admin benefit deferred service configuration', () => {
  it('renders read-only referral and tax planning configuration sections', async () => {
    const { default: AdminBenefitsPage } = await import('@/app/[locale]/admin/benefits/page');

    render(<AdminBenefitsPage />);

    expect(screen.getByText('Referral configuration preview')).toBeInTheDocument();
    expect(screen.getByText(/letter template, and ePatient integration/)).toBeInTheDocument();
    expect(screen.getByText('ePatient payload + 30-day validity')).toBeInTheDocument();
    expect(screen.getByText('Tax Planning configuration preview')).toBeInTheDocument();
    expect(screen.getByText('Payroll sync planned')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ePatient sync planned' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit tax brackets planned' })).toBeDisabled();
    expect(screen.getByText('Benefit master data')).toBeInTheDocument();
  });
});
