'use client';

// /workflows/leave/[id] — unified-queue detail page for an employee leave
// request (Group A leave-approvals store). Read + mock approve/reject via the
// unified APPROVAL_REGISTRY adapter so the source store flips and every
// projection (/quick-approve list, /requests, /workflows) re-derives live.
// No backend.
//
// Multi-level chain (Manager → HR for unpaid/long/sensitive types): the first
// approve sets `awaitingNext` (stays pending, advances to HR); the second
// approve finalizes (status=approved) and deducts the reserved quota. Reject at
// any step releases the reserve. Action is gated to the CURRENT step's roles.
// Phase: UI mockup. Humi tokens only. Danger = pumpkin (--color-danger).

import { use, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarDays, Paperclip } from 'lucide-react';
import { Button, Modal, FormField } from '@/components/humi';
import { useLeaveApprovals, type LeaveRequest } from '@/stores/leave-approvals';
import { APPROVAL_REGISTRY, type QueueApproval } from '@/lib/approval-registry';
import { appliedChainFor } from '@/lib/time/approval-rules';
import { getLeaveType } from '@/lib/time/leave-types';
import { currentStep, rolesActAtCurrentStep } from '@/lib/approval-routing';
import { formatDate } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/rbac';

const APPROVER_NAME = 'ผู้อนุมัติ / Approver';

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex gap-2 py-1.5 border-b border-hairline last:border-0">
      <span className="w-44 shrink-0 text-xs text-ink-muted">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

/** Build the QueueApproval the routing helpers read, from a live leave record. */
function toQueueApproval(req: LeaveRequest): QueueApproval {
  const status = req.status === 'approved' ? 'approved' : req.status === 'rejected' ? 'rejected' : 'pending';
  const row = req.queueSnapshot ?? APPROVAL_REGISTRY.leave.toQueueItem(req);
  return { row, status, awaitingNext: req.awaitingNext };
}

export default function LeaveDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const locale = useLocale();
  const isTh = locale !== 'en';
  const router = useRouter();

  const request = useLeaveApprovals((s) => s.requests.find((r) => r.id === id));
  const roles = useAuthStore((s) => s.roles) as Role[];

  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (!request) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-base font-semibold text-ink">{isTh ? 'ไม่พบคำขอ' : 'Request not found'}</p>
        <p className="text-sm text-ink-muted">{isTh ? `ไม่พบคำขอรหัส ${id}` : `No request with ID ${id}`}</p>
        <Button variant="secondary" size="md" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" aria-hidden />
          {isTh ? 'กลับ' : 'Back'}
        </Button>
      </div>
    );
  }

  const def = getLeaveType(request.leaveCode ?? '');
  const typeLabel = (isTh ? def?.nameTh : def?.nameEn) ?? request.leaveType;
  const queueItem = toQueueApproval(request);
  const chain = appliedChainFor('leave', request.leaveCode);
  const step = currentStep(queueItem);
  const canAct = rolesActAtCurrentStep(queueItem, roles);

  const isPending = request.status === 'pending';
  const statusLabel =
    request.status === 'approved'
      ? isTh ? 'อนุมัติแล้ว' : 'Approved'
      : request.status === 'rejected'
        ? isTh ? 'ไม่อนุมัติ' : 'Rejected'
        : request.awaitingNext
          ? isTh ? 'รอฝ่ายบุคคล' : 'Awaiting HR'
          : isTh ? 'รออนุมัติ' : 'Pending';

  // The seeded timeline is the SAME chain length; current step index drives which
  // step is active. Build a presentational step list from the routing chain.
  const decidedSteps = request.audit.filter((a) => a.action === 'approve').length;

  function confirm() {
    if (!request || !mode) return;
    if (mode === 'approve') {
      APPROVAL_REGISTRY.leave.approve(request.id, { name: APPROVER_NAME, role: roles[0] });
      // After the act, re-read to decide which toast to show.
      const fresh = useLeaveApprovals.getState().requests.find((r) => r.id === request.id);
      if (fresh?.status === 'approved') {
        showToast(isTh ? 'อนุมัติคำขอลาแล้ว · หักสิทธิ์เรียบร้อย' : 'Leave approved · quota deducted');
      } else {
        showToast(isTh ? 'อนุมัติขั้นแรกแล้ว · ส่งต่อฝ่ายบุคคล' : 'First level approved · forwarded to HR');
      }
    } else {
      APPROVAL_REGISTRY.leave.reject(
        request.id,
        { name: APPROVER_NAME, role: roles[0] },
        reason || (isTh ? 'ปฏิเสธจากคิวอนุมัติ' : 'Rejected from approval queue'),
      );
      showToast(isTh ? 'ปฏิเสธคำขอแล้ว · คืนสิทธิ์ที่จองไว้' : 'Leave rejected · reserve released');
    }
    setMode(null);
    setReason('');
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-ink-muted mb-4" aria-label="breadcrumb">
        <Link href={`/${locale}/quick-approve`} className="hover:text-ink transition">
          {isTh ? 'คิวอนุมัติ' : 'Approvals'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-ink font-medium">{request.id}</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] bg-accent-soft text-accent">
          <CalendarDays className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {isTh ? 'การลา' : 'Leave'} · {request.id}
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            {request.employeeName}
          </h1>
          <span className="humi-tag humi-tag--butter mt-1 inline-block text-xs">{statusLabel}</span>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-[var(--radius-md)] border border-hairline bg-surface shadow-[var(--shadow-card)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {isTh ? 'รายละเอียดคำขอ' : 'Request details'}
        </p>
        <div className="divide-y divide-hairline">
          <FieldRow label={isTh ? 'รหัสพนักงาน' : 'Employee ID'} value={request.employeeId} />
          <FieldRow label={isTh ? 'ประเภทการลา' : 'Leave type'} value={typeLabel} />
          <FieldRow
            label={isTh ? 'ช่วงวันที่' : 'Dates'}
            value={`${formatDate(request.startDate, 'medium', locale)}${
              request.endDate !== request.startDate ? ` – ${formatDate(request.endDate, 'medium', locale)}` : ''
            }`}
          />
          <FieldRow
            label={isTh ? 'จำนวนวัน' : 'Days'}
            value={<span className="font-semibold">{request.days ?? 0} {isTh ? 'วัน' : 'day(s)'}</span>}
          />
          <FieldRow
            label={isTh ? 'สิทธิ์ที่จองไว้' : 'Reserved'}
            value={
              (request.reservedDays ?? 0) > 0
                ? `${request.reservedDays} ${isTh ? 'วัน' : 'day(s)'}`
                : isTh ? 'ไม่มีโควต้า' : 'No quota'
            }
          />
          <FieldRow label={isTh ? 'เหตุผล' : 'Reason'} value={request.reason} />
          <FieldRow
            label={isTh ? 'วันที่ส่ง' : 'Submitted'}
            value={formatDate(request.submittedAt, 'medium', locale)}
          />
        </div>

        {/* Attachments (view/download) */}
        {request.docs && request.docs.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {isTh ? 'เอกสารแนบ' : 'Attachments'}
            </p>
            <ul className="flex flex-col gap-1.5">
              {request.docs.map((doc, i) => (
                <li key={`${doc}-${i}`}>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                  >
                    <Paperclip size={13} aria-hidden />
                    {doc}
                    <span className="text-ink-muted">· {isTh ? 'ดู/ดาวน์โหลด' : 'View / download'}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Approval chain */}
      <div className="mt-4 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {isTh ? 'เส้นทางอนุมัติ' : 'Approval chain'}
        </p>
        <ol className="flex flex-col gap-2.5">
          {chain.map((s, i) => {
            const done = i < decidedSteps;
            const active = isPending && step && chain[i] === step;
            return (
              <li key={i} className="flex items-start gap-2.5">
                <div
                  className={
                    done
                      ? 'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[color:var(--color-success)]'
                      : active
                        ? 'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent'
                        : 'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-hairline'
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">
                    {isTh ? s.labelTh : s.labelEn}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {done
                      ? isTh ? 'อนุมัติแล้ว' : 'Approved'
                      : active
                        ? isTh ? 'รอดำเนินการ' : 'Awaiting action'
                        : isTh ? 'ยังไม่ถึงคิว' : 'Not yet'}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Audit timeline */}
      <div className="mt-4 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {isTh ? 'ประวัติการดำเนินการ' : 'History'}
        </p>
        <div className="flex flex-col gap-3">
          {request.audit.map((entry, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">
                  {entry.action} · {entry.actorName}
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  {formatDate(entry.at, 'medium', locale)}
                  {entry.comment ? ` — ${entry.comment}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action surface — only the CURRENT step's routed approver can decide */}
      {isPending && canAct && (
        <div className="sticky bottom-4 z-30 mt-6">
          <div className="rounded-[var(--radius-lg)] border border-hairline bg-surface shadow-[var(--shadow-card)] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-ink-muted">
              {step
                ? isTh
                  ? `รอ${step.labelTh}อนุมัติ`
                  : `Awaiting ${step.labelEn}`
                : isTh ? 'รออนุมัติ' : 'Awaiting approval'}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="md" onClick={() => setMode('approve')}>
                {isTh ? 'อนุมัติ' : 'Approve'}
              </Button>
              <Button variant="danger" size="md" onClick={() => setMode('reject')}>
                {isTh ? 'ปฏิเสธ' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {isPending && !canAct && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-4 py-3 text-sm text-ink-muted">
          {isTh
            ? 'ดูได้อย่างเดียว — คำขอนี้รอผู้อนุมัติในขั้นปัจจุบัน'
            : 'View-only — this request awaits the current-step approver'}
        </div>
      )}

      {/* Confirm modal */}
      {mode && (
        <Modal
          open
          onClose={() => setMode(null)}
          title={
            mode === 'approve'
              ? isTh ? 'ยืนยันการอนุมัติ' : 'Confirm approval'
              : isTh ? 'ยืนยันการปฏิเสธ' : 'Confirm rejection'
          }
        >
          <div className="flex flex-col gap-4 p-4">
            {mode === 'reject' && (
              <FormField label={isTh ? 'เหตุผลที่ปฏิเสธ' : 'Reason for rejection'} required>
                {(controlProps) => (
                  <textarea
                    {...controlProps}
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                )}
              </FormField>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="md" onClick={() => setMode(null)}>
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button
                variant={mode === 'approve' ? 'primary' : 'danger'}
                size="md"
                onClick={confirm}
                disabled={mode === 'reject' && reason.trim().length === 0}
              >
                {isTh ? 'ยืนยัน' : 'Confirm'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--radius-md)] border border-hairline bg-surface px-4 py-2 text-sm text-ink shadow-[var(--shadow-md)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
