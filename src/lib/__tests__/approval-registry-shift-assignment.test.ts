import { describe, it, expect } from 'vitest';
import {
  APPROVAL_REGISTRY,
  selectPendingApprovals,
  shiftGroupToPendingRequest,
} from '@/lib/approval-registry';
import { useShiftAssignment } from '@/stores/shift-assignment';
import type { ShiftGroup } from '@/lib/shift-groups';

// STA-168 — the shift_assignment adapter mirrors time_correction: a whole month
// grid (a "list of cells") collapses into ONE PendingRequest queue row.

function group(overrides: Partial<ShiftGroup> = {}): ShiftGroup {
  return {
    id: 'SHIFT-TEST',
    month: '2026-07',
    managerIds: ['emp-002'],
    status: 'pending',
    submittedAt: '2026-06-25T09:00:00',
    createdAt: '2026-06-20T09:00:00',
    cells: [
      { empId: 'emp-006', date: '2026-07-01', shiftCode: '8A0800' },
      { empId: 'emp-006', date: '2026-07-02', shiftCode: '9A0700' },
      { empId: 'emp-019', date: '2026-07-01', shiftCode: '', dayOff: true },
    ],
    ...overrides,
  };
}

describe('shift_assignment adapter registration', () => {
  it('is registered in APPROVAL_REGISTRY (satisfies the totality gate)', () => {
    expect(APPROVAL_REGISTRY.shift_assignment).toBeTruthy();
    expect(APPROVAL_REGISTRY.shift_assignment.labels.en).toBe('Shift assignment');
  });

  it('collapses a whole group into ONE queue row (type shift_assignment)', () => {
    const row = shiftGroupToPendingRequest(group());
    expect(row.type).toBe('shift_assignment');
    expect(row.id).toBe('SHIFT-TEST');
    // 2 members with assignments, 3 filled cells.
    expect(row.description).toContain('2 คน');
    expect(row.description).toContain('3 กะ');
  });
});

describe('selectPendingApprovals — shift group eligibility', () => {
  it('a pending group surfaces as ONE pending queue row', () => {
    const out = selectPendingApprovals({
      leave: [],
      workflow: [],
      claims: [],
      transfers: [],
      shiftGroups: [group({ status: 'pending' })],
    });
    const rows = out.filter((q) => q.row.type === 'shift_assignment');
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('pending');
  });

  it('an approved group surfaces as an approved row', () => {
    const out = selectPendingApprovals({
      leave: [],
      workflow: [],
      claims: [],
      transfers: [],
      shiftGroups: [group({ status: 'approved' })],
    });
    expect(out.find((q) => q.row.type === 'shift_assignment')!.status).toBe('approved');
  });

  it('draft and returned groups are NOT queue-eligible', () => {
    const out = selectPendingApprovals({
      leave: [],
      workflow: [],
      claims: [],
      transfers: [],
      shiftGroups: [group({ id: 'D', status: 'draft' }), group({ id: 'R', status: 'returned' })],
    });
    expect(out.filter((q) => q.row.type === 'shift_assignment')).toHaveLength(0);
  });
});

describe('adapter approve / reject dispatch to the store', () => {
  it('approve flips the store group pending → approved', () => {
    useShiftAssignment.setState({ groups: [group({ status: 'pending' })] });
    APPROVAL_REGISTRY.shift_assignment.approve('SHIFT-TEST', { name: 'HR' });
    expect(useShiftAssignment.getState().getGroup('SHIFT-TEST')!.status).toBe('approved');
    useShiftAssignment.getState().clear();
  });

  it('reject returns the group for revision (sent_back idiom) with the note', () => {
    useShiftAssignment.setState({ groups: [group({ status: 'pending' })] });
    APPROVAL_REGISTRY.shift_assignment.reject('SHIFT-TEST', { name: 'HR' }, 'แก้กะวันหยุด');
    const g = useShiftAssignment.getState().getGroup('SHIFT-TEST')!;
    expect(g.status).toBe('returned');
    expect(g.returnNote).toBe('แก้กะวันหยุด');
    useShiftAssignment.getState().clear();
  });
});
