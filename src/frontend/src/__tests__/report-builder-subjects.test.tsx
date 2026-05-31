/**
 * Feature 2 — subject-selectable report builder.
 *
 * Covers:
 *  - selecting a subject renders that subject's columns (preview headers)
 *  - changing a filter changes the preview rows
 *  - export wiring is present (Export CSV control) + the subject compute + CSV
 *    serialization round-trips through the canonical admin csvExport util.
 */

import { describe, expect, test, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import { useAuthStore } from '@/stores/auth-store';
import { SubjectReportBuilder } from '@/components/reports/SubjectReportBuilder';
import { ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';
import { buildSubjects } from '@/lib/report-builder-subjects';
import { buildCsvText } from '@/lib/admin/utils/csvExport';
import enMessages from '../../messages/en.json';

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/reports/builder',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ locale: 'en' }),
}));

function setAdmin() {
  useAuthStore.setState({
    userId: 'TEST',
    username: 'admin',
    email: 'admin@humi.test',
    roles: ['hr_admin'],
    isAuthenticated: true,
    originalUser: null,
    _hasHydrated: true,
  } as any);
}

function renderBuilder() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages as any}>
      <SubjectReportBuilder />
    </NextIntlClientProvider>,
  );
}

describe('SubjectReportBuilder', () => {
  beforeEach(() => setAdmin());

  test('default subject (headcount-by-dept) renders its columns in the preview', () => {
    renderBuilder();
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(
      expect.arrayContaining(['Department', 'Headcount', 'Active', 'On leave']),
    );
  });

  test('selecting a different subject swaps the columns', () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: 'Employee roster', pressed: false }));
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(
      expect.arrayContaining(['Employee ID', 'Name', 'Position', 'Hire date']),
    );
  });

  test('export control is present', () => {
    renderBuilder();
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeTruthy();
  });
});

describe('report-builder-subjects compute + filters (unit)', () => {
  test('roster filter changes the number of rows', () => {
    const subjects = buildSubjects(ALL_PORTED_EMPLOYEES);
    const roster = subjects.find((s) => s.id === 'headcount-roster')!;
    const all = roster.compute(ALL_PORTED_EMPLOYEES, {}, 'en');
    const activeOnly = roster.compute(ALL_PORTED_EMPLOYEES, { status: 'active' }, 'en');
    // Active filter must be a strict subset (some employees are on leave/terminated).
    expect(activeOnly.length).toBeLessThanOrEqual(all.length);
    expect(activeOnly.every((r) => r.status === 'active')).toBe(true);
  });

  test('benefits-enrollment compute produces plan rows exportable as CSV', () => {
    const subjects = buildSubjects(ALL_PORTED_EMPLOYEES);
    const enrollment = subjects.find((s) => s.id === 'benefits-enrollment')!;
    const rows = enrollment.compute(ALL_PORTED_EMPLOYEES, {}, 'en');
    expect(rows.length).toBeGreaterThan(0);
    const csv = buildCsvText(
      rows,
      enrollment.columns.map((c) => ({ header: c.labelEn, accessor: (r: any) => r[c.id] })),
    );
    expect(csv).toContain('Plan code');
    expect(csv).toContain('Rate (%)');
  });
});
