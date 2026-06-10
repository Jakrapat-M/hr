'use client';

// /workflows/resignation/[id] — Manager "อนุมัติการลาออก" (resignation approval).
// Recreates the approved Offboard_Manager design (mod-offboard.jsx) in Next.js +
// Humi tokens. Reads the TerminationRequest from termination-approvals, and on a
// decision dispatches approveByManager / reject, then routes back to /quick-approve.
//
// Stage 08 directives (verbatim): always use the word "ลาออก" / resignation in
// every user-facing string. No red — danger = pumpkin (--color-danger). Bilingual
// TH/EN via the locale param. Phase: UI mockup, client-side only, no backend.

import { use, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  MessageCircle,
  Plus,
  Users,
  X,
} from 'lucide-react';
import {
  useTerminationApprovals,
  TERMINATION_REASON_LABEL,
  type TerminationRequest,
} from '@/stores/termination-approvals';
import { formatDate } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/rbac';

const APPROVER_NAME = 'ผู้จัดการ / Manager';

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

type Decision = 'approve' | 'discuss' | null;

// ── Avatar initials ────────────────────────────────────────────────────────────
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.round(ms / 86400000);
}

// ── Eyebrow ─────────────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
      {children}
    </div>
  );
}

// ── Timeline metric cell ─────────────────────────────────────────────────────────
function Metric({
  label,
  value,
  sub,
  accent,
  last,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`px-3.5 leading-tight ${last ? '' : 'border-r border-hairline-soft'}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-lg font-semibold tracking-tight ${
          accent ? 'text-accent' : 'text-ink'
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}

// ── Decision choice card ─────────────────────────────────────────────────────────
function DecisionCard({
  active,
  onClick,
  title,
  sub,
  tone,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  tone: 'warning' | 'accent';
  icon: typeof Check;
}) {
  const activeBorder = tone === 'warning' ? 'border-warning' : 'border-accent';
  const activeBg = tone === 'warning' ? 'bg-warning-soft' : 'bg-accent-soft';
  const iconActiveBg = tone === 'warning' ? 'bg-warning text-white' : 'bg-accent text-white';
  const iconIdle = tone === 'warning' ? 'text-warning' : 'text-accent';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 rounded-[var(--radius-md)] border-[1.5px] p-4 text-left transition ${
        active ? `${activeBorder} ${activeBg}` : 'border-hairline bg-surface'
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${
          active ? iconActiveBg : `bg-canvas-soft ${iconIdle}`
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="mt-1 font-display text-base font-semibold text-ink">{title}</span>
      <span className="text-xs leading-snug text-ink-muted">{sub}</span>
    </button>
  );
}

// ── Process timeline step ────────────────────────────────────────────────────────
type StepState = 'done' | 'current' | 'pending';
function ProcessStep({
  n,
  title,
  sub,
  state,
  last,
}: {
  n: number;
  title: string;
  sub: string;
  state: StepState;
  last?: boolean;
}) {
  const dotClass =
    state === 'done'
      ? 'bg-success text-white border-success'
      : state === 'current'
        ? 'bg-accent text-white border-accent'
        : 'bg-surface text-ink-muted border-hairline';
  const titleClass =
    state === 'current' ? 'text-ink' : state === 'done' ? 'text-ink-soft' : 'text-ink-muted';
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <div className="relative flex justify-center">
        <div
          className={`z-10 flex h-7 w-7 items-center justify-center rounded-full border font-display text-xs font-bold ${dotClass}`}
        >
          {state === 'done' ? <Check className="h-3.5 w-3.5" /> : n}
        </div>
        {!last && (
          <div className="absolute left-1/2 top-7 -bottom-2.5 w-0.5 -translate-x-1/2 bg-hairline" />
        )}
      </div>
      <div className="pb-4">
        <div className={`text-sm font-semibold ${titleClass}`}>{title}</div>
        <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────
export default function ResignationDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const locale = useLocale();
  const isTh = locale !== 'en';
  const router = useRouter();

  const request = useTerminationApprovals((s) =>
    s.requests.find((r) => r.id === id),
  ) as TerminationRequest | undefined;
  const approveByManager = useTerminationApprovals((s) => s.approveByManager);
  const reject = useTerminationApprovals((s) => s.reject);
  const roles = useAuthStore((s) => s.roles) as Role[];

  const [decision, setDecision] = useState<Decision>(null);
  const [comment, setComment] = useState('');

  const submittedDate = request ? request.submittedAt : '';
  const submitWaitDays = useMemo(
    () => (submittedDate ? Math.max(0, daysBetween(submittedDate, new Date().toISOString())) : 0),
    [submittedDate],
  );
  const noticeDays = useMemo(
    () => (request ? Math.max(0, daysBetween(request.submittedAt, request.requestedLastDay)) : 0),
    [request],
  );
  const daysToLastDay = useMemo(
    () =>
      request
        ? Math.max(0, daysBetween(new Date().toISOString(), request.requestedLastDay))
        : 0,
    [request],
  );

  if (!request) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-base font-semibold text-ink">
          {isTh ? 'ไม่พบคำขอลาออก' : 'Resignation request not found'}
        </p>
        <p className="text-sm text-ink-muted">
          {isTh ? `ไม่พบคำขอรหัส ${id}` : `No request with ID ${id}`}
        </p>
        <Link href={`/${locale}/quick-approve`} className="humi-button humi-button--secondary">
          {isTh ? 'กลับไปคิวอนุมัติ' : 'Back to approvals'}
        </Link>
      </div>
    );
  }

  const refNum = `REQ-${id.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}`;
  const isPending = request.status === 'pending_manager';
  const statusLabel =
    request.status === 'pending_manager'
      ? isTh ? 'รอหัวหน้าอนุมัติ' : 'Awaiting manager'
      : request.status === 'pending_spd'
        ? isTh ? 'รอ SPD อนุมัติ' : 'Awaiting SPD'
        : request.status === 'approved'
          ? isTh ? 'อนุมัติแล้ว' : 'Approved'
          : isTh ? 'ไม่อนุมัติ' : 'Rejected';

  const reasonLabel = TERMINATION_REASON_LABEL[request.reasonCode];

  // Footer left label mirrors the design's decision-state copy.
  const footerLeft = !isPending
    ? statusLabel
    : decision === 'approve'
      ? isTh ? 'พร้อมส่งต่อ HR Admin' : 'Ready to forward to HR Admin'
      : decision === 'discuss'
        ? isTh ? 'พร้อมนัด 1-on-1' : 'Ready to schedule 1-on-1'
        : isTh ? 'กรุณาเลือกการตัดสินใจ' : 'Please choose a decision';

  function handleApprove() {
    if (!request || !isPending) return;
    approveByManager(request.id, { role: 'manager', name: APPROVER_NAME }, comment || undefined);
    router.push(`/${locale}/quick-approve?decided=resignation-approved`);
  }

  function handleReject() {
    if (!request || !isPending) return;
    reject(
      request.id,
      { role: roles[0] ?? 'manager', name: APPROVER_NAME },
      comment || (isTh ? 'ไม่อนุมัติคำขอลาออก' : 'Resignation not approved'),
    );
    router.push(`/${locale}/quick-approve?decided=resignation-rejected`);
  }

  return (
    <div className="pb-8 pt-1.5">
      {/* Page head — breadcrumb + title + SLA tag */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-6">
        <div>
          <nav className="humi-eyebrow flex items-center gap-1.5" aria-label="breadcrumb">
            <Link href={`/${locale}/quick-approve`} className="transition hover:text-ink">
              {isTh ? 'กล่องงาน' : 'Workbox'}
            </Link>
            <span>›</span>
            <span>{isTh ? 'คำขอลาออก' : 'Resignation'}</span>
            <span>›</span>
            <span className="text-ink-soft">{refNum}</span>
          </nav>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink">
            {isTh ? 'อนุมัติการลาออก' : 'Approve resignation'}
            <span className="ml-2.5 font-medium text-ink-muted">· {request.employeeName}</span>
          </h1>
        </div>
        <span className="humi-tag humi-tag--butter inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          {isTh ? `รอตอบกลับ ${submitWaitDays} วัน` : `Awaiting ${submitWaitDays} d`}
        </span>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_340px] gap-5">
        {/* LEFT — case detail */}
        <div className="flex flex-col gap-4">
          {/* Employee header card */}
          <div className="humi-card">
            <div className="flex items-center gap-4">
              <div className="humi-avatar humi-avatar--ink flex h-16 w-16 flex-shrink-0 items-center justify-center font-display text-xl font-bold">
                {initials(request.employeeName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl font-semibold tracking-tight text-ink">
                  {request.employeeName}
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  {request.employeeId}
                  {isTh ? ' · พนักงานประจำ' : ' · Full-time'}
                </div>
              </div>
              <Link
                href={`/${locale}/profile`}
                className="text-sm font-semibold text-accent transition hover:opacity-80"
              >
                {isTh ? 'ดูโปรไฟล์ →' : 'View profile →'}
              </Link>
            </div>

            {/* Timeline metric strip */}
            <div className="mt-4 grid grid-cols-4 gap-0 rounded-[var(--radius-md)] bg-canvas-soft p-4">
              <Metric
                label={isTh ? 'ส่งคำขอเมื่อ' : 'Submitted'}
                value={formatDate(request.submittedAt, 'medium', locale)}
                sub={isTh ? `เมื่อ ${submitWaitDays} วันที่แล้ว` : `${submitWaitDays} d ago`}
              />
              <Metric
                label={isTh ? 'วันสุดท้าย' : 'Last day'}
                value={formatDate(request.requestedLastDay, 'medium', locale)}
                sub={isTh ? `อีก ${daysToLastDay} วัน` : `in ${daysToLastDay} d`}
                accent
              />
              <Metric
                label={isTh ? 'ระยะเวลาแจ้งล่วงหน้า' : 'Notice period'}
                value={isTh ? `${noticeDays} วัน` : `${noticeDays} d`}
                sub={
                  noticeDays >= 30
                    ? isTh ? 'ตามนโยบาย ≥ 30 วัน ✓' : 'Policy ≥ 30 d ✓'
                    : isTh ? 'ต่ำกว่านโยบาย 30 วัน' : 'Below 30-d policy'
                }
              />
              <Metric
                label={isTh ? 'วันลาคงเหลือ' : 'Leave balance'}
                value={isTh ? '6 วัน' : '6 d'}
                sub={isTh ? 'ต้องเคลียร์ก่อน' : 'Clear before exit'}
                last
              />
            </div>
          </div>

          {/* Reason card */}
          <div className="humi-card">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                {isTh ? 'เหตุผลที่ลาออก' : 'Reason for resignation'}
              </h3>
              <span className="humi-tag">{reasonLabel}</span>
            </div>
            <div className="rounded-[var(--radius-md)] border-l-[3px] border-accent bg-canvas-soft p-4 text-sm italic leading-relaxed text-ink-soft">
              &ldquo;{request.reasonText || (isTh ? 'ไม่ได้ระบุเหตุผลเพิ่มเติม' : 'No additional reason provided')}&rdquo;
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
              <AlertTriangle className="h-3.5 w-3.5" />
              {isTh
                ? 'เหตุผลและคำตอบสัมภาษณ์ออกจะถูกแชร์ให้ HR Admin โดยอัตโนมัติ'
                : 'The reason and exit-interview answers are shared with HR Admin automatically.'}
            </div>
          </div>

          {/* Decision panel */}
          <div className="humi-card">
            <h3 className="font-display text-base font-semibold tracking-tight text-ink">
              {isTh ? 'การตัดสินใจของคุณ' : 'Your decision'}
            </h3>
            <p className="mt-1 mb-3.5 text-sm text-ink-muted">
              {isTh
                ? 'คุณสามารถอนุมัติได้เลย หรือขอคุยกับพนักงานก่อน (จะถูกบันทึกเป็น 1-on-1 อัตโนมัติ)'
                : 'You can approve directly, or ask to talk first (recorded as a 1-on-1 automatically).'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <DecisionCard
                active={decision === 'discuss'}
                onClick={() => isPending && setDecision('discuss')}
                title={isTh ? 'ขอคุยก่อน' : 'Talk first'}
                sub={
                  isTh
                    ? 'นัด 1-on-1 ภายใน 2 วัน · เก็บเป็นคำขออยู่ในระบบ'
                    : 'Schedule a 1-on-1 within 2 days · kept as a request'
                }
                tone="warning"
                icon={MessageCircle}
              />
              <DecisionCard
                active={decision === 'approve'}
                onClick={() => isPending && setDecision('approve')}
                title={isTh ? 'อนุมัติ' : 'Approve'}
                sub={
                  isTh
                    ? 'ส่งต่อให้ HR Admin · เริ่มกระบวนการ offboarding'
                    : 'Forward to HR Admin · start offboarding'
                }
                tone="accent"
                icon={Check}
              />
            </div>

            {/* Comment */}
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                {isTh ? 'ข้อความถึงพนักงาน (ไม่บังคับ)' : 'Message to employee (optional)'}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={!isPending}
                placeholder={
                  isTh
                    ? 'เช่น ขอบคุณสำหรับสิ่งที่ทำมา · ขอให้โชคดี'
                    : 'e.g. Thank you for everything · all the best'
                }
                className="w-full resize-y rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
              />
              <div className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted">
                <AlertTriangle className="h-3 w-3" />
                {isTh
                  ? 'ข้อความจะถูกส่งถึงพนักงานพร้อมแจ้งผลการอนุมัติ'
                  : 'The message is sent to the employee with the decision.'}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — process timeline + replacement plan */}
        <div className="flex flex-col gap-4">
          {/* Process timeline */}
          <div className="humi-card humi-card--cream sticky top-20">
            <Eyebrow>{isTh ? 'กระบวนการ Offboarding' : 'Offboarding process'}</Eyebrow>
            <h3 className="mb-4 mt-1.5 font-display text-base font-semibold tracking-tight text-ink">
              {isTh ? '4 ขั้นตอน' : '4 steps'}
            </h3>

            <ProcessStep
              n={1}
              title={isTh ? 'พนักงานส่งคำขอ' : 'Employee submitted'}
              sub={formatDate(request.submittedAt, 'medium', locale)}
              state="done"
            />
            <ProcessStep
              n={2}
              title={isTh ? 'หัวหน้าอนุมัติ' : 'Manager approval'}
              sub={
                request.status === 'pending_manager'
                  ? isTh ? 'คุณอยู่ขั้นนี้' : 'You are here'
                  : isTh ? 'เสร็จแล้ว' : 'Done'
              }
              state={request.status === 'pending_manager' ? 'current' : 'done'}
            />
            <ProcessStep
              n={3}
              title={isTh ? 'HR Admin จัดการ' : 'HR Admin handling'}
              sub="Clearance · final pay"
              state={request.status === 'pending_spd' ? 'current' : request.status === 'approved' ? 'done' : 'pending'}
            />
            <ProcessStep
              n={4}
              title={isTh ? 'วันสุดท้าย + Exit Interview' : 'Last day + Exit Interview'}
              sub={formatDate(request.requestedLastDay, 'medium', locale)}
              state={request.status === 'approved' ? 'done' : 'pending'}
              last
            />
          </div>

          {/* Replacement plan */}
          <div className="humi-card">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                {isTh ? 'แผนทดแทน' : 'Backfill plan'}
              </h3>
              <Users className="h-4 w-4 text-ink-muted" />
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-hairline bg-surface px-3.5 py-2 text-sm font-semibold text-ink-soft transition hover:bg-canvas-soft"
              >
                <Plus className="h-3.5 w-3.5" /> {isTh ? 'เปิด Job Requisition' : 'Open job requisition'}
              </button>
              <button
                type="button"
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-hairline bg-surface px-3.5 py-2 text-sm font-semibold text-ink-soft transition hover:bg-canvas-soft"
              >
                <Users className="h-3.5 w-3.5" /> {isTh ? 'ขอโอนย้ายภายใน' : 'Request internal transfer'}
              </button>
            </div>
            <div className="mt-3 text-xs leading-snug text-ink-muted">
              {isTh
                ? 'แนะนำเปิดรับสมัครภายใน 7 วัน · ใช้เวลาสรรหา ~ 4 สัปดาห์'
                : 'Suggest opening within 7 days · ~4 weeks to fill.'}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer — decision actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-hairline bg-surface px-6 py-4 shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-2.5">
          <Check
            className={`h-4 w-4 ${decision || !isPending ? 'text-success' : 'text-ink-faint'}`}
          />
          <span className="text-sm text-ink-soft">{footerLeft}</span>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleReject}
            disabled={!isPending}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> {isTh ? 'ปฏิเสธ' : 'Reject'}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={!isPending || !decision}
            className="humi-button humi-button--primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {decision === 'discuss' ? (
              <MessageCircle className="h-3.5 w-3.5" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
            {decision === 'discuss'
              ? isTh ? 'นัดคุยก่อน' : 'Schedule a talk'
              : isTh ? 'อนุมัติและส่งต่อ HR Admin' : 'Approve & forward to HR Admin'}
          </button>
        </div>
      </div>
    </div>
  );
}
