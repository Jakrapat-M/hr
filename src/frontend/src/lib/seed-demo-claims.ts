// seed-demo-claims.ts — pre-populate the benefit-claims Zustand store with
// 8–10 historical claims at mixed statuses so /requests looks lived-in on first
// load. Guarded by a localStorage flag so it only runs once per browser.

import { useBenefitClaimsStore, type BenefitClaimRequest } from '@/stores/benefit-claims';
import { DEMO_EMPLOYEES } from './demo-org-chart';

const SEED_FLAG_KEY = 'demo-claims-seeded-v1';

// Build a deterministic ISO date string `daysAgo` days before today.
function daysAgoIso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function daysAgoDate(daysAgo: number): string {
  return daysAgoIso(daysAgo).slice(0, 10);
}

// 8 hex chars — realistic enough for a demo Camunda instance id.
function demoInstanceId(): string {
  return 'demo-' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
}

// emp-042 = Wichai Thamdee; emp-001 = Somchai; emp-002 = Somying; emp-100 = Preeya; emp-101 = Thana
const [wichai, somchai, somying, preeya, thana] = [
  DEMO_EMPLOYEES.find((e) => e.id === 'emp-042')!,
  DEMO_EMPLOYEES.find((e) => e.id === 'emp-001')!,
  DEMO_EMPLOYEES.find((e) => e.id === 'emp-002')!,
  DEMO_EMPLOYEES.find((e) => e.id === 'emp-100')!,
  DEMO_EMPLOYEES.find((e) => e.id === 'emp-101')!,
];

function makeAudit(submitterName: string, submittedAt: string, extra?: Array<{ actorRole: 'employee' | 'spd'; actorName: string; action: 'approve' | 'reject' | 'send_back' | 'resubmit'; at: string; note?: string }>) {
  return [
    { at: submittedAt, actorRole: 'employee' as const, actorName: submitterName, action: 'submit' as const, note: 'ส่งคำขอเบิกสวัสดิการ' },
    ...(extra ?? []),
  ];
}

const SEED_CLAIMS: BenefitClaimRequest[] = [
  // 1. pending — Wichai medical OPD
  {
    id: 'BEN-CLM-S001',
    workflowRequestId: 'REQ-BEN-S001',
    employeeId: wichai.id,
    employeeName: wichai.nameTh,
    company: 'Central Group',
    businessUnit: 'People Operations',
    employeeGroup: 'Monthly',
    personalGrade: 'PG3',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: 'ค่ารักษาพยาบาล',
    remainingAmount: 15180,
    currency: 'THB',
    receiptNo: 'RCPT-2026-S001',
    receiptDate: daysAgoDate(3),
    receiptAmount: 820,
    totalClaimAmount: 820,
    status: 'pending_spd',
    submittedAt: daysAgoIso(3),
    updatedAt: daysAgoIso(3),
    hospitalName: 'คลินิกกรุงเทพ',
    opdIpd: 'opd',
    attachments: [],
    audit: makeAudit(wichai.nameTh, daysAgoIso(3)),
    version: 1,
    previousVersions: [],
    workflowInstanceId: demoInstanceId(),
    workflowStatus: 'pending',
  },
  // 2. pending — Somchai training
  {
    id: 'BEN-CLM-S002',
    workflowRequestId: 'REQ-BEN-S002',
    employeeId: somchai.id,
    employeeName: somchai.nameTh,
    company: 'Central Group',
    businessUnit: 'Training & Development',
    employeeGroup: 'Monthly',
    personalGrade: 'PG3',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: 'ค่ารักษาพยาบาล',
    remainingAmount: 19200,
    currency: 'THB',
    receiptNo: 'RCPT-2026-S002',
    receiptDate: daysAgoDate(7),
    receiptAmount: 5000,
    totalClaimAmount: 5000,
    status: 'pending_spd',
    submittedAt: daysAgoIso(7),
    updatedAt: daysAgoIso(7),
    attachments: [],
    audit: makeAudit(somchai.nameTh, daysAgoIso(7)),
    version: 1,
    previousVersions: [],
    workflowInstanceId: demoInstanceId(),
    workflowStatus: 'pending',
  },
  // 3. pending — Somying gasoline
  {
    id: 'BEN-CLM-S003',
    workflowRequestId: 'REQ-BEN-S003',
    employeeId: somying.id,
    employeeName: somying.nameTh,
    company: 'Central Group',
    businessUnit: 'Operations',
    employeeGroup: 'Monthly',
    personalGrade: 'PG2',
    benefitType: 'gasoline',
    benefitCode: 'BEN-FUEL',
    benefitName: 'ค่าน้ำมัน',
    remainingAmount: 2500,
    currency: 'THB',
    receiptNo: 'RCPT-2026-S003',
    receiptDate: daysAgoDate(5),
    receiptAmount: 800,
    totalClaimAmount: 800,
    gasolineClaimType: 'fuel',
    status: 'pending_spd',
    submittedAt: daysAgoIso(5),
    updatedAt: daysAgoIso(5),
    attachments: [],
    audit: makeAudit(somying.nameTh, daysAgoIso(5)),
    version: 1,
    previousVersions: [],
    workflowInstanceId: demoInstanceId(),
    workflowStatus: 'pending',
  },
  // 4. approved — Preeya medical
  {
    id: 'BEN-CLM-S004',
    workflowRequestId: 'REQ-BEN-S004',
    employeeId: preeya.id,
    employeeName: preeya.nameTh,
    company: 'Central Group',
    businessUnit: 'Finance',
    employeeGroup: 'Monthly',
    personalGrade: 'PG4',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: 'ค่ารักษาพยาบาล',
    remainingAmount: 12000,
    currency: 'THB',
    receiptNo: 'RCPT-2026-S004',
    receiptDate: daysAgoDate(14),
    receiptAmount: 3200,
    totalClaimAmount: 3200,
    hospitalName: 'รพ.สมิติเวช',
    opdIpd: 'opd',
    status: 'approved',
    submittedAt: daysAgoIso(14),
    updatedAt: daysAgoIso(12),
    attachments: [],
    audit: makeAudit(preeya.nameTh, daysAgoIso(14), [
      { actorRole: 'spd', actorName: 'ทีม SPD', action: 'approve', at: daysAgoIso(12) },
    ]),
    version: 1,
    previousVersions: [],
    workflowInstanceId: demoInstanceId(),
    workflowStatus: 'approved',
  },
  // 5. approved — Thana physical checkup
  {
    id: 'BEN-CLM-S005',
    workflowRequestId: 'REQ-BEN-S005',
    employeeId: thana.id,
    employeeName: thana.nameTh,
    company: 'Central Group',
    businessUnit: 'Finance',
    employeeGroup: 'Monthly',
    personalGrade: 'PG3',
    benefitType: 'physical_checkup',
    benefitCode: 'BEN-CHECKUP',
    benefitName: 'ตรวจสุขภาพ',
    remainingAmount: 7500,
    currency: 'THB',
    receiptNo: 'RCPT-2026-S005',
    receiptDate: daysAgoDate(20),
    receiptAmount: 2800,
    totalClaimAmount: 2800,
    status: 'approved',
    submittedAt: daysAgoIso(20),
    updatedAt: daysAgoIso(18),
    attachments: [],
    audit: makeAudit(thana.nameTh, daysAgoIso(20), [
      { actorRole: 'spd', actorName: 'ทีม SPD', action: 'approve', at: daysAgoIso(18) },
    ]),
    version: 1,
    previousVersions: [],
    workflowInstanceId: demoInstanceId(),
    workflowStatus: 'approved',
  },
  // 6. paid — Wichai dental
  {
    id: 'BEN-CLM-S006',
    workflowRequestId: 'REQ-BEN-S006',
    employeeId: wichai.id,
    employeeName: wichai.nameTh,
    company: 'Central Group',
    businessUnit: 'People Operations',
    employeeGroup: 'Monthly',
    personalGrade: 'PG3',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: 'ค่าทำฟัน',
    remainingAmount: 8000,
    currency: 'THB',
    receiptNo: 'RCPT-2026-S006',
    receiptDate: daysAgoDate(25),
    receiptAmount: 4500,
    totalClaimAmount: 4500,
    status: 'approved',
    submittedAt: daysAgoIso(25),
    updatedAt: daysAgoIso(21),
    attachments: [],
    audit: makeAudit(wichai.nameTh, daysAgoIso(25), [
      { actorRole: 'spd', actorName: 'ทีม SPD', action: 'approve', at: daysAgoIso(21) },
    ]),
    version: 1,
    previousVersions: [],
    workflowInstanceId: demoInstanceId(),
    workflowStatus: 'paid',
  },
  // 7. paid — Somchai medical IPD
  {
    id: 'BEN-CLM-S007',
    workflowRequestId: 'REQ-BEN-S007',
    employeeId: somchai.id,
    employeeName: somchai.nameTh,
    company: 'Central Group',
    businessUnit: 'People Operations',
    employeeGroup: 'Monthly',
    personalGrade: 'PG3',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: 'ค่ารักษาพยาบาล (IPD)',
    remainingAmount: 30000,
    currency: 'THB',
    receiptNo: 'RCPT-2026-S007',
    receiptDate: daysAgoDate(28),
    receiptAmount: 15000,
    totalClaimAmount: 15000,
    hospitalName: 'รพ.บำรุงราษฎร์',
    opdIpd: 'ipd',
    status: 'approved',
    submittedAt: daysAgoIso(28),
    updatedAt: daysAgoIso(24),
    attachments: [],
    audit: makeAudit(somchai.nameTh, daysAgoIso(28), [
      { actorRole: 'spd', actorName: 'ทีม SPD', action: 'approve', at: daysAgoIso(24) },
    ]),
    version: 1,
    previousVersions: [],
    workflowInstanceId: demoInstanceId(),
    workflowStatus: 'paid',
  },
  // 8. paid — Preeya gasoline
  {
    id: 'BEN-CLM-S008',
    workflowRequestId: 'REQ-BEN-S008',
    employeeId: preeya.id,
    employeeName: preeya.nameTh,
    company: 'Central Group',
    businessUnit: 'Finance',
    employeeGroup: 'Monthly',
    personalGrade: 'PG4',
    benefitType: 'gasoline',
    benefitCode: 'BEN-FUEL',
    benefitName: 'ค่าน้ำมัน',
    remainingAmount: 2000,
    currency: 'THB',
    receiptNo: 'RCPT-2026-S008',
    receiptDate: daysAgoDate(30),
    receiptAmount: 500,
    totalClaimAmount: 500,
    gasolineClaimType: 'fuel',
    status: 'approved',
    submittedAt: daysAgoIso(30),
    updatedAt: daysAgoIso(27),
    attachments: [],
    audit: makeAudit(preeya.nameTh, daysAgoIso(30), [
      { actorRole: 'spd', actorName: 'ทีม SPD', action: 'approve', at: daysAgoIso(27) },
    ]),
    version: 1,
    previousVersions: [],
    workflowInstanceId: demoInstanceId(),
    workflowStatus: 'paid',
  },
  // 9. rejected — Thana medical (missing docs)
  {
    id: 'BEN-CLM-S009',
    workflowRequestId: 'REQ-BEN-S009',
    employeeId: thana.id,
    employeeName: thana.nameTh,
    company: 'Central Group',
    businessUnit: 'Finance',
    employeeGroup: 'Monthly',
    personalGrade: 'PG3',
    benefitType: 'medical',
    benefitCode: 'BEN-MED-OPD',
    benefitName: 'ค่ารักษาพยาบาล',
    remainingAmount: 16200,
    currency: 'THB',
    receiptNo: 'RCPT-2026-S009',
    receiptDate: daysAgoDate(22),
    receiptAmount: 1200,
    totalClaimAmount: 1200,
    status: 'rejected',
    correctionReason: 'เอกสารแนบไม่ครบ กรุณาแนบใบเสร็จต้นฉบับ',
    submittedAt: daysAgoIso(22),
    updatedAt: daysAgoIso(19),
    attachments: [],
    audit: makeAudit(thana.nameTh, daysAgoIso(22), [
      { actorRole: 'spd', actorName: 'ทีม SPD', action: 'reject', at: daysAgoIso(19), note: 'เอกสารแนบไม่ครบ กรุณาแนบใบเสร็จต้นฉบับ' },
    ]),
    version: 1,
    previousVersions: [],
    workflowInstanceId: demoInstanceId(),
    workflowStatus: 'rejected',
  },
  // 10. pending (bypass) — Somying dependent medical
  {
    id: 'BEN-CLM-S010',
    workflowRequestId: 'REQ-BEN-S010',
    employeeId: somying.id,
    employeeName: somying.nameTh,
    company: 'Central Group',
    businessUnit: 'Operations',
    employeeGroup: 'Monthly',
    personalGrade: 'PG2',
    benefitType: 'dependent',
    benefitCode: 'BEN-DEP-MED',
    benefitName: 'ค่ารักษาผู้รับสิทธิ์ร่วม',
    remainingAmount: 25000,
    currency: 'THB',
    receiptNo: 'RCPT-2026-S010',
    receiptDate: daysAgoDate(2),
    receiptAmount: 3000,
    totalClaimAmount: 3000,
    dependentName: 'สมชาย รักงาน',
    dependentRelationship: 'คู่สมรส',
    hospitalName: 'รพ.พระรามเก้า',
    status: 'pending_spd',
    submittedAt: daysAgoIso(2),
    updatedAt: daysAgoIso(2),
    attachments: [],
    audit: makeAudit(somying.nameTh, daysAgoIso(2)),
    version: 1,
    previousVersions: [],
    // workflowInstanceId null simulates a bypass / legacy path (no Camunda link)
    workflowInstanceId: null,
    workflowStatus: 'pending',
  },
];

/** Seed the benefit-claims store once per browser session.
 *  Idempotent: skipped if the localStorage flag is set OR the store already
 *  has claims (meaning the user has previously submitted real ones). */
export function seedDemoClaimsIfNeeded(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEED_FLAG_KEY) === 'yes') return;

  const store = useBenefitClaimsStore.getState();
  if (store.claims.length > 0) {
    localStorage.setItem(SEED_FLAG_KEY, 'yes');
    return;
  }

  useBenefitClaimsStore.setState((s) => ({
    claims: [...SEED_CLAIMS, ...s.claims],
  }));
  localStorage.setItem(SEED_FLAG_KEY, 'yes');
}
