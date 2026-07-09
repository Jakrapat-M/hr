// lib/time/leave-seed.ts — STA-235 (Team Timesheet Draft 2)
//
// MOCK ONLY. Approved-leave overlay for the weekly Team Timesheet. The grid's
// schedule/attendance seeds have no leave concept, so this adds a small per-day
// leave layer keyed on the empId namespace. Draft-2 requires each existing leave
// (ลาป่วย / ลาพักร้อน) to render READ-ONLY with its hour range — the manager can
// only edit shift time, never leave (the employee uses Time Correction).
//
// Pinned to the demo week (2026-06-01→06-07, DEMO_TODAY) via EMP-0301 — the
// canonical always-first grid row — so ≥1 read-only leave chip with an hour range
// is always visible. Never wall-clock dates.

export type LeaveDay = {
  date: string; // 'YYYY-MM-DD'
  code: string; // leave-types.ts code
  nameTh: string;
  nameEn: string;
  /** Leave block hour range (read-only display). */
  startTime: string; // 'HH:MM'
  endTime: string;
};

// EMP-0301 (พิมพ์ชนก) is the pinned demo row (Store standard, 10:00–19:00 Mon–Sat).
// A half-day sick leave (Thu) + a full-day annual leave (Fri) give both leave
// archetypes and guarantee the "ลา" filter returns a row in the default week.
const LEAVE_SEED: Record<string, LeaveDay[]> = {
  'EMP-0301': [
    {
      date: '2026-06-04',
      code: 'sick_leave',
      nameTh: 'ลาป่วย',
      nameEn: 'Sick leave',
      startTime: '10:00',
      endTime: '14:00',
    },
    {
      date: '2026-06-05',
      code: 'annual_leave',
      nameTh: 'ลาพักร้อน',
      nameEn: 'Annual leave',
      startTime: '10:00',
      endTime: '19:00',
    },
  ],
};

/** Approved-leave days for an employee (empty when none seeded). */
export function getLeaveForPeriod(empId: string): LeaveDay[] {
  return LEAVE_SEED[empId] ?? [];
}
