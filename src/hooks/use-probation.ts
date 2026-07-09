'use client';

import { useState, useEffect, useCallback } from 'react';

export type ProbationStatus =
  | 'pending_manager'
  | 'pending_hr'
  | 'approved'
  | 'rejected'
  | 'extended'
  | 'escalated_ceo'
  | 'sent_back';

// STA-23 PO v2 — outcome / decision types
export type ProbationOutcome =
  | 'pass_normal'
  | 'fail_normal'
  | 'pass_before_due'
  | 'fail_before_due'
  | 'extend';

export type ProbationFailReason =
  | 'performance'
  | 'attitude'
  | 'policy'
  | 'skill_mismatch'
  | 'other';

export interface ProbationDecisionInput {
  outcome: ProbationOutcome;
  effectiveDate?: string; // ISO date — required for *_before_due + extend
  failReason?: ProbationFailReason; // required only when outcome === 'fail_normal'
  failReasonText?: string; // free-text fail reason — required only when outcome === 'fail_normal'
  comment: string; // section comments
}

export interface ProbationTimelineEntry {
  actor: string;
  actorRole: string;
  action: string;
  date: string;
  comment?: string;
  // STA-23: extended fields stored on timeline entries
  outcome?: ProbationOutcome;
  effectiveDate?: string;
  failReason?: ProbationFailReason;
  failReasonText?: string;
}

export interface ProbationCase {
  id: string;
  employeeId: string;
  fullNameTh: string;
  fullNameEn: string;
  photo?: string;
  position: string;
  department: string;
  company?: string;
  businessUnit?: string;
  location?: string;
  jobCode?: string;
  jobLevel?: string;
  employeeGroup?: string;
  /** STA-23: employees exempted from probation — HRBP marks passed with pass date = hire date. */
  isProbationExempt?: boolean;
  hireDate: string;
  probationEndDate: string;
  status: ProbationStatus;
  currentApprover: { name: string; role: string };
  request: {
    requestedBy: string;
    requestedRole: string;
    requestedAt: string;
    source: string;
  };
  manager: {
    name: string;
    role: string;
    employeeId?: string;
  };
  assessment: {
    result?: string;
    score?: string;
    reason?: string;
    remarks?: string;
  };
  slaDeadline: string;
  timeline: ProbationTimelineEntry[];
  requestType?: string;
  requestReason?: string;
  assessmentSummary?: string;
  managerRemarks?: string;
  hrRemarks?: string;
  submittedAt?: string;
  decidedAt?: string;
}

const STATUS_LABEL: Record<ProbationStatus, string> = {
  pending_manager: 'รอหัวหน้างาน',
  pending_hr: 'รอ HRBP',
  approved: 'ผ่านทดลองงาน',
  rejected: 'ไม่ผ่าน',
  extended: 'ขยายเวลา',
  escalated_ceo: 'ส่ง CEO',
  sent_back: 'ส่งกลับหัวหน้างาน',
};

export { STATUS_LABEL };

// Mock data — matches Temporal POC workflow states
const MOCK_CASES: ProbationCase[] = [
  {
    id: 'PB-001',
    employeeId: 'EMP042',
    fullNameTh: 'สมชาย สุขใจ',
    fullNameEn: 'Somchai Sukjai',
    photo: 'https://i.pravatar.cc/150?img=33',
    position: 'Software Engineer',
    department: 'Product & Technology',
    company: 'Central Group',
    businessUnit: 'Digital & IT',
    location: 'Silom Tower',
    jobCode: 'SE-TL2',
    jobLevel: 'TL2',
    employeeGroup: 'A - Permanent',
    hireDate: '2026-02-19',
    probationEndDate: '2026-06-18',
    status: 'pending_manager',
    currentApprover: { name: 'Rungrote Amnuaysopon', role: 'VP Product & Technology' },
    request: {
      requestedBy: 'ระบบ',
      requestedRole: 'System',
      requestedAt: '2026-04-09T09:00:00',
      source: 'TBD: EC probation workflow API',
    },
    manager: { name: 'Rungrote Amnuaysopon', role: 'Direct Manager', employeeId: 'EMP006' },
    assessment: {
      result: 'Pending manager decision',
      score: 'TBD',
      reason: 'Auto-created when probation reached configured end date.',
      remarks: '',
    },
    slaDeadline: '2026-06-16T17:00:00',
    requestType: 'Probation manager approval',
    requestReason: '120-day probation review requires manager sign-off before HR update',
    assessmentSummary:
      'Delivery is on track, collaborates well with squad, and has no critical conduct issue.',
    managerRemarks: 'TBD — manager decision comment will be captured on submit',
    hrRemarks: 'TBD — EC/SharePoint property mapping pending backend confirmation',
    submittedAt: '2026-04-09T09:00:00',
    timeline: [
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'สร้าง workflow อัตโนมัติ — probation ครบ 120 วัน',
        date: '2026-04-09T09:00:00',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'แจ้ง Rungrote Amnuaysopon (หัวหน้างาน) — SLA 48 ชม.',
        date: '2026-04-09T09:01:00',
      },
    ],
  },
  {
    id: 'PB-002',
    employeeId: 'EMP055',
    fullNameTh: 'พิมพ์ชนก รัตนกุล',
    fullNameEn: 'Pimchanok Ratanakul',
    photo: 'https://i.pravatar.cc/150?img=45',
    position: 'UX Designer',
    department: 'Product & Technology',
    company: 'Central Group',
    businessUnit: 'Experience Design',
    location: 'Silom Tower',
    jobCode: 'UX-TL2',
    jobLevel: 'TL2',
    employeeGroup: 'A - Permanent',
    hireDate: '2026-03-02',
    probationEndDate: '2026-06-30',
    status: 'pending_hr',
    currentApprover: { name: 'กัณณิกา ศรีสวัสดิ์', role: 'HRBP' },
    request: {
      requestedBy: 'ระบบ',
      requestedRole: 'System',
      requestedAt: '2026-04-01T09:00:00',
      source: 'TBD: EC probation workflow API',
    },
    manager: { name: 'Rungrote Amnuaysopon', role: 'Direct Manager', employeeId: 'EMP006' },
    assessment: {
      result: 'Escalated to HR Director',
      score: 'TBD',
      reason: 'Manager SLA elapsed before decision.',
      remarks: 'HR Director can close or return per workflow configuration.',
    },
    slaDeadline: '2026-06-28T17:00:00',
    requestType: 'Probation HR escalation',
    requestReason: 'Manager SLA elapsed; HR Director review required.',
    assessmentSummary: 'TBD — manager assessment did not arrive before SLA escalation.',
    managerRemarks: 'TBD',
    hrRemarks: 'รอ HR Director ตรวจสอบ',
    submittedAt: '2026-04-01T09:00:00',
    timeline: [
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'สร้าง workflow — probation ครบ 120 วัน',
        date: '2026-04-01T09:00:00',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'แจ้ง Rungrote Amnuaysopon (หัวหน้างาน)',
        date: '2026-04-01T09:01:00',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'หัวหน้างานไม่ตอบใน 48 ชม. — escalate ไป HR Director',
        date: '2026-04-03T09:01:00',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'แจ้ง กัณณิกา ศรีสวัสดิ์ (HR Director) — SLA 24 ชม.',
        date: '2026-04-03T09:02:00',
      },
    ],
  },
  {
    id: 'PB-003',
    employeeId: 'EMP061',
    fullNameTh: 'ธนวัฒน์ ชัยพร',
    fullNameEn: 'Thanawat Chaiyaporn',
    photo: 'https://i.pravatar.cc/150?img=52',
    position: 'Backend Developer',
    department: 'Product & Technology',
    company: 'Central Group',
    businessUnit: 'Digital & IT',
    location: 'Silom Tower',
    jobCode: 'BE-TL2',
    jobLevel: 'TL2',
    employeeGroup: 'A - Permanent',
    hireDate: '2026-03-27',
    probationEndDate: '2026-07-25',
    status: 'approved',
    currentApprover: { name: 'Rungrote Amnuaysopon', role: 'VP Product & Technology' },
    request: {
      requestedBy: 'ระบบ',
      requestedRole: 'System',
      requestedAt: '2026-03-15T09:00:00',
      source: 'TBD: EC probation workflow API',
    },
    manager: { name: 'Rungrote Amnuaysopon', role: 'Direct Manager', employeeId: 'EMP006' },
    assessment: {
      result: 'Pass probation',
      score: 'Exceeds expectations',
      reason: 'Delivered agreed goals and demonstrated production readiness.',
      remarks: 'ผลงานดีมาก deliver ตรงเวลา code quality สูง',
    },
    slaDeadline: '2026-07-23T17:00:00',
    requestType: 'Probation manager approval',
    requestReason: 'Completed probation period; manager approved permanent status.',
    assessmentSummary: 'Consistent delivery, strong ownership, and positive peer feedback.',
    managerRemarks: 'ผลงานดีมาก deliver ตรงเวลา code quality สูง',
    hrRemarks: 'Approved record ready for EC update.',
    submittedAt: '2026-03-15T09:00:00',
    decidedAt: '2026-03-16T14:30:01',
    timeline: [
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'สร้าง workflow — probation ครบ 120 วัน',
        date: '2026-03-15T09:00:00',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'แจ้ง Rungrote Amnuaysopon (หัวหน้างาน)',
        date: '2026-03-15T09:01:00',
      },
      {
        actor: 'Rungrote Amnuaysopon',
        actorRole: 'Manager',
        action: 'อนุมัติ — ผ่านทดลองงาน',
        date: '2026-03-16T14:30:00',
        comment: 'ผลงานดีมาก deliver ตรงเวลา code quality สูง',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'อัพเดทสถานะ → พนักงานประจำ',
        date: '2026-03-16T14:30:01',
      },
    ],
  },
  {
    id: 'PB-004',
    employeeId: 'EMP058',
    fullNameTh: 'วรัญญา อินทรศรี',
    fullNameEn: 'Waranya Intarasri',
    photo: 'https://i.pravatar.cc/150?img=49',
    position: 'QA Analyst',
    department: 'Product & Technology',
    company: 'Central Group',
    businessUnit: 'Digital & IT',
    location: undefined,
    jobCode: 'QA-TL1',
    jobLevel: 'TL1',
    employeeGroup: 'A - Permanent',
    hireDate: '2026-04-17',
    probationEndDate: '2026-08-15',
    status: 'extended',
    currentApprover: { name: 'Rungrote Amnuaysopon', role: 'VP Product & Technology' },
    request: {
      requestedBy: 'ระบบ',
      requestedRole: 'System',
      requestedAt: '2026-03-01T09:00:00',
      source: 'TBD: EC probation workflow API',
    },
    manager: { name: 'Rungrote Amnuaysopon', role: 'Direct Manager', employeeId: 'EMP006' },
    assessment: {
      result: 'Extend probation',
      score: 'Needs improvement',
      reason: 'Needs more evidence before permanent conversion.',
      remarks: 'ต้องปรับปรุงเรื่อง test coverage และ communication skill',
    },
    slaDeadline: '2026-08-13T17:00:00',
    requestType: 'Probation manager review',
    requestReason: 'Manager requested more evidence before permanent conversion.',
    assessmentSummary: 'Needs additional consistency on test coverage and communication rituals.',
    managerRemarks: 'ต้องปรับปรุงเรื่อง test coverage และ communication skill',
    hrRemarks: 'Extended review scheduled.',
    submittedAt: '2026-03-01T09:00:00',
    decidedAt: '2026-03-02T10:15:01',
    timeline: [
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'สร้าง workflow — probation ครบ 120 วัน',
        date: '2026-03-01T09:00:00',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'แจ้ง Rungrote Amnuaysopon (หัวหน้างาน)',
        date: '2026-03-01T09:01:00',
      },
      {
        actor: 'Rungrote Amnuaysopon',
        actorRole: 'Manager',
        action: 'ไม่อนุมัติ — ขยายเวลาทดลองงาน 90 วัน',
        date: '2026-03-02T10:15:00',
        comment: 'ต้องปรับปรุงเรื่อง test coverage และ communication skill',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'ขยาย probation → ครบ 1 มิ.ย. 2026 — re-review scheduled',
        date: '2026-03-02T10:15:01',
      },
    ],
  },
  {
    id: 'PB-005',
    employeeId: 'EMP070',
    fullNameTh: 'ศุภวิชญ์ เกียรติกุล',
    fullNameEn: 'Suppawit Kiattikul',
    photo: 'https://i.pravatar.cc/150?img=12',
    position: 'Senior Advisor',
    department: 'Executive Office',
    company: 'Central Group',
    businessUnit: 'Corporate',
    location: 'Silom Tower',
    jobCode: 'EXC-SR',
    jobLevel: 'SR',
    employeeGroup: 'E - Executive',
    isProbationExempt: true,
    hireDate: '2026-05-04',
    probationEndDate: '2026-09-01',
    status: 'pending_hr',
    currentApprover: { name: 'กัณณิกา ศรีสวัสดิ์', role: 'HRBP' },
    request: {
      requestedBy: 'ระบบ',
      requestedRole: 'System',
      requestedAt: '2026-05-04T09:00:00',
      source: 'TBD: EC probation workflow API',
    },
    manager: { name: 'Rungrote Amnuaysopon', role: 'Direct Manager', employeeId: 'EMP006' },
    assessment: {
      result: 'Exempt from probation',
      score: 'N/A',
      reason: 'พนักงานกลุ่มยกเว้นทดลองงาน — HRBP บรรจุได้ทันที',
      remarks: 'pass date = วันเริ่มงาน',
    },
    slaDeadline: '2026-08-30T17:00:00',
    requestType: 'Probation HRBP exempt',
    requestReason: 'พนักงานยกเว้นทดลองงาน — HRBP บรรจุโดยใช้วันเริ่มงานเป็นวันบรรจุ',
    assessmentSummary: 'พนักงานกลุ่มยกเว้นทดลองงาน ไม่ต้องประเมินผลทดลองงาน',
    managerRemarks: 'N/A',
    hrRemarks: 'รอ HRBP บรรจุ (ยกเว้นทดลองงาน)',
    submittedAt: '2026-05-04T09:00:00',
    timeline: [
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'สร้าง workflow — พนักงานยกเว้นทดลองงาน',
        date: '2026-05-04T09:00:00',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'แจ้ง HRBP — บรรจุพนักงานยกเว้นทดลองงาน',
        date: '2026-05-04T09:01:00',
      },
    ],
  },
  {
    // STA-238 — pending sample so /quick-approve shows a live probation task.
    id: 'PB-006',
    employeeId: 'EMP073',
    fullNameTh: 'ณัฐริกา พงษ์ไพบูลย์',
    fullNameEn: 'Nattarika Pongpaiboon',
    photo: 'https://i.pravatar.cc/150?img=24',
    position: 'Data Analyst',
    department: 'Product & Technology',
    company: 'Central Group',
    businessUnit: 'Data & Insights',
    location: 'Silom Tower',
    jobCode: 'DA-TL1',
    jobLevel: 'TL1',
    employeeGroup: 'A - Permanent',
    hireDate: '2026-03-10',
    probationEndDate: '2026-07-08',
    status: 'pending_manager',
    currentApprover: { name: 'Rungrote Amnuaysopon', role: 'VP Product & Technology' },
    request: {
      requestedBy: 'ระบบ',
      requestedRole: 'System',
      requestedAt: '2026-07-01T09:00:00',
      source: 'TBD: EC probation workflow API',
    },
    manager: { name: 'Rungrote Amnuaysopon', role: 'Direct Manager', employeeId: 'EMP006' },
    assessment: {
      result: 'Pending manager decision',
      score: 'TBD',
      reason: 'Auto-created when probation reached configured end date.',
      remarks: '',
    },
    slaDeadline: '2026-07-06T17:00:00',
    requestType: 'Probation manager approval',
    requestReason: '120-day probation review requires manager sign-off before HR update',
    assessmentSummary:
      'Ships dashboards on schedule and picks up the data stack quickly; ready for a permanent decision.',
    managerRemarks: 'TBD — manager decision comment will be captured on submit',
    hrRemarks: 'TBD — EC/SharePoint property mapping pending backend confirmation',
    submittedAt: '2026-07-01T09:00:00',
    timeline: [
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'สร้าง workflow อัตโนมัติ — probation ครบ 120 วัน',
        date: '2026-07-01T09:00:00',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'แจ้ง Rungrote Amnuaysopon (หัวหน้างาน) — SLA 48 ชม.',
        date: '2026-07-01T09:01:00',
      },
    ],
  },
  {
    // STA-238 — a second pending sample, sitting at the HRBP step.
    id: 'PB-007',
    employeeId: 'EMP081',
    fullNameTh: 'กิตติพงศ์ วรรณศิริ',
    fullNameEn: 'Kittipong Wannasiri',
    photo: 'https://i.pravatar.cc/150?img=15',
    position: 'Store Supervisor',
    department: 'Retail Operations',
    company: 'Central Group',
    businessUnit: 'Store Network',
    location: 'CentralWorld',
    jobCode: 'SUP-TL1',
    jobLevel: 'TL1',
    employeeGroup: 'A - Permanent',
    hireDate: '2026-03-05',
    probationEndDate: '2026-07-03',
    status: 'pending_hr',
    currentApprover: { name: 'กัณณิกา ศรีสวัสดิ์', role: 'HRBP' },
    request: {
      requestedBy: 'ระบบ',
      requestedRole: 'System',
      requestedAt: '2026-06-28T09:00:00',
      source: 'TBD: EC probation workflow API',
    },
    manager: { name: 'สุนิสา เจริญทรัพย์', role: 'Direct Manager', employeeId: 'EMP012' },
    assessment: {
      result: 'Manager approved — awaiting HRBP',
      score: 'Meets expectations',
      reason: 'Manager signed off; HRBP confirmation pending before permanent status.',
      remarks: 'ดูแลหน้าร้านได้ดี ทีมงานให้ผลตอบรับเชิงบวก',
    },
    slaDeadline: '2026-07-06T17:00:00',
    requestType: 'Probation HRBP approval',
    requestReason: 'Manager approved probation result; HRBP confirmation required.',
    assessmentSummary: 'Strong floor leadership and consistent service scores through the probation window.',
    managerRemarks: 'ดูแลหน้าร้านได้ดี ทีมงานให้ผลตอบรับเชิงบวก',
    hrRemarks: 'รอ HRBP ยืนยันผลก่อนบรรจุ',
    submittedAt: '2026-06-28T09:00:00',
    timeline: [
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'สร้าง workflow — probation ครบ 120 วัน',
        date: '2026-06-28T09:00:00',
      },
      {
        actor: 'สุนิสา เจริญทรัพย์',
        actorRole: 'Manager',
        action: 'อนุมัติผลทดลองงาน — ส่งต่อ HRBP',
        date: '2026-06-30T10:20:00',
        comment: 'ดูแลหน้าร้านได้ดี ทีมงานให้ผลตอบรับเชิงบวก',
      },
      {
        actor: 'ระบบ',
        actorRole: 'System',
        action: 'แจ้ง กัณณิกา ศรีสวัสดิ์ (HRBP) — SLA 24 ชม.',
        date: '2026-06-30T10:21:00',
      },
    ],
  },
];

/**
 * Non-reactive accessor over the probation mock cases (STA-238). Exposed so the
 * approval-registry's one-shot `getPendingApprovals()` can surface probation rows
 * without a React render. Returns the raw const (avoids exporting the mutable
 * array binding directly).
 */
export function getProbationCases(): ProbationCase[] {
  return MOCK_CASES;
}

export function useProbationCases() {
  const [cases, setCases] = useState<ProbationCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setCases(MOCK_CASES);
      setLoading(false);
    }, 300);
  }, []);

  return { cases, loading };
}

export function useProbationCase(id: string) {
  const [probationCase, setProbationCase] = useState<ProbationCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setProbationCase(MOCK_CASES.find((c) => c.id === id) ?? null);
      setLoading(false);
    }, 200);
  }, [id]);

  // @deprecated use submitDecision
  const approve = useCallback(
    (comment: string) => {
      if (!probationCase) return;
      const now = new Date().toISOString();
      setProbationCase({
        ...probationCase,
        status: 'approved',
        managerRemarks: comment || probationCase.managerRemarks,
        decidedAt: now,
        timeline: [
          ...probationCase.timeline,
          {
            actor: 'You',
            actorRole: 'Manager',
            action: 'อนุมัติ — ผ่านทดลองงาน',
            date: now,
            comment: comment || undefined,
          },
          { actor: 'ระบบ', actorRole: 'System', action: 'อัพเดทสถานะ → พนักงานประจำ', date: now },
        ],
      });
    },
    [probationCase],
  );

  // @deprecated use submitDecision
  const reject = useCallback((comment: string) => {
    if (!probationCase) return;
    setProbationCase({
      ...probationCase,
      status: 'rejected',
      timeline: [
        ...probationCase.timeline,
        { actor: 'You', actorRole: 'Manager', action: 'ปฏิเสธ — ไม่ผ่านทดลองงาน', date: new Date().toISOString(), comment },
        { actor: 'ระบบ', actorRole: 'System', action: 'อัพเดทสถานะ → ไม่ผ่านทดลองงาน', date: new Date().toISOString() },
      ],
    });
  }, [probationCase]);

  const submitDecision = useCallback(
    (input: ProbationDecisionInput) => {
      if (!probationCase) return;
      const now = new Date().toISOString();
      const { outcome, effectiveDate, failReason, failReasonText, comment } = input;

      const isPass = outcome === 'pass_normal' || outcome === 'pass_before_due';
      const isFail = outcome === 'fail_normal' || outcome === 'fail_before_due';
      const isExtend = outcome === 'extend';

      let nextStatus: ProbationStatus;
      if (isExtend) {
        nextStatus = 'extended';
      } else if (isPass) {
        nextStatus = 'approved';
      } else {
        // isFail
        nextStatus = 'rejected';
      }

      const actionLabel = isExtend
        ? 'ขยายเวลาทดลองงาน'
        : isPass
          ? 'อนุมัติ — ผ่านทดลองงาน'
          : 'ปฏิเสธ — ไม่ผ่านทดลองงาน';

      const timelineEntry: ProbationTimelineEntry = {
        actor: 'You',
        actorRole: 'Manager',
        action: actionLabel,
        date: now,
        comment: comment || undefined,
        outcome,
        effectiveDate: effectiveDate || undefined,
        failReason: failReason || undefined,
        failReasonText: failReasonText || undefined,
      };

      setProbationCase({
        ...probationCase,
        status: nextStatus,
        managerRemarks: comment || probationCase.managerRemarks,
        decidedAt: now,
        timeline: [
          ...probationCase.timeline,
          timelineEntry,
          {
            actor: 'ระบบ',
            actorRole: 'System',
            action: isExtend
              ? `ขยาย probation → ถึงวันที่ ${effectiveDate ?? 'TBD'}`
              : isPass
                ? 'อัพเดทสถานะ → พนักงานประจำ'
                : 'อัพเดทสถานะ → ไม่ผ่านทดลองงาน',
            date: now,
          },
        ],
      });
    },
    [probationCase],
  );

  // STA-23 — HRBP approves the manager result (pending_hr → approved).
  const hrbpApprove = useCallback(
    (comment?: string) => {
      if (!probationCase) return;
      const now = new Date().toISOString();
      setProbationCase({
        ...probationCase,
        status: 'approved',
        hrRemarks: comment || probationCase.hrRemarks,
        decidedAt: now,
        timeline: [
          ...probationCase.timeline,
          {
            actor: 'You',
            actorRole: 'HRBP',
            action: 'HRBP อนุมัติ / HRBP approved',
            date: now,
            comment: comment || undefined,
          },
          { actor: 'ระบบ', actorRole: 'System', action: 'อัพเดทสถานะ → พนักงานประจำ', date: now },
        ],
      });
    },
    [probationCase],
  );

  // STA-23 — HRBP sends the case back to the direct manager (pending_hr → sent_back).
  const sendBackToManager = useCallback(
    (reason: string) => {
      if (!probationCase) return;
      const now = new Date().toISOString();
      setProbationCase({
        ...probationCase,
        status: 'sent_back',
        hrRemarks: reason || probationCase.hrRemarks,
        timeline: [
          ...probationCase.timeline,
          {
            actor: 'You',
            actorRole: 'HRBP',
            action: `HRBP ส่งกลับให้หัวหน้างาน — ${reason}`,
            date: now,
            comment: reason || undefined,
          },
        ],
      });
    },
    [probationCase],
  );

  // STA-23 — HRBP marks an exempt employee as passed; pass date = hire date.
  const markExemptPassed = useCallback(() => {
    if (!probationCase) return;
    const now = new Date().toISOString();
    setProbationCase({
      ...probationCase,
      status: 'approved',
      decidedAt: now,
      timeline: [
        ...probationCase.timeline,
        {
          actor: 'You',
          actorRole: 'HRBP',
          action: 'ยกเว้นทดลองงาน — ผ่านโดย HRBP (pass date = วันเริ่มงาน)',
          date: now,
          outcome: 'pass_normal',
          effectiveDate: probationCase.hireDate,
        },
        { actor: 'ระบบ', actorRole: 'System', action: 'อัพเดทสถานะ → พนักงานประจำ', date: now },
      ],
    });
  }, [probationCase]);

  return {
    probationCase,
    loading,
    approve,
    reject,
    submitDecision,
    hrbpApprove,
    sendBackToManager,
    markExemptPassed,
  };
}
