'use client';

// /workflows/time-correction/[id] — unified-queue detail page for an employee
// time-correction request (P3 time-corrections store). Read + mock approve/reject
// via the unified APPROVAL_REGISTRY adapter so the source store flips and every
// projection (the /quick-approve list, /requests, /workflows) re-derives live.
// No backend.
//
// Manager (first-line) chain — the routed approver is the team manager (manager+).
// canActOn parity: a non-approver persona sees this VIEW-ONLY (never hidden).
// Phase: UI mockup. Humi tokens only. Danger = pumpkin (--color-danger).

import { use, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { Button, Modal, FormField } from '@/components/humi';
import {
  useTimeCorrections,
  TIME_CORRECTION_STEP_LABEL,
  TIME_CORRECTION_KIND_LABEL,
} from '@/stores/time-corrections';
import { APPROVAL_REGISTRY } from '@/lib/approval-registry';
import { formatDate } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';
import { hasRole } from '@/lib/rbac';

const MANAGER_NAME = 'ผู้จัดการ / Manager';

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

export default function TimeCorrectionDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const locale = useLocale();
  const isTh = locale !== 'en';
  const router = useRouter();

  const request = useTimeCorrections((s) => s.requests.find((r) => r.id === id));
  const roles = useAuthStore((s) => s.roles);
  // Manager+ (first-line approver chain) can act; everyone else view-only.
  const canAct = hasRole(roles, 'manager');

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
      APPROVAL_REGISTRY.time_correction.approve(request.id, { name: MANAGER_NAME });
      showToast(isTh ? 'อนุมัติการแก้ไขเวลาแล้ว' : 'Time correction approved');
    } else {
      APPROVAL_REGISTRY.time_correction.reject(
        request.id,
        { name: MANAGER_NAME },
        reason || (isTh ? 'ปฏิเสธจากคิวอนุมัติ' : 'Rejected from approval queue'),
      );
      showToast(isTh ? 'ปฏิเสธคำขอแล้ว' : 'Time correction rejected');
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

  const isPending = request.status === 'pending_manager';
  const stepLabel = TIME_CORRECTION_STEP_LABEL[request.status];
  const kindLabel = TIME_CORRECTION_KIND_LABEL[request.kind];

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
          <Clock3 className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {isTh ? 'แก้ไขเวลา' : 'Time correction'} · {request.id}
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            {request.employeeName}
          </h1>
          <span className="humi-tag humi-tag--butter mt-1 inline-block text-xs">
            {isTh ? stepLabel.th : stepLabel.en}
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
          <FieldRow label={isTh ? 'แผนก' : 'Department'} value={request.department} />
          <FieldRow label={isTh ? 'ประเภท' : 'Type'} value={isTh ? kindLabel.th : kindLabel.en} />
          <FieldRow
            label={isTh ? 'วันที่' : 'Date'}
            value={formatDate(request.date, 'medium', locale)}
          />
          <FieldRow label={isTh ? 'เวลาเดิม' : 'Original time'} value={request.originalTime ?? '—'} />
          <FieldRow
            label={isTh ? 'เวลาที่ถูกต้อง' : 'Corrected time'}
            value={<span className="font-semibold">{request.correctedTime}</span>}
          />
          <FieldRow label={isTh ? 'เหตุผล' : 'Reason'} value={request.reason} />
          <FieldRow
            label={isTh ? 'วันที่ส่ง' : 'Submitted'}
            value={formatDate(request.submittedAt, 'medium', locale)}
          />
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

      {/* Action surface — only the routed approver (manager+) can decide */}
      {isPending && canAct && (
        <div className="sticky bottom-4 z-30 mt-6">
          <div className="rounded-[var(--radius-lg)] border border-hairline bg-surface shadow-[var(--shadow-card)] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-ink-muted">
              {isTh ? 'รอหัวหน้างานอนุมัติ' : 'Awaiting manager approval'}
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
            ? 'ดูได้อย่างเดียว — คำขอนี้รอการอนุมัติของหัวหน้างาน'
            : 'View-only — this request awaits manager approval'}
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
