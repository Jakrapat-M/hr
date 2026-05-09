// demo-org-chart.ts — in-repo demo org chart for stable persona resolution.
// Used by benefit claim forms to derive managerId without a live API call.

export interface DemoEmployee {
  id: string;
  nameTh: string;
  nameEn: string;
  managerId: string | null;
  groups: ReadonlyArray<'employees' | 'managers' | 'hr-auditors' | 'finance-team'>;
}

export const DEMO_EMPLOYEES: ReadonlyArray<DemoEmployee> = [
  { id: 'emp-001', nameTh: 'สมชาย ใจดี',       nameEn: 'Somchai Jaidee',       managerId: 'mgr-007', groups: ['employees'] },
  { id: 'emp-002', nameTh: 'สมหญิง รักงาน',    nameEn: 'Somying Rakngan',      managerId: 'mgr-007', groups: ['employees'] },
  { id: 'emp-042', nameTh: 'วิชัย ทำดี',        nameEn: 'Wichai Thamdee',       managerId: 'mgr-007', groups: ['employees'] },
  { id: 'emp-100', nameTh: 'ปรียา สุขใจ',       nameEn: 'Preeya Sukjai',        managerId: 'mgr-021', groups: ['employees'] },
  { id: 'emp-101', nameTh: 'ธนา รวยมาก',        nameEn: 'Thana Ruaymak',        managerId: 'mgr-021', groups: ['employees'] },
  { id: 'mgr-007', nameTh: 'ผ่องศรี เก่งงาน',  nameEn: 'Phongsri Kengngan',    managerId: 'demo',    groups: ['employees', 'managers'] },
  { id: 'mgr-021', nameTh: 'นิรันดร์ บริหาร',  nameEn: 'Niran Borihan',        managerId: 'demo',    groups: ['employees', 'managers'] },
  { id: 'demo',    nameTh: 'ผู้บริหารใหญ่',    nameEn: 'Big Boss',             managerId: null,      groups: ['employees', 'managers'] },
];

const _empById = new Map<string, DemoEmployee>(DEMO_EMPLOYEES.map((e) => [e.id, e]));

export function lookupEmployee(id: string): DemoEmployee | null {
  return _empById.get(id) ?? null;
}

/** Returns the managerId for the given employeeId. Falls back to "demo" when unknown. */
export function lookupManagerId(employeeId: string): string {
  const emp = _empById.get(employeeId);
  return emp?.managerId ?? 'demo';
}

/** Returns the display name for an employee id. Falls back to the id itself when unknown. */
export function lookupName(id: string, locale: 'th' | 'en'): string {
  const emp = _empById.get(id);
  if (!emp) return id;
  return locale === 'th' ? emp.nameTh : emp.nameEn;
}
