/**
 * overtime-requests.test.ts — Group B store acceptance tests.
 *
 * Covers: submit → approve → reject lifecycle, audit trail, stable seed ids
 * (seedFromQueue preserves row.id and is idempotent per id), and terminal-state
 * guards (approve/reject on a non-pending row is a no-op).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOvertimeRequests, type OTRequest } from '../overtime-requests';

function baseRow(id: string, overrides: Partial<OTRequest> = {}): OTRequest {
  return {
    id,
    employeeId: 'EMP001',
    employeeName: 'พิมพ์ชนก ศรีวัฒน์',
    department: 'Store',
    otType: 'OT',
    startAt: '2026-06-01T18:00:00',
    endAt: '2026-06-01T21:00:00',
    hours: 3,
    reason: 'ปิดยอดสิ้นเดือน',
    docs: [],
    status: 'pending',
    submittedAt: '2026-06-01T08:00:00+07:00',
    audit: [{ actorId: 'EMP001', actorName: 'พิมพ์ชนก ศรีวัฒน์', action: 'submit', at: '2026-06-01T08:00:00+07:00' }],
    ...overrides,
  };
}

beforeEach(() => {
  useOvertimeRequests.getState().clear();
});

describe('overtime-requests store — submit/approve/reject', () => {
  it('addRequest creates a pending row with a submit audit entry', () => {
    const id = useOvertimeRequests.getState().addRequest({
      employeeId: 'EMP001',
      employeeName: 'พิมพ์ชนก ศรีวัฒน์',
      department: 'Store',
      otType: 'OT',
      startAt: '2026-06-01T18:00:00',
      endAt: '2026-06-01T21:00:00',
      hours: 3,
      reason: 'งานด่วน',
      docs: [],
    });
    const req = useOvertimeRequests.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('pending');
    expect(req.audit).toHaveLength(1);
    expect(req.audit[0].action).toBe('submit');
  });

  it('approve flips status to approved + appends an approve audit entry', () => {
    const id = useOvertimeRequests.getState().addRequest({
      employeeId: 'EMP001', employeeName: 'A', department: 'Store', otType: 'OT',
      startAt: '2026-06-01T18:00:00', endAt: '2026-06-01T20:00:00', hours: 2, reason: 'r', docs: [],
    });
    useOvertimeRequests.getState().approve(id, { name: 'Mgr' }, 'ok');
    const req = useOvertimeRequests.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('approved');
    expect(req.audit.some((a) => a.action === 'approve' && a.comment === 'ok')).toBe(true);
  });

  it('reject flips status to rejected + records the reason', () => {
    const id = useOvertimeRequests.getState().addRequest({
      employeeId: 'EMP001', employeeName: 'A', department: 'Store', otType: 'OT_BREAK',
      startAt: '2026-06-01T23:00:00', endAt: '2026-06-02T02:00:00', hours: 3, reason: 'r', docs: [],
    });
    useOvertimeRequests.getState().reject(id, { name: 'Mgr' }, 'ไม่อนุมัติล่วงหน้า');
    const req = useOvertimeRequests.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('rejected');
    expect(req.audit.some((a) => a.action === 'reject' && a.comment === 'ไม่อนุมัติล่วงหน้า')).toBe(true);
  });

  it('approve/reject on a terminal row is a no-op (no double-transition)', () => {
    const id = useOvertimeRequests.getState().addRequest({
      employeeId: 'EMP001', employeeName: 'A', department: 'Store', otType: 'OT',
      startAt: '2026-06-01T18:00:00', endAt: '2026-06-01T20:00:00', hours: 2, reason: 'r', docs: [],
    });
    useOvertimeRequests.getState().approve(id, { name: 'Mgr' });
    useOvertimeRequests.getState().reject(id, { name: 'Mgr' }, 'late');
    const req = useOvertimeRequests.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('approved'); // reject ignored after approval
  });

  it('approve/reject never throw for unknown ids', () => {
    expect(() => useOvertimeRequests.getState().approve('MISSING', { name: 'A' })).not.toThrow();
    expect(() => useOvertimeRequests.getState().reject('MISSING', { name: 'A' }, 'r')).not.toThrow();
  });
});

describe('overtime-requests store — seedFromQueue stable ids', () => {
  it('seeds rows preserving their ids', () => {
    useOvertimeRequests.getState().seedFromQueue([baseRow('OT-DEMO-0001'), baseRow('OT-DEMO-0002')]);
    const ids = useOvertimeRequests.getState().requests.map((r) => r.id).sort();
    expect(ids).toEqual(['OT-DEMO-0001', 'OT-DEMO-0002']);
  });

  it('seeding twice does not duplicate a row with the same id', () => {
    useOvertimeRequests.getState().seedFromQueue([baseRow('OT-DEMO-0001')]);
    useOvertimeRequests.getState().seedFromQueue([baseRow('OT-DEMO-0001')]);
    expect(useOvertimeRequests.getState().requests.filter((r) => r.id === 'OT-DEMO-0001')).toHaveLength(1);
  });

  it('a seeded row can be approved by its stable id', () => {
    useOvertimeRequests.getState().seedFromQueue([baseRow('OT-DEMO-0001')]);
    useOvertimeRequests.getState().approve('OT-DEMO-0001', { name: 'Mgr' });
    expect(useOvertimeRequests.getState().requests.find((r) => r.id === 'OT-DEMO-0001')?.status).toBe('approved');
  });
});
