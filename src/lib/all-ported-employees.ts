// ════════════════════════════════════════════════════════════
// Shared 212-employee pool for /profile/me, /admin/employees,
// /manager-dashboard, /admin/change-requests.
//
// Composition: 12 existing (with SF parity overlay) + 88 synthetic
// + 100 REAL SF QAS employees (T5 Real Data Port). Synthetic kept for
// backwards compat with sprint #82-#85 fields tied to emp-001..emp-100;
// SF real adds 100 emp-sf-X with authentic Thai dept / position / hireDate.
//
// Extracted from /profile/me/page.tsx 2026-04-26 to enable scope-filter
// wire-up in /admin/employees + /manager-dashboard (Track A).
// ════════════════════════════════════════════════════════════

import { HUMI_EMPLOYEES, type HumiEmployee } from './humi-mock-data';
import { SF_PARITY_NEW_EMPLOYEES, withSfParity } from './humi-mock-data-sf-parity';
import { SF_REAL_EMPLOYEES } from './humi-mock-data-sf-real';

// ────────────────────────────────────────────────────────────
// P2 — Deterministic scope seeding (businessUnitId + managerId).
//
// The raw source rows carry INCONSISTENT scope fields: synthetic rows use
// email-valued managerId ('manager@humi.test') + label BUs ('BU-004-CDS'),
// while SF-real rows use emp-sf-X managerId + numeric BUs ('10000001').
// scope-filter.ts compares `managerId === self.id` and
// `businessUnitId === self.businessUnitId`, so the mixed shapes never resolve
// to a realistic cohort.
//
// We re-derive BOTH fields from stable fields (department, id) on the composed
// pool so 'bu' and 'direct-reports' scope modes resolve to non-empty,
// realistic sets. Fully deterministic — no randomness, reproducible from id.
// ────────────────────────────────────────────────────────────

/** Canonical Business Units — a small realistic set keyed by function. */
const BU_PEOPLE = 'BU-PEOPLE'; // HR / People & Org (emp-007 HRBP cohort)
const BU_FINANCE = 'BU-FINANCE'; // Finance & Accounting (emp-002 Manager)
const BU_TECH = 'BU-TECH'; // IT / Engineering / Data
const BU_STRATEGY = 'BU-STRATEGY'; // Corporate strategy & projects
const BU_LEGAL = 'BU-LEGAL'; // Legal & compliance
const BU_RETAIL = 'BU-RETAIL'; // Sales / store ops / retail
const BU_OPS = 'BU-OPS'; // Operations / admin / general

/**
 * Map a (Thai or EN) department label onto one of the canonical BUs.
 * Substring match keeps the derivation stable as new dept labels appear.
 */
function deriveBusinessUnitId(department: string): string {
  const d = department.toLowerCase();
  if (
    department.includes('ทรัพยากรบุคคล') ||
    d.includes('hr') ||
    d.includes('people') ||
    d.includes('branding')
  )
    return BU_PEOPLE;
  if (department.includes('การเงิน') || department.includes('บัญชี') || d.includes('financ'))
    return BU_FINANCE;
  if (
    department.includes('เทคโนโลยี') ||
    d.includes('it') ||
    d.includes('tech') ||
    d.includes('data') ||
    d.includes('digital')
  )
    return BU_TECH;
  if (department.includes('กลยุทธ์') || d.includes('strateg') || d.includes('project'))
    return BU_STRATEGY;
  if (department.includes('กฎหมาย') || d.includes('legal') || d.includes('complian'))
    return BU_LEGAL;
  if (
    department.includes('ขาย') ||
    department.includes('การตลาด') ||
    d.includes('sales') ||
    d.includes('store') ||
    d.includes('retail') ||
    d.includes('brand') ||
    d.includes('shoe') ||
    d.includes('cashier') ||
    d.includes('food') ||
    d.includes('delica')
  )
    return BU_RETAIL;
  return BU_OPS; // ปฏิบัติการ / ธุรการ / OPS / anything else
}

/**
 * Pick a deterministic manager (emp-id) for a given employee within the pool.
 *
 * Strategy: each BU gets a designated head (the first manager-tier persona we
 * pin per BU). Everyone in that BU — except the head — reports to the head,
 * forming a shallow 2-level tree (no cycles). Top-of-org rows (the heads)
 * report to null.
 *
 *   BU-PEOPLE   head → emp-007  (HRBP persona; gives /hrbp/employees a cohort)
 *   BU-FINANCE  head → emp-002  (Manager persona; gives direct-reports a list)
 *   BU-TECH     head → emp-008
 *   BU-STRATEGY head → emp-005
 *   BU-LEGAL    head → emp-011
 *   BU-RETAIL   head → emp-013
 *   BU-OPS      head → emp-sf-052 (a real SF mid-tier node) w/ fallback
 */
const BU_HEAD: Record<string, string> = {
  [BU_PEOPLE]: 'emp-007',
  [BU_FINANCE]: 'emp-002',
  [BU_TECH]: 'emp-008',
  [BU_STRATEGY]: 'emp-005',
  [BU_LEGAL]: 'emp-011',
  [BU_RETAIL]: 'emp-013',
  [BU_OPS]: 'emp-sf-052',
};

/** Re-derive businessUnitId + managerId deterministically for the whole pool. */
function seedScopeFields(rows: HumiEmployee[]): HumiEmployee[] {
  // First pass: assign each row its BU.
  const withBu = rows.map((e) => ({
    ...e,
    businessUnitId: deriveBusinessUnitId(e.department),
  }));

  // Ensure each BU head actually belongs to its BU (so it can be the parent).
  const idToBu = new Map(withBu.map((e) => [e.id, e.businessUnitId] as const));
  const validHead: Record<string, string | null> = {};
  for (const [bu, headId] of Object.entries(BU_HEAD)) {
    validHead[bu] = idToBu.get(headId) === bu ? headId : null;
  }
  // Fallback: if a BU's pinned head isn't in that BU, use the first member.
  for (const bu of Object.values({
    BU_PEOPLE,
    BU_FINANCE,
    BU_TECH,
    BU_STRATEGY,
    BU_LEGAL,
    BU_RETAIL,
    BU_OPS,
  })) {
    if (!validHead[bu]) {
      const first = withBu.find((e) => e.businessUnitId === bu);
      validHead[bu] = first ? first.id : null;
    }
  }

  // Second pass: everyone reports to their BU head; heads report to null.
  return withBu.map((e) => {
    const head = validHead[e.businessUnitId] ?? null;
    const managerId = head && head !== e.id ? head : null;
    return { ...e, managerId: managerId ?? undefined };
  });
}

export const ALL_PORTED_EMPLOYEES: HumiEmployee[] = seedScopeFields([
  ...HUMI_EMPLOYEES.map(withSfParity),
  ...SF_PARITY_NEW_EMPLOYEES,
  ...SF_REAL_EMPLOYEES,
]);

// Persona → SF-parity employee mapping for view-as.
// Drives /profile/me, /manager-dashboard subordinate count, and
// /admin/employees scope filter via TopbarPersonaSwitcher.
export const EMP_BY_LOGIN: Record<string, string> = Object.freeze({
  'admin@humi.test':    'emp-005', // ผู้อำนวยการฝ่ายกลยุทธ์
  'spd@humi.test':      'emp-001', // ผู้จัดการฝ่ายทรัพยากรบุคคล
  'hrbp@humi.test':     'emp-007', // หัวหน้าทีมพัฒนาองค์กร
  'manager@humi.test':  'emp-002', // นักวิเคราะห์การเงินอาวุโส
  'employee@humi.test': 'emp-003', // วิศวกรซอฟต์แวร์อาวุโส
  // T7 — SF-canonical personas (per RBAC V2 matrix)
  'ken@humi.test':      'emp-005', // Ken — HR Admin (Director tier)
  'apinya@humi.test':   'emp-007', // Apinya — HRBP for BU
  'worawee@humi.test':  'emp-001', // Worawee — SPD final approver
  'rungrote@humi.test': 'emp-002', // Rungrote — Manager Finance
});

/** Find ported employee for the current login email. Falls back to null. */
export function employeeForLogin(email: string | null | undefined): HumiEmployee | null {
  if (!email) return null;
  const id = EMP_BY_LOGIN[email];
  if (!id) return null;
  return ALL_PORTED_EMPLOYEES.find((e) => e.id === id) ?? null;
}

/** Mask Thai national ID: keep first + last 4 digits, mask middle. */
export function maskNationalId(nid: string | undefined): string {
  if (!nid) return '—';
  const clean = nid.replace(/\D/g, '');
  if (clean.length !== 13) return nid;
  return `${clean[0]}-${clean.slice(1, 5).replace(/./g, 'X')}-${clean.slice(5, 9).replace(/./g, 'X')}-${clean.slice(9, 11)}-${clean[11]}${clean[12]}`;
}
