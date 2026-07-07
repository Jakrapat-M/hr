'use client';

import { use, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  FileText,
  Paperclip,
  Plus,
  RotateCcw,
  Users,
} from 'lucide-react';
import { Modal } from '@/components/humi';
import {
  useTerminationApprovals,
  TERMINATION_REASON_LABEL,
  type TerminationRequest,
} from '@/stores/termination-approvals';
import type { AttachedFile } from '@/components/admin/AttachmentDropzone/AttachmentDropzone';
import { formatDate } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';
import { personaTiers } from '@/lib/persona-tiers';

const APPROVER_NAME = 'ผู้จัดการ / Manager';
const HR_ADMIN_NAME = 'ผู้ดูแลระบบ HR / HR Admin';

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

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
  const approveByHrAdmin = useTerminationApprovals((s) => s.approve);
  const rejectRequest = useTerminationApprovals((s) => s.reject);

  // Step 2 (pending_spd — "HR Admin handling" per the offboarding timeline)
  // needs its own actor gate: the page previously only ever recognized the
  // manager step, so HR Admin could never act here even after switching
  // persona. Mirrors the tier-gate pattern from workflows/probation/[id].
  const viewerRoles = useAuthStore((s) => s.roles);
  const viewerName = useAuthStore((s) => s.username);
  const viewerTiers = personaTiers(viewerRoles);
  const isManagerViewer = viewerTiers.includes('C');
  const isHrAdminViewer = viewerTiers.includes('A');

  // Attachment preview (mockup). STA-247 — attachments are now AttachedFile[]
  // (base64 dataUrl when captured via the ESS AttachmentDropzone); real files
  // download their own dataUrl, seeded demo files fall back to a sample view.
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);

  // Send-back (return to employee) — mirrors the RotateCcw "Send back" action
  // used elsewhere in quick-approve (ActionPanel), backed by the store's reject().
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [sendBackReason, setSendBackReason] = useState('');

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

  const refNum = id.length <= 16 ? id : `${id.slice(0, 12)}…${id.slice(-3)}`;
  const isManagerStep = request.status === 'pending_manager';
  const isHrAdminStep = request.status === 'pending_spd';
  // Whether the CURRENTLY ACTING persona can act on THIS request's current
  // step — not just whether the request happens to be pending at all.
  const canAct = (isManagerStep && isManagerViewer) || (isHrAdminStep && isHrAdminViewer);
  const statusLabel =
    request.status === 'pending_manager'
      ? isTh ? 'รอหัวหน้าอนุมัติ' : 'Awaiting manager'
      : request.status === 'pending_spd'
        ? isTh ? 'รอ HR Admin ดำเนินการ' : 'Awaiting HR Admin'
        : request.status === 'approved'
          ? isTh ? 'อนุมัติแล้ว' : 'Approved'
          : isTh ? 'ไม่อนุมัติ' : 'Rejected';

  const reasonLabel = TERMINATION_REASON_LABEL[request.reasonCode];

  // Footer left label mirrors the design's decision-state copy.
  const footerLeft = canAct
    ? isTh ? 'พร้อมอนุมัติและกลับไปคิวอนุมัติ' : 'Ready to approve and send back'
    : statusLabel;

  function handleApprove() {
    if (!request || !canAct) return;
    if (isManagerStep) {
      approveByManager(request.id, { role: 'manager', name: viewerName ?? APPROVER_NAME });
    } else {
      approveByHrAdmin(request.id, { role: 'hr_admin', name: viewerName ?? HR_ADMIN_NAME });
    }
    router.push(`/${locale}/quick-approve?decided=resignation-approved`);
  }

  function handleSendBack() {
    if (!request || !canAct || !sendBackReason.trim()) return;
    const actorRole = isManagerStep ? 'manager' : 'hr_admin';
    const actorName = viewerName ?? (isManagerStep ? APPROVER_NAME : HR_ADMIN_NAME);
    rejectRequest(request.id, { role: actorRole, name: actorName }, sendBackReason.trim());
    setSendBackOpen(false);
    router.push(`/${locale}/quick-approve?decided=resignation-sent-back`);
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

          {/* Attachments card */}
          {request.attachments?.length ? (
            <div className="humi-card">
              <h3 className="mb-3.5 font-display text-base font-semibold tracking-tight text-ink">
                {isTh ? 'เอกสารแนบ' : 'Attachments'}
              </h3>
              <ul className="flex flex-col gap-2">
                {request.attachments.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3.5 py-2.5 text-left text-sm text-ink transition hover:border-accent hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-ink-muted" />
                      <span className="truncate">{file.name}</span>
                      <FileText className="ml-auto h-4 w-4 shrink-0 text-ink-muted transition group-hover:text-accent" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

        </div>

        {/* RIGHT — process timeline + replacement plan */}
        <div className="flex flex-col gap-4">
          {/* Process timeline — NOT sticky: a sticky card here overlaps the
              Backfill card below it on scroll (sticky-sibling overlap). */}
          <div className="humi-card humi-card--cream">
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
                  ? isManagerViewer
                    ? isTh ? 'คุณอยู่ขั้นนี้' : 'You are here'
                    : isTh ? 'กำลังดำเนินการ' : 'In progress'
                  : isTh ? 'เสร็จแล้ว' : 'Done'
              }
              state={request.status === 'pending_manager' ? 'current' : 'done'}
            />
            <ProcessStep
              n={3}
              title={isTh ? 'HR Admin จัดการ' : 'HR Admin handling'}
              sub={
                request.status === 'pending_spd' && isHrAdminViewer
                  ? isTh ? 'คุณอยู่ขั้นนี้' : 'You are here'
                  : 'Clearance · final pay'
              }
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
            className={`h-4 w-4 ${canAct ? 'text-success' : 'text-ink-faint'}`}
          />
          <span className="text-sm text-ink-soft">{footerLeft}</span>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setSendBackOpen(true)}
            disabled={!canAct}
            className="humi-button humi-button--ghost disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {isTh ? 'ส่งกลับ' : 'Send back'}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={!canAct}
            className="humi-button humi-button--primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {isTh ? 'อนุมัติและส่งกลับ' : 'Approve & send back'}
          </button>
        </div>
      </div>

      {/* Send-back reason modal */}
      <Modal
        open={sendBackOpen}
        onClose={() => setSendBackOpen(false)}
        title={isTh ? 'ส่งกลับคำขอลาออก' : 'Send back resignation request'}
        widthClass="max-w-md"
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-sm text-ink-muted">
            {isTh
              ? 'ระบุเหตุผลที่ส่งกลับคำขอนี้ พนักงานจะเห็นเหตุผลดังกล่าว'
              : 'Tell the employee why this request is being sent back.'}
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              {isTh ? 'เหตุผลในการส่งกลับ' : 'Reason for sending back'}
              <span aria-hidden className="ml-0.5 text-danger">*</span>
            </label>
            <textarea
              rows={3}
              value={sendBackReason}
              onChange={(e) => setSendBackReason(e.target.value)}
              placeholder={
                isTh ? 'เช่น ต้องการรายละเอียดเพิ่มเติม' : 'e.g. Need more details'
              }
              className="w-full resize-y rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setSendBackOpen(false)}
              className="humi-button humi-button--ghost"
            >
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSendBack}
              disabled={!sendBackReason.trim()}
              className="humi-button humi-button--danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {isTh ? 'ยืนยันส่งกลับ' : 'Confirm send back'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Attachment preview (mockup) — renders a sample document view for the
          selected file. No real file store this phase; the body is derived from
          the request so it reads as a believable resignation document. */}
      <Modal
        open={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.name ?? ''}
        widthClass="max-w-2xl"
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-md)] border border-hairline bg-surface px-8 py-7 shadow-[var(--shadow-card)]">
            <div className="mb-5 flex items-center gap-2 text-eyebrow uppercase tracking-wide text-ink-muted">
              <FileText className="h-3.5 w-3.5" />
              {isTh ? 'ตัวอย่างเอกสาร' : 'Sample document'}
            </div>
            <div className="space-y-2.5 text-sm leading-relaxed text-ink-soft">
              <p>{isTh ? 'เรียน ฝ่ายทรัพยากรบุคคล' : 'To: Human Resources'}</p>
              <p>
                {isTh
                  ? `ข้าพเจ้า ${request.employeeName} มีความประสงค์ขอลาออกจากตำแหน่ง โดยแจ้งล่วงหน้าตามระเบียบบริษัท`
                  : `I, ${request.employeeName}, hereby submit my resignation with the required advance notice per company policy.`}
              </p>
              <p>
                {isTh
                  ? `วันสุดท้ายของการปฏิบัติงานคือ ${formatDate(request.requestedLastDay, 'long', locale)}`
                  : `My last working day will be ${formatDate(request.requestedLastDay, 'long', locale)}.`}
              </p>
              <p>{isTh ? 'จึงเรียนมาเพื่อโปรดพิจารณา' : 'Thank you for your consideration.'}</p>
              <p className="pt-2">{isTh ? 'ขอแสดงความนับถือ' : 'Sincerely,'}</p>
              <p className="font-medium text-ink">{request.employeeName}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">
              {isTh ? 'เอกสารตัวอย่างสำหรับการตรวจสอบ' : 'Sample document for review'}
            </span>
            <button
              type="button"
              onClick={() => {
                if (!previewFile) return;
                // Real files captured via the ESS AttachmentDropzone carry their own
                // dataUrl; seeded demo attachments have none and get a sample text file.
                if (previewFile.dataUrl) {
                  const a = document.createElement('a');
                  a.href = previewFile.dataUrl;
                  a.download = previewFile.name;
                  a.click();
                  return;
                }
                const blob = new Blob(
                  [`${previewFile.name}\n\n${request.employeeName}\n${formatDate(request.requestedLastDay, 'long', locale)}`],
                  { type: 'text/plain' },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = previewFile.name.replace(/\.pdf$/i, '.txt');
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-hairline bg-surface px-3.5 py-2 text-sm font-semibold text-ink-soft transition hover:bg-canvas-soft"
            >
              <Download className="h-3.5 w-3.5" /> {isTh ? 'ดาวน์โหลด' : 'Download'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
