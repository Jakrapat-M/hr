/**
 * Audit Log page — STA-80 record change-history regression tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

vi.mock('next-intl', () => ({
  useLocale: vi.fn().mockReturnValue('th'),
}));

vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    canSee: () => true,
    canDo: () => true,
    entities: {},
    actions: {},
    queueScope: 'enterprise',
  }),
}));

import AuditLogPage from '../page';

describe('Audit Log — record change history (STA-80)', () => {
  it('renders field-level before/after for record edits', () => {
    render(<AuditLogPage />);
    // Benefit max-claim change: 30,000 → 35,000
    expect(screen.getAllByText('TH_MED_001').length).toBeGreaterThan(0);
    expect(screen.getByText('30,000 THB')).toBeInTheDocument();
    expect(screen.getByText('35,000 THB')).toBeInTheDocument();
  });

  it('search matches the target record, not just the actor', () => {
    render(<AuditLogPage />);
    const search = screen.getByRole('textbox');

    fireEvent.change(search, { target: { value: 'Benefit' } });

    // change-history rows for the benefit record survive…
    expect(screen.getByText('35,000 THB')).toBeInTheDocument();
    // …while unrelated workflow rows (a leave request) are filtered out
    expect(screen.queryByText('WF-001')).not.toBeInTheDocument();
  });

  it('search by record id narrows to that record', () => {
    render(<AuditLogPage />);
    const search = screen.getByRole('textbox');

    fireEvent.change(search, { target: { value: 'TH_MED_001' } });

    expect(screen.getAllByText('TH_MED_001').length).toBeGreaterThan(0);
    expect(screen.queryByText('EMP004')).not.toBeInTheDocument();
  });
});
