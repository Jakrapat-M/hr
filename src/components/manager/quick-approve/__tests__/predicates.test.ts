import { describe, expect, it } from 'vitest';

import type { PendingRequest } from '@/lib/quick-approve-api';
import {
  computeTabCounts,
  isActionRequired,
  isWatching,
} from '@/components/manager/quick-approve/predicates';

function request(overrides: Partial<PendingRequest & Record<string, unknown>> = {}) {
  return {
    id: 'WF-TEST-001',
    type: 'leave',
    requester: {
      id: 'EMP-001',
      name: 'Employee One',
      position: 'Engineer',
      department: 'IT',
    },
    description: 'Annual leave',
    submittedAt: new Date().toISOString(),
    urgency: 'normal',
    waitingDays: 1,
    details: {},
    approvalTimeline: [
      { step: 1, approver: 'Manager', status: 'pending' },
    ],
    ...overrides,
  } satisfies PendingRequest & Record<string, unknown>;
}

describe('quick approve smart-tab predicates', () => {
  it('keeps legacy mock rows without assigneeId visible in manager action tab', () => {
    const row = request();

    expect(isActionRequired(row, 'manager', 'MGR001')).toBe(true);
    expect(isWatching(row, 'manager', 'MGR001')).toBe(false);
    expect(computeTabCounts([row], 'manager', 'MGR001')).toMatchObject({
      action: 1,
      watching: 0,
    });
  });

  it('still sends explicitly assigned rows for another manager to watching', () => {
    const row = request({ assigneeId: 'MGR002' });

    expect(isActionRequired(row, 'manager', 'MGR001')).toBe(false);
    expect(isWatching(row, 'manager', 'MGR001')).toBe(true);
    expect(computeTabCounts([row], 'manager', 'MGR001')).toMatchObject({
      action: 0,
      watching: 1,
    });
  });
});
