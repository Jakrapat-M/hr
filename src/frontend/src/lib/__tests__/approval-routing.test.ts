/**
 * approval-routing.test.ts — P4 Item 1 acceptance tests.
 *
 * The MOCK approver-routing matrix makes the unified /quick-approve queue speak
 * truth about WHO approves WHAT, and at WHICH step:
 *   • every RequestType has an ordered approver chain (totality);
 *   • canActOn is STEP-AWARE — only the CURRENT step's routed role(s) can act,
 *     and senior approvers still act on every row through role inheritance;
 *   • a pay_rate row is actionable by SPD but VIEW-ONLY for a plain manager;
 *   • a leave/time_correction row is actionable by the team manager;
 *   • a row past its manager step (awaitingNext) is view-only for the manager.
 */

import { describe, it, expect } from 'vitest';
import {
  APPROVAL_ROUTING,
  routingChainFor,
  routingStagesFor,
  currentStepIndex,
  currentStep,
  currentStepRoles,
  rolesActAtCurrentStep,
  nextApproverLabel,
} from '../approval-routing';
import { canActOn } from '../claim-permissions';
import type { QueueApproval } from '../approval-registry';
import type { PendingRequest, RequestType, ApprovalStep } from '../quick-approve-api';
import type { Role } from '../rbac';

const MANAGER: Role[] = ['manager'];
const SPD: Role[] = ['spd'];
const HRBP: Role[] = ['hrbp'];
const HR_ADMIN: Role[] = ['hr_admin'];
const EMPLOYEE: Role[] = ['employee'];

const ALL_TYPES: RequestType[] = [
  'leave',
  'overtime',
  'claim',
  'transfer',
  'change_request',
  'probation',
  'pay_rate',
  'tax_planning',
  'time_correction',
];

function makeRow(
  type: RequestType,
  timeline: ApprovalStep[],
): PendingRequest {
  return {
    id: `${type}-1`,
    type,
    requester: { id: 'E1', name: 'Test User', position: 'X', department: 'D' },
    description: 'test',
    submittedAt: new Date().toISOString(),
    urgency: 'normal',
    waitingDays: 0,
    details: {},
    approvalTimeline: timeline,
  };
}

function pendingItem(
  type: RequestType,
  timeline: ApprovalStep[] = [{ step: 1, approver: 'X', status: 'pending' }],
  awaitingNext = false,
): QueueApproval {
  return { row: makeRow(type, timeline), status: 'pending', awaitingNext };
}

// ── Matrix shape ──────────────────────────────────────────────────────────────
describe('APPROVAL_ROUTING — matrix totality + shape', () => {
  it('defines an ordered approver chain for every RequestType', () => {
    for (const type of ALL_TYPES) {
      const chain = routingChainFor(type);
      expect(chain.length).toBeGreaterThanOrEqual(1);
      for (const step of chain) {
        expect(step.roles.length).toBeGreaterThanOrEqual(1);
        expect(step.labelTh).toBeTruthy();
        expect(step.labelEn).toBeTruthy();
        expect(step.stage).toBeTruthy();
      }
    }
  });

  it('matrix keys cover exactly the RequestType union', () => {
    expect(Object.keys(APPROVAL_ROUTING).sort()).toEqual([...ALL_TYPES].sort());
  });

  it('routingStagesFor returns the ordered stage pills', () => {
    expect(routingStagesFor('transfer')).toEqual(['manager', 'hrbp', 'spd']);
    expect(routingStagesFor('claim')).toEqual(['manager', 'spd']);
    expect(routingStagesFor('pay_rate')).toEqual(['spd']);
  });
});

// ── Current-step derivation ─────────────────────────────────────────────────────
describe('currentStep / currentStepIndex — derived from status + timeline', () => {
  it('terminal rows have no current step', () => {
    const item: QueueApproval = { row: makeRow('leave', []), status: 'approved' };
    expect(currentStepIndex(item)).toBe(-1);
    expect(currentStep(item)).toBeUndefined();
    expect(nextApproverLabel(item, 'en')).toBeNull();
  });

  it('a fresh claim is at step 0 (Manager)', () => {
    const item = pendingItem('claim', [{ step: 1, approver: 'หัวหน้างาน', status: 'pending' }]);
    expect(currentStepIndex(item)).toBe(0);
    expect(currentStepRoles(item)).toEqual(['manager']);
    expect(nextApproverLabel(item, 'en')).toBe('Manager');
    expect(nextApproverLabel(item, 'th')).toBe('หัวหน้างาน');
  });

  it('a claim whose manager step is decided advances to step 1 (SPD)', () => {
    const item = pendingItem('claim', [
      { step: 1, approver: 'หัวหน้างาน', status: 'approved' },
      { step: 2, approver: 'SPD Benefits', status: 'pending' },
    ]);
    expect(currentStepIndex(item)).toBe(1);
    expect(currentStepRoles(item)).toEqual(['spd']);
    expect(nextApproverLabel(item, 'en')).toBe('SPD Benefits');
  });

  it('awaitingNext advances a single-step chain to its last index', () => {
    const item = pendingItem('leave', [{ step: 1, approver: 'Manager', status: 'approved' }], true);
    // leave has a single [manager] step → clamps to last index (0), but the
    // manager has already acted (awaitingNext) so canActOn keeps it view-only.
    expect(currentStepIndex(item)).toBe(0);
  });
});

// ── Step-aware canActOn ──────────────────────────────────────────────────────────
describe('canActOn — STEP-AWARE per the routing matrix', () => {
  it('pay_rate: actionable by SPD, VIEW-ONLY for a plain manager', () => {
    const item = pendingItem('pay_rate', [{ step: 1, approver: 'SPD', status: 'pending' }]);
    expect(rolesActAtCurrentStep(item, SPD)).toBe(true);
    expect(canActOn(item, SPD)).toBe(true);
    expect(canActOn(item, HRBP)).toBe(true); // hrbp is a routed pay-rate approver
    expect(canActOn(item, MANAGER)).toBe(false);
    expect(canActOn(item, EMPLOYEE)).toBe(false);
  });

  it('tax_planning: actionable by SPD, VIEW-ONLY for a plain manager', () => {
    const item = pendingItem('tax_planning', [{ step: 1, approver: 'Payroll', status: 'pending' }]);
    expect(canActOn(item, SPD)).toBe(true);
    expect(canActOn(item, MANAGER)).toBe(false);
  });

  it('change_request: actionable by SPD, VIEW-ONLY for a plain manager', () => {
    const item = pendingItem('change_request', [{ step: 1, approver: 'SPD', status: 'pending' }]);
    expect(canActOn(item, SPD)).toBe(true);
    expect(canActOn(item, MANAGER)).toBe(false);
  });

  it('leave: actionable by the team manager (first-line)', () => {
    const item = pendingItem('leave', [{ step: 1, approver: 'หัวหน้างาน', status: 'pending' }]);
    expect(canActOn(item, MANAGER)).toBe(true);
    expect(canActOn(item, EMPLOYEE)).toBe(false);
  });

  it('time_correction: actionable by the team manager (first-line)', () => {
    const item = pendingItem('time_correction', [{ step: 1, approver: 'หัวหน้างาน', status: 'pending' }]);
    expect(canActOn(item, MANAGER)).toBe(true);
  });

  it('claim at step 1 (SPD): view-only for the manager, actionable by SPD', () => {
    const item = pendingItem('claim', [
      { step: 1, approver: 'หัวหน้างาน', status: 'approved' },
      { step: 2, approver: 'SPD Benefits', status: 'pending' },
    ], true);
    expect(canActOn(item, MANAGER)).toBe(false);
    expect(canActOn(item, SPD)).toBe(true);
  });

  it('senior approver (hr_admin) acts on EVERY row type (role inheritance)', () => {
    for (const type of ALL_TYPES) {
      const item = pendingItem(type);
      expect(canActOn(item, HR_ADMIN)).toBe(true);
    }
  });

  it('terminal rows are never actionable', () => {
    const approved: QueueApproval = { row: makeRow('pay_rate', []), status: 'approved' };
    expect(canActOn(approved, SPD)).toBe(false);
    expect(canActOn(approved, HR_ADMIN)).toBe(false);
  });
});
