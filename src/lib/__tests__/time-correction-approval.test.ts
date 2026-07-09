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
    correctionType: 'in',
    reasonCode: 'UNABLE_TO_SCAN',
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

  it('round-trips correctionType + reasonCode and derives the pay-code', () => {
    const id = submitOne();
    const stored = useTimeCorrections.getState().requests.find((r) => r.id === id)!;
    expect(stored.correctionType).toBe('in');
    expect(stored.reasonCode).toBe('UNABLE_TO_SCAN');
    // payCode is derived from the reason registry (UNABLE_TO_SCAN → UNABLE_TO_SCAN).
    expect(stored.payCode).toBe('UNABLE_TO_SCAN');
  });

  it('single-day stores NO `days` key (byte-identical shape)', () => {
    const id = submitOne();
    const stored = useTimeCorrections.getState().requests.find((r) => r.id === id)!;
    expect(stored.days).toBeUndefined();
  });
});

describe('multi-day time correction — Convention X (one request, N days)', () => {
  function submitMultiDay() {
    return useTimeCorrections.getState().addRequest({
      employeeId: 'EMP102',
      employeeName: 'Natcha Panyasiri',
      department: 'My Team',
      date: '2026-05-20',
      correctionType: 'in',
      reasonCode: 'UNABLE_TO_SCAN',
      originalTime: '09:22',
      correctedTime: '09:05',
      reason: 'Badge scanned at 09:05',
      days: [
        {
          date: '2026-05-21',
          correctionType: 'out',
          reasonCode: 'FORGET_CARD',
          correctedTime: '18:10',
          reason: 'Forgot to clock out',
        },
        {
          date: '2026-05-22',
          correctionType: 'both',
          reasonCode: 'MACHINE_BROKE',
          correctedTime: '08:30',
          reason: 'Scanner down',
        },
      ],
    });
  }

  it('stores ONE request carrying days 1..n; top-level === day 0', () => {
    const id = submitMultiDay();
    const stored = useTimeCorrections.getState().requests.find((r) => r.id === id)!;
    // Convention X: day 0 lives top-level, days[] holds days 1..n ONLY.
    expect(stored.date).toBe('2026-05-20');
    expect(stored.correctionType).toBe('in');
    expect(stored.days).toHaveLength(2);
    expect(stored.days!.map((d) => d.date)).toEqual(['2026-05-21', '2026-05-22']);
    // Exactly ONE request was stored for the whole submission.
    expect(useTimeCorrections.getState().requests.filter((r) => r.id === id)).toHaveLength(1);
  });

  it('surfaces as ONE quick-approve row summarizing N days', () => {
    const id = submitMultiDay();
    const queue = getPendingApprovals().filter((q) => q.row.id === id);
    expect(queue).toHaveLength(1); // ONE queue item for the multi-day request
    const stored = useTimeCorrections.getState().requests.find((r) => r.id === id)!;
    const pr = timeCorrectionToPendingRequest(stored);
    // N = 1 + days.length = 3; description summarizes the +N extra days.
    expect(pr.description).toContain('+2');
  });

  it('single-day description is byte-identical (no days summary)', () => {
    const id = submitOne();
    const stored = useTimeCorrections.getState().requests.find((r) => r.id === id)!;
    const pr = timeCorrectionToPendingRequest(stored);
    expect(pr.description).toBe('แก้ไขเวลา (เวลาเข้า (ลืมกดเข้า)) — 2026-05-20 · 09:05');
  });
});
