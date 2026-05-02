export type AuditAction =
  | 'login'
  | 'logout'
  | 'persona_switch'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'edit'
  | 'create'
  | 'delete'
  | 'view';

export type AuditCategory = 'persona' | 'workflow' | 'employee' | 'system';

export interface AuditEntry {
  id: string;
  actor: string;
  actorRole: string;
  action: AuditAction;
  actionLabelTh: string;
  actionLabelEn: string;
  targetEntity: string;
  targetEntityTh: string;
  targetId: string;
  category: AuditCategory;
  ip: string;
  timestamp: string;
}

export const MOCK_AUDIT_LOG: AuditEntry[] = [
  { id: 'AUD-001', actor: 'วิชัย SPD',        actorRole: 'SPD',      action: 'approve',        actionLabelTh: 'อนุมัติ',              actionLabelEn: 'Approved',          targetEntity: 'LeaveRequest',        targetEntityTh: 'คำขอลา',              targetId: 'WF-001', category: 'workflow', ip: '10.0.1.12',  timestamp: '2026-05-02T08:31:00Z' },
  { id: 'AUD-002', actor: 'กัณณิกา HRBP',    actorRole: 'HRBP',     action: 'approve',        actionLabelTh: 'อนุมัติ',              actionLabelEn: 'Approved',          targetEntity: 'OvertimeRequest',     targetEntityTh: 'คำขอล่วงเวลา',        targetId: 'WF-008', category: 'workflow', ip: '10.0.1.24',  timestamp: '2026-05-02T07:55:00Z' },
  { id: 'AUD-003', actor: 'สมชาย Manager',    actorRole: 'Manager',  action: 'submit',         actionLabelTh: 'ยื่นคำขอ',             actionLabelEn: 'Submitted',         targetEntity: 'LeaveRequest',        targetEntityTh: 'คำขอลา',              targetId: 'WF-006', category: 'workflow', ip: '10.0.2.44',  timestamp: '2026-05-02T07:30:00Z' },
  { id: 'AUD-004', actor: 'Ken Admin',         actorRole: 'HR Admin', action: 'persona_switch', actionLabelTh: 'สลับ persona',          actionLabelEn: 'Persona Switch',    targetEntity: 'Session',             targetEntityTh: 'เซสชัน',              targetId: 'SES-001', category: 'persona', ip: '10.0.0.5',   timestamp: '2026-05-02T07:00:00Z' },
  { id: 'AUD-005', actor: 'วิชัย SPD',        actorRole: 'SPD',      action: 'reject',         actionLabelTh: 'ปฏิเสธ',               actionLabelEn: 'Rejected',          targetEntity: 'ClaimRequest',        targetEntityTh: 'คำขอเบิก',             targetId: 'WF-007', category: 'workflow', ip: '10.0.1.12',  timestamp: '2026-05-01T16:45:00Z' },
  { id: 'AUD-006', actor: 'กัณณิกา HRBP',    actorRole: 'HRBP',     action: 'edit',           actionLabelTh: 'แก้ไขข้อมูล',          actionLabelEn: 'Edited',            targetEntity: 'Employee',            targetEntityTh: 'ข้อมูลพนักงาน',       targetId: 'EMP004', category: 'employee', ip: '10.0.1.24',  timestamp: '2026-05-01T15:20:00Z' },
  { id: 'AUD-007', actor: 'Ken Admin',         actorRole: 'HR Admin', action: 'login',          actionLabelTh: 'เข้าสู่ระบบ',          actionLabelEn: 'Login',             targetEntity: 'Session',             targetEntityTh: 'เซสชัน',              targetId: 'SES-001', category: 'system', ip: '10.0.0.5',   timestamp: '2026-05-01T09:00:00Z' },
  { id: 'AUD-008', actor: 'สมชาย Manager',    actorRole: 'Manager',  action: 'approve',        actionLabelTh: 'อนุมัติ',              actionLabelEn: 'Approved',          targetEntity: 'LeaveRequest',        targetEntityTh: 'คำขอลา',              targetId: 'WF-010', category: 'workflow', ip: '10.0.2.44',  timestamp: '2026-05-01T08:40:00Z' },
  { id: 'AUD-009', actor: 'วิชัย SPD',        actorRole: 'SPD',      action: 'approve',        actionLabelTh: 'อนุมัติ',              actionLabelEn: 'Approved',          targetEntity: 'TransferRequest',     targetEntityTh: 'คำขอโอนย้าย',         targetId: 'WF-004', category: 'workflow', ip: '10.0.1.12',  timestamp: '2026-04-30T14:30:00Z' },
  { id: 'AUD-010', actor: 'Ken Admin',         actorRole: 'HR Admin', action: 'persona_switch', actionLabelTh: 'สลับ persona',          actionLabelEn: 'Persona Switch',    targetEntity: 'Session',             targetEntityTh: 'เซสชัน',              targetId: 'SES-002', category: 'persona', ip: '10.0.0.5',   timestamp: '2026-04-30T14:00:00Z' },
  { id: 'AUD-011', actor: 'กัณณิกา HRBP',    actorRole: 'HRBP',     action: 'view',           actionLabelTh: 'ดูข้อมูล',             actionLabelEn: 'Viewed',            targetEntity: 'PayrollReport',       targetEntityTh: 'รายงานเงินเดือน',     targetId: 'RPT-001', category: 'system', ip: '10.0.1.24',  timestamp: '2026-04-30T11:00:00Z' },
  { id: 'AUD-012', actor: 'สมหญิง Employee',  actorRole: 'Employee', action: 'submit',         actionLabelTh: 'ยื่นคำขอ',             actionLabelEn: 'Submitted',         targetEntity: 'PersonalInfoChange',  targetEntityTh: 'แก้ไขข้อมูลส่วนตัว', targetId: 'WF-DEMO-001', category: 'workflow', ip: '10.0.3.55', timestamp: '2026-04-29T09:00:00Z' },
  { id: 'AUD-013', actor: 'Ken Admin',         actorRole: 'HR Admin', action: 'create',         actionLabelTh: 'สร้างข้อมูล',          actionLabelEn: 'Created',           targetEntity: 'Employee',            targetEntityTh: 'ข้อมูลพนักงาน',       targetId: 'EMP015', category: 'employee', ip: '10.0.0.5',   timestamp: '2026-04-29T08:30:00Z' },
  { id: 'AUD-014', actor: 'วิชัย SPD',        actorRole: 'SPD',      action: 'approve',        actionLabelTh: 'อนุมัติ',              actionLabelEn: 'Approved',          targetEntity: 'ClaimRequest',        targetEntityTh: 'คำขอเบิก',             targetId: 'WF-015', category: 'workflow', ip: '10.0.1.12',  timestamp: '2026-04-28T17:00:00Z' },
  { id: 'AUD-015', actor: 'กัณณิกา HRBP',    actorRole: 'HRBP',     action: 'reject',         actionLabelTh: 'ปฏิเสธ',               actionLabelEn: 'Rejected',          targetEntity: 'OvertimeRequest',     targetEntityTh: 'คำขอล่วงเวลา',        targetId: 'WF-009', category: 'workflow', ip: '10.0.1.24',  timestamp: '2026-04-28T15:30:00Z' },
  { id: 'AUD-016', actor: 'Ken Admin',         actorRole: 'HR Admin', action: 'persona_switch', actionLabelTh: 'สลับ persona',          actionLabelEn: 'Persona Switch',    targetEntity: 'Session',             targetEntityTh: 'เซสชัน',              targetId: 'SES-003', category: 'persona', ip: '10.0.0.5',   timestamp: '2026-04-28T14:00:00Z' },
  { id: 'AUD-017', actor: 'สมชาย Manager',    actorRole: 'Manager',  action: 'approve',        actionLabelTh: 'อนุมัติ',              actionLabelEn: 'Approved',          targetEntity: 'ClaimRequest',        targetEntityTh: 'คำขอเบิก',             targetId: 'WF-005', category: 'workflow', ip: '10.0.2.44',  timestamp: '2026-04-27T10:45:00Z' },
  { id: 'AUD-018', actor: 'วิชัย SPD',        actorRole: 'SPD',      action: 'login',          actionLabelTh: 'เข้าสู่ระบบ',          actionLabelEn: 'Login',             targetEntity: 'Session',             targetEntityTh: 'เซสชัน',              targetId: 'SES-004', category: 'system', ip: '10.0.1.12',  timestamp: '2026-04-27T08:00:00Z' },
  { id: 'AUD-019', actor: 'กัณณิกา HRBP',    actorRole: 'HRBP',     action: 'edit',           actionLabelTh: 'แก้ไขข้อมูล',          actionLabelEn: 'Edited',            targetEntity: 'BenefitRecord',       targetEntityTh: 'บันทึกสวัสดิการ',     targetId: 'BEN-003', category: 'system', ip: '10.0.1.24',  timestamp: '2026-04-26T14:20:00Z' },
  { id: 'AUD-020', actor: 'Ken Admin',         actorRole: 'HR Admin', action: 'delete',         actionLabelTh: 'ลบข้อมูล',             actionLabelEn: 'Deleted',           targetEntity: 'Employee',            targetEntityTh: 'ข้อมูลพนักงาน',       targetId: 'EMP-X01', category: 'employee', ip: '10.0.0.5',  timestamp: '2026-04-25T16:00:00Z' },
  { id: 'AUD-021', actor: 'สมชาย Manager',    actorRole: 'Manager',  action: 'submit',         actionLabelTh: 'ยื่นคำขอ',             actionLabelEn: 'Submitted',         targetEntity: 'OvertimeRequest',     targetEntityTh: 'คำขอล่วงเวลา',        targetId: 'WF-012', category: 'workflow', ip: '10.0.2.44',  timestamp: '2026-04-25T08:10:00Z' },
  { id: 'AUD-022', actor: 'วิชัย SPD',        actorRole: 'SPD',      action: 'approve',        actionLabelTh: 'อนุมัติ',              actionLabelEn: 'Approved',          targetEntity: 'ResignationRequest',  targetEntityTh: 'ใบลาออก',              targetId: 'TERM-001', category: 'workflow', ip: '10.0.1.12', timestamp: '2026-04-24T11:00:00Z' },
  { id: 'AUD-023', actor: 'Ken Admin',         actorRole: 'HR Admin', action: 'persona_switch', actionLabelTh: 'สลับ persona',          actionLabelEn: 'Persona Switch',    targetEntity: 'Session',             targetEntityTh: 'เซสชัน',              targetId: 'SES-005', category: 'persona', ip: '10.0.0.5',   timestamp: '2026-04-24T09:30:00Z' },
  { id: 'AUD-024', actor: 'กัณณิกา HRBP',    actorRole: 'HRBP',     action: 'approve',        actionLabelTh: 'อนุมัติ',              actionLabelEn: 'Approved',          targetEntity: 'TransferRequest',     targetEntityTh: 'คำขอโอนย้าย',         targetId: 'WF-011', category: 'workflow', ip: '10.0.1.24',  timestamp: '2026-04-23T15:45:00Z' },
  { id: 'AUD-025', actor: 'สมหญิง Employee',  actorRole: 'Employee', action: 'submit',         actionLabelTh: 'ยื่นคำขอ',             actionLabelEn: 'Submitted',         targetEntity: 'PersonalInfoChange',  targetEntityTh: 'แก้ไขข้อมูลส่วนตัว', targetId: 'WF-DEMO-002', category: 'workflow', ip: '10.0.3.55', timestamp: '2026-04-22T10:00:00Z' },
  { id: 'AUD-026', actor: 'Ken Admin',         actorRole: 'HR Admin', action: 'login',          actionLabelTh: 'เข้าสู่ระบบ',          actionLabelEn: 'Login',             targetEntity: 'Session',             targetEntityTh: 'เซสชัน',              targetId: 'SES-006', category: 'system', ip: '10.0.0.5',   timestamp: '2026-04-22T08:00:00Z' },
  { id: 'AUD-027', actor: 'สมชาย Manager',    actorRole: 'Manager',  action: 'reject',         actionLabelTh: 'ปฏิเสธ',               actionLabelEn: 'Rejected',          targetEntity: 'ClaimRequest',        targetEntityTh: 'คำขอเบิก',             targetId: 'WF-003', category: 'workflow', ip: '10.0.2.44',  timestamp: '2026-04-21T14:00:00Z' },
  { id: 'AUD-028', actor: 'วิชัย SPD',        actorRole: 'SPD',      action: 'view',           actionLabelTh: 'ดูข้อมูล',             actionLabelEn: 'Viewed',            targetEntity: 'AuditLog',            targetEntityTh: 'บันทึกตรวจสอบ',       targetId: 'AUD-LOG-1', category: 'system', ip: '10.0.1.12', timestamp: '2026-04-21T09:00:00Z' },
  { id: 'AUD-029', actor: 'กัณณิกา HRBP',    actorRole: 'HRBP',     action: 'edit',           actionLabelTh: 'แก้ไขข้อมูล',          actionLabelEn: 'Edited',            targetEntity: 'NotificationTemplate',targetEntityTh: 'เทมเพลตแจ้งเตือน',    targetId: 'NT-009', category: 'system', ip: '10.0.1.24',  timestamp: '2026-04-20T16:30:00Z' },
  { id: 'AUD-030', actor: 'Ken Admin',         actorRole: 'HR Admin', action: 'create',         actionLabelTh: 'สร้างข้อมูล',          actionLabelEn: 'Created',           targetEntity: 'Employee',            targetEntityTh: 'ข้อมูลพนักงาน',       targetId: 'EMP016', category: 'employee', ip: '10.0.0.5',   timestamp: '2026-04-20T09:15:00Z' },
  { id: 'AUD-031', actor: 'สมหญิง Employee',  actorRole: 'Employee', action: 'submit',         actionLabelTh: 'ยื่นคำขอ',             actionLabelEn: 'Submitted',         targetEntity: 'PersonalInfoChange',  targetEntityTh: 'แก้ไขข้อมูลส่วนตัว', targetId: 'WF-DEMO-003', category: 'workflow', ip: '10.0.3.55', timestamp: '2026-04-19T11:00:00Z' },
  { id: 'AUD-032', actor: 'วิชัย SPD',        actorRole: 'SPD',      action: 'persona_switch', actionLabelTh: 'สลับ persona',          actionLabelEn: 'Persona Switch',    targetEntity: 'Session',             targetEntityTh: 'เซสชัน',              targetId: 'SES-007', category: 'persona', ip: '10.0.1.12',  timestamp: '2026-04-19T08:30:00Z' },
  { id: 'AUD-033', actor: 'กัณณิกา HRBP',    actorRole: 'HRBP',     action: 'approve',        actionLabelTh: 'อนุมัติ',              actionLabelEn: 'Approved',          targetEntity: 'LeaveRequest',        targetEntityTh: 'คำขอลา',              targetId: 'WF-013', category: 'workflow', ip: '10.0.1.24',  timestamp: '2026-04-18T15:00:00Z' },
  { id: 'AUD-034', actor: 'Ken Admin',         actorRole: 'HR Admin', action: 'logout',         actionLabelTh: 'ออกจากระบบ',           actionLabelEn: 'Logout',            targetEntity: 'Session',             targetEntityTh: 'เซสชัน',              targetId: 'SES-008', category: 'system', ip: '10.0.0.5',   timestamp: '2026-04-18T18:00:00Z' },
  { id: 'AUD-035', actor: 'สมชาย Manager',    actorRole: 'Manager',  action: 'approve',        actionLabelTh: 'อนุมัติ',              actionLabelEn: 'Approved',          targetEntity: 'TransferRequest',     targetEntityTh: 'คำขอโอนย้าย',         targetId: 'WF-004', category: 'workflow', ip: '10.0.2.44',  timestamp: '2026-04-18T10:20:00Z' },
];
