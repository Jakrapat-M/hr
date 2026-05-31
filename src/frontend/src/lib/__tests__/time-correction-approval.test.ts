/**
 * time-correction-approval.test.ts — P3 acceptance tests.
 *
 * Covers:
 *   • A submitted time-correction appears as a 'time_correction' row in the
 *     unified queue (selectPendingApprovals / getPendingApprovals).
 *   • The row's drill-in routes to /workflows/time-correction/<id>.
 *   • An approver (manager+) canActOn the row; a non-approver (employee) is
 *     view-only.
 *   • Approve / reject via the registry adapter flips the source store status,
 *     and the queue re-derives the collapsed status (pending → approved/rejected).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  APPROVAL_REGISTRY,
  getPendingApprovals,
  timeCorrectionToPendingRequest,
} from '../approval-registry';
import { canActOn } from '../claim-permissions';
import { useTimeCorrections } from '@/stores/time-corrections';
import type { Role } from '@/lib/rbac';

const EMPLOYEE: Role[] = ['employee'];
const MANAGER: Role[] = ['manager'];

function submitOne() {
  return useTimeCorrections.getState().addRequest({
    employeeId: 'EMP102',
    employeeName: 'Natcha Panyasiri',
    department: 'My Team',
    date: '2026-05-20',
    kind: 'wrong-time',
    originalTime: '09:22',
    correctedTime: '09:05',
    reason: 'Badge scanned at 09:05',
  });
}

// Mirror quick-approve-simple.tsx detailHref for the time_correction branch.
function detailHref(locale: string, id: string): string {
  return `/${locale}/workflows/time-correction/${id}`;
}

beforeEach(() => {
  useTimeCorrections.getState().clear();
});

describe('time-correction → unified quick-approve row', () => {
  it('a submitted correction surfaces as a time_correction queue row', () => {
    const id = submitOne();
    const queue = getPendingApprovals();
    const row = queue.find((q) => q.row.id === id);
    expect(row).toBeDefined();
    expect(row!.row.type).toBe('time_correction');
    expect(row!.status).toBe('pending');
  });

  it('bridge sets the manager (หัวหน้างาน) first-line approval step', () => {
    const id = submitOne();
    const fresh = useTimeCorrections.getState().requests.find((r) => r.id === id)!;
    const pr = timeCorrectionToPendingRequest(fresh);
    expect(pr.approvalTimeline[0].approver).toBe('หัวหน้างาน');
    expect(pr.type).toBe('time_correction');
  });

  it('row drill-in routes to /workflows/time-correction/<id>', () => {
    const id = submitOne();
    expect(detailHref('th', id)).toBe(`/th/workflows/time-correction/${id}`);
    expect(detailHref('en', id)).toBe(`/en/workflows/time-correction/${id}`);
  });

  it('approver (manager) canActOn the row; employee is view-only', () => {
    submitOne();
    const item = getPendingApprovals().find((q) => q.row.type === 'time_correction')!;
    expect(canActOn(item, MANAGER)).toBe(true);
    expect(canActOn(item, EMPLOYEE)).toBe(false);
  });

  it('registry approve flips store + queue status to approved', () => {
    const id = submitOne();
    APPROVAL_REGISTRY.time_correction.approve(id, { name: 'Mgr' });
    const stored = useTimeCorrections.getState().requests.find((r) => r.id === id)!;
    expect(stored.status).toBe('approved');
    const item = getPendingApprovals().find((q) => q.row.id === id)!;
    expect(item.status).toBe('approved');
    // Terminal rows are no longer actionable.
    expect(canActOn(item, MANAGER)).toBe(false);
  });

  it('registry reject flips store + queue status to rejected (with reason in audit)', () => {
    const id = submitOne();
    APPROVAL_REGISTRY.time_correction.reject(id, { name: 'Mgr' }, 'insufficient detail');
    const stored = useTimeCorrections.getState().requests.find((r) => r.id === id)!;
    expect(stored.status).toBe('rejected');
    expect(stored.audit.some((a) => a.action === 'reject' && a.comment === 'insufficient detail')).toBe(true);
    const item = getPendingApprovals().find((q) => q.row.id === id)!;
    expect(item.status).toBe('rejected');
  });

  it('adapter approve/reject never throw for unknown ids', () => {
    expect(() => APPROVAL_REGISTRY.time_correction.approve('MISSING', { name: 'A' })).not.toThrow();
    expect(() => APPROVAL_REGISTRY.time_correction.reject('MISSING', { name: 'A' }, 'r')).not.toThrow();
  });
});
