'use client';

/**
 * budget-reallocation-store — STA-95 "Reallocate Next Year Budget"
 *
 * HR moves part of an employee's NEXT-year medical budget into the CURRENT year
 * (e.g. ฿10,000: current +10,000, next −10,000). Mockup-only persistence.
 *
 * Source-of-truth split (Architect synthesis):
 *   - CURRENT-year base = the plan's registry entitlement (getPlan(planId)
 *     .coverage.entitlementAmount) — NOT stored here, so it can never drift from
 *     the plan registry or contradict a Special-Privilege override.
 *   - This store owns ONLY the NEXT-year base (registry has no next-year concept)
 *     + the reallocation deltas. Running totals are derived at the call site
 *     (BA-confirmed display rule 2026-06-11):
 *       currentYearTotal = registryEntitlement              (annual cap; unchanged)
 *       nextYearTotal    = nextYearBase − Σ amount          (reduced by borrowing)
 *     so (currentYearTotal − nextYearTotal) === Σ amount — the gap between the two
 *     years equals the total transferred (a ฿10,000 move shows 40,000 / 30,000).
 *
 * NOTE: BE-04 "borrow-forward" (src/stores/benefit-exception-store.ts) already
 * models a current↔future medical transfer with an approval flow. That is the
 * eventual real-backend home; this dedicated store exists only to give the
 * mockup the ledger-with-running-totals UI the ticket needs. Consolidate the two
 * when the backend phase re-scopes this.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ReallocationRecord {
  id: string;
  employeeId: string; // e.g. 'EMP-0001'
  planId: string; // references BENEFIT_PLAN_REGISTRY[].id (medical plan)
  amount: number; // THB moved next→current, > 0
  effectiveStartDate: string; // ISO
  effectiveEndDate: string; // ISO
  reason: string; // required
  createdBy: string;
  createdAt: string; // ISO timestamp — drives the running-balance order
}

/** Seeded next-year medical budget per employee + plan (registry has none). */
export interface NextYearBudgetBase {
  employeeId: string;
  planId: string;
  nextYearBase: number; // THB
}

interface BudgetReallocationState {
  records: ReallocationRecord[];
  nextYearBases: NextYearBudgetBase[];
  addReallocation: (
    rec: Omit<ReallocationRecord, 'id' | 'createdAt'> & { createdAt?: string },
  ) => void;
  removeReallocation: (id: string) => void;
  clear: () => void;
}

// ── Selectors ─────────────────────────────────────────────────────────────────
//
// Both return FRESH arrays/values each call → guard with useShallow / useMemo.

/** Reallocation records for an employee, oldest-first (running-balance order). */
export const selectReallocationsForEmployee =
  (employeeId: string) => (s: BudgetReallocationState) =>
    s.records
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

/** Seeded next-year base for an employee + plan; default 0 when unseeded. */
export const selectNextYearBase =
  (employeeId: string, planId: string) => (s: BudgetReallocationState) =>
    s.nextYearBases.find((b) => b.employeeId === employeeId && b.planId === planId)
      ?.nextYearBase ?? 0;

// ── Seed ─────────────────────────────────────────────────────────────────────
//
// EMP-0002 & EMP-0003 get a next-year medical budget so HR can demo immediately
// (both are active in MOCK_EMPLOYEES, so the reallocation FORM is reachable — the
// change_type gate blocks inactive employees like EMP-0001). EMP-0002 has one
// prior reallocation so the change-log is non-empty on first open. Registry-
// backed planIds; EMP-000X namespace matches useEmployees.
const seedBases: NextYearBudgetBase[] = [
  { employeeId: 'EMP-0002', planId: 'BE-MED-001', nextYearBase: 40000 },
  { employeeId: 'EMP-0002', planId: 'BE-MED-003', nextYearBase: 200000 },
  { employeeId: 'EMP-0003', planId: 'BE-MED-001', nextYearBase: 40000 },
];

const seedRecords: ReallocationRecord[] = [
  {
    id: 'RB-0001',
    employeeId: 'EMP-0002',
    planId: 'BE-MED-001',
    amount: 5000,
    effectiveStartDate: '2026-06-01T00:00:00.000Z',
    effectiveEndDate: '2026-12-31T00:00:00.000Z',
    reason: 'ขอใช้สิทธิ์ค่ารักษาพยาบาลปีหน้าล่วงหน้า (ค่ารักษาต่อเนื่อง)',
    createdBy: 'นงลักษณ์ ทรัพย์เจริญ (HR)',
    createdAt: '2026-05-20T03:00:00.000Z',
  },
  {
    // STA-95 demo — accident this year requires borrowing next-year budget.
    // base 40,000 + moved 10,000 → this year 50,000 / next year 30,000.
    id: 'RB-0002',
    employeeId: 'EMP-0003',
    planId: 'BE-MED-001',
    amount: 10000,
    effectiveStartDate: '2026-06-01T00:00:00.000Z',
    effectiveEndDate: '2026-12-31T00:00:00.000Z',
    reason: 'อุบัติเหตุ — ขอใช้วงเงินค่ารักษาพยาบาลปีหน้าล่วงหน้า',
    createdBy: 'นงลักษณ์ ทรัพย์เจริญ (HR)',
    createdAt: '2026-06-05T03:00:00.000Z',
  },
];

// ── Store ─────────────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();
let seq = seedRecords.length;
const nextId = () => `RB-${String(++seq).padStart(4, '0')}`;

export const useBudgetReallocationStore = create<BudgetReallocationState>()(
  persist(
    (set) => ({
      records: seedRecords,
      nextYearBases: seedBases,
      addReallocation: (rec) =>
        set((s) => ({
          records: [
            ...s.records,
            { ...rec, id: nextId(), createdAt: rec.createdAt ?? nowIso() },
          ],
        })),
      removeReallocation: (id) =>
        set((s) => ({ records: s.records.filter((r) => r.id !== id) })),
      clear: () => set({ records: seedRecords, nextYearBases: seedBases }),
    }),
    { name: 'humi-budget-reallocations' },
  ),
);
