import { describe, it, expect } from 'vitest';
import { leaveStageLabel } from '@/stores/leave-approvals';

// Audit P2-3 — the employee-side status label must distinguish the two pending
// stages of a 2-level (Manager → HR) chain. Single source of truth tested here;
// timeoff status tab and the detail header both consume this function.

describe('leaveStageLabel — 2-stage narration', () => {
  it('pending without awaitingNext → waiting for manager', () => {
    expect(leaveStageLabel('pending', false, true)).toBe('รอหัวหน้าอนุมัติ');
    expect(leaveStageLabel('pending', false, false)).toBe('Awaiting manager');
    expect(leaveStageLabel('pending', undefined, true)).toBe('รอหัวหน้าอนุมัติ');
  });

  it('pending WITH awaitingNext → manager approved, awaiting HR', () => {
    expect(leaveStageLabel('pending', true, true)).toBe('หัวหน้าอนุมัติแล้ว · รอฝ่ายบุคคล');
    expect(leaveStageLabel('pending', true, false)).toBe('Manager approved · awaiting HR');
  });

  it('approved → approved', () => {
    expect(leaveStageLabel('approved', false, true)).toBe('อนุมัติแล้ว');
    expect(leaveStageLabel('approved', true, false)).toBe('Approved');
  });

  it('rejected → rejected (ignores awaitingNext)', () => {
    expect(leaveStageLabel('rejected', false, true)).toBe('ไม่อนุมัติ');
    expect(leaveStageLabel('rejected', true, false)).toBe('Rejected');
  });
});
