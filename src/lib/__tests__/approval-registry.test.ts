/**
 * approval-registry.test.ts — PR-1a (clickable-HRMS) acceptance tests.
 *
 * Covers:
 *   AC-1a.1 statelessness — module source has no create()/useState/module-level
 *           mutable request array.
 *   AC-1a.2 totality — registry has all 6 RequestType keys, each a complete adapter.
 *   AC-1a.3 approve() reaches a terminal OR next-pending state without throwing
 *           (transfer no-throw stub; others delegate to their store).
 *   AC-1a.4 lifted helpers produce output identical to the pre-lift originals.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  APPROVAL_REGISTRY,
  probationToPendingRequest,
  benefitClaimToPendingRequest,
  selectPendingApprovals,
  type ApprovalAdapter,
} from '../approval-registry';
import type { PendingRequest, RequestType, Urgency } from '../quick-approve-api';
import type { ProbationCase } from '@/hooks/use-probation';
import type { BenefitClaimRequest } from '@/stores/benefit-claims';
import { useTerminationApprovals } from '@/stores/termination-approvals';

const ALL_REQUEST_TYPES: RequestType[] = [
  'leave',
  'overtime',
  'claim',
  'transfer',
  'change_request',
  'probation',
  'pay_rate',
  'tax_planning',
  'time_correction',
  'shift_assignment',
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_SOURCE = readFileSync(
  resolve(__dirname, '../approval-registry.ts'),
  'utf8',
);

// ── AC-1a.2 — totality ─────────────────────────────────────────────────────────
describe('APPROVAL_REGISTRY — totality (AC-1a.2)', () => {
  it('has exactly the 6 RequestType keys', () => {
    expect(Object.keys(APPROVAL_REGISTRY).sort()).toEqual([...ALL_REQUEST_TYPES].sort());
  });

  it.each(ALL_REQUEST_TYPES)('exposes a complete adapter for %s', (type) => {
    const adapter = APPROVAL_REGISTRY[type] as ApprovalAdapter;
    expect(typeof adapter.toQueueItem).toBe('function');
    expect(typeof adapter.approve).toBe('function');
    expect(typeof adapter.reject).toBe('function');
    expect(typeof adapter.seed).toBe('function');
    expect(typeof adapter.labels.th).toBe('string');
    expect(typeof adapter.labels.en).toBe('string');
    expect(adapter.labels.th.length).toBeGreaterThan(0);
    expect(adapter.labels.en.length).toBeGreaterThan(0);
  });
});

// ── AC-1a.1 — statelessness ──────────────────────────────────────────────────────
describe('APPROVAL_REGISTRY — statelessness (AC-1a.1)', () => {
  it('module source declares no store factory or local state', () => {
    // Strip comments so prose mentions of these names don't trip the scan.
    const code = REGISTRY_SOURCE
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '');
    // No Zustand store factory (create<...>) in the registry module itself.
    expect(code).not.toMatch(/\bcreate\s*</);
    // No React state hook usage/import.
    expect(code).not.toMatch(/\buseState\s*\(/);
    expect(code).not.toMatch(/\buseState\b.*from\s+['"]react['"]/);
    // No module-level mutable request array (let/var arrays holding requests).
    expect(code).not.toMatch(/^\s*(let|var)\s+\w+\s*:\s*[^=]*\[\]/m);
  });

  it('seed() is a no-op in PR-1a (orchestrated only by ensureDemoSeed)', () => {
    // Calling every seed must not throw and must not return a value.
    for (const type of ALL_REQUEST_TYPES) {
      expect(() => APPROVAL_REGISTRY[type].seed()).not.toThrow();
      expect(APPROVAL_REGISTRY[type].seed()).toBeUndefined();
    }
  });
});

// ── AC-1a.3 — approve() reaches terminal/next without throwing ────────────────────
describe('APPROVAL_REGISTRY — non-throwing approve/reject (AC-1a.3)', () => {
  it('transfer approve/reject are no-throw stubs (no store schema)', () => {
    expect(() => APPROVAL_REGISTRY.transfer.approve('TR-1', { name: 'Mgr' })).not.toThrow();
    expect(() =>
      APPROVAL_REGISTRY.transfer.reject('TR-1', { name: 'Mgr' }, 'reason'),
    ).not.toThrow();
  });

  it('claim approve awaits a Promise (benefit managerApprove)', async () => {
    vi.useFakeTimers();
    try {
      const p = APPROVAL_REGISTRY.claim.approve('BEN-CLM-MGR1', { name: 'Mgr' });
      expect(p).toBeInstanceOf(Promise);
      await vi.advanceTimersByTimeAsync(400);
      await expect(p).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('store-backed approve/reject do not throw for unknown ids (no-op map)', () => {
    const storeBacked: RequestType[] = ['leave', 'overtime', 'change_request', 'probation', 'pay_rate', 'tax_planning', 'time_correction'];
    for (const type of storeBacked) {
      expect(() => APPROVAL_REGISTRY[type].approve('MISSING', { name: 'A', role: 'spd' })).not.toThrow();
      expect(() =>
        APPROVAL_REGISTRY[type].reject('MISSING', { name: 'A', role: 'spd' }, 'r'),
      ).not.toThrow();
    }
  });
});

describe('APPROVAL_REGISTRY — termination lifecycle projection', () => {
  beforeEach(() => {
    useTerminationApprovals.getState().clear();
  });

  afterEach(() => {
    useTerminationApprovals.getState().clear();
  });

  function addTerminationRequest(): string {
    return useTerminationApprovals.getState().addRequest({
      employeeId: 'EMP-TERM-1',
      employeeName: 'Termination Tester',
      requestedLastDay: '2026-08-31',
      reasonCode: 'TERM_OTHER',
      reasonText: 'Lifecycle test',
      submittedBy: { id: 'SUBMITTER-TERM-1', name: 'Submitter', role: 'employee' },
      sourceRoute: 'ess',
    });
  }

  it('maps the change_request reject adapter to termination sendBack for TR rows', () => {
    const id = addTerminationRequest();

    APPROVAL_REGISTRY.change_request.reject(
      id,
      { name: 'Manager', role: 'manager' },
      'Please revise the request',
    );

    const request = useTerminationApprovals.getState().requests.find((item) => item.id === id);
    expect(request?.status).toBe('sent_back');
    expect(request?.audit.at(-1)).toMatchObject({
      action: 'send_back',
      actorRole: 'manager',
      actorName: 'Manager',
      comment: 'Please revise the request',
    });
  });

  it('excludes sent-back and withdrawn termination rows from the approver queue', () => {
    const pendingId = addTerminationRequest();
    const sentBackId = addTerminationRequest();
    const withdrawnId = addTerminationRequest();
    useTerminationApprovals
      .getState()
      .sendBack(sentBackId, 'Need revisions', { role: 'manager', name: 'Manager' });
    useTerminationApprovals.getState().withdraw(withdrawnId);

    const rows = selectPendingApprovals({
      leave: [],
      workflow: [],
      claims: [],
      transfers: [],
      terminations: useTerminationApprovals.getState().requests,
    });
    const ids = rows.map((item) => item.row.id);

    expect(ids).toContain(pendingId);
    expect(ids).not.toContain(sentBackId);
    expect(ids).not.toContain(withdrawnId);
  });
});

// ── AC-1a.4 — lifted-helper parity vs the pre-lift originals ──────────────────────
// Reference copies of the ORIGINAL helpers (verbatim from quick-approve-page.tsx
// before the lift). The lifted registry versions must produce identical output.

function probationToPendingRequest_ORIGINAL(c: ProbationCase): PendingRequest {
  const slaMs = new Date(c.slaDeadline).getTime() - Date.now();
  const slaHours = slaMs / (1000 * 60 * 60);
  const urgency: Urgency = slaHours < 12 ? 'urgent' : slaHours < 48 ? 'normal' : 'low';
  const waitingDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(c.submittedAt ?? c.hireDate).getTime()) / 86400000),
  );
  const managerStatus =
    c.status === 'pending_manager' ? 'pending'
    : c.status === 'pending_hr' || c.status === 'escalated_ceo' || c.status === 'approved' ? 'approved'
    : 'pending';
  const hrStatus =
    c.status === 'pending_hr' || c.status === 'escalated_ceo' ? 'pending'
    : c.status === 'approved' ? 'approved'
    : 'pending';
  return {
    id: c.id,
    type: 'probation',
    requester: {
      id: c.employeeId,
      // STA-128: emp code surfaced structurally for the รหัสพนักงาน queue column.
      employeeId: c.employeeId,
      name: c.fullNameTh,
      position: c.position,
      department: c.department,
    },
    description: `อนุมัติผลทดลองงาน — ${c.fullNameTh}`,
    submittedAt: c.submittedAt ?? c.hireDate,
    urgency,
    waitingDays,
    details: {},
    approvalTimeline: [
      { step: 1, approver: 'หัวหน้างาน', status: managerStatus },
      { step: 2, approver: 'HR Director', status: hrStatus },
    ],
  };
}

function benefitClaimToPendingRequest_ORIGINAL(c: BenefitClaimRequest): PendingRequest {
  const elapsedMs = Date.now() - new Date(c.submittedAt).getTime();
  const slaHours = elapsedMs / (1000 * 60 * 60);
  const urgency: Urgency = slaHours > 48 ? 'urgent' : slaHours > 24 ? 'normal' : 'low';
  const waitingDays = Math.max(0, Math.floor(elapsedMs / 86400000));
  return {
    id: c.id,
    type: 'claim',
    requester: {
      id: c.employeeId,
      // STA-128: emp code surfaced structurally for the รหัสพนักงาน queue column.
      employeeId: c.employeeId,
      name: c.employeeName,
      position: c.benefitName,
      department: c.businessUnit,
    },
    description: `เบิกสวัสดิการ ${c.benefitName} — ฿${c.totalClaimAmount.toLocaleString('th-TH')}`,
    submittedAt: c.submittedAt,
    urgency,
    waitingDays,
    // STA-79: lifted helper now carries receipt attachments + the claim-approve
    // workspace filter facets — baseline updated to match the merged behavior.
    attachments: c.attachments.map((file) => file.filename ?? file.name ?? 'attachment'),
    filterMeta: {
      eventReason: c.benefitType,
      requestedFor: c.employeeName,
      effectiveDate: c.receiptDate,
      initiatedBy: c.employeeName,
      initiatedDate: c.submittedAt.slice(0, 10),
      company: c.company,
      businessUnit: c.businessUnit,
      department: c.businessUnit,
      assignment: 'Manager approval',
    },
    // STA-128: claim total surfaced structurally for the ยอดเบิกรวม queue column.
    details: { totalClaimAmount: c.totalClaimAmount },
    approvalTimeline: [
      { step: 1, approver: 'หัวหน้างาน', status: 'pending' },
      { step: 2, approver: 'SPD Benefits', status: 'pending' },
    ],
  };
}

const PROBATION_FIXTURES: ProbationCase[] = [
  {
    id: 'PB-FX-1',
    employeeId: 'EMP100',
    fullNameTh: 'ทดสอบ หนึ่ง',
    fullNameEn: 'Test One',
    position: 'Engineer',
    department: 'Tech',
    hireDate: '2026-01-01',
    probationEndDate: '2026-07-01',
    status: 'pending_manager',
    currentApprover: { name: 'Mgr', role: 'Manager' },
    request: { requestedBy: 'sys', requestedRole: 'System', requestedAt: '2026-05-01T00:00:00.000Z', source: 'x' },
    manager: { name: 'Mgr', role: 'Manager' },
    assessment: {},
    slaDeadline: '2026-05-26T00:00:00.000Z', // > 12h, < 48h window depends on frozen now
    timeline: [],
    submittedAt: '2026-05-20T00:00:00.000Z',
  },
  {
    id: 'PB-FX-2',
    employeeId: 'EMP101',
    fullNameTh: 'ทดสอบ สอง',
    fullNameEn: 'Test Two',
    position: 'Designer',
    department: 'Design',
    hireDate: '2025-12-01',
    probationEndDate: '2026-06-01',
    status: 'pending_hr',
    currentApprover: { name: 'HR', role: 'HR' },
    request: { requestedBy: 'sys', requestedRole: 'System', requestedAt: '2026-05-01T00:00:00.000Z', source: 'x' },
    manager: { name: 'Mgr', role: 'Manager' },
    assessment: {},
    slaDeadline: '2026-05-25T06:00:00.000Z',
    timeline: [],
    // no submittedAt — exercises the hireDate fallback
  },
];

const BENEFIT_FIXTURE: BenefitClaimRequest = {
  id: 'BEN-CLM-FX1',
  workflowRequestId: 'REQ-FX1',
  employeeId: 'EMP200',
  employeeName: 'เบิก ทดสอบ',
  company: 'Central Group',
  businessUnit: 'HR',
  employeeGroup: 'Monthly',
  personalGrade: 'PG3',
  benefitType: 'medical',
  benefitCode: 'BEN-MED-OPD',
  benefitName: 'ค่ารักษาพยาบาล',
  remainingAmount: 15000,
  currency: 'THB',
  receiptNo: 'RCPT-FX',
  receiptDate: '2026-05-01',
  claimDate: '2026-05-01',
  receiptAmount: 3200,
  totalClaimAmount: 3200,
  remark: '',
  status: 'pending_manager_approval',
  submittedAt: '2026-05-20T08:00:00.000Z',
  updatedAt: '2026-05-20T08:00:00.000Z',
  attachments: [],
  audit: [],
  version: 1,
  previousVersions: [],
};

describe('lifted helper parity (AC-1a.4)', () => {
  // Freeze time so the SLA/elapsed-derived fields are deterministic across both
  // the lifted and the reference original.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T00:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(PROBATION_FIXTURES)('probationToPendingRequest matches original for $id', (fixture) => {
    expect(probationToPendingRequest(fixture)).toEqual(
      probationToPendingRequest_ORIGINAL(fixture),
    );
  });

  it('benefitClaimToPendingRequest matches original', () => {
    expect(benefitClaimToPendingRequest(BENEFIT_FIXTURE)).toEqual(
      benefitClaimToPendingRequest_ORIGINAL(BENEFIT_FIXTURE),
    );
  });

  it('registry claim.toQueueItem == benefitClaimToPendingRequest', () => {
    expect(APPROVAL_REGISTRY.claim.toQueueItem(BENEFIT_FIXTURE)).toEqual(
      benefitClaimToPendingRequest(BENEFIT_FIXTURE),
    );
  });

  it('registry probation.toQueueItem == probationToPendingRequest', () => {
    expect(APPROVAL_REGISTRY.probation.toQueueItem(PROBATION_FIXTURES[0])).toEqual(
      probationToPendingRequest(PROBATION_FIXTURES[0]),
    );
  });
});

// ── STA-128 — queue rows carry structured emp-code + claim-total fields ──────────
// Guards the รหัสพนักงาน / ยอดเบิกรวม columns: the values come from structured row
// fields populated at the adapter, NEVER by parsing the description string.
describe('STA-128 — structured emp-code + claim-total population', () => {
  it('claim row exposes requester.employeeId from the source claim', () => {
    const row = benefitClaimToPendingRequest(BENEFIT_FIXTURE);
    expect(row.requester.employeeId).toBe(BENEFIT_FIXTURE.employeeId);
  });

  it('claim row exposes details.totalClaimAmount structurally (not description-parsed)', () => {
    const row = benefitClaimToPendingRequest(BENEFIT_FIXTURE);
    expect((row.details as { totalClaimAmount?: number }).totalClaimAmount).toBe(
      BENEFIT_FIXTURE.totalClaimAmount,
    );
  });

  it('probation row exposes requester.employeeId from the source case', () => {
    const row = probationToPendingRequest(PROBATION_FIXTURES[0]);
    expect(row.requester.employeeId).toBe(PROBATION_FIXTURES[0].employeeId);
  });
});
