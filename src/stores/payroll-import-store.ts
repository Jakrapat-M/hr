// payroll-import-store.ts — Zustand mock store for bulk-imported payroll rows.
//
// MOCKUP only: no real backend / persistence. The payroll import wizard
// (ModuleImportWizard via /payroll/import) commits parsed payslip rows here so
// the import "commit" has a real Zustand target (per CLAUDE.md: import commit
// writes to a Zustand mock store). Job history lives in the shared
// import-jobs-store; this store holds the committed payslip records.
//
// This is its OWN store (NOT an approval/queue store) — seeding it does NOT
// violate the ensureDemoSeed rule (which only governs approval/queue rows).

import { create } from 'zustand';
import type { PayslipSummary } from '@/hooks/use-payroll';

export interface PayrollImportState {
  /** payslip rows committed through the bulk-import wizard */
  imported: PayslipSummary[];
  /** bulk-upsert rows by employeeId (insert new, replace existing) */
  importPayslips: (rows: PayslipSummary[]) => void;
  reset: () => void;
}

export const usePayrollImport = create<PayrollImportState>()((set) => ({
  imported: [],

  importPayslips: (rows) =>
    set((s) => {
      const byId = new Map(s.imported.map((p) => [p.employeeId, p]));
      for (const row of rows) byId.set(row.employeeId, row);
      return { imported: Array.from(byId.values()) };
    }),

  reset: () => set({ imported: [] }),
}));
