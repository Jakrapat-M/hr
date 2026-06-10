// demo-seed.ts — hydrate workflow stores with realistic mock requests so
// personas don't land on empty inboxes during a fresh demo.
//
// Called once by AppShell on mount. This is the SINGLE seed authority (plan R1):
// the registry-owned approval stores (leave/overtime, change_request, claim,
// transfer) are seeded ONLY from here, via the registry adapters' seed() over the
// canonical queue rows (APPROVAL_SEED_BY_TYPE). The previous overlapping demo
// arrays for leave + personal-info-change have been reconciled into the single
// fixture source (leave rows → APPROVAL_SEED_BY_TYPE.leave; the 3 legacy
// personal-info rows now live in workflow-approvals' own LEGACY_PERSONAL_INFO_REQUESTS,
// seeded alongside the queue change_request rows by the change_request adapter).
//
// Termination + promotion are NOT part of the unified queue's 6 RequestType
// values, so they keep their own fixtures here.

import { useTerminationApprovals, type TerminationRequest } from '@/stores/termination-approvals';
import { usePromotionApprovals, type PromotionRequest } from '@/stores/promotion-approvals';
import { usePayRateApprovals, type PayRateRequest } from '@/stores/pay-rate-approvals';
import {
  useBenefitTaxPlanningStore,
  submitTaxPlanningForPayrollReview,
  type TaxPlanningDraft,
} from '@/stores/benefit-tax-planning';
import { calculateThaiPitEstimate } from '@/lib/tax-planning';
import { APPROVAL_REGISTRY } from '@/lib/approval-registry';
import { APPROVAL_SEED_BY_TYPE } from '@/lib/approval-seed-fixtures';
import { useLeaveBalances } from '@/stores/leave-balances';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useOvertimeRequests, type OTRequest } from '@/stores/overtime-requests';
import { useTimeCorrections, type TimeCorrectionRequest } from '@/stores/time-corrections';
import type { PendingRequest } from '@/lib/quick-approve-api';
import { appliedChainFor } from '@/lib/time/approval-rules';
import { getLeaveType } from '@/lib/time/leave-types';

const MOCK_TERMINATION_REQUESTS: TerminationRequest[] = [
  {
    // pending_manager — Manager will see this in quick-approve
    id: 'TR-20260424-0800-X1KM',
    employeeId: 'EMP-0055',
    employeeName: 'ประเสริฐ วัฒนชัย',
    requestedLastDay: '2026-05-31',
    reasonCode: 'TERM_RESIGN',
    reasonText: 'ได้รับข้อเสนองานใหม่ที่เหมาะสมกว่า ขอลาออกตามกำหนดแจ้งล่วงหน้า 30 วัน',
    status: 'pending_manager',
    submittedAt: '2026-04-24T08:00:00+07:00',
    submittedBy: { id: 'EMP-0055', name: 'ประเสริฐ วัฒนชัย', role: 'employee' },
    audit: [
      {
        actorRole: 'employee',
        actorName: 'ประเสริฐ วัฒนชัย',
        action: 'submit',
        at: '2026-04-24T08:00:00+07:00',
      },
    ],
  },
  {
    // pending_manager — second item in Manager inbox
    id: 'TR-20260423-1100-Y2NP',
    employeeId: 'EMP-0203',
    employeeName: 'อรณิชา ปานสุข',
    requestedLastDay: '2026-05-15',
    reasonCode: 'TERM_RETRIE',
    reasonText: 'เกษียณอายุตามครบกำหนด',
    status: 'pending_manager',
    submittedAt: '2026-04-23T11:00:00+07:00',
    submittedBy: { id: 'EMP-0203', name: 'อรณิชา ปานสุข', role: 'employee' },
    audit: [
      {
        actorRole: 'employee',
        actorName: 'อรณิชา ปานสุข',
        action: 'submit',
        at: '2026-04-23T11:00:00+07:00',
      },
    ],
  },
  {
    // pending_spd — already past Manager, SPD inbox will show this
    id: 'TR-20260422-0930-Z3QR',
    employeeId: 'EMP-0178',
    employeeName: 'วิชัย ศรีสุวรรณ',
    requestedLastDay: '2026-05-20',
    reasonCode: 'TERM_EOC',
    reasonText: 'ครบสัญญาจ้าง ไม่ต่อสัญญา',
    status: 'pending_spd',
    submittedAt: '2026-04-22T09:30:00+07:00',
    submittedBy: { id: 'EMP-0178', name: 'วิชัย ศรีสุวรรณ', role: 'employee' },
    audit: [
      {
        actorRole: 'employee',
        actorName: 'วิชัย ศรีสุวรรณ',
        action: 'submit',
        at: '2026-04-22T09:30:00+07:00',
      },
      {
        actorRole: 'manager',
        actorName: 'สมชาย หัวหน้าทีม',
        action: 'approve',
        comment: 'รับทราบ ยืนยันการสิ้นสุดสัญญา',
        at: '2026-04-22T11:15:00+07:00',
      },
    ],
  },
  {
    // approved — history record
    id: 'TR-20260420-1400-W4ST',
    employeeId: 'EMP-0091',
    employeeName: 'นภาพร จิตรดา',
    requestedLastDay: '2026-05-05',
    reasonCode: 'TERM_RESIGN',
    status: 'approved',
    submittedAt: '2026-04-20T14:00:00+07:00',
    submittedBy: { id: 'EMP-0091', name: 'นภาพร จิตรดา', role: 'employee' },
    audit: [
      {
        actorRole: 'employee',
        actorName: 'นภาพร จิตรดา',
        action: 'submit',
        at: '2026-04-20T14:00:00+07:00',
      },
      {
        actorRole: 'manager',
        actorName: 'สมชาย หัวหน้าทีม',
        action: 'approve',
        at: '2026-04-21T09:00:00+07:00',
      },
      {
        actorRole: 'spd',
        actorName: 'ดารณี ล. (SPD)',
        action: 'approve',
        comment: 'ยืนยันการลาออก เอกสารครบถ้วน',
        at: '2026-04-21T14:30:00+07:00',
      },
    ],
  },
];

// Non-terminal resignations (pending_manager / pending_spd) surface in the unified
// queue via the change_request vehicle; approved/rejected drop out. This count is
// part of TOTAL_SEED_COUNT (mirrors the other *_DEMO_COUNT seed-count exports).
export const TERMINATION_DEMO_COUNT = MOCK_TERMINATION_REQUESTS.filter(
  (r) => r.status !== 'approved' && r.status !== 'rejected',
).length;

const MOCK_PROMOTION_REQUESTS: PromotionRequest[] = [
  {
    id: 'PM-20260424-0930-D4HK',
    employeeId: 'EMP-0142',
    employeeName: 'กมลรัตน์ จันทร์แดง',
    fromPosition: 'HR Officer',
    toPosition: 'HR Senior Officer',
    effectiveDate: '2026-06-01',
    salaryDelta: 12,
    notes: 'ผลประเมินดีเยี่ยม 3 ปีติดต่อกัน',
    status: 'pending_spd',
    submittedAt: '2026-04-24T09:30:00+07:00',
    submittedBy: { id: 'ADM001', name: 'สมชาย HR Admin', role: 'hr_admin' },
    audit: [
      {
        actorRole: 'hr_admin',
        actorName: 'สมชาย HR Admin',
        action: 'submit',
        at: '2026-04-24T09:30:00+07:00',
      },
    ],
  },
  {
    id: 'PM-20260423-1145-E5JM',
    employeeId: 'EMP-0087',
    employeeName: 'ธนวัฒน์ สุขเกษม',
    fromPosition: 'Finance Analyst',
    toPosition: 'Finance Senior Analyst',
    effectiveDate: '2026-05-01',
    salaryDelta: 15,
    status: 'pending_spd',
    submittedAt: '2026-04-23T11:45:00+07:00',
    submittedBy: { id: 'ADM001', name: 'สมชาย HR Admin', role: 'hr_admin' },
    audit: [
      {
        actorRole: 'hr_admin',
        actorName: 'สมชาย HR Admin',
        action: 'submit',
        at: '2026-04-23T11:45:00+07:00',
      },
    ],
  },
];

// ── P2: pay-rate + tax-planning demo rows for the unified /quick-approve queue ──
// These two stores live outside the registry-owned seed (their records normally
// originate from the submit forms). To keep the unified inbox demo-complete, seed
// a couple of fully-formed pending records directly into each store. Counts are
// exported so the selector tests can assert the seeded total without a magic number.

export const MOCK_PAY_RATE_REQUESTS: PayRateRequest[] = [
  {
    id: 'PR-20260424-0930-A1BC',
    employeeId: 'EMP-0142',
    employeeName: 'กมลรัตน์ จันทร์แดง',
    effectiveDate: '2026-06-01',
    eventReasonCode: 'PRCHG_MERINC',
    payGroup: 'PG-MONTHLY',
    payrollId: 'PRL-001',
    payComponent: 'Base Salary',
    amountType: 'percent',
    amount: 8,
    currency: 'THB',
    frequency: 'Monthly',
    recurringPayments: [],
    notes: 'ผลประเมินดีเยี่ยม 2 ปีติดต่อกัน',
    status: 'pending_spd',
    submittedAt: '2026-04-24T09:30:00+07:00',
    submittedBy: { id: 'ADM001', name: 'สมชาย HR Admin', role: 'hr_admin' },
    audit: [
      {
        actorRole: 'hr_admin',
        actorName: 'สมชาย HR Admin',
        action: 'submit',
        at: '2026-04-24T09:30:00+07:00',
      },
    ],
  },
  {
    id: 'PR-20260423-1100-D4EF',
    employeeId: 'EMP-0087',
    employeeName: 'ธนวัฒน์ สุขเกษม',
    effectiveDate: '2026-05-01',
    eventReasonCode: 'PRCHG_ADJPOS',
    payGroup: 'PG-MONTHLY',
    payrollId: 'PRL-001',
    payComponent: 'Base Salary',
    amountType: 'flat',
    amount: 5000,
    currency: 'THB',
    frequency: 'Monthly',
    recurringPayments: [],
    status: 'pending_spd',
    submittedAt: '2026-04-23T11:00:00+07:00',
    submittedBy: { id: 'ADM001', name: 'สมชาย HR Admin', role: 'hr_admin' },
    audit: [
      {
        actorRole: 'hr_admin',
        actorName: 'สมชาย HR Admin',
        action: 'submit',
        at: '2026-04-23T11:00:00+07:00',
      },
    ],
  },
];

export const PAY_RATE_DEMO_COUNT = MOCK_PAY_RATE_REQUESTS.length;

/** Build a single tax-planning draft that is already submitted for Payroll review. */
function buildTaxPlanningDemoDraft(): TaxPlanningDraft {
  const at = '2026-04-22T10:00:00+07:00';
  const allowances = {
    spouse: 0,
    children: 60000,
    parents: 0,
    disability: 0,
    lifeInsurance: 25000,
    providentFund: 0,
    retirementFund: 0,
    socialSecurity: 9000,
    donations: 0,
    other: 0,
  };
  const estimate = calculateThaiPitEstimate({
    ytdIncome: 840000,
    ytdWithholding: 56000,
    expectedAdditionalIncome: 0,
    allowances,
  });
  const base: TaxPlanningDraft = {
    id: 'TAX-PLAN-9001',
    workflowRequestId: 'REQ-TAX-9001',
    employeeId: 'EMP001',
    employeeName: 'จงรักษ์ ทานากะ',
    maskedTaxId: '1-1xxx-xxxxx-xx-1',
    taxYear: 2026,
    status: 'estimated',
    expectedAdditionalIncome: 0,
    allowances,
    estimate,
    submittedAt: undefined,
    reviewedAt: undefined,
    updatedAt: at,
    audit: [
      { at, actorRole: 'employee', actorName: 'จงรักษ์ ทานากะ', action: 'create', note: 'สร้างร่างแผนภาษี' },
      { at, actorRole: 'employee', actorName: 'จงรักษ์ ทานากะ', action: 'estimate', note: 'คำนวณประมาณการภาษี' },
    ],
  };
  // Advance to submitted_payroll via the pure transition so the record is valid +
  // queue-eligible (a pending Payroll-review row in the unified inbox).
  return submitTaxPlanningForPayrollReview(base);
}

export const TAX_PLANNING_DEMO_COUNT = 1;

// ── Group A: leave-balance buckets + pending ESS leave rows ────────────────────
// Seed the 7 quotaTracked buckets for the demo employee (EMP001) so the ESS
// leave form has real quota to reserve/deduct against. Values are illustrative.
// Distinct display name (NOT the canonical 'สมชาย ใจดี' seed-row requester) so
// the seeded demo leave rows don't collide with the canonical queue rows in
// name-based test lookups.
const DEMO_LEAVE_EMPLOYEE = { id: 'EMP001', name: 'พิมพ์ชนก ศรีวัฒน์' };

const DEMO_LEAVE_BALANCE_SEEDS: Array<{ kind: string; initial: number }> = [
  { kind: 'sick_leave', initial: 30 },
  { kind: 'annual_leave', initial: 10 },
  { kind: 'personnel_leave', initial: 3 },
  { kind: 'maternity_leave', initial: 98 },
  { kind: 'maternity_leave_unpaid', initial: 90 },
  { kind: 'maternity_risk_case', initial: 90 },
  { kind: 'maternity_spouse', initial: 15 },
];

/** Build a pending ESS leave row carrying its canonical queue snapshot. */
function buildDemoLeaveRow(args: {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  submittedAt: string;
}): PendingRequest {
  const def = getLeaveType(args.code);
  const chain = appliedChainFor('leave', args.code);
  return {
    id: args.id,
    type: 'leave',
    requester: {
      id: DEMO_LEAVE_EMPLOYEE.id,
      name: DEMO_LEAVE_EMPLOYEE.name,
      position: def?.nameTh ?? args.code,
      department: 'Store',
    },
    description: `${def?.nameTh ?? args.code} — ${args.startDate} – ${args.endDate} · ${args.days} วัน`,
    submittedAt: args.submittedAt,
    urgency: 'normal',
    waitingDays: 0,
    details: { leaveType: args.code, startDate: args.startDate, endDate: args.endDate, reason: args.reason },
    approvalTimeline: chain.map((step, i) => ({ step: i + 1, approver: step.labelTh, status: 'pending' as const })),
  };
}

// One 1-level (annual) and one 2-level (maternity) pending row so /quick-approve
// shows a non-zero leave count AND the 2-level advance is demoable.
const DEMO_PENDING_LEAVE: Array<{
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  submittedAt: string;
}> = [
  {
    id: 'LV-DEMO-ANNUAL-0001',
    code: 'annual_leave',
    startDate: '2026-06-08',
    endDate: '2026-06-09',
    days: 2,
    reason: 'พาครอบครัวไปต่างจังหวัด',
    submittedAt: '2026-06-06T08:00:00+07:00',
  },
  {
    id: 'LV-DEMO-MAT-0002',
    code: 'maternity_leave',
    startDate: '2026-06-10',
    endDate: '2026-06-19',
    days: 10,
    reason: 'ลาคลอดบุตร',
    submittedAt: '2026-06-06T09:00:00+07:00',
  },
];

/** Number of demo ESS leave rows seeded into the unified queue (Group A). */
export const LEAVE_DEMO_COUNT = DEMO_PENDING_LEAVE.length;

// ── Group B: pending ESS OT rows ───────────────────────────────────────────────
// Seed 2 pending OT rows into the dedicated overtime-requests store with STABLE
// ids so the detail route resolves them across a full reload. One is a
// cross-midnight example (23:00 → 02:00 = 3h) to exercise the wrap math.
const DEMO_OT_EMPLOYEE = { id: 'EMP001', name: 'พิมพ์ชนก ศรีวัฒน์', department: 'Store' };

const DEMO_PENDING_OT: OTRequest[] = [
  {
    id: 'OT-DEMO-0001',
    employeeId: DEMO_OT_EMPLOYEE.id,
    employeeName: DEMO_OT_EMPLOYEE.name,
    department: DEMO_OT_EMPLOYEE.department,
    otType: 'OT',
    startAt: '2026-06-01T18:00:00',
    endAt: '2026-06-01T21:00:00',
    hours: 3,
    reason: 'ปิดยอดขายสิ้นเดือน',
    docs: [],
    status: 'pending',
    submittedAt: '2026-06-06T08:00:00+07:00',
    audit: [
      { actorId: DEMO_OT_EMPLOYEE.id, actorName: DEMO_OT_EMPLOYEE.name, action: 'submit', at: '2026-06-06T08:00:00+07:00' },
    ],
  },
  {
    // Cross-midnight: 1 Jun 23:00 → 2 Jun 02:00 = 3h.
    id: 'OT-DEMO-0002',
    employeeId: DEMO_OT_EMPLOYEE.id,
    employeeName: DEMO_OT_EMPLOYEE.name,
    department: DEMO_OT_EMPLOYEE.department,
    otType: 'OT_BREAK',
    startAt: '2026-06-01T23:00:00',
    endAt: '2026-06-02T02:00:00',
    hours: 3,
    reason: 'ตรวจนับสต็อกข้ามคืน',
    docs: [],
    status: 'pending',
    submittedAt: '2026-06-06T09:00:00+07:00',
    audit: [
      { actorId: DEMO_OT_EMPLOYEE.id, actorName: DEMO_OT_EMPLOYEE.name, action: 'submit', at: '2026-06-06T09:00:00+07:00' },
    ],
  },
];

/** Number of demo ESS OT rows seeded into the unified queue (Group B). */
export const OT_DEMO_COUNT = DEMO_PENDING_OT.length;

// ── Group D: pending ESS Time-Correction rows ──────────────────────────────────
// time-corrections is plain-persist (no rehydrate-wipe), so STABLE ids survive a
// full reload and the /workflows/time-correction/[id] detail resolves them. Two
// rows so the unified /quick-approve inbox shows a non-zero time_correction count
// alongside leave + OT.
const DEMO_TC_EMPLOYEE = { id: 'EMP001', name: 'พิมพ์ชนก ศรีวัฒน์', department: 'Store' };

const DEMO_PENDING_TC: TimeCorrectionRequest[] = [
  {
    id: 'TCR-DEMO-0001',
    employeeId: DEMO_TC_EMPLOYEE.id,
    employeeName: DEMO_TC_EMPLOYEE.name,
    department: DEMO_TC_EMPLOYEE.department,
    date: '2026-06-03',
    correctionType: 'in',
    reasonCode: 'MACHINE_BROKE',
    payCode: 'MACHINE_BROKE',
    originalTime: '',
    correctedTime: '08:00',
    reason: 'เครื่องสแกนเสียตอนเช้า แตะบัตรไม่ติด',
    docs: [],
    status: 'pending_manager',
    submittedAt: '2026-06-06T08:30:00+07:00',
    audit: [
      { actorName: DEMO_TC_EMPLOYEE.name, action: 'submit', at: '2026-06-06T08:30:00+07:00' },
    ],
  },
  {
    id: 'TCR-DEMO-0002',
    employeeId: DEMO_TC_EMPLOYEE.id,
    employeeName: DEMO_TC_EMPLOYEE.name,
    department: DEMO_TC_EMPLOYEE.department,
    date: '2026-06-04',
    correctionType: 'both',
    reasonCode: 'FORGET_ID_TYPE',
    payCode: 'FORGET_ID_TYPE',
    originalTime: '08:05',
    correctedTime: '17:30',
    reason: 'ลืมกดประเภท in/out ขอแก้เป็นเวลาจริง',
    docs: [],
    status: 'pending_manager',
    submittedAt: '2026-06-06T09:15:00+07:00',
    audit: [
      { actorName: DEMO_TC_EMPLOYEE.name, action: 'submit', at: '2026-06-06T09:15:00+07:00' },
    ],
  },
];

/** Number of demo ESS Time-Correction rows seeded into the unified queue (Group D). */
export const TC_DEMO_COUNT = DEMO_PENDING_TC.length;

let seeded = false;

/** Reset the once-per-session guard. Test-only — lets a suite re-run the single
 *  seed authority after clearing the stores between cases. */
export function resetEnsureDemoSeedForTests(): void {
  seeded = false;
  useLeaveBalances.getState().clear();
  useOvertimeRequests.getState().clear();
  useTimeCorrections.getState().clear();
}

/** Seed all workflow stores once per browser session if stores are empty.
 *  Safe to call multiple times — idempotent via `seeded` flag + each store's
 *  own init-overwrite-empties guard. SINGLE seed authority (plan R1). */
export function ensureDemoSeed(): void {
  if (seeded) return;
  seeded = true;

  // ── Registry-owned approval stores (the unified queue's canonical 20 rows) ──
  // Group B: OT now has its OWN store, so the leave adapter seeds ONLY leave rows
  // (no more leave+overtime spread). The canonical OT rows are seeded into the
  // overtime-requests store via its own adapter below.
  APPROVAL_REGISTRY.leave.seed(APPROVAL_SEED_BY_TYPE.leave);
  APPROVAL_REGISTRY.overtime.seed(APPROVAL_SEED_BY_TYPE.overtime);
  // Add the 2 demo ESS OT rows (incl. one cross-midnight) with stable ids so the
  // /workflows/ot/[id] detail route resolves them across a full reload.
  useOvertimeRequests.getState().seedFromQueue(DEMO_PENDING_OT);
  // Group D: seed the demo Time-Correction rows (init-overwrite-empties) so the
  // unified queue shows a non-zero time_correction count. Plain-persist store, so
  // a user-submitted correction (length > 0) is preserved on reload, not clobbered.
  if (useTimeCorrections.getState().requests.length === 0) {
    useTimeCorrections.setState({ requests: DEMO_PENDING_TC });
  }
  // Group A: seed the demo employee's quota buckets BEFORE adding leave rows so
  // the reserve() on each addRequest draws against a real balance.
  useLeaveBalances
    .getState()
    .seedBalances(DEMO_LEAVE_BALANCE_SEEDS.map((s) => ({ employeeId: DEMO_LEAVE_EMPLOYEE.id, ...s })));

  // Add the demo pending ESS leave rows (reserves quota, carries a queueSnapshot
  // so they surface in /quick-approve). Only seed when no ESS leave row exists.
  const leaveStore = useLeaveApprovals.getState();
  const hasDemoEss = leaveStore.requests.some((r) => !!r.leaveCode);
  if (!hasDemoEss) {
    for (const row of DEMO_PENDING_LEAVE) {
      const snapshot = buildDemoLeaveRow(row);
      // Pass the STABLE id (row.id, e.g. `LV-DEMO-MAT-0002`) as the store record's
      // id so it survives the rehydrate-and-reseed cycle with the SAME id every
      // load. The record id, the queueSnapshot id, and the inbox drill-in link all
      // align on this stable id, so the detail route resolves it across a full
      // navigation. addRequest is idempotent on a stable id (no double-reserve).
      useLeaveApprovals.getState().addRequest({
        id: row.id,
        employeeId: DEMO_LEAVE_EMPLOYEE.id,
        employeeName: DEMO_LEAVE_EMPLOYEE.name,
        leaveType: row.code,
        leaveCode: row.code,
        startDate: row.startDate,
        endDate: row.endDate,
        reason: row.reason,
        days: row.days,
        unit: '1-day',
        queueSnapshot: snapshot,
      });
    }
  }

  APPROVAL_REGISTRY.change_request.seed(APPROVAL_SEED_BY_TYPE.change_request);
  APPROVAL_REGISTRY.claim.seed(APPROVAL_SEED_BY_TYPE.claim);
  APPROVAL_REGISTRY.transfer.seed(APPROVAL_SEED_BY_TYPE.transfer);
  // probation: zero canonical queue rows — adapter seed is a documented no-op.
  APPROVAL_REGISTRY.probation.seed(APPROVAL_SEED_BY_TYPE.probation);

  // ── Non-queue lifecycle stores (own fixtures; not part of the 6 RequestType) ──
  const terminationState = useTerminationApprovals.getState();
  if (terminationState.requests.length === 0) {
    useTerminationApprovals.setState({ requests: MOCK_TERMINATION_REQUESTS });
  }

  const promotionState = usePromotionApprovals.getState();
  if (promotionState.requests.length === 0) {
    usePromotionApprovals.setState({ requests: MOCK_PROMOTION_REQUESTS });
  }

  // ── P2: pay-rate + tax-planning rows now surface in the unified queue ────────
  // Both stores live outside the registry-owned seed; inject demo records directly
  // (init-overwrite-empties) so the unified /quick-approve inbox is demo-complete.
  const payRateState = usePayRateApprovals.getState();
  if (payRateState.requests.length === 0) {
    usePayRateApprovals.setState({ requests: MOCK_PAY_RATE_REQUESTS });
  }

  const taxPlanningState = useBenefitTaxPlanningStore.getState();
  if (taxPlanningState.drafts.length === 0) {
    useBenefitTaxPlanningStore.setState({ drafts: [buildTaxPlanningDemoDraft()] });
  }
}
