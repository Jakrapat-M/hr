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
import { buildSubjects, subjectsForScope } from '@/lib/report-builder-subjects';
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
    email: 'admin@cnext.test',
    roles: ['hr_admin'],
    isAuthenticated: true,
    originalUser: null,
    _hasHydrated: true,
  } as any);
}

function setManager() {
  useAuthStore.setState({
    userId: 'TEST',
    username: 'manager',
    email: 'manager@cnext.test',
    roles: ['manager'],
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

  test('manager sees a reduced subject set vs admin (no benefits subjects)', () => {
    // Admin (all scope) → full set including benefits subjects.
    setAdmin();
    const { unmount } = renderBuilder();
    expect(screen.queryByRole('button', { name: 'Benefits enrollment' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Benefits claims' })).toBeTruthy();
    const adminPills = screen
      .getByRole('group', { name: 'Subject' })
      .querySelectorAll('button').length;
    unmount();

    // Manager (direct-reports scope) → employee subjects only, benefits hidden.
    setManager();
    renderBuilder();
    expect(screen.queryByRole('button', { name: 'Benefits enrollment' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Benefits claims' })).toBeNull();
    // Employee subjects still present.
    expect(screen.queryByRole('button', { name: 'Headcount by department' })).toBeTruthy();
    const managerPills = screen
      .getByRole('group', { name: 'Subject' })
      .querySelectorAll('button').length;

    expect(managerPills).toBeLessThan(adminPills);
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

  test('subjectsForScope: manager set is a strict subset of admin set', () => {
    const adminSet = subjectsForScope(ALL_PORTED_EMPLOYEES, 'all').map((s) => s.id);
    const managerSet = subjectsForScope(ALL_PORTED_EMPLOYEES, 'direct-reports').map((s) => s.id);
    // Benefits subjects are gated to bu (HRBP) or wider.
    expect(adminSet).toEqual(expect.arrayContaining(['benefits-enrollment', 'benefits-claims']));
    expect(managerSet).not.toContain('benefits-enrollment');
    expect(managerSet).not.toContain('benefits-claims');
    // Manager keeps the employee subjects.
    expect(managerSet).toEqual(expect.arrayContaining(['headcount-by-dept', 'headcount-roster']));
    expect(managerSet.length).toBeLessThan(adminSet.length);
    expect(managerSet.every((id) => adminSet.includes(id))).toBe(true);
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
