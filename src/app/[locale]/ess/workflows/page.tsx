'use client';

// ess/workflows/page.tsx — My Workflows list
// Dynamic read from workflow-approvals store (5-persona journey).
// Filtered to requests where submittedBy.id === current user.
// Enhanced: approval chain, days waiting, status badge, collapsible audit timeline.

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowRight, Plus, User, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { buttonVariants, EmptyState } from '@/components/humi';
import { useWorkflowApprovals, STEP_LABEL, type ApprovalStep } from '@/stores/workflow-approvals';
import { useAuthStore } from '@/stores/auth-store';
import { ApprovalChain } from '@/components/quick-approve/ApprovalChain';
import type { ApproverStage } from '@/data/benefits/plan-registry';

// Chains per workflow type
const CHAINS: Record<string, ApproverStage[]> = {
  personal_info_change: ['spd'],
  timeoff: ['manager', 'hr_admin'],
  overtime: ['manager'],
};

// Extended status type covering all workflow types
type ExtendedStatus = ApprovalStep | 'pending_manager' | 'pending_hr_admin' | 'approved' | 'rejected' | 'returned';

// Unified status style
const STATUS_STYLE: Record<string, string> = {
  pending_spd: 'bg-amber-50 text-amber-700 border border-amber-200',
  pending_manager: 'bg-amber-50 text-amber-700 border border-amber-200',
  pending_hr_admin: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-danger-soft text-danger-ink border border-danger',
  returned: 'bg-accent-soft text-accent-ink border border-accent-soft',
};

const STATUS_LABEL_TH: Record<string, string> = {
  pending_spd: 'รอ SPD อนุมัติ',
  pending_manager: 'รอหัวหน้าอนุมัติ',
  pending_hr_admin: 'รอ HR Admin อนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ถูกปฏิเสธ',
  returned: 'ส่งกลับแก้ไข',
};

const STATUS_LABEL_EN: Record<string, string> = {
  pending_spd: 'Pending SPD',
  pending_manager: 'Pending Manager',
  pending_hr_admin: 'Pending HR Admin',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned',
};

function activeStageForStatus(status: string, type: string): ApproverStage | undefined {
  if (type === 'personal_info_change' && status === 'pending_spd') return 'spd';
  if ((type === 'timeoff' || type === 'overtime') && status === 'pending_manager') return 'manager';
  if (type === 'timeoff' && status === 'pending_hr_admin') return 'hr_admin';
  return undefined;
}

// Mock extra entries so the ESS demo has visible chain + history variety.
// These seed on first render alongside store entries (store starts empty for new users).
const MOCK_ESS_REQUESTS = [
  {
    id: 'WF-DEMO-001',
    type: 'personal_info_change' as const,
    employeeId: 'EMP010',
    employeeName: 'สมหญิง มีสุข',
    submittedBy: { id: 'EMP010', name: 'สมหญิง มีสุข', role: 'employee' as const },
    submittedAt: '2026-04-20T09:00:00Z',
    status: 'pending_spd' as ApprovalStep,
    diffs: [
      { path: 'contact.phone', label: 'เบอร์โทรศัพท์', before: '081-111-1111', after: '081-999-2222' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'สมหญิง มีสุข', action: 'submit' as const, at: '2026-04-20T09:00:00Z' },
    ],
  },
  {
    id: 'WF-DEMO-002',
    type: 'personal_info_change' as const,
    employeeId: 'EMP010',
    employeeName: 'สมหญิง มีสุข',
    submittedBy: { id: 'EMP010', name: 'สมหญิง มีสุข', role: 'employee' as const },
    submittedAt: '2026-03-15T11:00:00Z',
    status: 'approved' as ApprovalStep,
    diffs: [
      { path: 'names.lastNameLocal', label: 'นามสกุล (ไทย)', before: 'สมบูรณ์', after: 'มีสุข' },
      { path: 'names.lastNameEn', label: 'Last Name (EN)', before: 'Somboon', after: 'Meesuk' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'สมหญิง มีสุข', action: 'submit' as const, at: '2026-03-15T11:00:00Z' },
      { actorRole: 'spd' as const, actorName: 'วิชัย SPD', action: 'approve' as const, comment: 'ตรวจสอบเอกสารเรียบร้อย', at: '2026-03-16T14:30:00Z' },
    ],
  },
  {
    id: 'WF-DEMO-003',
    type: 'personal_info_change' as const,
    employeeId: 'EMP010',
    employeeName: 'สมหญิง มีสุข',
    submittedBy: { id: 'EMP010', name: 'สมหญิง มีสุข', role: 'employee' as const },
    submittedAt: '2026-02-10T08:30:00Z',
    status: 'rejected' as ApprovalStep,
    diffs: [
      { path: 'bank.accountNumber', label: 'เลขบัญชีธนาคาร', before: '***-1234', after: '***-5678' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'สมหญิง มีสุข', action: 'submit' as const, at: '2026-02-10T08:30:00Z' },
      { actorRole: 'spd' as const, actorName: 'วิชัย SPD', action: 'reject' as const, comment: 'กรุณาแนบสำเนาสมุดบัญชีธนาคาร', at: '2026-02-11T09:00:00Z' },
    ],
  },
  {
    id: 'WF-DEMO-004',
    type: 'personal_info_change' as const,
    employeeId: 'EMP011',
    employeeName: 'ประสิทธิ์ บุญมาก',
    submittedBy: { id: 'EMP011', name: 'ประสิทธิ์ บุญมาก', role: 'employee' as const },
    submittedAt: '2026-04-25T13:00:00Z',
    status: 'pending_spd' as ApprovalStep,
    diffs: [
      { path: 'address.current', label: 'ที่อยู่ปัจจุบัน', before: '123 สุขุมวิท', after: '456 รัชดาภิเษก' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'ประสิทธิ์ บุญมาก', action: 'submit' as const, at: '2026-04-25T13:00:00Z' },
    ],
  },
  {
    id: 'WF-DEMO-005',
    type: 'personal_info_change' as const,
    employeeId: 'EMP012',
    employeeName: 'อรนุช วงศ์สุวรรณ',
    submittedBy: { id: 'EMP012', name: 'อรนุช วงศ์สุวรรณ', role: 'employee' as const },
    submittedAt: '2026-01-20T10:00:00Z',
    status: 'approved' as ApprovalStep,
    diffs: [
      { path: 'contact.emergencyPhone', label: 'เบอร์ฉุกเฉิน', before: '02-000-0000', after: '089-777-8888' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'อรนุช วงศ์สุวรรณ', action: 'submit' as const, at: '2026-01-20T10:00:00Z' },
      { actorRole: 'spd' as const, actorName: 'กัณณิกา SPD', action: 'approve' as const, at: '2026-01-21T11:00:00Z' },
    ],
  },
  // ── Timeoff entries ──────────────────────────────────────────────────────────
  {
    id: 'WF-DEMO-TO-001',
    type: 'timeoff' as const,
    employeeId: 'EMP010',
    employeeName: 'สมหญิง มีสุข',
    submittedBy: { id: 'EMP010', name: 'สมหญิง มีสุข', role: 'employee' as const },
    submittedAt: '2026-04-29T08:30:00Z',
    status: 'pending_manager' as ExtendedStatus,
    diffs: [
      { path: 'leave.from', label: 'ลาพักร้อน ตั้งแต่', before: '', after: '12 พ.ค. 2569' },
      { path: 'leave.to', label: 'ถึงวันที่', before: '', after: '14 พ.ค. 2569' },
      { path: 'leave.reason', label: 'เหตุผล', before: '', after: 'พักผ่อนประจำปีครอบครัว' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'สมหญิง มีสุข', action: 'submit' as const, at: '2026-04-29T08:30:00Z' },
    ],
  },
  {
    id: 'WF-DEMO-TO-002',
    type: 'timeoff' as const,
    employeeId: 'EMP010',
    employeeName: 'สมหญิง มีสุข',
    submittedBy: { id: 'EMP010', name: 'สมหญิง มีสุข', role: 'employee' as const },
    submittedAt: '2026-03-10T09:00:00Z',
    status: 'approved' as ExtendedStatus,
    diffs: [
      { path: 'leave.from', label: 'ลาป่วย ตั้งแต่', before: '', after: '14 มี.ค. 2569' },
      { path: 'leave.to', label: 'ถึงวันที่', before: '', after: '17 มี.ค. 2569' },
      { path: 'leave.reason', label: 'เหตุผล', before: '', after: 'ไข้หวัดใหญ่' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'สมหญิง มีสุข', action: 'submit' as const, at: '2026-03-10T09:00:00Z' },
      { actorRole: 'manager' as const, actorName: 'กฤตนัย อินทรเดช', action: 'approve' as const, comment: 'ดูแลสุขภาพด้วยนะครับ', at: '2026-03-10T10:30:00Z' },
      { actorRole: 'hr_admin' as const, actorName: 'วรินทร์ HR Admin', action: 'approve' as const, at: '2026-03-11T09:00:00Z' },
    ],
  },
  {
    id: 'WF-DEMO-TO-003',
    type: 'timeoff' as const,
    employeeId: 'EMP011',
    employeeName: 'ประสิทธิ์ บุญมาก',
    submittedBy: { id: 'EMP011', name: 'ประสิทธิ์ บุญมาก', role: 'employee' as const },
    submittedAt: '2026-02-20T10:00:00Z',
    status: 'rejected' as ExtendedStatus,
    diffs: [
      { path: 'leave.from', label: 'ลากิจ ตั้งแต่', before: '', after: '25 ก.พ. 2569' },
      { path: 'leave.to', label: 'ถึงวันที่', before: '', after: '27 ก.พ. 2569' },
      { path: 'leave.reason', label: 'เหตุผล', before: '', after: 'ธุระส่วนตัว' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'ประสิทธิ์ บุญมาก', action: 'submit' as const, at: '2026-02-20T10:00:00Z' },
      { actorRole: 'manager' as const, actorName: 'กฤตนัย อินทรเดช', action: 'reject' as const, comment: 'ช่วงนั้นทีมทำ Quarter-end ไม่สามารถอนุมัติได้', at: '2026-02-21T09:00:00Z' },
    ],
  },
  // ── Overtime entries ─────────────────────────────────────────────────────────
  {
    id: 'WF-DEMO-OT-001',
    type: 'overtime' as const,
    employeeId: 'EMP010',
    employeeName: 'สมหญิง มีสุข',
    submittedBy: { id: 'EMP010', name: 'สมหญิง มีสุข', role: 'employee' as const },
    submittedAt: '2026-04-27T17:00:00Z',
    status: 'pending_manager' as ExtendedStatus,
    diffs: [
      { path: 'ot.date', label: 'วันที่ทำ OT', before: '', after: '30 เม.ย. 2569' },
      { path: 'ot.hours', label: 'จำนวนชั่วโมง', before: '', after: '3 ชั่วโมง (18:00–21:00)' },
      { path: 'ot.reason', label: 'เหตุผล', before: '', after: 'ปิดงบ Quarter สิ้นเดือน' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'สมหญิง มีสุข', action: 'submit' as const, at: '2026-04-27T17:00:00Z' },
    ],
  },
  {
    id: 'WF-DEMO-OT-002',
    type: 'overtime' as const,
    employeeId: 'EMP010',
    employeeName: 'สมหญิง มีสุข',
    submittedBy: { id: 'EMP010', name: 'สมหญิง มีสุข', role: 'employee' as const },
    submittedAt: '2026-03-22T17:00:00Z',
    status: 'approved' as ExtendedStatus,
    diffs: [
      { path: 'ot.date', label: 'วันที่ทำ OT', before: '', after: '25 มี.ค. 2569' },
      { path: 'ot.hours', label: 'จำนวนชั่วโมง', before: '', after: '2 ชั่วโมง (18:00–20:00)' },
      { path: 'ot.reason', label: 'เหตุผล', before: '', after: 'เตรียมข้อมูลนำเสนอผู้บริหาร' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'สมหญิง มีสุข', action: 'submit' as const, at: '2026-03-22T17:00:00Z' },
      { actorRole: 'manager' as const, actorName: 'กฤตนัย อินทรเดช', action: 'approve' as const, at: '2026-03-23T08:30:00Z' },
    ],
  },
  {
    id: 'WF-DEMO-OT-003',
    type: 'overtime' as const,
    employeeId: 'EMP012',
    employeeName: 'อรนุช วงศ์สุวรรณ',
    submittedBy: { id: 'EMP012', name: 'อรนุช วงศ์สุวรรณ', role: 'employee' as const },
    submittedAt: '2026-02-15T16:00:00Z',
    status: 'rejected' as ExtendedStatus,
    diffs: [
      { path: 'ot.date', label: 'วันที่ทำ OT', before: '', after: '18 ก.พ. 2569 (วันหยุด)' },
      { path: 'ot.hours', label: 'จำนวนชั่วโมง', before: '', after: '5 ชั่วโมง (09:00–14:00)' },
      { path: 'ot.reason', label: 'เหตุผล', before: '', after: 'ตรวจสต็อกประจำปี' },
    ],
    audit: [
      { actorRole: 'employee' as const, actorName: 'อรนุช วงศ์สุวรรณ', action: 'submit' as const, at: '2026-02-15T16:00:00Z' },
      { actorRole: 'manager' as const, actorName: 'กฤตนัย อินทรเดช', action: 'reject' as const, comment: 'ไม่ได้ขออนุมัติล่วงหน้าตามระเบียบ', at: '2026-02-16T09:00:00Z' },
    ],
  },
];

function daysWaiting(submittedAt: string): number {
  return Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86400000);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dotColor(action: string) {
  if (action === 'approve') return 'bg-success';
  if (action === 'reject') return 'bg-danger';
  return 'bg-accent-soft';
}

type AnyRequest = {
  id: string;
  type: string;
  employeeId: string;
  employeeName: string;
  submittedBy: { id: string; name: string; role: string };
  submittedAt: string;
  status: string;
  diffs: { path: string; label: string; before: string; after: string }[];
  audit: { actorRole: string; actorName: string; action: string; comment?: string; at: string }[];
};

const TYPE_TITLE_TH: Record<string, string> = {
  personal_info_change: 'ขอแก้ไขข้อมูลส่วนตัว',
  timeoff: 'คำขอลางาน',
  overtime: 'คำขอทำงานล่วงเวลา (OT)',
};

const TYPE_TITLE_EN: Record<string, string> = {
  personal_info_change: 'Personal Info Change Request',
  timeoff: 'Leave Request',
  overtime: 'Overtime Request',
};

function isPendingStatus(status: string): boolean {
  return status.startsWith('pending_');
}

function RequestRow({ req, locale }: { req: AnyRequest; locale: string }) {
  const [expanded, setExpanded] = useState(false);
  const days = daysWaiting(req.submittedAt);
  const chain = CHAINS[req.type] ?? ['spd'];
  const activeStage = activeStageForStatus(req.status, req.type);
  const statusLabel = locale === 'th'
    ? (STATUS_LABEL_TH[req.status] ?? req.status)
    : (STATUS_LABEL_EN[req.status] ?? req.status);
  const statusStyle = STATUS_STYLE[req.status] ?? 'bg-surface-raised text-ink-muted';
  const typeTitle = locale === 'th'
    ? (TYPE_TITLE_TH[req.type] ?? req.type)
    : (TYPE_TITLE_EN[req.type] ?? req.type);

  const actionLabel = (action: string) => {
    if (action === 'submit') return locale === 'th' ? 'ส่งคำขอ' : 'Submitted';
    if (action === 'approve') return locale === 'th' ? 'อนุมัติ' : 'Approved';
    if (action === 'reject') return locale === 'th' ? 'ปฏิเสธ' : 'Rejected';
    return action;
  };

  return (
    <li className="humi-card" style={{ padding: 16 }}>
      {/* Header row */}
      <div className="humi-row" style={{ gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>{req.id}</div>
          <div className="text-body font-semibold text-ink">{typeTitle}</div>
          <div className="text-small text-ink-muted mt-0.5">
            {locale === 'th' ? 'ส่งเมื่อ' : 'Submitted'} {formatDate(req.submittedAt)} · {req.diffs.length} {locale === 'th' ? 'รายการ' : 'fields'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusStyle}`}>
            {statusLabel}
          </span>
          {isPendingStatus(req.status) && (
            <span className={`text-xs font-mono ${days > 3 ? 'text-amber-600 font-semibold' : 'text-ink-muted'}`}>
              {days} {locale === 'th' ? 'ด. รอ' : 'd. waiting'}
            </span>
          )}
        </div>
      </div>

      {/* Approval chain */}
      <div style={{ marginTop: 10 }}>
        <ApprovalChain chain={chain} locale={locale} activeStage={activeStage} size="sm" />
      </div>

      {/* Diff summary */}
      <div
        style={{
          marginTop: 12,
          borderTop: '1px solid var(--color-hairline-soft)',
          paddingTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {req.diffs.slice(0, 3).map((d) => (
          <div
            key={d.path}
            className="humi-row"
            style={{ gap: 8, fontSize: 12, flexWrap: 'wrap' }}
          >
            <span className="text-ink-muted" style={{ minWidth: 140 }}>{d.label}</span>
            {d.before && (
              <>
                <span className="text-ink-faint" style={{ textDecoration: 'line-through' }}>{d.before}</span>
                <ArrowRight size={10} aria-hidden />
              </>
            )}
            <span className="text-ink">{d.after || (locale === 'th' ? '(ว่าง)' : '(empty)')}</span>
          </div>
        ))}
        {req.diffs.length > 3 && (
          <div className="text-small text-ink-faint">
            {locale === 'th' ? `และอีก ${req.diffs.length - 3} รายการ` : `and ${req.diffs.length - 3} more`}
          </div>
        )}
      </div>

      {/* Expand/collapse history toggle */}
      <button
        className="mt-2 flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
        {locale === 'th' ? 'ประวัติการดำเนินการ' : 'Audit history'}
      </button>

      {/* Collapsible audit timeline */}
      {expanded && (
        <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--color-hairline-soft)' }}>
          <ol className="space-y-2">
            {req.audit.map((entry, idx) => (
              <li key={idx} className="flex gap-3 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor(entry.action)} mt-1.5 shrink-0`} />
                <div>
                  <span className="font-medium text-ink">{entry.actorName}</span>
                  {' '}
                  <span className="text-ink-muted">{actionLabel(entry.action)}</span>
                  <span className="ml-2 text-ink-faint">{formatDate(entry.at)}</span>
                  {entry.comment && (
                    <p className="text-ink-muted mt-0.5 italic">&ldquo;{entry.comment}&rdquo;</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}

export default function MyWorkflowsPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'th';
  const userId = useAuthStore((s) => s.userId);
  const allRequests = useWorkflowApprovals((s) => s.requests);

  // Merge store requests (this user's live submissions) with demo seed data
  const myStoreRequests = useMemo(
    () => allRequests.filter((r) => r.submittedBy.id === userId),
    [allRequests, userId],
  );

  // Show store requests first, then demo entries (demo entries for non-matching userId
  // act as illustrative examples so the demo is never empty)
  const displayRequests: AnyRequest[] = useMemo(() => {
    if (myStoreRequests.length > 0) {
      return myStoreRequests as AnyRequest[];
    }
    return MOCK_ESS_REQUESTS as AnyRequest[];
  }, [myStoreRequests]);

  return (
    <div className="pb-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="humi-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {locale === 'th' ? 'คำขอของฉัน' : 'My Requests'}
          </h1>
          <p className="text-small text-ink-muted mt-1">
            {locale === 'th'
              ? 'ประวัติคำขอลางาน · OT · แก้ไขข้อมูล และสถานะการอนุมัติ'
              : 'History of leave, overtime, and info-change requests with approval status'}
          </p>
        </div>
        <Link
          href={`/${locale}/ess/profile/edit`}
          className={buttonVariants({ variant: 'primary' })}
          style={{ alignSelf: 'flex-start' }}
        >
          <Plus size={14} aria-hidden />
          {locale === 'th' ? 'ยื่นคำขอใหม่' : 'New Request'}
        </Link>
      </div>

      {/* Summary pill row */}
      <div className="flex gap-3 flex-wrap">
        {(() => {
          const pendingCount = displayRequests.filter((r) => isPendingStatus(r.status)).length;
          const approvedCount = displayRequests.filter((r) => r.status === 'approved').length;
          const rejectedCount = displayRequests.filter((r) => r.status === 'rejected').length;
          return [
            pendingCount > 0 && (
              <span key="pending" className="rounded-full px-3 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                {locale === 'th' ? 'รอดำเนินการ' : 'Pending'} · {pendingCount}
              </span>
            ),
            approvedCount > 0 && (
              <span key="approved" className="rounded-full px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                {locale === 'th' ? 'อนุมัติแล้ว' : 'Approved'} · {approvedCount}
              </span>
            ),
            rejectedCount > 0 && (
              <span key="rejected" className="rounded-full px-3 py-1 text-xs font-medium bg-danger-soft text-danger-ink border border-danger">
                {locale === 'th' ? 'ปฏิเสธ' : 'Rejected'} · {rejectedCount}
              </span>
            ),
          ];
        })()}
      </div>

      {displayRequests.length === 0 ? (
        <EmptyState
          icon={FileText}
          titleTh="ยังไม่มีคำขอ"
          titleEn="No requests yet"
          descTh='คลิก "ยื่นคำขอใหม่" ด้านบนเพื่อเริ่มคำขอแก้ไขข้อมูล'
          descEn='Click "New Request" above to start an info-change request.'
          ctaLabelTh="ยื่นคำขอใหม่"
          ctaLabelEn="New Request"
          ctaHref={`/${locale}/ess/profile/edit`}
        />
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-label={locale === 'th' ? 'รายการคำขอของฉัน' : 'My requests'}>
          {displayRequests.slice(0, 8).map((req) => (
            <RequestRow key={req.id} req={req} locale={locale} />
          ))}
          {displayRequests.length > 8 && (
            <li style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', fontSize: 12, color: 'var(--color-ink-muted)' }}>
              <span>Showing 8 of {displayRequests.length}</span>
              <span aria-hidden style={{ color: 'var(--color-ink-faint)' }}>·</span>
              <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>View all</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
