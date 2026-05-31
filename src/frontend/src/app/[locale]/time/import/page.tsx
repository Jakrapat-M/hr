'use client';

// time/import — bulk timesheet (attendance) import (MOCKUP).
//
// Thin config wrapper around the reusable ModuleImportWizard. Because /time is a
// TOP-LEVEL route (NOT under /admin/), it inherits NO automatic guard — so this
// page SELF-GUARDS to HR Admin tier and renders <AccessDenied> IN PLACE on deny
// (no redirect, URL preserved), mirroring the payroll/import pattern.
//
// The wizard's commit() writes parsed timesheet rows into the useTimesheetImport
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
import { formatDate } from '@/lib/date';
import { useTimesheetImport } from '@/stores/timesheet-import-store';
import type { TimesheetSubmission } from '@/stores/timesheet-submissions';

// Sample preview rows — first 10 rows of an uploaded timesheet CSV (mocked).
const SAMPLE_ROWS: TimesheetSubmission[] = [
  { id: 'TS-IMP-8001', employeeId: 'EMP-8001', employeeName: 'ธนกร ศรีสุข', weekStart: '2026-05-18', rows: [], totalHours: 40, status: 'submitted', submittedAt: '2026-05-23T09:00:00.000Z' },
  { id: 'TS-IMP-8002', employeeId: 'EMP-8002', employeeName: 'ปิยะนุช วงศ์ทอง', weekStart: '2026-05-18', rows: [], totalHours: 42, status: 'submitted', submittedAt: '2026-05-23T09:05:00.000Z' },
  { id: 'TS-IMP-8003', employeeId: 'EMP-8003', employeeName: 'อนุชา แก้วมณี', weekStart: '2026-05-18', rows: [], totalHours: 38, status: 'submitted', submittedAt: '2026-05-23T09:10:00.000Z' },
  { id: 'TS-IMP-8004', employeeId: 'EMP-8004', employeeName: 'สุนิสา เจริญสุข', weekStart: '2026-05-18', rows: [], totalHours: 45, status: 'submitted', submittedAt: '2026-05-23T09:15:00.000Z' },
  { id: 'TS-IMP-8005', employeeId: 'EMP-8005', employeeName: 'กิตติศักดิ์ ภูผา', weekStart: '2026-05-18', rows: [], totalHours: 40, status: 'submitted', submittedAt: '2026-05-23T09:20:00.000Z' },
  { id: 'TS-IMP-8006', employeeId: 'EMP-8006', employeeName: 'รัชนก ทองดี', weekStart: '2026-05-18', rows: [], totalHours: 52, status: 'submitted', submittedAt: '2026-05-23T09:25:00.000Z' },
  { id: 'TS-IMP-8007', employeeId: 'EMP-8007', employeeName: 'ธีรเดช อินทร์แก้ว', weekStart: '2026-05-18', rows: [], totalHours: 40, status: 'submitted', submittedAt: '2026-05-23T09:30:00.000Z' },
  { id: 'TS-IMP-8008', employeeId: 'EMP-8008', employeeName: 'พรทิพย์ มั่นคง', weekStart: '2026-05-18', rows: [], totalHours: 37, status: 'submitted', submittedAt: '2026-05-23T09:35:00.000Z' },
  { id: 'TS-IMP-8009', employeeId: 'EMP-8009', employeeName: 'ชนาธิป สุขใจ', weekStart: '2026-05-18', rows: [], totalHours: 41, status: 'submitted', submittedAt: '2026-05-23T09:40:00.000Z' },
  { id: 'TS-IMP-8010', employeeId: 'EMP-8010', employeeName: 'มนตรี พงษ์ศักดิ์', weekStart: '2026-05-18', rows: [], totalHours: 40, status: 'submitted', submittedAt: '2026-05-23T09:45:00.000Z' },
];

const VALIDATION: ValidationItem[] = [
  { row: 1, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 2, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 3, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 4, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 5, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 6, severity: 'warning', messageTh: 'ชั่วโมงรวมเกิน 48 ชม./สัปดาห์ ต้องตรวจสอบ OT', messageEn: 'Weekly hours exceed 48h — review overtime' },
  { row: 7, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 8, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 9, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
  { row: 10, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' },
];

const JOBS_SEED = [
  {
    id: 'IMP-0412', module: 'time', filename: 'timesheets_wk20_2026.csv', type: 'time',
    status: 'completed' as const, started: '2026-05-23T08:10:00', records: 96, processed: 96, errors: 0,
    logLines: [
      '[08:10:00] Job IMP-0412 started',
      '[08:10:01] Parsed 96 rows from timesheets_wk20_2026.csv',
      '[08:10:02] Validation passed: 96/96 rows OK',
      '[08:10:05] Inserted 96 timesheet records',
      '[08:10:05] Job IMP-0412 completed successfully',
    ],
  },
  {
    id: 'IMP-0407', module: 'time', filename: 'attendance_corrections.csv', type: 'time',
    status: 'completed' as const, started: '2026-05-20T15:30:00', records: 31, processed: 30, errors: 1,
    logLines: [
      '[15:30:00] Job IMP-0407 started',
      '[15:30:01] Parsed 31 rows from attendance_corrections.csv',
      '[15:30:02] Validation: 30 OK / 1 warning',
      '[15:30:02] WARNING row 7: weekly total 61h exceeds cap — flagged for OT review',
      '[15:30:04] Inserted 30 timesheet records (1 skipped)',
      '[15:30:04] Job IMP-0407 completed with warnings',
    ],
  },
];

export default function TimeImportPage() {
  const locale = useLocale();
  const params = useParams<{ locale: string }>();
  const isTh = (params?.locale ?? locale ?? 'th') !== 'en';

  const roles = useAuthStore((s) => s.roles);
  const importTimesheets = useTimesheetImport((s) => s.importTimesheets);

  // Self-guard: HR Admin tier only (route is not under /admin/). Deny in place.
  if (!hasRole(roles, 'hr_admin')) {
    return (
      <AccessDenied
        reason="Bulk timesheet import is restricted to HR Admin and above."
        reasonTh="การนำเข้าใบลงเวลาแบบกลุ่ม สงวนสิทธิ์เฉพาะ HR Admin ขึ้นไป"
      />
    );
  }

  const previewColumns: DataTableColumn<TimesheetSubmission>[] = [
    { id: 'employeeId', header: isTh ? 'รหัสพนักงาน' : 'Employee ID', cell: (r) => <span className="font-mono text-small">{r.employeeId}</span> },
    {
      id: 'name', header: isTh ? 'พนักงาน' : 'Employee', cell: (r) => (
        <span className="text-small font-medium text-ink">{r.employeeName}</span>
      ),
    },
    { id: 'weekStart', header: isTh ? 'สัปดาห์เริ่ม' : 'Week of', cell: (r) => <span className="text-small text-ink-muted">{formatDate(r.weekStart, 'medium', isTh ? 'th' : 'en')}</span> },
    { id: 'total', header: isTh ? 'ชั่วโมงรวม' : 'Total hours', align: 'right', cell: (r) => <span className="text-small text-ink tabular-nums">{r.totalHours}</span> },
    {
      id: 'status', header: isTh ? 'สถานะ' : 'Status', cell: () => (
        <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-ink">
          {isTh ? 'ส่งแล้ว' : 'Submitted'}
        </span>
      ),
    },
  ];

  const config: ModuleImportConfig<TimesheetSubmission> = {
    module: 'time',
    eyebrowTh: 'ลงเวลา · นำเข้าข้อมูล',
    eyebrowEn: 'Time & Attendance · Bulk Import',
    titleTh: 'นำเข้าใบลงเวลาแบบกลุ่ม',
    titleEn: 'Bulk Import Timesheets',
    subtitleTh: 'อัปโหลด CSV เพื่อนำเข้าใบลงเวลาและชั่วโมงทำงานรายสัปดาห์เป็นกลุ่ม',
    subtitleEn: 'Upload CSV to bulk-import weekly timesheets and attendance hours',
    csvHintColumns: 'employeeId, employeeName, weekStart, totalHours, status',
    previewColumns,
    sampleRows: SAMPLE_ROWS,
    rowKey: (r) => r.id,
    validationItems: VALIDATION,
    jobsSeed: JOBS_SEED,
    commit: (rows) => importTimesheets(rows),
  };

  return <ModuleImportWizard config={config} isTh={isTh} />;
}
