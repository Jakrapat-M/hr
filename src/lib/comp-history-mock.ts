// ════════════════════════════════════════════════════════════
// comp-history-mock.ts — READ-ONLY compensation history seed (P3)
//
// Static, registry-backed mock data for the read-only Compensation
// History surface rendered on:
//   - /profile/me            (self view — own history)
//   - /admin/employees/[id]  (admin/HRBP/manager viewing an employee)
//
// PHASE = UI mockup, NO backend. This is a static seed only; there is
// no persistence and no API. Amounts are illustrative THB monthly base
// salary figures. Viewer-tier masking is applied at render time in
// components/profile/CompensationHistory.tsx (lower-tier viewers see
// masked amounts; the owner / HR comp-view roles see full figures).
// ════════════════════════════════════════════════════════════

export type CompChangeType = 'promotion' | 'merit' | 'adjustment' | 'hire';

export interface CompHistoryEntry {
  id: string;
  /** ISO-8601 effective date — formatted to Buddhist Era at render via lib/date.ts */
  effectiveDate: string;
  type: CompChangeType;
  /** Monthly base salary BEFORE this change (THB). null for the initial hire row. */
  oldAmount: number | null;
  /** Monthly base salary AFTER this change (THB). */
  newAmount: number;
  /** Short note describing the change (bilingual handled via i18n type label + this free note). */
  note?: string;
}

// Default self-view history (used on /profile/me — the current logged-in user).
export const SELF_COMP_HISTORY: CompHistoryEntry[] = [
  {
    id: 'CH-SELF-04',
    effectiveDate: '2026-01-01',
    type: 'merit',
    oldAmount: 78000,
    newAmount: 82500,
    note: 'Annual merit increase',
  },
  {
    id: 'CH-SELF-03',
    effectiveDate: '2024-07-01',
    type: 'promotion',
    oldAmount: 65000,
    newAmount: 78000,
    note: 'Promotion to Senior',
  },
  {
    id: 'CH-SELF-02',
    effectiveDate: '2023-01-01',
    type: 'adjustment',
    oldAmount: 60000,
    newAmount: 65000,
    note: 'Market adjustment',
  },
  {
    id: 'CH-SELF-01',
    effectiveDate: '2021-06-01',
    type: 'hire',
    oldAmount: null,
    newAmount: 60000,
    note: 'Initial hire',
  },
];

// Per-employee histories for the admin/employee-detail surface. Keyed by
// employee_id. Any employee without an explicit entry falls back to a
// deterministic generated history so the admin surface is never empty.
const EMP_COMP_HISTORY: Record<string, CompHistoryEntry[]> = {
  'EMP001': SELF_COMP_HISTORY,
};

// Deterministic fallback: derive a plausible 3-row history from the id hash so
// every employee shows a non-empty read-only history in the mockup.
function fallbackHistory(employeeId: string): CompHistoryEntry[] {
  let h = 0;
  for (let i = 0; i < employeeId.length; i++) h = (h * 31 + employeeId.charCodeAt(i)) >>> 0;
  const base = 28000 + (h % 22) * 1000; // 28,000 – 49,000
  const step1 = base + 3500;
  const step2 = step1 + 5500;
  return [
    {
      id: `${employeeId}-CH-03`,
      effectiveDate: '2025-01-01',
      type: 'merit',
      oldAmount: step1,
      newAmount: step2,
      note: 'Annual merit increase',
    },
    {
      id: `${employeeId}-CH-02`,
      effectiveDate: '2023-04-01',
      type: 'adjustment',
      oldAmount: base,
      newAmount: step1,
      note: 'Market adjustment',
    },
    {
      id: `${employeeId}-CH-01`,
      effectiveDate: '2021-09-01',
      type: 'hire',
      oldAmount: null,
      newAmount: base,
      note: 'Initial hire',
    },
  ];
}

/** Read-only accessor: returns a compensation history (never empty) for an employee id. */
export function getCompHistory(employeeId: string): CompHistoryEntry[] {
  return EMP_COMP_HISTORY[employeeId] ?? fallbackHistory(employeeId);
}
