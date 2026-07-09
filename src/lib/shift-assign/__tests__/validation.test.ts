import { describe, it, expect } from 'vitest';
import { getShiftAssignWarnings, warningsByCell } from '@/lib/shift-assign/validation';
import { cellKey, type ShiftGroup } from '@/lib/shift-groups';

// STA-168 — OT-period overlap validation reuses the shared `overlaps` helper.
// NO-RED: callers render these in pumpkin/neutral.

function group(cells: ShiftGroup['cells']): ShiftGroup {
  return {
    id: 'G1',
    month: '2026-07',
    managerIds: ['emp-002'],
    status: 'draft',
    createdAt: '2026-06-01T00:00:00',
    cells,
  };
}

describe('getShiftAssignWarnings', () => {
  it('flags an OT window that overlaps the scheduled shift', () => {
    // 8A0800 shift = 08:00–17:00; OT 16:00–18:00 overlaps.
    const w = getShiftAssignWarnings(
      group([{ empId: 'emp-006', date: '2026-07-01', shiftCode: '8A0800', otStart: '16:00', otEnd: '18:00' }]),
    );
    expect(w).toHaveLength(1);
    expect(w[0].kind).toBe('ot_overlaps_shift');
  });

  it('does NOT flag an OT window that starts after the shift ends', () => {
    // shift 08:00–17:00; OT 17:00–19:00 → no overlap.
    const w = getShiftAssignWarnings(
      group([{ empId: 'emp-006', date: '2026-07-01', shiftCode: '8A0800', otStart: '17:00', otEnd: '19:00' }]),
    );
    expect(w).toHaveLength(0);
  });

  it('flags an invalid OT range (start >= end)', () => {
    const w = getShiftAssignWarnings(
      group([{ empId: 'emp-006', date: '2026-07-01', shiftCode: '8A0800', otStart: '19:00', otEnd: '18:00' }]),
    );
    expect(w).toHaveLength(1);
    expect(w[0].kind).toBe('ot_range_invalid');
  });

  it('ignores cells without OT', () => {
    expect(
      getShiftAssignWarnings(group([{ empId: 'emp-006', date: '2026-07-01', shiftCode: '8A0800' }])),
    ).toHaveLength(0);
  });

  it('warningsByCell keys warnings by cell', () => {
    const map = warningsByCell(
      group([{ empId: 'emp-006', date: '2026-07-01', shiftCode: '8A0800', otStart: '16:00', otEnd: '18:00' }]),
    );
    expect(map[cellKey('emp-006', '2026-07-01')]).toBeTruthy();
  });
});
