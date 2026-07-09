// timesheet-import-store.ts — Zustand mock store for bulk-imported timesheet rows.
//
// MOCKUP only: no real backend / persistence. The time import wizard
// (ModuleImportWizard via /time/import) commits parsed timesheet-submission rows
// here so the import "commit" has a real Zustand target (per CLAUDE.md: import
// commit writes to a Zustand mock store). Job history lives in the shared
// import-jobs-store; this store holds the committed timesheet records.
//
// This is its OWN store (NOT an approval/queue store) — seeding it does NOT
// violate the ensureDemoSeed rule (which only governs approval/queue rows).

import { create } from 'zustand';
import type { TimesheetSubmission } from '@/stores/timesheet-submissions';

export interface TimesheetImportState {
  /** timesheet rows committed through the bulk-import wizard */
  imported: TimesheetSubmission[];
  /** bulk-upsert rows by id (insert new, replace existing) */
  importTimesheets: (rows: TimesheetSubmission[]) => void;
  reset: () => void;
}

export const useTimesheetImport = create<TimesheetImportState>()((set) => ({
  imported: [],

  importTimesheets: (rows) =>
    set((s) => {
      const byId = new Map(s.imported.map((r) => [r.id, r]));
      for (const row of rows) byId.set(row.id, row);
      return { imported: Array.from(byId.values()) };
    }),

  reset: () => set({ imported: [] }),
}));
