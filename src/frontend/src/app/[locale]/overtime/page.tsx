'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { Plus, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Card, CardEyebrow, Button } from '@/components/humi';
import { ApprovalChain } from '@/components/quick-approve/ApprovalChain';
import type { ApproverStage } from '@/data/benefits/plan-registry';
import { useOvertime, type OTRequest, type OTStatus } from '@/hooks/use-overtime';
import { cn } from '@/lib/utils';

// Overtime approval chain: manager only
const OT_CHAIN: ApproverStage[] = ['manager'];

const STATUS_STYLE: Record<OTStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
  completed: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-danger-soft text-danger-ink border border-danger',
  cancelled: 'bg-surface-raised text-ink-muted border border-hairline',
};

const STATUS_LABEL_TH: Record<OTStatus, string> = {
  pending: 'รอหัวหน้าอนุมัติ',
  approved: 'อนุมัติแล้ว',
  completed: 'เสร็จสิ้น',
  rejected: 'ถูกปฏิเสธ',
  cancelled: 'ยกเลิก',
};

const STATUS_LABEL_EN: Record<OTStatus, string> = {
  pending: 'Pending Manager',
  approved: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

// Mock audit per request ID
const OT_AUDIT: Record<string, Array<{ actorName: string; action: string; comment?: string; at: string }>> = {
  OT001: [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-02-17T09:00:00Z' },
    { actorName: 'Surachai P.', action: 'approve', comment: 'Approved — project critical', at: '2026-02-17T14:00:00Z' },
  ],
  OT002: [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-02-20T09:00:00Z' },
  ],
  OT003: [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-02-09T09:00:00Z' },
    { actorName: 'Surachai P.', action: 'approve', at: '2026-02-09T16:00:00Z' },
  ],
  OT004: [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-01-27T09:00:00Z' },
    { actorName: 'Surachai P.', action: 'reject', comment: 'ไม่เป็นไปตามเงื่อนไข OT', at: '2026-01-27T17:00:00Z' },
  ],
};

// Extra mock entries shown when store is empty
const MOCK_EXTRA: OTRequest[] = [
  {
    id: 'OT-DEMO-001',
    date: '2026-04-30',
    startTime: '18:00',
    endTime: '21:00',
    totalHours: 3,
    type: 'weekday',
    reason: 'ปิดงบ Quarter สิ้นเดือน',
    status: 'pending',
    estimatedAmount: 1125,
    submittedAt: '2026-04-27',
  },
  {
    id: 'OT-DEMO-002',
    date: '2026-04-12',
    startTime: '09:00',
    endTime: '14:00',
    totalHours: 5,
    type: 'weekend',
    reason: 'ตรวจสต็อกประจำเดือน',
    status: 'approved',
    estimatedAmount: 3000,
    approvedBy: 'Surachai P.',
    submittedAt: '2026-04-10',
  },
  {
    id: 'OT-DEMO-003',
    date: '2026-03-25',
    startTime: '18:00',
    endTime: '20:00',
    totalHours: 2,
    type: 'weekday',
    reason: 'เตรียมข้อมูลนำเสนอผู้บริหาร',
    status: 'rejected',
    estimatedAmount: 750,
    submittedAt: '2026-03-22',
  },
];

const OT_AUDIT_DEMO: Record<string, typeof OT_AUDIT[string]> = {
  'OT-DEMO-001': [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-04-27T17:00:00Z' },
  ],
  'OT-DEMO-002': [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-04-10T09:00:00Z' },
    { actorName: 'Surachai P.', action: 'approve', at: '2026-04-11T08:30:00Z' },
  ],
  'OT-DEMO-003': [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-03-22T16:00:00Z' },
    { actorName: 'Surachai P.', action: 'reject', comment: 'ไม่ได้ขออนุมัติล่วงหน้าตามระเบียบ', at: '2026-03-23T09:00:00Z' },
  ],
};

function daysWaiting(submittedAt: string): number {
  const d = new Date(submittedAt.length === 10 ? submittedAt + 'T00:00:00Z' : submittedAt);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function dotColor(action: string) {
  if (action === 'approve') return 'bg-success';
  if (action === 'reject') return 'bg-danger';
  return 'bg-accent-soft';
}

function OTRow({
  req,
  locale,
  auditMap,
  onCancel,
}: {
  req: OTRequest;
  locale: string;
  auditMap: Record<string, Array<{ actorName: string; action: string; comment?: string; at: string }>>;
  onCancel?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const days = daysWaiting(req.submittedAt);
  const audit = auditMap[req.id];
  const activeStage: ApproverStage | undefined = req.status === 'pending' ? 'manager' : undefined;
  const statusLabel = locale === 'th' ? STATUS_LABEL_TH[req.status] : STATUS_LABEL_EN[req.status];

  const actionLabel = (action: string) => {
    if (action === 'submit') return locale === 'th' ? 'ส่งคำขอ' : 'Submitted';
    if (action === 'approve') return locale === 'th' ? 'อนุมัติ' : 'Approved';
    if (action === 'reject') return locale === 'th' ? 'ปฏิเสธ' : 'Rejected';
    return action;
  };

  return (
    <li className="humi-card" style={{ padding: 16 }}>
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="humi-eyebrow mb-0.5">{req.id}</div>
            <p className="text-body font-semibold text-ink">
              {req.date} · {req.startTime}–{req.endTime} · {req.totalHours}h
            </p>
            <p className="text-small text-ink-muted mt-0.5">{req.reason}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', STATUS_STYLE[req.status])}>
              {statusLabel}
            </span>
            {req.status === 'pending' && (
              <span className={cn('text-xs font-mono', days > 3 ? 'text-amber-600 font-semibold' : 'text-ink-muted')}>
                {days} {locale === 'th' ? 'ด. รอ' : 'd. waiting'}
              </span>
            )}
          </div>
        </div>

        {/* Approval chain */}
        <ApprovalChain chain={OT_CHAIN} locale={locale} activeStage={activeStage} size="sm" />

        {/* Audit toggle */}
        {audit && audit.length > 0 && (
          <>
            <button
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
              {locale === 'th' ? 'ประวัติการดำเนินการ' : 'Audit history'}
            </button>
            {expanded && (
              <ol className="space-y-2 pl-2">
                {audit.map((entry, idx) => (
                  <li key={idx} className="flex gap-3 text-xs">
                    <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', dotColor(entry.action))} />
                    <div>
                      <span className="font-medium text-ink">{entry.actorName}</span>
                      {' '}
                      <span className="text-ink-muted">{actionLabel(entry.action)}</span>
                      <span className="ml-2 text-ink-faint">{formatDateTime(entry.at)}</span>
                      {entry.comment && (
                        <p className="text-ink-muted mt-0.5 italic">&ldquo;{entry.comment}&rdquo;</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        {/* Cancel action */}
        {req.status === 'pending' && onCancel && (
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => onCancel(req.id)}>
              {locale === 'th' ? 'ยกเลิกคำขอ' : 'Cancel Request'}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function OvertimePage() {
  const locale = useLocale();
  const t = useTranslations('overtime');
  const { requests, loading, stats, submitRequest, cancelRequest } = useOvertime();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', startTime: '18:00', endTime: '20:00', reason: '' });

  const displayRequests = requests.length > 0 ? requests : MOCK_EXTRA;
  const auditMap = requests.length > 0 ? OT_AUDIT : OT_AUDIT_DEMO;
  const pendingCount = displayRequests.filter((r) => r.status === 'pending').length;

  async function handleSubmit() {
    if (!form.date || !form.reason) return;
    const hours = parseInt(form.endTime) - parseInt(form.startTime);
    await submitRequest({
      date: form.date, startTime: form.startTime, endTime: form.endTime,
      totalHours: Math.max(hours, 1), type: 'weekday', reason: form.reason,
      estimatedAmount: Math.max(hours, 1) * 250 * 1.5,
    });
    setForm({ date: '', startTime: '18:00', endTime: '20:00', reason: '' });
    setShowForm(false);
  }

  return (
    <div className="pb-8 flex flex-col gap-6">
      {/* Header */}
      <header className="humi-page-head">
        <div className="flex flex-col gap-1">
          <CardEyebrow>{locale === 'th' ? 'การทำงาน · OT' : 'Work · Overtime'}</CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            {locale === 'th' ? 'คำขอทำงานล่วงเวลา' : 'Overtime Requests'}
          </h1>
          <p className="text-small text-ink-muted mt-1">
            {locale === 'th'
              ? 'ยื่นคำขอ · ติดตามสถานะ · ประวัติ OT'
              : 'Submit requests · Track status · OT history'}
          </p>
        </div>
        <div className="humi-spacer" />
        <Button variant="primary" leadingIcon={<Plus size={16} />} onClick={() => setShowForm((v) => !v)}>
          {locale === 'th' ? 'ยื่นคำขอ OT' : 'New OT Request'}
        </Button>
      </header>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {pendingCount > 0 && (
          <span className="rounded-full px-3 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            {locale === 'th' ? 'รออนุมัติ' : 'Pending'} · {pendingCount}
          </span>
        )}
        {stats.approvedCount > 0 && (
          <span className="rounded-full px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            {locale === 'th' ? 'อนุมัติแล้ว' : 'Approved'} · {stats.approvedCount}
          </span>
        )}
        <span className="rounded-full px-3 py-1 text-xs font-medium bg-surface-raised text-ink-muted border border-hairline">
          <Clock size={11} className="inline mr-1" aria-hidden />
          {stats.weeklyHours}h / {stats.maxWeeklyHours}h {locale === 'th' ? 'สัปดาห์นี้' : 'this week'}
        </span>
      </div>

      {/* Approval chain info */}
      <div className="flex flex-col gap-1.5">
        <p className="text-small font-medium text-ink-muted">
          {locale === 'th' ? 'ขั้นตอนอนุมัติ' : 'Approval chain'}
        </p>
        <ApprovalChain chain={OT_CHAIN} locale={locale} size="md" />
      </div>

      {/* Quick submit form */}
      {showForm && (
        <Card variant="raised" size="lg">
          <h2 className="font-semibold text-ink mb-4">
            {locale === 'th' ? 'ยื่นคำขอทำงานล่วงเวลา' : 'Submit OT Request'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-small font-medium text-ink-soft">
                {locale === 'th' ? 'วันที่ *' : 'Date *'}
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-small font-medium text-ink-soft">
                  {locale === 'th' ? 'เริ่ม' : 'Start'}
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-small font-medium text-ink-soft">
                  {locale === 'th' ? 'สิ้นสุด' : 'End'}
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-small font-medium text-ink-soft">
                {locale === 'th' ? 'เหตุผล *' : 'Reason *'}
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                rows={2}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 resize-none"
                placeholder={locale === 'th' ? 'ระบุเหตุผลการทำ OT' : 'Describe the reason for OT'}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!form.date || !form.reason}>
              {locale === 'th' ? 'ส่งคำขอ' : 'Submit'}
            </Button>
          </div>
        </Card>
      )}

      {/* Request list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="humi-card animate-pulse" style={{ padding: 16, minHeight: 80 }} />
          ))}
        </div>
      ) : displayRequests.length === 0 ? (
        <div className="humi-card humi-card--cream" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-body text-ink-muted">
            {locale === 'th' ? 'ยังไม่มีคำขอ OT' : 'No OT requests yet'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={locale === 'th' ? 'รายการคำขอ OT' : 'OT requests'}>
          {displayRequests.map((req) => (
            <OTRow
              key={req.id}
              req={req}
              locale={locale}
              auditMap={auditMap}
              onCancel={requests.length > 0 ? cancelRequest : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
