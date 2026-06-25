'use client';

// /overtime — Group B ESS OT (overtime) submit + status list.
//
// Employee self-service: submit an OT request, track its status. Approval moves
// OUT of this page to /quick-approve + /workflows/ot/[id] (no inline approve/
// reject here). Driven by the dedicated overtime-requests Zustand store.
//
// Cross-midnight entry: separate start date+time and end date+time inputs so a
// shift like 1 Jun 23:00 → 2 Jun 02:00 is enterable; computed OT hours render
// live (computeOtHours wraps past midnight).
//
// Single validate point gates submit on (B2/B4):
//   • OT-flag gate — getEmployeeTimeAttrs(empId).otEligible === false.
//   • overlap with the employee's own pending/approved OT.
//   • outside the current payroll period (isWithinCurrentPeriod).
//   • OT+Leave overlap (scan the leave-approvals store).
//   • monthly OT cap exceeded (monthlyOtTotal + requested > MONTHLY_OT_CAP_HOURS).
// All errors render in pumpkin (--color-danger). Humi tokens only. No backend.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Clock, ChevronRight } from 'lucide-react';
import { Card, CardEyebrow, Button } from '@/components/humi';
import { FileUploadField } from '@/components/humi/FileUploadField';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  useOvertimeRequests,
  OT_STATUS_LABEL,
  type OTStatus,
  type OTRequest,
} from '@/stores/overtime-requests';
import { OT_TYPES, type OtTypeCode } from '@/lib/time/ot-types';
import { computeOtHours, monthlyOtTotal, MONTHLY_OT_CAP_HOURS } from '@/lib/time/ot-math';
import { isWithinCurrentPeriod } from '@/lib/time/period';
import { getEmployeeTimeAttrs } from '@/lib/time/employee-time-attrs';
import { useLeaveApprovals } from '@/stores/leave-approvals';

// Fall back to the demo employee (EMP001 — seeded quota + attrs) when the live
// persona has no concrete id, so the gates stay demoable.
const DEMO_EMPLOYEE = { id: 'EMP001', name: 'พิมพ์ชนก ศรีวัฒน์', department: 'Store' };

const STATUS_STYLE: Record<OTStatus, string> = {
  pending: 'bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border border-[color:var(--color-warning)]',
  approved: 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border border-[color:var(--color-success)]',
  rejected: 'bg-danger-soft text-danger-ink border border-danger',
};

function combineDateTime(date: string, time: string): string {
  if (!date || !time) return '';
  return `${date}T${time}:00`;
}

/** Two OT windows overlap when start < other.end AND other.start < end. */
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = new Date(aStart).getTime();
  let ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  let be = new Date(bEnd).getTime();
  if ([as, ae, bs, be].some(Number.isNaN)) return false;
  // Normalize cross-midnight ends so the comparison stays a simple interval test.
  if (ae <= as) ae += 24 * 60 * 60 * 1000;
  if (be <= bs) be += 24 * 60 * 60 * 1000;
  return as < be && bs < ae;
}

function OTRow({ req, locale }: { req: OTRequest; locale: string }) {
  const isTh = locale !== 'en';
  const otDef = OT_TYPES.find((t) => t.code === req.otType);
  const otLabel = (isTh ? otDef?.nameTh : otDef?.nameEn) ?? req.otType;
  const statusLabel = isTh ? OT_STATUS_LABEL[req.status].th : OT_STATUS_LABEL[req.status].en;
  const start = new Date(req.startAt);
  const end = new Date(req.endAt);
  const fmt = (d: Date) =>
    d.toLocaleString(isTh ? 'th-TH' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  return (
    <li className="humi-card" style={{ padding: 16 }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="humi-eyebrow mb-0.5">{req.id}</div>
          <p className="text-body font-semibold text-ink">
            {otLabel} · {req.hours}h
          </p>
          <p className="text-small text-ink-muted mt-0.5">
            {fmt(start)} → {fmt(end)}
          </p>
          {req.reason && <p className="text-small text-ink-muted mt-0.5">{req.reason}</p>}
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
            STATUS_STYLE[req.status],
          )}
        >
          {statusLabel}
        </span>
      </div>
    </li>
  );
}

export default function OvertimePage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const empId = userId ?? DEMO_EMPLOYEE.id;
  const empName = username ?? DEMO_EMPLOYEE.name;

  const allRequests = useOvertimeRequests((s) => s.requests);
  const addRequest = useOvertimeRequests((s) => s.addRequest);
  const leaveRequests = useLeaveApprovals((s) => s.requests);

  const myRequests = useMemo(
    () => allRequests.filter((r) => r.employeeId === empId),
    [allRequests, empId],
  );

  // STA-149 — open on the request FORM by default; the status list lives in a
  // secondary "Status" tab (single control model — no separate show/hide button).
  const [activeTab, setActiveTab] = useState<'request' | 'status'>('request');
  const [form, setForm] = useState({
    otType: 'OT' as OtTypeCode,
    startDate: '',
    startTime: '18:00',
    endDate: '',
    endTime: '20:00',
    reason: '',
    attachmentId: null as string | null,
  });
  const [error, setError] = useState<string | null>(null);

  const attrs = getEmployeeTimeAttrs(empId);

  const startAt = combineDateTime(form.startDate, form.startTime);
  const endAt = combineDateTime(form.endDate || form.startDate, form.endTime);
  const liveHours = startAt && endAt ? computeOtHours(startAt, endAt) : 0;

  // SINGLE validate point (B2/B4). Returns a localized message or null.
  function validate(): string | null {
    if (!attrs.otEligible) {
      return isTh ? 'ไม่มีสิทธิ์ขอ OT' : 'Not eligible for OT';
    }
    if (!form.startDate || !form.reason.trim()) {
      return isTh ? 'กรุณากรอกวันที่และเหตุผล' : 'Please enter a date and reason';
    }
    if (!startAt || !endAt || liveHours <= 0) {
      return isTh ? 'ช่วงเวลาไม่ถูกต้อง' : 'Invalid time range';
    }
    const day = startAt.slice(0, 10);
    if (!isWithinCurrentPeriod(day)) {
      return isTh
        ? 'วันที่อยู่นอกรอบจ่ายเงินเดือนปัจจุบัน'
        : 'Date is outside the current payroll period';
    }
    // Overlap with the employee's own pending/approved OT.
    const hasOtOverlap = myRequests
      .filter((r) => r.status === 'pending' || r.status === 'approved')
      .some((r) => overlaps(startAt, endAt, r.startAt, r.endAt));
    if (hasOtOverlap) {
      return isTh ? 'ช่วงเวลาทับซ้อนกับคำขอ OT เดิม' : 'Overlaps with an existing OT request';
    }
    // OT + Leave overlap (same calendar day, pending/approved leave).
    const hasLeaveOverlap = leaveRequests
      .filter((r) => r.employeeId === empId && r.status !== 'rejected')
      .some((r) => day >= r.startDate && day <= r.endDate);
    if (hasLeaveOverlap) {
      return isTh ? 'วันที่ทับซ้อนกับวันลา' : 'Overlaps with a leave request';
    }
    // Monthly cap.
    const monthTotal = monthlyOtTotal(myRequests, empId);
    if (monthTotal + liveHours > MONTHLY_OT_CAP_HOURS) {
      return isTh
        ? `เกินเพดาน OT รายเดือน (${monthTotal + liveHours}/${MONTHLY_OT_CAP_HOURS} ชม.)`
        : `Exceeds monthly OT cap (${monthTotal + liveHours}/${MONTHLY_OT_CAP_HOURS}h)`;
    }
    return null;
  }

  function handleSubmit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    addRequest({
      employeeId: empId,
      employeeName: empName,
      department: DEMO_EMPLOYEE.department,
      otType: form.otType,
      startAt,
      endAt,
      hours: liveHours,
      reason: form.reason.trim(),
      docs: form.attachmentId ? [form.attachmentId] : [],
    });
    setForm({ otType: 'OT', startDate: '', startTime: '18:00', endDate: '', endTime: '20:00', reason: '', attachmentId: null });
    setError(null);
    setActiveTab('status'); // STA-149 — jump to the status list to show the new request
  }

  const pendingCount = myRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = myRequests.filter((r) => r.status === 'approved').length;
  const monthTotal = monthlyOtTotal(myRequests, empId);

  return (
    <div className="pb-8 flex flex-col gap-6">
      {/* Breadcrumb — back to the Time hub (parent), matching /time/corrections */}
      <nav className="flex items-center gap-1 text-xs text-ink-muted" aria-label="breadcrumb">
        <Link href={`/${locale}/time`} className="hover:text-ink transition">
          {isTh ? 'เวลางาน' : 'Time'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-ink font-medium">
          {isTh ? 'คำขอทำงานล่วงเวลา' : 'Overtime Requests'}
        </span>
      </nav>

      {/* Header */}
      <header className="humi-page-head">
        <div className="flex flex-col gap-1">
          <CardEyebrow>{isTh ? 'การทำงาน · OT' : 'Work · Overtime'}</CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            {isTh ? 'คำขอทำงานล่วงเวลา' : 'Overtime Requests'}
          </h1>
          <p className="text-small text-ink-muted mt-1">
            {isTh ? 'ยื่นคำขอ · ติดตามสถานะ OT' : 'Submit requests · Track OT status'}
          </p>
        </div>
      </header>

      {/* STA-149 — Request / Status tabs (Request is the default view). */}
      <div role="tablist" aria-label={isTh ? 'มุมมอง OT' : 'OT views'} className="flex gap-1 border-b border-hairline">
        {([
          { key: 'request' as const, label: isTh ? 'ยื่นคำขอ' : 'Request' },
          { key: 'status' as const, label: `${isTh ? 'สถานะ' : 'Status'}${myRequests.length > 0 ? ` (${myRequests.length})` : ''}` },
        ]).map((tab) => (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.key}
            onClick={() => { setActiveTab(tab.key); setError(null); }}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-small font-medium transition-colors',
              activeTab === tab.key
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OT-flag gate banner (B2) */}
      {!attrs.otEligible && (
        <div className="rounded-[var(--radius-md)] border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-ink">
          {isTh ? 'ไม่มีสิทธิ์ขอ OT' : 'Not eligible for OT'}
        </div>
      )}

      {/* Summary chips (Status tab) */}
      {activeTab === 'status' && (
      <div className="flex gap-3 flex-wrap">
        {pendingCount > 0 && (
          <span className="rounded-full px-3 py-1 text-xs font-medium bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border border-[color:var(--color-warning)]">
            {isTh ? 'รออนุมัติ' : 'Pending'} · {pendingCount}
          </span>
        )}
        {approvedCount > 0 && (
          <span className="rounded-full px-3 py-1 text-xs font-medium bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border border-[color:var(--color-success)]">
            {isTh ? 'อนุมัติแล้ว' : 'Approved'} · {approvedCount}
          </span>
        )}
        <span className="rounded-full px-3 py-1 text-xs font-medium bg-surface-raised text-ink-muted border border-hairline">
          <Clock size={11} className="inline mr-1" aria-hidden />
          {monthTotal}h / {MONTHLY_OT_CAP_HOURS}h {isTh ? 'รอบนี้' : 'this period'}
        </span>
      </div>
      )}

      {/* Submit form (Request tab — default) */}
      {activeTab === 'request' && (
        <Card variant="raised" size="lg">
          <h2 className="font-semibold text-ink mb-4">
            {isTh ? 'ยื่นคำขอทำงานล่วงเวลา' : 'Submit OT Request'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* OT type */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-small font-medium text-ink-soft">
                {isTh ? 'ประเภท OT' : 'OT type'}
              </label>
              <select
                value={form.otType}
                onChange={(e) => setForm((p) => ({ ...p, otType: e.target.value as OtTypeCode }))}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {OT_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {isTh ? t.nameTh : t.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Start date + time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-small font-medium text-ink-soft">
                {isTh ? 'วันที่เริ่ม *' : 'Start date *'}
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-small font-medium text-ink-soft">
                {isTh ? 'เวลาเริ่ม' : 'Start time'}
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              />
            </div>

            {/* End date + time (separate date enables cross-midnight) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-small font-medium text-ink-soft">
                {isTh ? 'วันที่สิ้นสุด' : 'End date'}
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                placeholder={form.startDate}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-small font-medium text-ink-soft">
                {isTh ? 'เวลาสิ้นสุด' : 'End time'}
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              />
            </div>

            {/* Live computed hours */}
            <div className="sm:col-span-2 flex items-center gap-2 text-small text-ink-muted">
              <Clock size={14} aria-hidden />
              {isTh ? 'จำนวนชั่วโมง OT:' : 'Computed OT hours:'}{' '}
              <span className="font-semibold text-ink">{liveHours}</span> {isTh ? 'ชม.' : 'h'}
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-small font-medium text-ink-soft">
                {isTh ? 'เหตุผล *' : 'Reason *'}
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                rows={2}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 resize-none"
                placeholder={isTh ? 'ระบุเหตุผลการทำ OT' : 'Describe the reason for OT'}
              />
            </div>
          </div>

          {/* Optional document attachment (single file) */}
          <div className="mt-4">
            <FileUploadField
              label={isTh ? 'เอกสารแนบ (ไม่บังคับ)' : 'Attachment (optional)'}
              maxFiles={1}
              onUpload={(id) => setForm((p) => ({ ...p, attachmentId: id }))}
              onRemove={() => setForm((p) => ({ ...p, attachmentId: null }))}
            />
          </div>

          {/* Inline validation error (pumpkin) */}
          {error && (
            <div className="mt-3 rounded-[var(--radius-md)] border border-danger bg-danger-soft px-3 py-2 text-sm text-danger-ink">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setForm({ otType: 'OT', startDate: '', startTime: '18:00', endDate: '', endTime: '20:00', reason: '', attachmentId: null });
                setError(null);
                setActiveTab('status');
              }}
            >
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!attrs.otEligible}>
              {isTh ? 'ส่งคำขอ' : 'Submit'}
            </Button>
          </div>
        </Card>
      )}

      {/* Request list (Status tab) */}
      {activeTab === 'status' && (myRequests.length === 0 ? (
        <div className="humi-card humi-card--cream" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-body text-ink-muted">
            {isTh ? 'ยังไม่มีคำขอ OT' : 'No OT requests yet'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={isTh ? 'รายการคำขอ OT' : 'OT requests'}>
          {myRequests.map((req) => (
            <OTRow key={req.id} req={req} locale={locale} />
          ))}
        </ul>
      ))}
    </div>
  );
}
