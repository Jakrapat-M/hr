'use client';

// /workflows/tax-planning/[id] — unified-queue detail page for a tax-planning
// Payroll-review request (benefit-tax-planning store). Read + mock approve/reject
// via the unified APPROVAL_REGISTRY adapter so the source store flips and every
// projection re-derives live. No backend.
//
// Phase: UI mockup. Humi tokens only. Danger = pumpkin (--color-danger).
// Sensitive tax id stays masked (maskTaxId / store maskedTaxId).

import { use, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calculator } from 'lucide-react';
import { Button, Modal, FormField } from '@/components/humi';
import {
  useBenefitTaxPlanningStore,
  TAX_PLANNING_STATUS_LABEL,
  formatTHB,
} from '@/stores/benefit-tax-planning';
import { APPROVAL_REGISTRY } from '@/lib/approval-registry';
import { formatDate } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole } from '@/lib/rbac';

const PAYROLL_NAME = 'ทีม Payroll';
// Tax-planning Payroll review is acted on by Payroll-capable senior approvers in
// the mock (SPD / HR Admin / HR Manager). Mirror the unified-inbox canActOn gate.
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

export default function TaxPlanningDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const locale = useLocale();
  const isTh = locale !== 'en';
  const router = useRouter();

  const draft = useBenefitTaxPlanningStore((s) => s.drafts.find((d) => d.id === id));
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
    if (!draft || !mode) return;
    if (mode === 'approve') {
      APPROVAL_REGISTRY.tax_planning.approve(draft.id, { name: PAYROLL_NAME, role: 'spd' });
      showToast(isTh ? 'Payroll รับทราบแผนภาษีแล้ว' : 'Tax plan acknowledged');
    } else {
      APPROVAL_REGISTRY.tax_planning.reject(
        draft.id,
        { name: PAYROLL_NAME, role: 'spd' },
        reason || (isTh ? 'ไม่รับแผนภาษี' : 'Tax plan not accepted'),
      );
      showToast(isTh ? 'ไม่รับแผนภาษี' : 'Tax plan rejected');
    }
    setMode(null);
    setReason('');
  }

  if (!draft) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-base font-semibold text-ink">{isTh ? 'ไม่พบแผนภาษี' : 'Tax plan not found'}</p>
        <p className="text-sm text-ink-muted">{isTh ? `ไม่พบรหัส ${id}` : `No tax plan with ID ${id}`}</p>
        <Button variant="secondary" size="md" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" aria-hidden />
          {isTh ? 'กลับ' : 'Back'}
        </Button>
      </div>
    );
  }

  const isPending = draft.status === 'submitted_payroll' || draft.status === 'payroll_reviewing';
  const estimate = draft.estimate;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-ink-muted mb-4" aria-label="breadcrumb">
        <Link href={`/${locale}/quick-approve`} className="hover:text-ink transition">
          {isTh ? 'คิวอนุมัติ' : 'Approvals'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-ink font-medium">{draft.id}</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] bg-accent-soft text-accent">
          <Calculator className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {isTh ? 'วางแผนภาษี · Payroll review' : 'Tax planning · Payroll review'} · {draft.id}
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            {draft.employeeName}
          </h1>
          <span className="humi-tag humi-tag--butter mt-1 inline-block text-xs">
            {TAX_PLANNING_STATUS_LABEL[draft.status]}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-[var(--radius-md)] border border-hairline bg-surface shadow-[var(--shadow-card)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {isTh ? 'รายละเอียดแผนภาษี' : 'Tax plan details'}
        </p>
        <div className="divide-y divide-hairline">
          <FieldRow label={isTh ? 'รหัสพนักงาน' : 'Employee ID'} value={draft.employeeId} />
          <FieldRow label={isTh ? 'เลขประจำตัวผู้เสียภาษี' : 'Tax ID'} value={draft.maskedTaxId} />
          <FieldRow label={isTh ? 'ปีภาษี' : 'Tax year'} value={draft.taxYear} />
          {estimate && (
            <>
              <FieldRow
                label={isTh ? 'รายได้ต่อปี (ประมาณ)' : 'Gross annual income'}
                value={formatTHB(estimate.grossAnnualIncome)}
              />
              <FieldRow
                label={isTh ? 'ค่าลดหย่อนรวม' : 'Total deductions'}
                value={formatTHB(estimate.totalDeductions)}
              />
              <FieldRow
                label={isTh ? 'ภาษีประมาณการ' : 'Estimated tax'}
                value={<span className="font-semibold">{formatTHB(estimate.estimatedTax)}</span>}
              />
              <FieldRow
                label={isTh ? 'ยอดที่ต้องชำระเพิ่ม / คืน' : 'Balance due / refund'}
                value={
                  estimate.remainingDue > 0
                    ? `${isTh ? 'ชำระเพิ่ม' : 'Due'} ${formatTHB(estimate.remainingDue)}`
                    : `${isTh ? 'คืน' : 'Refund'} ${formatTHB(estimate.refund)}`
                }
              />
            </>
          )}
          {draft.correctionReason && (
            <FieldRow label={isTh ? 'เหตุผลที่ส่งกลับ' : 'Send-back reason'} value={draft.correctionReason} />
          )}
          {draft.rejectionReason && (
            <FieldRow label={isTh ? 'เหตุผลที่ไม่รับ' : 'Rejection reason'} value={draft.rejectionReason} />
          )}
        </div>
      </div>

      {/* Audit timeline */}
      <div className="mt-4 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {isTh ? 'ประวัติการดำเนินการ' : 'History'}
        </p>
        <div className="flex flex-col gap-3">
          {draft.audit.map((entry, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">
                  {entry.action} · {entry.actorName}
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  {formatDate(entry.at, 'medium', locale)}
                  {entry.note ? ` — ${entry.note}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action surface — only the routed Payroll approver can decide */}
      {isPending && canAct && (
        <div className="sticky bottom-4 z-30 mt-6">
          <div className="rounded-[var(--radius-lg)] border border-hairline bg-surface shadow-[var(--shadow-card)] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-ink-muted">
              {isTh ? 'รอ Payroll ตรวจแผน' : 'Awaiting Payroll review'}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="md" onClick={() => setMode('approve')}>
                {isTh ? 'รับทราบแผน' : 'Acknowledge'}
              </Button>
              <Button variant="danger" size="md" onClick={() => setMode('reject')}>
                {isTh ? 'ไม่รับแผน' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {isPending && !canAct && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-4 py-3 text-sm text-ink-muted">
          {isTh
            ? 'ดูได้อย่างเดียว — แผนนี้รอ Payroll ตรวจ'
            : 'View-only — this plan awaits Payroll review'}
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
                ? 'ยืนยันการรับทราบแผน'
                : 'Confirm acknowledgement'
              : isTh
                ? 'ยืนยันการไม่รับแผน'
                : 'Confirm rejection'
          }
        >
          <div className="flex flex-col gap-4 p-4">
            {mode === 'reject' && (
              <FormField label={isTh ? 'เหตุผล' : 'Reason'} required>
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
