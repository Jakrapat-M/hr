import { describe, it, expect, beforeEach } from 'vitest';
import { useShiftAssignment } from '@/stores/shift-assignment';
import { cellKey, type ShiftGroup } from '@/lib/shift-groups';

// STA-168 — shift-assignment store: lifecycle (sent_back idiom), bulkApply,
// clearCells, and mutation gating on submitted/approved groups.

const GID = 'SA-TEST-GROUP';

function makeGroup(status: ShiftGroup['status']): ShiftGroup {
  return {
    id: GID,
    month: '2026-07',
    managerIds: ['emp-002'],
    status,
    createdAt: '2026-06-01T00:00:00',
    cells: [
      { empId: 'emp-006', date: '2026-07-01', shiftCode: '8A0800' },
      { empId: 'emp-006', date: '2026-07-02', shiftCode: '' },
    ],
  };
}

function seed(status: ShiftGroup['status']) {
  useShiftAssignment.setState({ groups: [makeGroup(status)] });
}

function get() {
  return useShiftAssignment.getState().getGroup(GID)!;
}

beforeEach(() => {
  useShiftAssignment.getState().clear();
});

describe('lifecycle (draft → pending → {approved | returned})', () => {
  it('submit moves draft → pending and stamps submittedAt', () => {
    seed('draft');
    useShiftAssignment.getState().submit(GID);
    const g = get();
    expect(g.status).toBe('pending');
    expect(g.submittedAt).toBeTruthy();
  });

  it('approve moves pending → approved', () => {
    seed('pending');
    useShiftAssignment.getState().approve(GID, { name: 'HR' });
    expect(get().status).toBe('approved');
  });

  it('returnForRevision moves pending → returned and captures the note', () => {
    seed('pending');
    useShiftAssignment.getState().returnForRevision(GID, 'ปรับวันหยุด');
    const g = get();
    expect(g.status).toBe('returned');
    expect(g.returnNote).toBe('ปรับวันหยุด');
  });

  it('a returned group is editable again to its owner and can be re-submitted', () => {
    seed('returned');
    // returned is mutable — an edit lands, then re-submit clears the note.
    useShiftAssignment.getState().upsertCell(GID, 'emp-006', '2026-07-02', { shiftCode: '9A0700' });
    expect(get().cells.find((c) => c.date === '2026-07-02')!.shiftCode).toBe('9A0700');
    useShiftAssignment.getState().submit(GID);
    const g = get();
    expect(g.status).toBe('pending');
    expect(g.returnNote).toBeUndefined();
  });

  it('reopen moves returned → draft', () => {
    seed('returned');
    useShiftAssignment.getState().reopen(GID);
    expect(get().status).toBe('draft');
  });
});

describe('mutations are gated to draft/returned', () => {
  it('upsertCell no-ops on a pending group', () => {
    seed('pending');
    useShiftAssignment.getState().upsertCell(GID, 'emp-006', '2026-07-01', { shiftCode: '4C0800' });
    expect(get().cells.find((c) => c.date === '2026-07-01')!.shiftCode).toBe('8A0800');
  });

  it('upsertCell no-ops on an approved group', () => {
    seed('approved');
    useShiftAssignment.getState().upsertCell(GID, 'emp-006', '2026-07-01', { shiftCode: '4C0800' });
    expect(get().cells.find((c) => c.date === '2026-07-01')!.shiftCode).toBe('8A0800');
  });
});

describe('bulkApply + clearCells', () => {
  it('bulkApply applies one patch to many cells (creating missing ones)', () => {
    seed('draft');
    useShiftAssignment.getState().bulkApply(
      GID,
      [
        { empId: 'emp-006', date: '2026-07-01' },
        { empId: 'emp-006', date: '2026-07-02' },
        { empId: 'emp-019', date: '2026-07-05' }, // missing → created
      ],
      { shiftCode: '9A0700', dayOff: false },
    );
    const g = get();
    const byKey = new Map(g.cells.map((c) => [cellKey(c.empId, c.date), c]));
    expect(byKey.get(cellKey('emp-006', '2026-07-01'))!.shiftCode).toBe('9A0700');
    expect(byKey.get(cellKey('emp-006', '2026-07-02'))!.shiftCode).toBe('9A0700');
    expect(byKey.get(cellKey('emp-019', '2026-07-05'))!.shiftCode).toBe('9A0700');
  });

  it('a dayOff patch clears the worked shift + OT', () => {
    seed('draft');
    useShiftAssignment.getState().bulkApply(GID, [{ empId: 'emp-006', date: '2026-07-01' }], {
      dayOff: true,
    });
    const c = get().cells.find((x) => x.date === '2026-07-01')!;
    expect(c.dayOff).toBe(true);
    expect(c.shiftCode).toBe('');
  });

  it('clearCells resets selected cells to empty', () => {
    seed('draft');
    useShiftAssignment.getState().clearCells(GID, [{ empId: 'emp-006', date: '2026-07-01' }]);
    const c = get().cells.find((x) => x.date === '2026-07-01')!;
    expect(c.shiftCode).toBe('');
    expect(c.dayOff).toBeUndefined();
  });
});
