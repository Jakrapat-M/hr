// report-builder-subjects.ts — Subject registry for the subject-selectable report builder.
//
// Each SUBJECT declares its column universe + the filters it supports + a pure
// `compute(scopedEmployees, filters)` that aggregates the existing MOCK data into
// preview rows. MOCKUP ONLY — everything is derived client-side from existing
// seeds (ALL_PORTED_EMPLOYEES persona-scoped, hrbp-/manager-reports mocks). No backend.
//
// Persona scoping note (intentional asymmetry, documented):
//   - Employee-derived subjects (headcount / leave / turnover) compute over the
//     persona-scoped employee slice passed in (filterEmployeesByPersona) so the
//     same data-scope posture as /reports applies.
//   - Benefits subjects (enrollment / claims) read the scope-agnostic
//     hrbp-reports-mock pool (full pool, not persona-narrowed here). This matches
//     the report-builder's portfolio-wide posture for benefits subjects.

import type { CnextEmployee } from './cnext-mock-data';
import { getClaimReportData, getEnrollmentByPlan } from './hrbp-reports-mock';
import { formatDate } from './date';
import type { ScopeMode } from './scope-filter';

export type SubjectId =
  | 'headcount-by-dept'
  | 'headcount-roster'
  | 'leave-summary'
  | 'turnover'
  | 'benefits-enrollment'
  | 'benefits-claims';

export interface SubjectColumn {
  /** Stable key used as the row property + CSV accessor + column id. */
  id: string;
  labelTh: string;
  labelEn: string;
  align?: 'left' | 'right';
}

export interface SubjectFilter {
  id: string;
  labelTh: string;
  labelEn: string;
  /** Option values + bilingual labels. Empty value = "all". */
  options: ReadonlyArray<{ value: string; labelTh: string; labelEn: string }>;
}

export type ReportRow = Record<string, string | number>;

export interface ReportSubject {
  id: SubjectId;
  labelTh: string;
  labelEn: string;
  columns: SubjectColumn[];
  filters: SubjectFilter[];
  /**
   * Minimum persona scope that may see this subject. Drives the per-persona
   * report SET: a manager (direct-reports) sees only employee subjects; HRBP+
   * (bu / all) additionally see the org-wide benefits subjects. Defaults to
   * 'direct-reports' (visible to manager and above).
   */
  minScope?: ScopeMode;
  /** Pure aggregation. `employees` is already persona-scoped by the caller. */
  compute: (
    employees: ReadonlyArray<CnextEmployee>,
    filters: Record<string, string>,
    locale: string,
  ) => ReportRow[];
}

/** Scope-mode ranking — higher number = wider entitlement. */
const SCOPE_RANK: Record<ScopeMode, number> = {
  self: 0,
  'direct-reports': 1,
  bu: 2,
  all: 3,
};

/**
 * Filter the full subject registry down to what a persona's scope may see.
 * Benefits subjects require `bu` scope (HRBP) or wider; employee subjects are
 * visible to managers and above. This is what makes a manager's report set
 * strictly smaller than an admin's.
 */
export function subjectsForScope(
  employees: ReadonlyArray<CnextEmployee>,
  mode: ScopeMode,
): ReportSubject[] {
  const rank = SCOPE_RANK[mode];
  return buildSubjects(employees).filter(
    (s) => rank >= SCOPE_RANK[s.minScope ?? 'direct-reports'],
  );
}

const STATUS_FILTER: SubjectFilter = {
  id: 'status',
  labelTh: 'สถานะ',
  labelEn: 'Status',
  options: [
    { value: 'active', labelTh: 'ทำงาน', labelEn: 'Active' },
    { value: 'leave', labelTh: 'ลา', labelEn: 'On leave' },
    { value: 'terminated', labelTh: 'พ้นสภาพ', labelEn: 'Terminated' },
  ],
};

function deptFilter(employees: ReadonlyArray<CnextEmployee>): SubjectFilter {
  const depts = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();
  return {
    id: 'department',
    labelTh: 'แผนก',
    labelEn: 'Department',
    options: depts.map((d) => ({ value: d, labelTh: d, labelEn: d })),
  };
}

const NEW_HIRE_WINDOW: SubjectFilter = {
  id: 'window',
  labelTh: 'ช่วงเวลาเข้างาน',
  labelEn: 'Hire window',
  options: [
    { value: '90', labelTh: '90 วันล่าสุด', labelEn: 'Last 90 days' },
    { value: '180', labelTh: '180 วันล่าสุด', labelEn: 'Last 180 days' },
    { value: '365', labelTh: '1 ปีล่าสุด', labelEn: 'Last 12 months' },
  ],
};

const PLAN_STATUS_FILTER: SubjectFilter = {
  id: 'status',
  labelTh: 'สถานะเคลม',
  labelEn: 'Claim status',
  options: [
    { value: 'approved', labelTh: 'อนุมัติ', labelEn: 'Approved' },
    { value: 'pending', labelTh: 'รออนุมัติ', labelEn: 'Pending' },
    { value: 'rejected', labelTh: 'ปฏิเสธ', labelEn: 'Rejected' },
  ],
};

function applyDeptStatus(
  employees: ReadonlyArray<CnextEmployee>,
  filters: Record<string, string>,
): CnextEmployee[] {
  return employees.filter((e) => {
    if (filters.department && e.department !== filters.department) return false;
    if (filters.status && e.status !== filters.status) return false;
    return true;
  });
}

/** Build the dynamic registry. Filters that depend on the scoped pool (department) are derived per call. */
export function buildSubjects(
  employees: ReadonlyArray<CnextEmployee>,
): ReportSubject[] {
  const dept = deptFilter(employees);

  return [
    {
      id: 'headcount-by-dept',
      labelTh: 'กำลังคนตามแผนก',
      labelEn: 'Headcount by department',
      columns: [
        { id: 'department', labelTh: 'แผนก', labelEn: 'Department' },
        { id: 'total', labelTh: 'ทั้งหมด', labelEn: 'Headcount', align: 'right' },
        { id: 'active', labelTh: 'ทำงาน', labelEn: 'Active', align: 'right' },
        { id: 'leave', labelTh: 'ลา', labelEn: 'On leave', align: 'right' },
      ],
      filters: [dept],
      compute: (emps, filters) => {
        const scoped = applyDeptStatus(emps, { department: filters.department ?? '' });
        const map = new Map<string, ReportRow>();
        for (const e of scoped) {
          const key = e.department || '—';
          const row = (map.get(key) as { department: string; total: number; active: number; leave: number } | undefined)
            ?? { department: key, total: 0, active: 0, leave: 0 };
          row.total += 1;
          if (e.status === 'active') row.active += 1;
          if (e.status === 'leave') row.leave += 1;
          map.set(key, row);
        }
        return [...map.values()].sort((a, b) => Number(b.total) - Number(a.total));
      },
    },
    {
      id: 'headcount-roster',
      labelTh: 'รายชื่อพนักงาน',
      labelEn: 'Employee roster',
      columns: [
        { id: 'code', labelTh: 'รหัสพนักงาน', labelEn: 'Employee ID' },
        { id: 'name', labelTh: 'ชื่อ-สกุล', labelEn: 'Name' },
        { id: 'department', labelTh: 'แผนก', labelEn: 'Department' },
        { id: 'position', labelTh: 'ตำแหน่ง', labelEn: 'Position' },
        { id: 'status', labelTh: 'สถานะ', labelEn: 'Status' },
        { id: 'hireDate', labelTh: 'วันเริ่มงาน', labelEn: 'Hire date' },
      ],
      filters: [dept, STATUS_FILTER],
      compute: (emps, filters, locale) =>
        applyDeptStatus(emps, filters).map((e) => ({
          code: e.employeeCode,
          name: `${e.firstNameTh} ${e.lastNameTh}`.trim(),
          department: e.department || '—',
          position: e.jobTitle || e.position || '—',
          status: e.status,
          hireDate: e.hireDate ? formatDate(e.hireDate, 'medium', locale) : '—',
        })),
    },
    {
      id: 'leave-summary',
      labelTh: 'สรุปการลา',
      labelEn: 'Leave summary',
      columns: [
        { id: 'code', labelTh: 'รหัสพนักงาน', labelEn: 'Employee ID' },
        { id: 'name', labelTh: 'ชื่อ-สกุล', labelEn: 'Name' },
        { id: 'department', labelTh: 'แผนก', labelEn: 'Department' },
        { id: 'status', labelTh: 'สถานะ', labelEn: 'Status' },
      ],
      filters: [dept],
      compute: (emps, filters) =>
        applyDeptStatus(emps, { department: filters.department ?? '' })
          .filter((e) => e.status === 'leave')
          .map((e) => ({
            code: e.employeeCode,
            name: `${e.firstNameTh} ${e.lastNameTh}`.trim(),
            department: e.department || '—',
            status: e.status,
          })),
    },
    {
      id: 'turnover',
      labelTh: 'พนักงานเข้าใหม่',
      labelEn: 'New hires',
      columns: [
        { id: 'code', labelTh: 'รหัสพนักงาน', labelEn: 'Employee ID' },
        { id: 'name', labelTh: 'ชื่อ-สกุล', labelEn: 'Name' },
        { id: 'department', labelTh: 'แผนก', labelEn: 'Department' },
        { id: 'hireDate', labelTh: 'วันเริ่มงาน', labelEn: 'Hire date' },
      ],
      filters: [NEW_HIRE_WINDOW, dept],
      compute: (emps, filters, locale) => {
        const windowDays = Number(filters.window || '180');
        const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
        return applyDeptStatus(emps, { department: filters.department ?? '' })
          .filter((e) => {
            if (!e.hireDate) return false;
            const t = new Date(e.hireDate).getTime();
            return !Number.isNaN(t) && t >= cutoff;
          })
          .sort((a, b) => new Date(b.hireDate ?? 0).getTime() - new Date(a.hireDate ?? 0).getTime())
          .map((e) => ({
            code: e.employeeCode,
            name: `${e.firstNameTh} ${e.lastNameTh}`.trim(),
            department: e.department || '—',
            hireDate: e.hireDate ? formatDate(e.hireDate, 'medium', locale) : '—',
          }));
      },
    },
    {
      id: 'benefits-enrollment',
      labelTh: 'การลงทะเบียนสวัสดิการ',
      labelEn: 'Benefits enrollment',
      minScope: 'bu',
      columns: [
        { id: 'planCode', labelTh: 'รหัสแผน', labelEn: 'Plan code' },
        { id: 'planName', labelTh: 'ชื่อแผน', labelEn: 'Plan' },
        { id: 'enrolled', labelTh: 'ลงทะเบียน', labelEn: 'Enrolled', align: 'right' },
        { id: 'total', labelTh: 'ทั้งหมด', labelEn: 'Eligible', align: 'right' },
        { id: 'pct', labelTh: 'สัดส่วน (%)', labelEn: 'Rate (%)', align: 'right' },
      ],
      filters: [],
      compute: (_emps, _filters, locale) => {
        const isTh = locale !== 'en';
        return getEnrollmentByPlan().map((p) => ({
          planCode: p.planCode,
          planName: isTh ? p.planNameTh : p.planNameEn,
          enrolled: p.enrolled,
          total: p.total,
          pct: p.pct,
        }));
      },
    },
    {
      id: 'benefits-claims',
      labelTh: 'เคลมสวัสดิการ',
      labelEn: 'Benefits claims',
      minScope: 'bu',
      columns: [
        { id: 'claimId', labelTh: 'เลขที่เคลม', labelEn: 'Claim ID' },
        { id: 'name', labelTh: 'ชื่อ-สกุล', labelEn: 'Name' },
        { id: 'planName', labelTh: 'แผน', labelEn: 'Plan' },
        { id: 'amount', labelTh: 'จำนวน (บาท)', labelEn: 'Amount (THB)', align: 'right' },
        { id: 'status', labelTh: 'สถานะ', labelEn: 'Status' },
        { id: 'date', labelTh: 'วันที่', labelEn: 'Date' },
      ],
      filters: [PLAN_STATUS_FILTER],
      compute: (_emps, filters, locale) => {
        const isTh = locale !== 'en';
        return getClaimReportData()
          .filter((c) => !filters.status || c.status === filters.status)
          .map((c) => ({
            claimId: c.claimId,
            name: isTh ? c.nameTh : c.nameEn,
            planName: isTh ? c.planNameTh : c.planNameEn,
            amount: c.amountThb,
            status: c.status,
            date: formatDate(c.date, 'medium', locale),
          }));
      },
    },
  ];
}
