import { describe, it, expect, beforeEach } from 'vitest';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useLeaveBalances, remainingFor } from '@/stores/leave-balances';

// leave-approvals — Group A quota + 2-level (Manager → HR) advance.
// maternity_leave is quotaTracked AND a 2-level type (levelsForLeaveType === 2).

const EMP = 'EMP-QUOTA-TEST';
const MGR = { id: 'MGR-1', name: 'Manager' };
const HR = { id: 'HR-1', name: 'HR' };

function seedMaternity(initial = 98) {
  useLeaveBalances.getState().clear();
  useLeaveBalances
    .getState()
    .seedBalances([{ employeeId: EMP, kind: 'maternity_leave', initial }]);
}

describe('leave-approvals — reserve / 2-level advance / deduct / release', () => {
  beforeEach(() => {
    useLeaveApprovals.getState().clear();
    seedMaternity();
  });

  it('addRequest reserves quota and records reservedDays', () => {
    const id = useLeaveApprovals.getState().addRequest({
      employeeId: EMP,
      employeeName: 'Mom',
      leaveType: 'maternity_leave',
      leaveCode: 'maternity_leave',
      startDate: '2026-06-10',
      endDate: '2026-06-19',
      reason: 'maternity',
      days: 10,
    });
    const req = useLeaveApprovals.getState().requests.find((r) => r.id === id)!;
    expect(req.reservedDays).toBe(10);
    expect(remainingFor(EMP, 'maternity_leave')).toBe(88); // 98 − 10 reserved
  });

  it('first approve sets awaitingNext and stays pending; second approve finalizes + deducts', () => {
    const id = useLeaveApprovals.getState().addRequest({
      employeeId: EMP,
      employeeName: 'Mom',
      leaveType: 'maternity_leave',
      leaveCode: 'maternity_leave',
      startDate: '2026-06-10',
      endDate: '2026-06-19',
      reason: 'maternity',
      days: 10,
    });

    // First (manager) approval → advance to HR step, still pending.
    useLeaveApprovals.getState().approve(id, MGR);
    let req = useLeaveApprovals.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('pending');
    expect(req.awaitingNext).toBe(true);
    // Quota still only reserved (not yet deducted).
    let bucket = useLeaveBalances.getState().balances[`${EMP}:maternity_leave`];
    expect(bucket.reserved).toBe(10);
    expect(bucket.debits).toBe(0);

    // Second (HR) approval → final approve + deduct.
    useLeaveApprovals.getState().approve(id, HR);
    req = useLeaveApprovals.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('approved');
    bucket = useLeaveBalances.getState().balances[`${EMP}:maternity_leave`];
    expect(bucket.reserved).toBe(0);
    expect(bucket.debits).toBe(10);
    expect(remainingFor(EMP, 'maternity_leave')).toBe(88); // 98 − 10 debited
  });

  it('reject releases the reserved quota', () => {
    const id = useLeaveApprovals.getState().addRequest({
      employeeId: EMP,
      employeeName: 'Mom',
      leaveType: 'maternity_leave',
      leaveCode: 'maternity_leave',
      startDate: '2026-06-10',
      endDate: '2026-06-19',
      reason: 'maternity',
      days: 10,
    });
    expect(remainingFor(EMP, 'maternity_leave')).toBe(88);

    useLeaveApprovals.getState().reject(id, MGR, 'not approved');
    const req = useLeaveApprovals.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('rejected');
    expect(remainingFor(EMP, 'maternity_leave')).toBe(98); // released back
  });

  // STA-157 — employee cancels a first-approval pending request.
  const EMPLOYEE = { id: EMP, name: 'Mom' };

  function addPendingMaternity() {
    return useLeaveApprovals.getState().addRequest({
      employeeId: EMP,
      employeeName: 'Mom',
      leaveType: 'maternity_leave',
      leaveCode: 'maternity_leave',
      startDate: '2026-06-10',
      endDate: '2026-06-19',
      reason: 'maternity',
      days: 10,
    });
  }

  it('cancel sets status cancelled, releases reserved quota, and records an audit entry', () => {
    const id = addPendingMaternity();
    expect(remainingFor(EMP, 'maternity_leave')).toBe(88); // reserved

    useLeaveApprovals.getState().cancel(id, EMPLOYEE);
    const req = useLeaveApprovals.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('cancelled');
    expect(remainingFor(EMP, 'maternity_leave')).toBe(98); // released back immediately
    const last = req.audit[req.audit.length - 1];
    expect(last.action).toBe('cancel');
    expect(last.actorName).toBe('Mom');
  });

  // STA-183 — the cycle-window rule supersedes the STA-157 first-approval gate:
  // an awaitingNext (manager-approved, still pending) in-cycle row is NOW
  // cancellable, and releases the reserved quota (never the debits, which are 0).
  it('cancel of an awaitingNext (2-level first-approved) in-cycle row releases reserved, NOT debits', () => {
    const id = addPendingMaternity();
    useLeaveApprovals.getState().approve(id, MGR); // → awaitingNext (HR), still pending
    expect(useLeaveBalances.getState().balances[`${EMP}:maternity_leave`].reserved).toBe(10);
    expect(useLeaveBalances.getState().balances[`${EMP}:maternity_leave`].debits).toBe(0);

    useLeaveApprovals.getState().cancel(id, EMPLOYEE);
    const req = useLeaveApprovals.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('cancelled');
    const bucket = useLeaveBalances.getState().balances[`${EMP}:maternity_leave`];
    expect(bucket.reserved).toBe(0); // reserved released
    expect(bucket.debits).toBe(0); // debits untouched
    expect(remainingFor(EMP, 'maternity_leave')).toBe(98);
  });

  // STA-183 — cancelling an APPROVED in-cycle leave must reverse the DEBITS (via
  // reverseApproved), restoring remaining to its pre-approval value — closes the
  // approved-leave quota-corruption blocker.
  it('cancel of an APPROVED in-cycle leave reverses debits and restores remaining', () => {
    useLeaveBalances.getState().clear();
    useLeaveBalances
      .getState()
      .seedBalances([{ employeeId: EMP, kind: 'annual_leave', initial: 10 }]);
    const id = useLeaveApprovals.getState().addRequest({
      employeeId: EMP,
      employeeName: 'Worker',
      leaveType: 'annual_leave',
      leaveCode: 'annual_leave',
      startDate: '2026-06-08',
      endDate: '2026-06-09',
      reason: 'vacation',
      days: 2,
    });
    useLeaveApprovals.getState().approve(id, MGR); // 1-level → approved + deduct
    expect(useLeaveBalances.getState().balances[`${EMP}:annual_leave`].debits).toBe(2);
    expect(remainingFor(EMP, 'annual_leave')).toBe(8);

    useLeaveApprovals.getState().cancel(id, EMPLOYEE);
    const req = useLeaveApprovals.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('cancelled');
    const bucket = useLeaveBalances.getState().balances[`${EMP}:annual_leave`];
    expect(bucket.debits).toBe(0); // debits reversed
    expect(bucket.reserved).toBe(0);
    expect(remainingFor(EMP, 'annual_leave')).toBe(10); // restored to pre-approval
  });

  // STA-183 — a start date older than the previous cycle is NOT cancellable.
  it('cancel is a no-op when the start date is out of the cycle window', () => {
    const id = useLeaveApprovals.getState().addRequest({
      employeeId: EMP,
      employeeName: 'Mom',
      leaveType: 'maternity_leave',
      leaveCode: 'maternity_leave',
      startDate: '2026-01-10', // before the previous cycle
      endDate: '2026-01-19',
      reason: 'maternity',
      days: 10,
    });
    useLeaveApprovals.getState().cancel(id, EMPLOYEE);
    const req = useLeaveApprovals.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('pending'); // unchanged — out of window
  });

  it('cancel is a no-op on an already-rejected request', () => {
    const id = addPendingMaternity();
    useLeaveApprovals.getState().reject(id, MGR, 'no');
    useLeaveApprovals.getState().cancel(id, EMPLOYEE);
    const req = useLeaveApprovals.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('rejected'); // unchanged
  });

  it('a 1-level quotaTracked type deducts on the single approval', () => {
    useLeaveBalances.getState().clear();
    useLeaveBalances
      .getState()
      .seedBalances([{ employeeId: EMP, kind: 'annual_leave', initial: 10 }]);
    const id = useLeaveApprovals.getState().addRequest({
      employeeId: EMP,
      employeeName: 'Worker',
      leaveType: 'annual_leave',
      leaveCode: 'annual_leave',
      startDate: '2026-06-08',
      endDate: '2026-06-09',
      reason: 'vacation',
      days: 2,
    });
    useLeaveApprovals.getState().approve(id, MGR);
    const req = useLeaveApprovals.getState().requests.find((r) => r.id === id)!;
    expect(req.status).toBe('approved'); // 1-level → finalizes immediately
    expect(req.awaitingNext).toBeFalsy();
    const bucket = useLeaveBalances.getState().balances[`${EMP}:annual_leave`];
    expect(bucket.debits).toBe(2);
    expect(remainingFor(EMP, 'annual_leave')).toBe(8);
  });
});
