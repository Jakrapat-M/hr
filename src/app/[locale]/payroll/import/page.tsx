'use client';

// payroll/import — bulk payroll (payslip) import (MOCKUP).
//
// Thin config wrapper around the reusable ModuleImportWizard. Because /payroll
// is a TOP-LEVEL route (NOT under /admin/), it inherits NO automatic guard — so
// this page SELF-GUARDS to HR Admin tier and renders <AccessDenied> IN PLACE on
// deny (no redirect, URL preserved), mirroring the admin/layout pattern.
//
// The wizard's commit() writes parsed payslip rows into the usePayrollImport
// Zustand mock store, and a completed job lands in the import-jobs store +
// history table.

import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  ModuleImportWizard,
  type ModuleImportConfig,
  type ValidationItem,
} from '@/components/admin/import/ModuleImportWizard';
import type { DataTableColumn } from '@/components/humi';
import { AccessDenied } from '@/components/shared/access-denied';
import { useAuthStore } from '@/stores/auth-store';
import { hasRole } from '@/lib/rbac';
import { maskValue } from '@/lib/date';
import { usePayrollImport } from '@/stores/payroll-import-store';
import type { PayslipSummary } from '@/hooks/use-payroll';

// Sample preview rows — first 10 rows of an uploaded payroll CSV (mocked).
const SAMPLE_ROWS: PayslipSummary[] = [
  { employeeId: 'EMP-7001', employeeName: 'ธนกร ศรีสุข', department: 'Engineering', grossSalary: 82000, overtime: 4000, allowances: 3000, totalGross: 89000, incomeTax: 6800, sso: 750, pf: 4100, otherDeductions: 0, totalDeductions: 11650, netPay: 77350 },
  { employeeId: 'EMP-7002', employeeName: 'ปิยะนุช วงศ์ทอง', department: 'Finance', grossSalary: 68000, overtime: 0, allowances: 2000, totalGross: 70000, incomeTax: 4600, sso: 750, pf: 3400, otherDeductions: 0, totalDeductions: 8750, netPay: 61250 },
  { employeeId: 'EMP-7003', employeeName: 'อนุชา แก้วมณี', department: 'Retail', grossSalary: 32000, overtime: 6000, allowances: 1500, totalGross: 39500, incomeTax: 1200, sso: 750, pf: 1600, otherDeductions: 200, totalDeductions: 3750, netPay: 35750 },
  { employeeId: 'EMP-7004', employeeName: 'สุนิสา เจริญสุข', department: 'HR', grossSalary: 56000, overtime: 0, allowances: 1000, totalGross: 57000, incomeTax: 3100, sso: 750, pf: 2800, otherDeductions: 0, totalDeductions: 6650, netPay: 50350 },
  { employeeId: 'EMP-7005', employeeName: 'กิตติศักดิ์ ภูผา', department: 'Operations', grossSalary: 45000, overtime: 7000, allowances: 1500, totalGross: 53500, incomeTax: 2300, sso: 750, pf: 2250, otherDeductions: 0, totalDeductions: 5300, netPay: 48200 },
  { employeeId: 'EMP-7006', employeeName: 'รัชนก ทองดี', department: 'Marketing', grossSalary: 61000, overtime: 1000, allowances: 2500, totalGross: 64500, incomeTax: 3900, sso: 750, pf: 3050, otherDeductions: 500, totalDeductions: 8200, netPay: 56300, anomaly: 'มีรายการหักอื่นเพิ่ม' },
  { employeeId: 'EMP-7007', employeeName: 'ธีรเดช อินทร์แก้ว', department: 'IT', grossSalary: 75000, overtime: 0, allowances: 3000, totalGross: 78000, incomeTax: 5500, sso: 750, pf: 3750, otherDeductions: 0, totalDeductions: 10000, netPay: 68000 },
  { employeeId: 'EMP-7008', employeeName: 'พรทิพย์ มั่นคง', department: 'Retail', grossSalary: 33000, overtime: 4000, allowances: 1500, totalGross: 38500, incomeTax: 1100, sso: 750, pf: 1650, otherDeductions: 0, totalDeductions: 3500, netPay: 35000 },
  { employeeId: 'EMP-7009', employeeName: 'ชนาธิป สุขใจ', department: 'Supply Chain', grossSalary: 58000, overtime: 2000, allowances: 2000, totalGross: 62000, incomeTax: 3700, sso: 750, pf: 2900, otherDeductions: 0, totalDeductions: 7350, netPay: 54650 },
  { employeeId: 'EMP-7010', employeeName: 'มนตรี พงษ์ศักดิ์', department: 'Finance', grossSalary: 90000, overtime: 0, allowances: 5000, totalGross: 95000, incomeTax: 9200, sso: 750, pf: 4500, otherDeductions: 0, totalDeductions: 14450, netPay: 80550 },
];

const VALIDATION: ValidationItem[] = [
  { row: 1, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 2, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 3, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 4, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 5, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 6, severity: 'warning', messageTh: 'มีรายการหักอื่นที่ต้องตรวจสอบ', messageEn: 'Other-deduction needs review' },
  { row: 7, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 8, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 9, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 10, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
];

const JOBS_SEED = [
  {
    id: 'IMP-0311', module: 'payroll', filename: 'payroll_feb_2026.csv', type: 'payroll',
    status: 'completed' as const, started: '2026-05-22T10:15:00', records: 152, processed: 152, errors: 0,
    logLines: [
      '[10:15:00] Job IMP-0311 started',
      '[10:15:01] Parsed 152 rows from payroll_feb_2026.csv',
      '[10:15:03] Validation passed: 152/152 rows OK',
      '[10:15:06] Inserted 152 payslip records',
      '[10:15:06] Job IMP-0311 completed successfully',
    ],
  },
  {
    id: 'IMP-0305', module: 'payroll', filename: 'adjustments_q1.csv', type: 'payroll',
    status: 'completed' as const, started: '2026-05-19T16:40:00', records: 23, processed: 22, errors: 1,
    logLines: [
      '[16:40:00] Job IMP-0305 started',
      '[16:40:01] Parsed 23 rows from adjustments_q1.csv',
      '[16:40:02] Validation: 22 OK / 1 warning',
      '[16:40:02] WARNING row 14: net pay differs from gross − deductions — flagged',
      '[16:40:04] Inserted 22 payslip records (1 skipped)',
      '[16:40:04] Job IMP-0305 completed with warnings',
    ],
  },
];

export default function PayrollImportPage() {
  const locale = useLocale();
  const params = useParams<{ locale: string }>();
  const isTh = (params?.locale ?? locale ?? 'th') !== 'en';

  const roles = useAuthStore((s) => s.roles);
  const importPayslips = usePayrollImport((s) => s.importPayslips);

  // Self-guard: HR Admin tier only (route is not under /admin/). Deny in place.
  if (!hasRole(roles, 'hr_admin')) {
    return (
      <AccessDenied
        reason="Bulk payroll import is restricted to HR Admin and above."
        reasonTh="การนำเข้าเงินเดือนแบบกลุ่ม สงวนสิทธิ์เฉพาะ HR Admin ขึ้นไป"
      />
    );
  }

  // Currency formatter for preview (net/tax shown masked per masking rule).
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  const previewColumns: DataTableColumn<PayslipSummary>[] = [
    { id: 'employeeId', header: isTh ? 'รหัสพนักงาน' : 'Employee ID', cell: (r) => <span className="font-mono text-small">{r.employeeId}</span> },
    {
      id: 'name', header: isTh ? 'พนักงาน' : 'Employee', cell: (r) => (
        <div>
          <p className="text-small font-medium text-ink">{r.employeeName}</p>
          <p className="text-xs text-ink-muted">{r.department}</p>
        </div>
      ),
    },
    { id: 'gross', header: isTh ? 'รายได้รวม' : 'Total Gross', align: 'right', cell: (r) => <span className="text-small text-ink tabular-nums">{fmt(r.totalGross)}</span> },
    { id: 'tax', header: isTh ? 'ภาษี' : 'Tax', align: 'right', cell: (r) => <span className="text-small text-ink-muted tabular-nums">{maskValue(String(r.incomeTax), 2)}</span> },
    { id: 'deductions', header: isTh ? 'รายการหัก' : 'Deductions', align: 'right', cell: (r) => <span className="text-small text-ink-muted tabular-nums">{fmt(r.totalDeductions)}</span> },
    { id: 'net', header: isTh ? 'เงินได้สุทธิ' : 'Net Pay', align: 'right', cell: (r) => <span className="text-small font-medium text-ink tabular-nums">{maskValue(String(r.netPay), 2)}</span> },
  ];

  const config: ModuleImportConfig<PayslipSummary> = {
    module: 'payroll',
    eyebrowTh: 'เงินเดือน · นำเข้าข้อมูล',
    eyebrowEn: 'Payroll · Bulk Import',
    titleTh: 'นำเข้าเงินเดือนแบบกลุ่ม',
    titleEn: 'Bulk Import Payroll',
    subtitleTh: 'อัปโหลด CSV เพื่อนำเข้ารายการเงินเดือน (รายได้ รายการหัก และเงินได้สุทธิ) เป็นกลุ่ม',
    subtitleEn: 'Upload CSV to bulk-import payslip records (earnings, deductions, net pay)',
    csvHintColumns: 'employeeId, employeeName, department, totalGross, incomeTax, sso, pf, totalDeductions, netPay',
    previewColumns,
    sampleRows: SAMPLE_ROWS,
    rowKey: (r) => r.employeeId,
    validationItems: VALIDATION,
    jobsSeed: JOBS_SEED,
    commit: (rows) => importPayslips(rows),
  };

  return <ModuleImportWizard config={config} isTh={isTh} />;
}
