'use client';

// employeeChangeConfig — "Change employee information" bulk-import subject (MOCKUP).
//
// A subject config for the registry-driven Bulk Import hub. Modeled on the
// employees add-new wrapper (admin/employees/import/page.tsx) but scoped to
// EDITING EXISTING employees (transfer / field update) rather than adding new
// hires. The commit path wires straight to useEmployees.importEmployees, an
// upsert keyed by employee_id — committing rows for EXISTING employee_ids merges
// the changed fields ({...existing, ...row}), so the registry visibly edits the
// demo employees.
//
// NO-RED: this file emits no danger styling. The wizard renders severity rows
// with error-* tokens (pumpkin) on its own.

import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import type {
  ModuleImportConfig,
  ValidationItem,
} from '@/components/admin/import/ModuleImportWizard';
import type { DataTableColumn } from '@/components/humi';
import { useEmployees } from '@/lib/admin/store/useEmployees';
import type { MockEmployee } from '@/mocks/employees';
import type { ImportJob } from '@/stores/import-jobs-store';

// Editable bulk-update row — a partial MockEmployee keyed by employee_id.
// editable columns pending BA Q2 — current default = transfer / field-update
// set (position_title, org_unit/department, managerId, store_branch_code as
// work location). employee_id is the immutable key, never edited.
export type EmployeeChangeRow = Partial<MockEmployee> & {
  employee_id: string;
};

// Sample rows edit EXISTING demo employees (EMP-0001..) so the upsert merge is
// visible in the registry after a commit.
const SAMPLE_ROWS: EmployeeChangeRow[] = [
  { employee_id: 'EMP-0001', position_title: 'Senior Software Engineer', org_unit: 'Digital', managerId: 'EMP-0002', store_branch_code: null },
  { employee_id: 'EMP-0002', position_title: 'HR Manager', org_unit: 'People', managerId: 'EMP-0003', store_branch_code: null },
  { employee_id: 'EMP-0003', position_title: 'Store Manager', org_unit: 'Retail', managerId: 'EMP-0004', store_branch_code: 'BR-1021' },
  { employee_id: 'EMP-0004', position_title: 'Senior Accountant', org_unit: 'Finance', managerId: 'EMP-0005', store_branch_code: null },
  { employee_id: 'EMP-0005', position_title: 'Logistics Manager', org_unit: 'Supply Chain', managerId: 'EMP-0006', store_branch_code: null },
  { employee_id: 'EMP-0006', position_title: 'Marketing Lead', org_unit: 'Marketing', managerId: 'EMP-0007', store_branch_code: null },
  { employee_id: 'EMP-0007', position_title: 'IT Lead', org_unit: 'IT', managerId: 'EMP-0008', store_branch_code: null },
  { employee_id: 'EMP-0008', position_title: 'Store Supervisor', org_unit: 'Retail', managerId: 'EMP-0009', store_branch_code: 'BR-1044' },
  { employee_id: 'EMP-0009', position_title: 'Senior Buyer', org_unit: 'Merchandising', managerId: 'EMP-0010', store_branch_code: null },
  { employee_id: 'EMP-0010', position_title: 'Cashier Lead', org_unit: 'Retail', managerId: 'EMP-0011', store_branch_code: 'BR-1102' },
];

const VALIDATION: ValidationItem[] = [
  { row: 1, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 2, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 3, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 4, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 5, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 6, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 7, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 8, severity: 'warning', messageTh: 'รหัสสาขาใหม่ — โปรดตรวจสอบ', messageEn: 'New branch code — please verify' },
  { row: 9, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 10, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
];

const JOBS_SEED: ImportJob[] = [
  {
    id: 'IMP-0218', module: 'employees', filename: 'transfers_jun_2026.csv', type: 'employee-change',
    status: 'completed', started: '2026-06-15T10:10:00', records: 23, processed: 23, errors: 0,
    logLines: [
      '[10:10:00] Job IMP-0218 started',
      '[10:10:01] Parsed 23 rows from transfers_jun_2026.csv',
      '[10:10:02] Validation passed: 23/23 rows OK',
      '[10:10:04] Updated 23 employee records',
      '[10:10:04] Job IMP-0218 completed successfully',
    ],
  },
  {
    id: 'IMP-0215', module: 'employees', filename: 'org_move_q2.csv', type: 'employee-change',
    status: 'completed', started: '2026-06-09T16:20:00', records: 9, processed: 8, errors: 1,
    logLines: [
      '[16:20:00] Job IMP-0215 started',
      '[16:20:01] Parsed 9 rows from org_move_q2.csv',
      '[16:20:02] Validation: 8 OK / 1 warning',
      '[16:20:02] WARNING row 4: manager "EMP-9999" not found — left unchanged',
      '[16:20:03] Updated 8 employee records (1 skipped)',
      '[16:20:03] Job IMP-0215 completed with warnings',
    ],
  },
];

/**
 * useEmployeeChangeImportConfig — wires the "Change employee information"
 * subject. Returns a ModuleImportConfig whose commit() upserts the edited rows
 * into the useEmployees mock store (existing employee_ids get merged). Must be
 * called inside a component (it calls a Zustand hook).
 */
export function useEmployeeChangeImportConfig(): ModuleImportConfig<EmployeeChangeRow> {
  const locale = useLocale();
  const params = useParams<{ locale: string }>();
  const isTh = (params?.locale ?? locale ?? 'th') !== 'en';

  const importEmployees = useEmployees((s) => s.importEmployees);

  const previewColumns: DataTableColumn<EmployeeChangeRow>[] = [
    { id: 'employee_id', header: isTh ? 'รหัสพนักงาน' : 'Employee ID', cell: (r) => <span className="font-mono text-small">{r.employee_id}</span> },
    { id: 'position', header: isTh ? 'ตำแหน่งใหม่' : 'New Position', cell: (r) => <span className="text-small text-ink">{r.position_title}</span> },
    { id: 'org_unit', header: isTh ? 'หน่วยงานใหม่' : 'New Department', cell: (r) => <span className="text-small text-ink-muted">{r.org_unit}</span> },
    { id: 'manager', header: isTh ? 'ผู้บังคับบัญชา' : 'Manager', cell: (r) => <span className="font-mono text-small text-ink-muted">{r.managerId ?? '—'}</span> },
    { id: 'work_location', header: isTh ? 'สถานที่ทำงาน' : 'Work Location', cell: (r) => <span className="font-mono text-small text-ink-muted">{r.store_branch_code ?? (isTh ? 'สำนักงานใหญ่' : 'HQ')}</span> },
  ];

  return {
    module: 'employees',
    eyebrowTh: 'เปลี่ยนข้อมูลพนักงาน · นำเข้าแบบกลุ่ม',
    eyebrowEn: 'Change employee information · Bulk Import',
    titleTh: 'เปลี่ยนข้อมูลพนักงานแบบกลุ่ม',
    titleEn: 'Bulk-update employee information',
    subtitleTh: 'อัปโหลด CSV เพื่อโอนย้ายหรือปรับปรุงข้อมูลพนักงานที่มีอยู่เป็นกลุ่ม',
    subtitleEn: 'Upload CSV to transfer or update existing employees in bulk',
    // editable columns pending BA Q2
    csvHintColumns: 'employee_id, position_title, org_unit, managerId, store_branch_code',
    previewColumns,
    sampleRows: SAMPLE_ROWS,
    rowKey: (r) => r.employee_id,
    validationItems: VALIDATION,
    jobsSeed: JOBS_SEED,
    commit: (rows) => importEmployees(rows),
  };
}
