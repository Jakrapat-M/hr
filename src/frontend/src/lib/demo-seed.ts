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
import { APPROVAL_REGISTRY } from '@/lib/approval-registry';
import { APPROVAL_SEED_BY_TYPE } from '@/lib/approval-seed-fixtures';

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

let seeded = false;

/** Reset the once-per-session guard. Test-only — lets a suite re-run the single
 *  seed authority after clearing the stores between cases. */
export function resetEnsureDemoSeedForTests(): void {
  seeded = false;
}

/** Seed all workflow stores once per browser session if stores are empty.
 *  Safe to call multiple times — idempotent via `seeded` flag + each store's
 *  own init-overwrite-empties guard. SINGLE seed authority (plan R1). */
export function ensureDemoSeed(): void {
  if (seeded) return;
  seeded = true;

  // ── Registry-owned approval stores (the unified queue's canonical 20 rows) ──
  // leave + overtime share the leave-approvals store; seed them TOGETHER through
  // the leave adapter so the store's single empty-guard doesn't skip the 2nd set.
  APPROVAL_REGISTRY.leave.seed([
    ...APPROVAL_SEED_BY_TYPE.leave,
    ...APPROVAL_SEED_BY_TYPE.overtime,
  ]);
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
}
