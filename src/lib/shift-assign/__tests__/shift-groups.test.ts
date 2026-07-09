import { describe, it, expect } from 'vitest';
import {
  canEditShiftGroup,
  monthDays,
  teamForGroup,
  assignedMemberCount,
  filledCellCount,
  type ShiftGroup,
} from '@/lib/shift-groups';

// STA-168 — ownership gate (D4) keys off managerIds.includes(selfEmpId), NOT
// persona/role. "Viewing as" flips the role, not the identity.

function group(overrides: Partial<ShiftGroup> = {}): ShiftGroup {
  return {
    id: 'G1',
    month: '2026-07',
    managerIds: ['emp-002'],
    status: 'draft',
    createdAt: '2026-06-01T00:00:00',
    cells: [
      { empId: 'emp-006', date: '2026-07-01', shiftCode: '8A0800' },
      { empId: 'emp-006', date: '2026-07-02', shiftCode: '', dayOff: true },
      { empId: 'emp-019', date: '2026-07-01', shiftCode: '' },
    ],
    ...overrides,
  };
}

describe('canEditShiftGroup — ownership gate', () => {
  it('the owning manager may edit a draft group', () => {
    expect(canEditShiftGroup(group({ status: 'draft' }), 'emp-002')).toBe(true);
  });

  it('the owning manager may edit a returned group', () => {
    expect(canEditShiftGroup(group({ status: 'returned' }), 'emp-002')).toBe(true);
  });

  it('a DIFFERENT manager may NOT edit a group they do not own (god-mode fix)', () => {
    // manager B (emp-007) is a valid manager persona but not in managerIds → denied.
    expect(canEditShiftGroup(group({ status: 'draft' }), 'emp-007')).toBe(false);
  });

  it('nobody may edit a pending group', () => {
    expect(canEditShiftGroup(group({ status: 'pending' }), 'emp-002')).toBe(false);
  });

  it('nobody may edit an approved group', () => {
    expect(canEditShiftGroup(group({ status: 'approved' }), 'emp-002')).toBe(false);
  });

  it('a null identity is denied', () => {
    expect(canEditShiftGroup(group(), null)).toBe(false);
  });

  it('containment works for a multi-manager group (array .includes, not ===)', () => {
    const g = group({ managerIds: ['emp-002', 'emp-013'] });
    expect(canEditShiftGroup(g, 'emp-013')).toBe(true);
    expect(canEditShiftGroup(g, 'emp-999')).toBe(false);
  });
});

describe('month + counts helpers', () => {
  it('monthDays returns every day of the month', () => {
    expect(monthDays('2026-07')).toHaveLength(31);
    expect(monthDays('2026-02')).toHaveLength(28);
    expect(monthDays('2026-07')[0]).toBe('2026-07-01');
  });

  it('assignedMemberCount counts distinct members with an assignment', () => {
    // emp-006 has a shift + a day off; emp-019 has an empty cell → 1 member assigned.
    expect(assignedMemberCount(group())).toBe(1);
  });

  it('filledCellCount counts worked shifts and explicit day offs', () => {
    expect(filledCellCount(group())).toBe(2);
  });

  it('teamForGroup resolves the manager’s real direct reports', () => {
    const team = teamForGroup(group({ managerIds: ['emp-002'] }));
    expect(team.length).toBeGreaterThan(0);
    expect(team.every((e) => e.managerId === 'emp-002')).toBe(true);
  });
});
