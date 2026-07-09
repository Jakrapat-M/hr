import { describe, it, expect, beforeEach } from 'vitest';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useLeaveBalances } from '@/stores/leave-balances';

// leave-approvals — persist/rehydrate contract.
//
// Verifies that:
// 1. A user-submitted (live) request survives a simulated rehydrate (store clear +
//    merge path via setState of persisted snapshot).
// 2. Re-seeding with the same stable id after rehydrate never doubles the row.
// 3. Seed rows are backfilled when missing (addRequest idempotent guard).

const EMP = 'EMP-PERSIST-TEST';

const SEED_ID = 'LV-DEMO-PERSIST-0001';
const LIVE_ID_PREFIX = 'LV-LIVE-';

function addSeedRow() {
  return useLeaveApprovals.getState().addRequest({
    id: SEED_ID,
    employeeId: EMP,
    employeeName: 'Seed Worker',
    leaveType: 'annual_leave',
    leaveCode: 'annual_leave',
    startDate: '2026-06-01',
    endDate: '2026-06-02',
    reason: 'seed row',
    days: 2,
  });
}

function addLiveRow(suffix = '001') {
  return useLeaveApprovals.getState().addRequest({
    // No stable id — simulates a user-submitted (ESS form) request.
    employeeId: EMP,
    employeeName: 'Live Worker',
    leaveType: 'sick',
    startDate: '2026-06-10',
    endDate: '2026-06-10',
    reason: 'เจ็บป่วย',
    days: 1,
  });
}

describe('leave-approvals — persist / rehydrate contract', () => {
  beforeEach(() => {
    useLeaveApprovals.getState().clear();
    useLeaveBalances.getState().clear();
  });

  it('live-submitted request survives a simulated rehydrate (setState from snapshot)', () => {
    // 1. Submit a live (user-generated) request.
    const liveId = addLiveRow();
    expect(useLeaveApprovals.getState().requests.some((r) => r.id === liveId)).toBe(true);

    // 2. Simulate rehydrate: capture current state, clear, then restore via setState
    //    (mirrors what zustand/persist does when loading from localStorage).
    const snapshot = { requests: [...useLeaveApprovals.getState().requests] };
    useLeaveApprovals.getState().clear();
    useLeaveApprovals.setState({ requests: snapshot.requests });

    // 3. Live row must still be there.
    expect(useLeaveApprovals.getState().requests.some((r) => r.id === liveId)).toBe(true);
  });

  it('re-seeding a stable id after rehydrate does NOT double the row', () => {
    // Seed once.
    addSeedRow();
    expect(useLeaveApprovals.getState().requests.filter((r) => r.id === SEED_ID)).toHaveLength(1);

    // Simulate rehydrate (restore persisted state).
    const snapshot = { requests: [...useLeaveApprovals.getState().requests] };
    useLeaveApprovals.getState().clear();
    useLeaveApprovals.setState({ requests: snapshot.requests });

    // Re-seed (ensureDemoSeed calls addRequest again with the same stable id).
    addSeedRow();

    // Must still be exactly one row with this id.
    expect(useLeaveApprovals.getState().requests.filter((r) => r.id === SEED_ID)).toHaveLength(1);
  });

  it('seed row is backfilled when missing after clear (idempotent addRequest)', () => {
    // Store is empty (cleared in beforeEach) — seed adds the row.
    const id = addSeedRow();
    expect(id).toBe(SEED_ID);
    expect(useLeaveApprovals.getState().requests.some((r) => r.id === SEED_ID)).toBe(true);
  });

  it('live row + seed row both present after rehydrate + reseed', () => {
    // Add both a live and a seed row.
    const liveId = addLiveRow();
    addSeedRow();
    expect(useLeaveApprovals.getState().requests).toHaveLength(2);

    // Simulate rehydrate.
    const snapshot = { requests: [...useLeaveApprovals.getState().requests] };
    useLeaveApprovals.getState().clear();
    useLeaveApprovals.setState({ requests: snapshot.requests });

    // Re-seed (idempotent — stable id already present).
    addSeedRow();

    const requests = useLeaveApprovals.getState().requests;
    expect(requests).toHaveLength(2);
    expect(requests.some((r) => r.id === liveId)).toBe(true);
    expect(requests.some((r) => r.id === SEED_ID)).toBe(true);
  });
});
