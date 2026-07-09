// STA-168 — Shift Assignment (จัดกะให้พนักงาน) domain model + seed.
//
// A ShiftGroup is one manager's month-grid of shift assignments for their team,
// submitted to HR as ONE approvable unit. It mirrors the time_correction
// "list of days → one queue row" pattern (a month grid is "a list of cells"),
// so the approval-registry adapter collapses a whole group into ONE PendingRequest.
//
// MOCKUP ONLY: seed-only, no backend. Shift vocabulary is reused UNCONDITIONALLY
// from SHIFT_CODES (lib/time/shift-codes.ts) — this module never forks it.

import { ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';
import type { HumiEmployee } from '@/lib/humi-mock-data';
import { SHIFT_CODES } from '@/lib/time/shift-codes';

/**
 * Lifecycle (mirrors the claim/change-request `sent_back` idiom, NOT probation):
 *   draft → pending → { approved | returned }
 * `returned` re-opens the group to its owning manager (editable again), exactly
 * like a `sent_back` claim returns to the employee.
 */
export type ShiftGroupStatus = 'draft' | 'pending' | 'approved' | 'returned';

/** One employee × day cell. A cell is either a worked shift, a day off, or empty. */
export interface ShiftCell {
  empId: string;
  /** ISO date YYYY-MM-DD (within the group's month). */
  date: string;
  /** SHIFT_CODES key for the assigned shift; '' when unset / day off. */
  shiftCode: string;
  /** Weekly rest / day off marker — mutually exclusive with a worked shiftCode. */
  dayOff?: boolean;
  /** Optional OT window (HH:MM) layered on top of the shift. */
  otStart?: string;
  otEnd?: string;
}

export interface ShiftGroup {
  id: string;
  /** Group month, ISO `YYYY-MM`. */
  month: string;
  /** Owning managers (emp ids). Editing keys off `managerIds.includes(selfEmpId)`. */
  managerIds: string[];
  cells: ShiftCell[];
  status: ShiftGroupStatus;
  /** Approver's note captured on return-for-revision (round-trips to the owner). */
  returnNote?: string;
  /** Set when the group is submitted for review. */
  submittedAt?: string;
  createdAt: string;
}

// ── Cell keying ────────────────────────────────────────────────────────────────

/** Stable key for a cell (empId × date). */
export function cellKey(empId: string, date: string): string {
  return `${empId}::${date}`;
}

// ── Month helpers ────────────────────────────────────────────────────────────────

/** All ISO dates (YYYY-MM-DD) in a `YYYY-MM` month, in order. */
export function monthDays(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return [];
  const count = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this
  const out: string[] = [];
  for (let d = 1; d <= count; d += 1) {
    out.push(`${month}-${String(d).padStart(2, '0')}`);
  }
  return out;
}

/** Bilingual month label, e.g. "กรกฎาคม 2569" / "July 2026". */
export function formatMonthLabel(month: string, locale: 'th' | 'en'): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  const d = new Date(y, m - 1, 1);
  if (locale === 'th') {
    return `${d.toLocaleDateString('th-TH', { month: 'long' })} ${y + 543}`;
  }
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** ISO weekday (0=Sun..6=Sat) of a date — used for weekend shading. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// ── Ownership gate (D4) ──────────────────────────────────────────────────────────

/**
 * A group is editable iff it is in an owner-editable state AND the logged-in
 * employee owns it. `managerIds` is an ARRAY, so the containment check is
 * `.includes(selfEmpId)` — NOT the scope-filter's 1:1 `managerId === self.id`.
 * The identity source (selfEmpId) is resolved by the caller via EMP_BY_LOGIN,
 * the same identity primitive the roster scoper uses.
 */
export function canEditShiftGroup(group: ShiftGroup, selfEmpId: string | null): boolean {
  if (!selfEmpId) return false;
  if (group.status !== 'draft' && group.status !== 'returned') return false;
  return group.managerIds.includes(selfEmpId);
}

// ── Team / people resolution ───────────────────────────────────────────────────

/** The team (direct reports) that a group's managers own — the grid's rows. */
export function teamForGroup(group: ShiftGroup): HumiEmployee[] {
  return ALL_PORTED_EMPLOYEES.filter(
    (e) => e.managerId != null && group.managerIds.includes(e.managerId),
  );
}

/** Resolve an emp id to a display name (falls back to the id). */
export function resolveEmpName(empId: string, locale: 'th' | 'en' = 'th'): string {
  const e = ALL_PORTED_EMPLOYEES.find((x) => x.id === empId);
  if (!e) return empId;
  if (locale === 'en') {
    return `${e.firstNameEn ?? e.firstNameTh} ${e.lastNameEn ?? e.lastNameTh}`.trim();
  }
  return `${e.firstNameTh} ${e.lastNameTh}`.trim();
}

/** Distinct employee count with at least one assignment in the group. */
export function assignedMemberCount(group: ShiftGroup): number {
  return new Set(group.cells.filter((c) => c.shiftCode || c.dayOff).map((c) => c.empId)).size;
}

/** Count of filled cells (worked shift or explicit day off). */
export function filledCellCount(group: ShiftGroup): number {
  return group.cells.filter((c) => c.shiftCode || c.dayOff).length;
}

// ── Seed (Q2) ──────────────────────────────────────────────────────────────────
//
// One manager persona (emp-002 — the BU-FINANCE head / `manager@humi.test`) owns
// three demo groups across the lifecycle so the grid, the queue row, and the
// ownership gate all have real data. Cells are built deterministically over the
// manager's real direct reports so rows always render.

const SEED_MANAGER_ID = 'emp-002';
const SEED_TEAM_IDS = ALL_PORTED_EMPLOYEES.filter((e) => e.managerId === SEED_MANAGER_ID)
  .slice(0, 5)
  .map((e) => e.id);

const SHIFT_KEYS = Object.keys(SHIFT_CODES);

/** Build a demo month of cells: each member gets a rotating shift Mon–Fri, day off on weekends. */
function seedCells(month: string, empIds: string[]): ShiftCell[] {
  const cells: ShiftCell[] = [];
  const days = monthDays(month);
  empIds.forEach((empId, i) => {
    days.forEach((date, di) => {
      const wd = isoWeekday(date);
      if (wd === 0 || wd === 6) {
        cells.push({ empId, date, shiftCode: '', dayOff: true });
      } else {
        cells.push({ empId, date, shiftCode: SHIFT_KEYS[(i + di) % SHIFT_KEYS.length] });
      }
    });
  });
  return cells;
}

export const SHIFT_GROUP_SEED: ShiftGroup[] = [
  {
    id: 'SHIFT-2026-07-FIN',
    month: '2026-07',
    managerIds: [SEED_MANAGER_ID],
    status: 'pending',
    submittedAt: '2026-06-25T09:00:00',
    createdAt: '2026-06-20T09:00:00',
    cells: seedCells('2026-07', SEED_TEAM_IDS),
  },
  {
    id: 'SHIFT-2026-08-FIN',
    month: '2026-08',
    managerIds: [SEED_MANAGER_ID],
    status: 'draft',
    createdAt: '2026-06-28T09:00:00',
    cells: seedCells('2026-08', SEED_TEAM_IDS.slice(0, 3)),
  },
  {
    id: 'SHIFT-2026-06-FIN',
    month: '2026-06',
    managerIds: [SEED_MANAGER_ID],
    status: 'returned',
    returnNote: 'กรุณาปรับกะวันหยุดนักขัตฤกษ์ให้เป็นวันหยุด และตรวจสอบ OT สัปดาห์สุดท้าย',
    submittedAt: '2026-05-24T09:00:00',
    createdAt: '2026-05-20T09:00:00',
    cells: seedCells('2026-06', SEED_TEAM_IDS),
  },
];
