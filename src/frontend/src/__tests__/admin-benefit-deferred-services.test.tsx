import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('admin benefit deferred service configuration', () => {
  it('renders read-only referral and tax planning configuration sections', async () => {
    const { default: AdminBenefitsPage } = await import('@/app/[locale]/admin/benefits/page');

    render(<AdminBenefitsPage />);

    expect(screen.getByText('Referral configuration preview')).toBeInTheDocument();
    expect(screen.getByText(/letter template, and ePatient integration/)).toBeInTheDocument();
    expect(screen.getByText('ePatient payload + 30-day validity')).toBeInTheDocument();
    expect(screen.getByText('Tax Planning configuration preview')).toBeInTheDocument();
    expect(screen.getByText('Payroll sync disabled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ePatient sync disabled' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit tax brackets disabled' })).toBeDisabled();
    expect(screen.getByText('Benefit master data')).toBeInTheDocument();
  });

  it('keeps admin deferred-service copy user-facing instead of implementation-facing', () => {
    const source = readFileSync(path.join(process.cwd(), 'src/app/[locale]/admin/benefits/page.tsx'), 'utf8');

    expect(source).not.toMatch(/Mock ePatient|Mock\/planned|local estimator only|planned follow-ups/i);
    expect(source).not.toMatch(/\bplanned\b/i);
  });
});
