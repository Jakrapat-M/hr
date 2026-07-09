// STA-168 — shift-assignment validation. Reuses the shared `overlaps` interval
// test (lib/time/time-overlap.ts) so an OT window declared on a cell is flagged
// when it overlaps that cell's scheduled shift working hours (double-counting).
//
// NO-RED: callers render these warnings in pumpkin (--color-danger) / neutral,
// never red. Pure + deterministic (no Date.now).

import { overlaps } from '@/lib/time/time-overlap';
import { getShiftCode } from '@/lib/time/shift-codes';
import { cellKey, type ShiftGroup } from '@/lib/shift-groups';

export type ShiftWarningKind = 'ot_overlaps_shift' | 'ot_range_invalid';

export interface ShiftWarning {
  empId: string;
  date: string;
  kind: ShiftWarningKind;
}

/** Build a full datetime string for the `overlaps` helper (needs ISO datetimes). */
function dt(date: string, time: string): string {
  return `${date}T${time}:00`;
}

/**
 * Validate every OT-bearing cell in a group:
 *  - `ot_range_invalid`  — OT start/end missing or start >= end (same-day).
 *  - `ot_overlaps_shift` — the OT window overlaps the cell's scheduled shift.
 */
export function getShiftAssignWarnings(group: ShiftGroup): ShiftWarning[] {
  const out: ShiftWarning[] = [];
  for (const c of group.cells) {
    if (!c.otStart && !c.otEnd) continue;
    // Incomplete or non-increasing OT window.
    if (!c.otStart || !c.otEnd || c.otStart >= c.otEnd) {
      out.push({ empId: c.empId, date: c.date, kind: 'ot_range_invalid' });
      continue;
    }
    const shift = getShiftCode(c.shiftCode || null);
    if (!shift) continue; // OT with no worked shift — nothing to overlap.
    if (
      overlaps(
        dt(c.date, c.otStart),
        dt(c.date, c.otEnd),
        dt(c.date, shift.in),
        dt(c.date, shift.out),
      )
    ) {
      out.push({ empId: c.empId, date: c.date, kind: 'ot_overlaps_shift' });
    }
  }
  return out;
}

/** Warning lookup keyed by cell for O(1) grid rendering. */
export function warningsByCell(group: ShiftGroup): Record<string, ShiftWarning> {
  const map: Record<string, ShiftWarning> = {};
  for (const w of getShiftAssignWarnings(group)) map[cellKey(w.empId, w.date)] = w;
  return map;
}
