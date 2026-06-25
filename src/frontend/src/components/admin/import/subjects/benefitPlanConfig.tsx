'use client';

// benefitPlanConfig — "Add / adjust benefit" bulk-import subject (MOCKUP, STA-115).
//
// Completes the Bulk Import hub: the registry-driven subject for bulk-assigning
// or adjusting an individual benefit entitlement across many employees at once
// (the CSV/batch version of the per-employee "Add / adjust individual benefit"
// action). Mirrors subjects/employeeChangeConfig.tsx.
//
// Commit target (plan D3): there is NO persistent benefit-assignment store today
// (the per-employee Current Benefits table is a hardcoded constant). So this
// subject OMITS `commit` — the wizard still records a `benefit-plan` job-history
// row on run, giving a full, honest mockup (upload → preview → validate → result)
// without faking a write into the employee record. Reflecting committed imports
// onto the employee benefit table is a flagged follow-up (BA-Q1).
//
// Validation is REAL + pure: validateBenefitRows() classifies each row against
// the live employee set + BENEFIT_PLAN_REGISTRY, so the Validate step reflects
// actual data (and is unit-tested with crafted bad rows).
//
// NO-RED: this file emits no danger styling; action badges use teal/indigo
// tokens. The wizard renders validation severities with its own pumpkin tokens.

import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import type {
  ModuleImportConfig,
  ValidationItem,
} from '@/components/admin/import/ModuleImportWizard';
import type { DataTableColumn } from '@/components/humi';
import { useEmployees } from '@/lib/admin/store/useEmployees';
import { BENEFIT_PLAN_REGISTRY } from '@/data/benefits/plan-registry';
import type { ImportJob } from '@/stores/import-jobs-store';

export type BenefitAction = 'add' | 'adjust';

export interface BenefitAssignmentRow {
  employee_id: string;
  employee_name: string;
  action: BenefitAction;
  /** Must match a BENEFIT_PLAN_REGISTRY id (e.g. BE-MED-001). */
  plan_code: string;
  plan_name: string;
  /** Entitlement / override amount, THB, >= 0. */
  entitle_amount: number;
  /** ISO yyyy-mm-dd. */
  effective_date: string;
  /** Optional; blank → open-ended. */
  effective_end_date?: string;
  note?: string;
}

const VALID_PLAN_CODES: ReadonlySet<string> = new Set(
  BENEFIT_PLAN_REGISTRY.map((p) => p.id),
);

const isIsoDate = (s: string | undefined): boolean =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/**
 * Pure, testable validation: classify each row against the known employee set
 * and the benefit-plan registry. Error checks first; then warnings (adjust /
 * duplicate); else ok. Returns one ValidationItem per row (1-based).
 */
export function validateBenefitRows(
  rows: BenefitAssignmentRow[],
  knownEmployeeIds: ReadonlySet<string>,
): ValidationItem[] {
  const seen = new Set<string>();
  return rows.map((r, i) => {
    const row = i + 1;
    const err = (th: string, en: string): ValidationItem => ({ row, severity: 'error', messageTh: th, messageEn: en });
    const warn = (th: string, en: string): ValidationItem => ({ row, severity: 'warning', messageTh: th, messageEn: en });

    if (!knownEmployeeIds.has(r.employee_id)) {
      return err(`ไม่พบรหัสพนักงาน ${r.employee_id}`, `Unknown employee ${r.employee_id}`);
    }
    if (r.action !== 'add' && r.action !== 'adjust') {
      return err(`การกระทำไม่ถูกต้อง "${r.action}"`, `Invalid action "${r.action}"`);
    }
    if (!VALID_PLAN_CODES.has(r.plan_code)) {
      return err(`ไม่พบรหัสแผนสวัสดิการ ${r.plan_code}`, `Unknown plan code ${r.plan_code}`);
    }
    if (!Number.isFinite(r.entitle_amount) || r.entitle_amount < 0) {
      return err('จำนวนวงเงินไม่ถูกต้อง', 'Invalid entitlement amount');
    }
    if (!isIsoDate(r.effective_date)) {
      return err('วันที่มีผลไม่ถูกต้อง', 'Invalid effective date');
    }
    if (r.effective_end_date && (!isIsoDate(r.effective_end_date) || r.effective_end_date < r.effective_date)) {
      return err('วันสิ้นสุดไม่ถูกต้อง', 'Invalid end date');
    }
    const key = `${r.employee_id}:${r.plan_code}`;
    if (seen.has(key)) {
      return warn('รายการซ้ำ (พนักงาน+แผน) — ใช้ค่าล่าสุด', 'Duplicate (employee + plan) — last wins');
    }
    seen.add(key);
    if (r.action === 'adjust') {
      return warn('ปรับสิทธิ — ตรวจสอบว่าพนักงานลงทะเบียนแผนนี้แล้ว', 'Adjust — verify the employee already holds this plan');
    }
    return { row, severity: 'ok', messageTh: 'ถูกต้อง', messageEn: 'Valid' };
  });
}

// Sample rows: realistic add+adjust mix over seeded employees + real plan codes.
// All valid (a clean happy-path run completes); bad-row classification is proven
// in the unit test with crafted rows.
const SAMPLE_ROWS: BenefitAssignmentRow[] = [
  { employee_id: 'EMP-0001', employee_name: 'Somchai Jaidee', action: 'add', plan_code: 'BE-MED-001', plan_name: 'Medical Reimbursement (OPD)', entitle_amount: 40000, effective_date: '2026-01-01', note: '' },
  { employee_id: 'EMP-0002', employee_name: 'Vipa Suwan', action: 'add', plan_code: 'BE-DEN-001', plan_name: 'Dental Reimbursement', entitle_amount: 8000, effective_date: '2026-01-01', note: '' },
  { employee_id: 'EMP-0003', employee_name: 'Wichai Thongdee', action: 'add', plan_code: 'BE-PHY-001', plan_name: 'Annual Physical Checkup — Package A', entitle_amount: 6000, effective_date: '2026-01-01', note: '' },
  { employee_id: 'EMP-0004', employee_name: 'Piya Saengsri', action: 'add', plan_code: 'BE-MED-001', plan_name: 'Medical Reimbursement (OPD)', entitle_amount: 40000, effective_date: '2026-01-01', note: '' },
  { employee_id: 'EMP-0005', employee_name: 'Luksana Wongsri', action: 'add', plan_code: 'BE-MED-004', plan_name: 'Medical Reimbursement — Dependent', entitle_amount: 25000, effective_date: '2026-02-01', note: 'New dependent' },
  { employee_id: 'EMP-0006', employee_name: 'Anuwat Meesuk', action: 'add', plan_code: 'BE-PHY-002', plan_name: 'Annual Physical Checkup — Package B', entitle_amount: 9000, effective_date: '2026-01-01', note: '' },
  { employee_id: 'EMP-0007', employee_name: 'Chalida Sapmark', action: 'add', plan_code: 'BE-DEN-001', plan_name: 'Dental Reimbursement', entitle_amount: 8000, effective_date: '2026-01-01', note: '' },
  { employee_id: 'EMP-0008', employee_name: 'Thana Srisawat', action: 'adjust', plan_code: 'BE-MED-001', plan_name: 'Medical Reimbursement (OPD)', entitle_amount: 55000, effective_date: '2026-03-01', note: 'Override per band promotion' },
  { employee_id: 'EMP-0009', employee_name: 'Kanokwan Sukjai', action: 'adjust', plan_code: 'BE-PHY-001', plan_name: 'Annual Physical Checkup — Package A', entitle_amount: 7500, effective_date: '2026-03-01', note: 'Top-up' },
  { employee_id: 'EMP-0010', employee_name: 'Suphachai Phongthai', action: 'adjust', plan_code: 'BE-MED-004', plan_name: 'Medical Reimbursement — Dependent', entitle_amount: 30000, effective_date: '2026-04-01', note: '' },
];

const JOBS_SEED: ImportJob[] = [
  {
    id: 'IMP-0231', module: 'benefit-plan', filename: 'benefit_grant_q1_2026.csv', type: 'benefit-plan',
    status: 'completed', started: '2026-06-18T09:30:00', records: 34, processed: 34, errors: 0,
    logLines: [
      '[09:30:00] Job IMP-0231 started',
      '[09:30:01] Parsed 34 rows from benefit_grant_q1_2026.csv',
      '[09:30:02] Validation passed: 34/34 rows OK',
      '[09:30:04] Recorded 34 benefit assignments (28 add / 6 adjust)',
      '[09:30:04] Job IMP-0231 completed successfully',
    ],
  },
  {
    id: 'IMP-0226', module: 'benefit-plan', filename: 'entitlement_override_may.csv', type: 'benefit-plan',
    status: 'completed', started: '2026-06-11T14:05:00', records: 12, processed: 11, errors: 1,
    logLines: [
      '[14:05:00] Job IMP-0226 started',
      '[14:05:01] Parsed 12 rows from entitlement_override_may.csv',
      '[14:05:02] Validation: 11 OK / 1 error',
      '[14:05:02] ERROR row 7: plan code "BE-XXX-000" not found — skipped',
      '[14:05:03] Recorded 11 benefit assignments (1 skipped)',
      '[14:05:03] Job IMP-0226 completed with errors',
    ],
  },
];

const actionBadge = (action: BenefitAction, isTh: boolean) => {
  const label = action === 'add' ? (isTh ? 'เพิ่ม' : 'Add') : (isTh ? 'ปรับสิทธิ' : 'Adjust');
  const tone = action === 'add' ? 'bg-accent-soft text-accent' : 'bg-info-soft text-info';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-small font-medium ${tone}`}>
      {label}
    </span>
  );
};

/**
 * useBenefitPlanImportConfig — wires the "Add / adjust benefit" subject.
 * No commit (D3 — no persistent benefit-assignment store yet); the wizard records
 * the run as a `benefit-plan` job-history row. Must be called inside a component.
 */
export function useBenefitPlanImportConfig(): ModuleImportConfig<BenefitAssignmentRow> {
  const locale = useLocale();
  const params = useParams<{ locale: string }>();
  const isTh = (params?.locale ?? locale ?? 'th') !== 'en';

  const employees = useEmployees((s) => s.all);
  const knownIds = new Set(employees.map((e) => e.employee_id));

  const previewColumns: DataTableColumn<BenefitAssignmentRow>[] = [
    {
      id: 'employee', header: isTh ? 'พนักงาน' : 'Employee', cell: (r) => (
        <div className="leading-tight">
          <span className="font-mono text-small text-ink">{r.employee_id}</span>
          <span className="block text-small text-ink-muted">{r.employee_name}</span>
        </div>
      ),
    },
    { id: 'action', header: isTh ? 'การกระทำ' : 'Action', cell: (r) => actionBadge(r.action, isTh) },
    {
      id: 'plan', header: isTh ? 'แผนสวัสดิการ' : 'Benefit plan', cell: (r) => (
        <div className="leading-tight">
          <span className="font-mono text-small text-ink">{r.plan_code}</span>
          <span className="block text-small text-ink-muted">{r.plan_name}</span>
        </div>
      ),
    },
    { id: 'amount', header: isTh ? 'วงเงิน (บาท)' : 'Entitlement (THB)', cell: (r) => <span className="text-small tabular-nums text-ink">{r.entitle_amount.toLocaleString('th-TH')}</span> },
    { id: 'effective', header: isTh ? 'วันที่มีผล' : 'Effective date', cell: (r) => <span className="text-small text-ink-muted">{r.effective_date}{r.effective_end_date ? ` → ${r.effective_end_date}` : ''}</span> },
    { id: 'note', header: isTh ? 'หมายเหตุ' : 'Note', cell: (r) => <span className="text-small text-ink-muted">{r.note || '—'}</span> },
  ];

  return {
    module: 'benefit-plan',
    eyebrowTh: 'เพิ่ม/ปรับสิทธิสวัสดิการ · นำเข้าแบบกลุ่ม',
    eyebrowEn: 'Add / adjust benefit · Bulk Import',
    titleTh: 'เพิ่ม/ปรับสิทธิสวัสดิการแบบกลุ่ม',
    titleEn: 'Bulk add / adjust benefit assignments',
    subtitleTh: 'อัปโหลด CSV เพื่อกำหนดหรือปรับวงเงินสิทธิสวัสดิการให้พนักงานหลายคนพร้อมกัน',
    subtitleEn: 'Upload CSV to assign or adjust benefit entitlements for many employees at once',
    csvHintColumns: 'employee_id, action, plan_code, entitle_amount, effective_date, effective_end_date, note',
    previewColumns,
    sampleRows: SAMPLE_ROWS,
    rowKey: (r) => `${r.employee_id}:${r.plan_code}`,
    validationItems: validateBenefitRows(SAMPLE_ROWS, knownIds),
    jobsSeed: JOBS_SEED,
    // No commit — mockup has no persistent benefit-assignment store (plan D3).
  };
}
