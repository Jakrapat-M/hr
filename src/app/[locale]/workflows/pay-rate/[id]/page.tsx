'use client';

// /workflows/pay-rate/[id] — unified-queue detail page for a pay-rate-change
// request (STA-24 pay-rate-approvals store). Read + mock approve/reject via the
// unified APPROVAL_REGISTRY adapter so the source store flips and every projection
// (the /quick-approve list, /requests, /workflows) re-derives live. No backend.
//
// Phase: UI mockup. Cnext tokens only. Danger = pumpkin (--color-danger).

import { use, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { Button, Modal, FormField } from '@/components/cnext';
import { usePayRateApprovals, PAY_RATE_STEP_LABEL } from '@/stores/pay-rate-approvals';
import { APPROVAL_REGISTRY } from '@/lib/approval-registry';
import { formatDate } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole } from '@/lib/rbac';

const MANAGER_NAME = 'ผู้จัดการ / Manager';
// SPD-chain: pay-rate is approved by SPD / HR Admin / HR Manager (not a plain
// manager). Mirror the unified-inbox canActOn gate for the detail action surface.
const ACTOR_ROLES = ['spd', 'hr_admin', 'hr_manager'] as const;

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

export default function PayRateDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const locale = useLocale();
  const isTh = locale !== 'en';
  const router = useRouter();

  const request = usePayRateApprovals((s) => s.requests.find((r) => r.id === id));
  const roles = useAuthStore((s) => s.roles);
  const canAct = hasAnyRole(roles, [...ACTOR_ROLES]);

  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function confirm() {
    if (!request || !mode) return;
    if (mode === 'approve') {
      APPROVAL_REGISTRY.pay_rate.approve(request.id, { name: MANAGER_NAME, role: 'spd' });
      showToast(isTh ? 'อนุมัติคำขอปรับเงินเดือนแล้ว' : 'Pay-rate request approved');
    } else {
      APPROVAL_REGISTRY.pay_rate.reject(
        request.id,
        { name: MANAGER_NAME, role: 'spd' },
        reason || (isTh ? 'ปฏิเสธจากคิวอนุมัติ' : 'Rejected from approval queue'),
      );
      showToast(isTh ? 'ปฏิเสธคำขอแล้ว' : 'Pay-rate request rejected');
    }
    setMode(null);
    setReason('');
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

  const isPending = request.status === 'pending_spd';
  const amountLabel =
    request.amountType === 'percent'
      ? `${request.amount}%`
      : `฿${request.amount.toLocaleString('th-TH')}`;

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
          <Wallet className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {isTh ? 'ปรับเงินเดือน' : 'Pay-rate change'} · {request.id}
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            {request.employeeName}
          </h1>
          <span className="cnext-tag cnext-tag--butter mt-1 inline-block text-xs">
            {PAY_RATE_STEP_LABEL[request.status]}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-[var(--radius-md)] border border-hairline bg-surface shadow-[var(--shadow-card)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {isTh ? 'รายละเอียดคำขอ' : 'Request details'}
        </p>
        <div className="divide-y divide-hairline">
          <FieldRow label={isTh ? 'รหัสพนักงาน' : 'Employee ID'} value={request.employeeId} />
          <FieldRow label={isTh ? 'องค์ประกอบเงินเดือน' : 'Pay component'} value={request.payComponent} />
          <FieldRow label={isTh ? 'กลุ่มจ่ายเงิน' : 'Pay group'} value={request.payGroup} />
          <FieldRow
            label={isTh ? 'จำนวน' : 'Amount'}
            value={<span className="font-semibold">{amountLabel}</span>}
          />
          <FieldRow label={isTh ? 'เหตุผล (รหัส)' : 'Event reason'} value={request.eventReasonCode} />
          <FieldRow
            label={isTh ? 'วันที่มีผล' : 'Effective date'}
            value={formatDate(request.effectiveDate, 'medium', locale)}
          />
          <FieldRow
            label={isTh ? 'วันที่ส่ง' : 'Submitted'}
            value={formatDate(request.submittedAt, 'medium', locale)}
          />
          {request.notes && <FieldRow label={isTh ? 'หมายเหตุ' : 'Notes'} value={request.notes} />}
        </div>
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

      {/* Action surface — only the routed approver (SPD-chain) can decide */}
      {isPending && canAct && (
        <div className="sticky bottom-4 z-30 mt-6">
          <div className="rounded-[var(--radius-lg)] border border-hairline bg-surface shadow-[var(--shadow-card)] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-ink-muted">
              {isTh ? 'รอการอนุมัติของ SPD' : 'Awaiting SPD approval'}
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
            ? 'ดูได้อย่างเดียว — คำขอนี้รอการอนุมัติของ SPD'
            : 'View-only — this request awaits SPD approval'}
        </div>
      )}

      {/* Confirm modal */}
      {mode && (
        <Modal
          open
          onClose={() => setMode(null)}
          title={
            mode === 'approve'
              ? isTh
                ? 'ยืนยันการอนุมัติ'
                : 'Confirm approval'
              : isTh
                ? 'ยืนยันการปฏิเสธ'
                : 'Confirm rejection'
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
