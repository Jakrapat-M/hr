import { create } from 'zustand';

// timesheet-submissions — Zustand store for weekly timesheet submissions (STA-65).
//
// Mockup phase: in-memory only (mirrors the idiom of `useTimeApprovals` in
// hooks/use-time.ts). This is STATUS TRACKING, not a routed approval — the
// manager/HR surface that reads this store is READ-ONLY reporting and must
// NOT introduce any quick-approve RequestType / approval routing.

export type TimesheetSubmissionStatus = 'draft' | 'submitted';

export interface TimesheetSubmissionRow {
  project: string;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface TimesheetSubmission {
  id: string;
  employeeId: string;
  employeeName: string;
  weekStart: string; // ISO date YYYY-MM-DD
  rows: TimesheetSubmissionRow[];
  totalHours: number;
  status: TimesheetSubmissionStatus;
  submittedAt: string; // ISO timestamp
}

export type TimesheetSubmissionInput = Omit<
  TimesheetSubmission,
  'id' | 'status' | 'submittedAt'
>;

// ── Validation ────────────────────────────────────────────────────────────────

export interface TimesheetValidationResult {
  valid: boolean;
  /** Stable reason code for callers to map to a localized message. */
  reason?: 'empty' | 'day-over-24';
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Validate weekly totals before persisting: no single day > 24h, week total > 0. */
export function validateTimesheet(rows: TimesheetSubmissionRow[]): TimesheetValidationResult {
  let total = 0;
  for (const row of rows) {
    for (const day of DAY_KEYS) {
      const v = row[day] ?? 0;
      if (v > 24) return { valid: false, reason: 'day-over-24' };
      total += v;
    }
  }
  if (total <= 0) return { valid: false, reason: 'empty' };
  return { valid: true };
}

export function sumTimesheetHours(rows: TimesheetSubmissionRow[]): number {
  return rows.reduce(
    (sum, row) => sum + DAY_KEYS.reduce((s, d) => s + (row[d] ?? 0), 0),
    0,
  );
}

// ── Seed ────────────────────────────────────────────────────────────────────

const SEED_SUBMISSIONS: TimesheetSubmission[] = [
  {
    id: 'TS-20260504-101',
    employeeId: 'EMP101',
    employeeName: 'Krittin Suksawat',
    weekStart: '2026-05-04',
    rows: [
      { project: 'Project Alpha', mon: 5, tue: 5, wed: 4, thu: 5, fri: 5, sat: 0, sun: 0 },
      { project: 'Internal / Admin', mon: 3, tue: 3, wed: 4, thu: 3, fri: 3, sat: 0, sun: 0 },
    ],
    totalHours: 55,
    status: 'submitted',
    submittedAt: '2026-05-08T10:15:00.000Z',
  },
  {
    id: 'TS-20260504-102',
    employeeId: 'EMP102',
    employeeName: 'Natcha Panyasiri',
    weekStart: '2026-05-04',
    rows: [
      { project: 'Project Beta', mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 },
    ],
    totalHours: 40,
    status: 'submitted',
    submittedAt: '2026-05-08T11:40:00.000Z',
  },
  {
    id: 'TS-20260427-103',
    employeeId: 'EMP103',
    employeeName: 'Thanawat Chaiyaporn',
    weekStart: '2026-04-27',
    rows: [
      { project: 'Project Alpha', mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 2, sun: 0 },
      { project: 'Project Beta', mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 0, sun: 0 },
    ],
    totalHours: 50,
    status: 'submitted',
    submittedAt: '2026-05-01T09:05:00.000Z',
  },
];

// ── Store ─────────────────────────────────────────────────────────────────────

interface TimesheetSubmissionsState {
  submissions: TimesheetSubmission[];
  saveDraft: (payload: TimesheetSubmissionInput) => TimesheetSubmission;
  submit: (payload: TimesheetSubmissionInput) => TimesheetSubmission;
  list: () => TimesheetSubmission[];
  clear: () => void;
}

function generateId(employeeId: string, weekStart: string): string {
  const week = weekStart.replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TS-${week}-${employeeId}-${rand}`;
}

function buildSubmission(
  payload: TimesheetSubmissionInput,
  status: TimesheetSubmissionStatus,
): TimesheetSubmission {
  return {
    ...payload,
    id: generateId(payload.employeeId, payload.weekStart),
    status,
    submittedAt: new Date().toISOString(),
  };
}

export const useTimesheetSubmissions = create<TimesheetSubmissionsState>((set, get) => ({
  submissions: SEED_SUBMISSIONS,
  saveDraft: (payload) => {
    const record = buildSubmission(payload, 'draft');
    set((state) => ({ submissions: [record, ...state.submissions] }));
    return record;
  },
  submit: (payload) => {
    const record = buildSubmission(payload, 'submitted');
    set((state) => ({ submissions: [record, ...state.submissions] }));
    return record;
  },
  list: () => get().submissions,
  clear: () => set({ submissions: [] }),
}));

/** Selector: all submitted (non-draft) timesheets, newest first. */
export function selectSubmittedTimesheets(
  submissions: TimesheetSubmission[],
): TimesheetSubmission[] {
  return submissions
    .filter((s) => s.status === 'submitted')
    .slice()
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
}
