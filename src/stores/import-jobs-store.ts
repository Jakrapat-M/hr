// import-jobs-store.ts — Zustand mock store for bulk-import job history,
// keyed by module ('employees' | 'payroll' | 'time' | ...).
//
// MOCKUP only: no real backend / persistence. The import wizard "commit" step
// (ModuleImportWizard) appends a completed job here + (optionally) commits the
// imported rows to the module's own mock store via a config.commit() callback.
//
// This is its OWN store (NOT an approval/queue store) — seeding the canonical
// MOCK_*_JOBS inside the store is fine and does NOT violate the ensureDemoSeed
// rule (which only governs approval/queue rows).

import { create } from 'zustand';

export type ImportJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  module: string;          // 'employees' | 'payroll' | 'time'
  filename: string;
  type: string;            // module-specific csv type id (e.g. 'roster')
  status: ImportJobStatus;
  started: string;         // ISO datetime string
  records: number | null;
  processed: number | null;
  errors: number;
  logLines: string[];
}

interface ImportJobsState {
  jobs: ImportJob[];
  /** jobs for a single module, newest first */
  getByModule: (module: string) => ImportJob[];
  /** prepend a completed/failed job to history */
  addJob: (job: ImportJob) => void;
  /** seed a module's history once (idempotent — skips if already seeded) */
  seedModule: (module: string, jobs: ImportJob[]) => void;
}

export const useImportJobs = create<ImportJobsState>()((set, get) => ({
  jobs: [],

  getByModule: (module) =>
    get()
      .jobs.filter((j) => j.module === module)
      .sort((a, b) => (a.started < b.started ? 1 : -1)),

  addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),

  seedModule: (module, seed) =>
    set((s) => {
      if (s.jobs.some((j) => j.module === module)) return s; // already seeded
      return { jobs: [...seed, ...s.jobs] };
    }),
}));
