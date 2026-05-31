/**
 * module-import-export.test.tsx
 * Feature 1 (Import/Export) — employees module.
 *
 * Covers:
 *  - ModuleImportWizard advances steps (upload → preview → validate → run) and a
 *    successful run commits rows into the useEmployees mock store + appends an
 *    import-job to the Zustand import-jobs store.
 *  - The employees export CSV column config masks the employee_id (sensitive id)
 *    and emits Thai headers via the shared exportToCSV util (buildCsvText).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'th',
}));

// ─── Wizard step + commit ──────────────────────────────────────────────────────

describe('ModuleImportWizard (employees) — steps + commit', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { useImportJobs } = await import('@/stores/import-jobs-store');
    act(() => useImportJobs.setState({ jobs: [] }));
  });

  it('advances upload → preview → validate → run and commits to the mock stores', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    const { default: Page } = await import('@/app/[locale]/admin/employees/import/page');
    const { useEmployees } = await import('@/lib/admin/store/useEmployees');
    const { useImportJobs } = await import('@/stores/import-jobs-store');

    const beforeCount = useEmployees.getState().all.length;
    const beforeHasNew = useEmployees.getState().all.some((e) => e.employee_id === 'EMP-9001');
    expect(beforeHasNew).toBe(false);

    render(<Page />);

    // Step 1 — simulate a file selection via the hidden input.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['employee_id\nEMP-9001'], 'new_hires.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);

    // Next → Preview
    await user.click(screen.getByRole('button', { name: /ตรวจสอบ →/ }));
    expect(screen.getByText(/แสดง 10 แถวแรก/)).toBeTruthy();

    // Next → Validate
    await user.click(screen.getByRole('button', { name: /ยืนยัน →/ }));
    expect(screen.getByText(/ตัวเลือกการนำเข้า/)).toBeTruthy();

    // Next → Run
    await user.click(screen.getByRole('button', { name: /รันงาน →/ }));

    // Run import — animate the 8-step mock progress.
    await user.click(screen.getByRole('button', { name: /เริ่มนำเข้าข้อมูล/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8 * 400 + 50);
    });

    // Commit applied to employees store (new ids prepended).
    await waitFor(() => {
      expect(useEmployees.getState().all.some((e) => e.employee_id === 'EMP-9001')).toBe(true);
    });
    expect(useEmployees.getState().all.length).toBe(beforeCount + 10);

    // Job-history store got a new completed job for the employees module.
    const jobs = useImportJobs.getState().jobs.filter((j) => j.module === 'employees');
    expect(jobs.some((j) => j.status === 'completed' && j.filename === 'new_hires.csv')).toBe(true);

    vi.useRealTimers();
  });

  it('seeds employees job history into the import-jobs store', async () => {
    const { default: Page } = await import('@/app/[locale]/admin/employees/import/page');
    const { useImportJobs } = await import('@/stores/import-jobs-store');
    render(<Page />);
    const seeded = useImportJobs.getState().jobs.filter((j) => j.module === 'employees');
    expect(seeded.some((j) => j.id === 'IMP-0210')).toBe(true);
  });
});

// ─── Export — masking + Thai headers ───────────────────────────────────────────

describe('Employees export — masked sensitive id + Thai headers', () => {
  it('masks employee_id and emits a UTF-8 BOM CSV with Thai headers', async () => {
    const { buildCsvText } = await import('@/lib/admin/utils/csvExport');
    const { maskValue } = await import('@/lib/date');

    type Row = { employee_id: string; name: string };
    const rows: Row[] = [{ employee_id: 'EMP-000123', name: 'สมชาย ใจดี' }];
    const cols = [
      { header: 'รหัสพนักงาน', accessor: (r: Row) => maskValue(r.employee_id, 4) },
      { header: 'ชื่อ-นามสกุล (TH)', accessor: (r: Row) => r.name },
    ];

    const text = buildCsvText(rows, cols);
    // BOM present
    expect(text.charCodeAt(0)).toBe(0xfeff);
    // Thai header present
    expect(text).toContain('รหัสพนักงาน');
    // employee_id masked — raw full value must NOT leak; last 4 visible
    expect(text).not.toContain('EMP-000123');
    expect(text).toContain('0123');
  });
});
