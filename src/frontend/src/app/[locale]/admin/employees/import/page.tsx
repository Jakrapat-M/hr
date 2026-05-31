'use client';

// admin/employees/import — bulk employee import (MOCKUP).
//
// Thin config wrapper around the reusable ModuleImportWizard. Inherits the
// hr_admin+ guard from admin/layout.tsx (this route sits under /admin/), so it
// needs no own guard. The wizard's commit() writes parsed rows into the
// useEmployees Zustand mock store (importEmployees), and a completed job lands
// in the import-jobs store + history table.

import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  ModuleImportWizard,
  type ModuleImportConfig,
  type ValidationItem,
} from '@/components/admin/import/ModuleImportWizard';
import type { DataTableColumn } from '@/components/humi';
import { useEmployees } from '@/lib/admin/store/useEmployees';
import type { MockEmployee } from '@/mocks/employees';
import type { ImportJob } from '@/stores/import-jobs-store';

// Import row — a partial MockEmployee that the wizard previews and commits.
type EmployeeImportRow = Partial<MockEmployee> & {
  employee_id: string;
  first_name_th: string;
  last_name_th: string;
  position_title: string;
  company: MockEmployee['company'];
};

const SAMPLE_ROWS: EmployeeImportRow[] = [
  { employee_id: 'EMP-9001', first_name_th: 'ธีรพงษ์', last_name_th: 'อินทรกุล', first_name_en: 'Theerapong', last_name_en: 'Intarakul', position_title: 'Software Engineer', company: 'CRC', org_unit: 'Digital', employee_class: 'PERMANENT', hire_date: '2026-05-01' },
  { employee_id: 'EMP-9002', first_name_th: 'พิมพ์ชนก', last_name_th: 'วัฒนกุล', first_name_en: 'Pimchanok', last_name_en: 'Watanakul', position_title: 'HR Officer', company: 'CEN', org_unit: 'People', employee_class: 'PERMANENT', hire_date: '2026-05-01' },
  { employee_id: 'EMP-9003', first_name_th: 'ณัฐวุฒิ', last_name_th: 'แสงทอง', first_name_en: 'Nattawut', last_name_en: 'Saengthong', position_title: 'Store Associate', company: 'ROBINSON', org_unit: 'Retail', employee_class: 'PARTIME', hire_date: '2026-05-02' },
  { employee_id: 'EMP-9004', first_name_th: 'อรอุมา', last_name_th: 'เจริญพร', first_name_en: 'On-uma', last_name_en: 'Charoenporn', position_title: 'Accountant', company: 'CPN', org_unit: 'Finance', employee_class: 'PERMANENT', hire_date: '2026-05-02' },
  { employee_id: 'EMP-9005', first_name_th: 'กฤษณะ', last_name_th: 'พงศ์ภัทร', first_name_en: 'Kritsana', last_name_en: 'Pongpat', position_title: 'Logistics Lead', company: 'CU', org_unit: 'Supply Chain', employee_class: 'PERMANENT', hire_date: '2026-05-03' },
  { employee_id: 'EMP-9006', first_name_th: 'สุภาวดี', last_name_th: 'ทองสุข', first_name_en: 'Supawadee', last_name_en: 'Thongsuk', position_title: 'Marketing Exec', company: 'CRC', org_unit: 'Marketing', employee_class: 'PERMANENT', hire_date: '2026-05-03' },
  { employee_id: 'EMP-9007', first_name_th: 'ชัยวัฒน์', last_name_th: 'ภูผา', first_name_en: 'Chaiwat', last_name_en: 'Phupha', position_title: 'IT Support', company: 'CEN', org_unit: 'IT', employee_class: 'PERMANENT', hire_date: '2026-05-04' },
  { employee_id: 'EMP-9008', first_name_th: 'มนัสนันท์', last_name_th: 'ศรีสุข', first_name_en: 'Manatsanan', last_name_en: 'Srisuk', position_title: 'Store Associate', company: 'ROBINSON', org_unit: 'Retail', employee_class: 'PARTIME', hire_date: '2026-05-04' },
  { employee_id: 'EMP-9009', first_name_th: 'ปรเมศวร์', last_name_th: 'จันทร์เพ็ญ', first_name_en: 'Poramet', last_name_en: 'Janpen', position_title: 'Buyer', company: 'CPN', org_unit: 'Merchandising', employee_class: 'PERMANENT', hire_date: '2026-05-05' },
  { employee_id: 'EMP-9010', first_name_th: 'รัตนาภรณ์', last_name_th: 'มีชัย', first_name_en: 'Rattanaporn', last_name_en: 'Meechai', position_title: 'Cashier', company: 'CU', org_unit: 'Retail', employee_class: 'PARTIME', hire_date: '2026-05-05' },
];

const VALIDATION: ValidationItem[] = [
  { row: 1, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 2, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 3, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 4, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 5, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 6, severity: 'warning', messageTh: 'ยังไม่ได้กำหนดผู้บังคับบัญชา', messageEn: 'Manager not yet assigned' },
  { row: 7, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 8, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 9, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 10, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
];

const JOBS_SEED: ImportJob[] = [
  {
    id: 'IMP-0210', module: 'employees', filename: 'new_hires_may_2026.csv', type: 'employees',
    status: 'completed', started: '2026-05-20T09:30:00', records: 42, processed: 42, errors: 0,
    logLines: [
      '[09:30:00] Job IMP-0210 started',
      '[09:30:01] Parsed 42 rows from new_hires_may_2026.csv',
      '[09:30:02] Validation passed: 42/42 rows OK',
      '[09:30:05] Inserted 42 employee records',
      '[09:30:05] Job IMP-0210 completed successfully',
    ],
  },
  {
    id: 'IMP-0208', module: 'employees', filename: 'transfers_q2.csv', type: 'employees',
    status: 'completed', started: '2026-05-18T14:05:00', records: 17, processed: 16, errors: 1,
    logLines: [
      '[14:05:00] Job IMP-0208 started',
      '[14:05:01] Parsed 17 rows from transfers_q2.csv',
      '[14:05:02] Validation: 16 OK / 1 warning',
      '[14:05:02] WARNING row 9: org_unit "ZZZ" not found — left blank',
      '[14:05:04] Inserted 16 employee records (1 skipped)',
      '[14:05:04] Job IMP-0208 completed with warnings',
    ],
  },
];

export default function EmployeesImportPage() {
  const locale = useLocale();
  const params = useParams<{ locale: string }>();
  const isTh = (params?.locale ?? locale ?? 'th') !== 'en';

  const importEmployees = useEmployees((s) => s.importEmployees);

  const previewColumns: DataTableColumn<EmployeeImportRow>[] = [
    { id: 'employee_id', header: isTh ? 'รหัสพนักงาน' : 'Employee ID', cell: (r) => <span className="font-mono text-small">{r.employee_id}</span> },
    {
      id: 'name', header: isTh ? 'ชื่อพนักงาน' : 'Employee Name', cell: (r) => (
        <div>
          <p className="text-small font-medium text-ink">{r.first_name_th} {r.last_name_th}</p>
          <p className="text-xs text-ink-muted">{r.first_name_en} {r.last_name_en}</p>
        </div>
      ),
    },
    { id: 'position', header: isTh ? 'ตำแหน่ง' : 'Position', cell: (r) => <span className="text-small text-ink">{r.position_title}</span> },
    { id: 'company', header: isTh ? 'บริษัท' : 'Company', cell: (r) => <span className="text-small text-ink-muted">{r.company}</span> },
    { id: 'org_unit', header: isTh ? 'หน่วยงาน' : 'Org Unit', cell: (r) => <span className="text-small text-ink-muted">{r.org_unit}</span> },
    {
      id: 'class', header: isTh ? 'ประเภท' : 'Class', cell: (r) => (
        <span className="text-small text-ink-muted">
          {r.employee_class === 'PARTIME' ? (isTh ? 'พาร์ทไทม์' : 'Part-time') : (isTh ? 'ประจำ' : 'Permanent')}
        </span>
      ),
    },
  ];

  const config: ModuleImportConfig<EmployeeImportRow> = {
    module: 'employees',
    eyebrowTh: 'ทะเบียนพนักงาน · นำเข้าข้อมูล',
    eyebrowEn: 'Employees · Bulk Import',
    titleTh: 'นำเข้าพนักงานแบบกลุ่ม',
    titleEn: 'Bulk Import Employees',
    subtitleTh: 'อัปโหลด CSV เพื่อเพิ่มหรือปรับปรุงทะเบียนพนักงานเป็นกลุ่ม',
    subtitleEn: 'Upload CSV to bulk-create or update employee records',
    csvHintColumns: 'employee_id, first_name_th, last_name_th, position_title, company, org_unit, employee_class, hire_date',
    previewColumns,
    sampleRows: SAMPLE_ROWS,
    rowKey: (r) => r.employee_id,
    validationItems: VALIDATION,
    jobsSeed: JOBS_SEED,
    commit: (rows) => importEmployees(rows),
  };

  return <ModuleImportWizard config={config} isTh={isTh} />;
}
