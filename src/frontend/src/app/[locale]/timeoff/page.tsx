'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole } from '@/lib/rbac';
import { Check, X, Heart, Coffee, Sun, Plus, Paperclip, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  CardEyebrow,
  CardTitle,
  Modal,
  Toggle,
  LeaveRangeCalendar,
} from '@/components/humi';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date';
import { countLeaveDays, remainingAfter, isOverQuota } from '@/lib/leave-math';
import { DOCUMENT_UPLOAD_HELPER_TH } from '@/lib/document-boundary';
import {
  HUMI_LEAVE_BALANCES,
  HUMI_LEAVE_PENDING,
  HUMI_LEAVE_COVERAGE,
  HUMI_TH_HOLIDAYS,
  type LeaveKind,
} from '@/lib/humi-mock-data';
import { useTimeoffStore, type TimeoffHistoryItem, type LeaveStatus } from '@/stores/humi-timeoff-slice';
import { ApprovalChain } from '@/components/quick-approve/ApprovalChain';
import type { ApproverStage } from '@/data/benefits/plan-registry';

// Timeoff approval chain: manager → hr_admin
const TIMEOFF_CHAIN: ApproverStage[] = ['manager', 'hr_admin'];

// Extended history item with audit + submittedAt as ISO for days-waiting
type HistoryItemExtended = TimeoffHistoryItem & {
  isoSubmittedAt?: string;
  audit?: Array<{ actorName: string; action: string; comment?: string; at: string }>;
};

// Seed mock audit data for initial history items
const AUDIT_MAP: Record<string, HistoryItemExtended['audit']> = {
  'lh-1': [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-03-10T09:00:00Z' },
    { actorName: 'กฤตนัย อินทรเดช', action: 'approve', comment: 'อนุมัติ', at: '2026-03-11T10:00:00Z' },
    { actorName: 'วรินทร์ HR Admin', action: 'approve', at: '2026-03-12T11:00:00Z' },
  ],
  'lh-2': [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2026-02-02T08:00:00Z' },
    { actorName: 'กฤตนัย อินทรเดช', action: 'approve', at: '2026-02-02T09:30:00Z' },
    { actorName: 'วรินทร์ HR Admin', action: 'approve', at: '2026-02-02T10:00:00Z' },
  ],
  'lh-3': [
    { actorName: 'สมชาย สุขใจ', action: 'submit', at: '2025-11-05T08:00:00Z' },
    { actorName: 'กฤตนัย อินทรเดช', action: 'reject', comment: 'ติดประชุมสำคัญ ขอเลื่อนวัน', at: '2025-11-05T14:00:00Z' },
  ],
};

const ISO_MAP: Record<string, string> = {
  'lh-1': '2026-03-10T09:00:00Z',
  'lh-2': '2026-02-02T08:00:00Z',
  'lh-3': '2025-11-05T08:00:00Z',
};

function daysWaiting(isoDate?: string): number {
  if (!isoDate) return 0;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
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

function activeStageForStatus(status: LeaveStatus): ApproverStage | undefined {
  if (status === 'pending') return 'manager';
  return undefined;
}

// ════════════════════════════════════════════════════════════
// /timeoff — Leave request portal
// Port of docs/design-ref/shelfly-bundle/project/screens/timeoff.jsx
// 3 balance KPIs + 3-tab panel (request / history / approvals)
// + right column with team coverage + policy callout.
// c5: Zustand persist + validation + submit → history+1 + toast
// ════════════════════════════════════════════════════════════

type TabKey = 'request' | 'history' | 'approve';

const LEAVE_TYPES: Array<{
  key: LeaveKind;
  label: string;
  hint: string;
  icon: typeof Sun;
  tileClass: string;
}> = [
  {
    key: 'vacation',
    label: 'ลาพักร้อน',
    hint: 'ได้รับค่าจ้าง',
    icon: Sun,
    tileClass: 'bg-accent-soft text-accent',
  },
  {
    key: 'sick',
    label: 'ลาป่วย',
    hint: 'ได้รับค่าจ้าง',
    icon: Heart,
    tileClass:
      'bg-[color:var(--color-accent-alt-soft)] text-[color:var(--color-accent-alt)]',
  },
  {
    key: 'personal',
    label: 'ลากิจ',
    hint: 'ได้รับค่าจ้าง',
    icon: Coffee,
    tileClass: 'bg-[color:var(--color-sage-soft)] text-ink',
  },
];

const HISTORY_TONE: Record<LeaveStatus, string> = {
  approved: 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]',
  rejected: 'bg-warning-soft text-[color:var(--color-warning)]',
  pending: 'bg-accent-soft text-[color:var(--color-accent-ink)]',
} as const;

const HISTORY_LABEL: Record<LeaveStatus, string> = {
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
  pending: 'รออนุมัติ',
} as const;

// Simple in-memory toast (no external library)
function useToast() {
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });
  const show = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast({ msg: '', visible: false }), 3200);
  };
  return { toast, show };
}

export default function HumiTimeoffPage() {
  const searchParams = useSearchParams();
  const roles = useAuthStore((s) => s.roles);
  // Manager approval tab is reviewer-only (remove-not-hide). Employees never
  // see it; the canonical approval inbox stays /quick-approve.
  const canReview = hasAnyRole(roles, ['manager', 'hrbp', 'spd', 'hr_admin', 'hr_manager']);
  const requestedTab = (searchParams.get('tab') as TabKey | null) ?? 'request';
  // Deep-link to ?tab=approve as a non-reviewer falls back to the request tab.
  const initialTab: TabKey = requestedTab === 'approve' && !canReview ? 'request' : requestedTab;
  const [tab, setTab] = useState<TabKey>(initialTab);
  const { toast, show: showToast } = useToast();

  // Local decision state for the manager approval tab. HUMI_LEAVE_PENDING is a
  // static display fixture (lp-1/lp-2) with no backing store, so the lightest
  // clean wiring for this isolated mockup tab is a per-row decision that flips
  // the row to a terminal chip + toast (no leave-approvals seed required here).
  const [pendingDecisions, setPendingDecisions] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [policyOpen, setPolicyOpen] = useState(false);

  const decide = (id: string, name: string, decision: 'approved' | 'rejected') => {
    setPendingDecisions((prev) => ({ ...prev, [id]: decision }));
    showToast(
      decision === 'approved'
        ? `อนุมัติคำขอลาของ ${name} แล้ว`
        : `ปฏิเสธคำขอลาของ ${name} แล้ว`,
    );
  };

  return (
    <>
      {/* Toast */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3',
            'bg-ink text-canvas shadow-[var(--shadow-lg)]',
            'text-body font-medium'
          )}
        >
          <Check size={16} aria-hidden />
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <header className="humi-page-head mb-8">
        <div className="flex flex-col gap-1">
          <CardEyebrow>ลางาน</CardEyebrow>
          <h1
            className={cn(
              'font-display font-semibold tracking-tight text-ink',
              'text-[length:var(--text-display-h1)] leading-[var(--text-display-h1--line-height)]'
            )}
          >
            ยื่นคำขอ · อนุมัติ · ติดตาม
          </h1>
        </div>
        <div className="humi-spacer" />
        <Button
          variant="primary"
          leadingIcon={<Plus size={16} />}
          onClick={() => setTab('request')}
        >
          สร้างคำขอใหม่
        </Button>
      </header>

      {/* Balance KPIs */}
      <section
        aria-label="ยอดวันลาคงเหลือ"
        className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3"
      >
        {HUMI_LEAVE_BALANCES.map((b) => (
          <Card key={b.kind} variant="raised" size="md">
            <CardEyebrow>{b.label}</CardEyebrow>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={cn(
                  'font-display font-semibold text-ink tabular-nums whitespace-nowrap',
                  'text-[length:var(--text-display-h1)] leading-[var(--text-display-h1--line-height)]'
                )}
              >
                {b.remaining}
              </span>
              <span className="text-small text-ink-muted">{b.unitLabel}</span>
            </div>
            {b.percentUsed > 0 && (
              <div
                role="progressbar"
                aria-valuenow={b.percentUsed}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={b.label}
                className="humi-progress mt-3"
              >
                <div
                  className={cn('h-full rounded-full', b.barClass)}
                  style={{ width: `${b.percentUsed}%` }}
                />
              </div>
            )}
            <p className="mt-2 text-small text-ink-muted">{b.note}</p>
          </Card>
        ))}
      </section>

      {/* Main grid: form (1.2fr) + right column (1fr) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Left — tabs + panel */}
        <Card variant="raised" size="lg">
          <div
            role="tablist"
            aria-label="มุมมองคำขอลางาน"
            className="flex flex-wrap gap-1 border-b border-hairline"
          >
            <TabButton active={tab === 'request'} onClick={() => setTab('request')}>
              คำขอใหม่
            </TabButton>
            <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
              ประวัติของฉัน
            </TabButton>
            {canReview && (
              <TabButton active={tab === 'approve'} onClick={() => setTab('approve')}>
                รออนุมัติ{' '}
                <span className="font-normal text-ink-muted">
                  ({HUMI_LEAVE_PENDING.length})
                </span>
              </TabButton>
            )}
          </div>

          {tab === 'request' && (
            <RequestTab
              onSubmitted={(msg) => { showToast(msg); setTab('history'); }}
              onSavedDraft={(msg) => showToast(msg)}
            />
          )}

          {tab === 'history' && <HistoryTab />}

          {tab === 'approve' && canReview && (
            <ul role="list" className="divide-y divide-hairline pt-2">
              {HUMI_LEAVE_PENDING.map((p) => {
                const decision = pendingDecisions[p.id];
                return (
                  <li
                    key={p.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={p.name} tone={p.tone} size="sm" />
                      <div className="min-w-0">
                        <p className="text-body font-semibold text-ink">{p.name}</p>
                        <p className="text-small text-ink-muted">
                          {p.reason} · {p.when}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {decision ? (
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] whitespace-nowrap',
                            HISTORY_TONE[decision],
                          )}
                        >
                          {HISTORY_LABEL[decision]}
                        </span>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            leadingIcon={<X size={14} />}
                            onClick={() => decide(p.id, p.name, 'rejected')}
                          >
                            ปฏิเสธ
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            leadingIcon={<Check size={14} />}
                            onClick={() => decide(p.id, p.name, 'approved')}
                          >
                            อนุมัติ
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Right column */}
        <aside className="flex flex-col gap-6">
          {/* Team coverage */}
          <Card variant="raised" size="lg">
            <CardEyebrow>ใครลาเดือนนี้</CardEyebrow>
            <CardTitle className="mt-1">การครอบคลุมของทีม</CardTitle>

            <ul role="list" className="mt-4 flex flex-col gap-3">
              {HUMI_LEAVE_COVERAGE.map((c) => (
                <li key={c.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} tone={c.tone} size="sm" />
                    <p className="flex-1 truncate text-small text-ink">
                      {c.name}
                    </p>
                    <p className="shrink-0 text-small text-ink-muted">
                      {c.dateLabel}
                    </p>
                  </div>
                  <div
                    aria-hidden
                    className="relative h-1.5 overflow-hidden rounded-full bg-hairline-soft"
                  >
                    <div
                      className="absolute h-full rounded-full bg-accent"
                      style={{
                        left: `${c.offsetPct}%`,
                        width: '12%',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Policy callout */}
          <Card
            variant="raised"
            size="lg"
            className="relative overflow-hidden bg-ink text-canvas"
          >
            <div
              aria-hidden
              className="absolute -right-10 -top-10 h-36 w-28 rounded-full bg-accent opacity-40 blur-2xl"
            />
            <CardEyebrow className="relative text-accent">นโยบาย</CardEyebrow>
            <h3
              className={cn(
                'relative mt-1 font-display font-semibold tracking-tight',
                'text-[length:var(--text-display-h3)] leading-[var(--text-display-h3--line-height)]',
                'text-canvas'
              )}
            >
              การยกยอดวันลา
            </h3>
            <p className="relative mt-2 text-small text-canvas/70 leading-relaxed">
              วันลาพักร้อนที่ไม่ได้ใช้ สูงสุด 5 วัน สามารถยกยอดไปปีถัดไปได้
              ส่วนที่เกินจะจ่ายเป็นเงินในเช็คเงินเดือนวันที่ 15 ธันวาคม
            </p>
            <div className="relative mt-4">
              <Button variant="primary" onClick={() => setPolicyOpen(true)}>
                อ่านนโยบายฉบับเต็ม
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {/* Policy modal — full leave-carryover policy text */}
      <Modal
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title="นโยบายการยกยอดวันลา · ฉบับเต็ม"
      >
        <div className="space-y-4 text-body text-ink-soft leading-relaxed">
          <p>
            วันลาพักร้อนที่ไม่ได้ใช้ภายในปีปฏิทิน สามารถยกยอดไปใช้ในปีถัดไปได้
            สูงสุด <strong className="text-ink">5 วัน</strong> โดยจะต้องใช้ให้หมดภายในไตรมาสแรกของปีถัดไป
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>วันลาส่วนที่เกิน 5 วันจะถูกจ่ายเป็นเงินในเช็คเงินเดือนวันที่ 15 ธันวาคม</li>
            <li>ลาป่วยและลากิจไม่สามารถยกยอดได้ และจะถูกรีเซ็ตต้นปี</li>
            <li>การยกยอดจะคำนวณอัตโนมัติเมื่อปิดรอบปลายปี ไม่ต้องยื่นคำขอ</li>
            <li>กรณีลาออกระหว่างปี วันลาคงเหลือจะถูกจ่ายตามสัดส่วนในงวดสุดท้าย</li>
          </ul>
          <p className="text-small text-ink-muted">
            อ้างอิงระเบียบบริษัทว่าด้วยการลา · ฉบับปรับปรุง 2569
          </p>
        </div>
      </Modal>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Request tab — form with validation
// ────────────────────────────────────────────────────────────

function RequestTab({
  onSubmitted,
  onSavedDraft,
}: {
  onSubmitted: (msg: string) => void;
  onSavedDraft: (msg: string) => void;
}) {
  const submit = useTimeoffStore((s) => s.submit);
  const [kind, setKind] = useState<LeaveKind>('vacation');
  // Range is stored as ISO (YYYY-MM-DD) from the calendar; reformatted to a
  // BE/TH label only at submit time (the History tab renders fromDate verbatim).
  const [fromISO, setFromISO] = useState('');
  const [toISO, setToISO] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const kindLabel =
    LEAVE_TYPES.find((t) => t.key === kind)?.label ?? 'ลางาน';

  const selectedBalance = HUMI_LEAVE_BALANCES.find((b) => b.kind === kind);
  const isSingleDay = !!fromISO && (!toISO || toISO === fromISO);

  // Live total-days via the single leave-day semantic (weekend + holiday aware).
  const totalDays = fromISO
    ? countLeaveDays(fromISO, toISO || fromISO, {
        holidays: HUMI_TH_HOLIDAYS,
        halfDay: isSingleDay && halfDay ? 'morning' : 'none',
      })
    : 0;

  const balanceRemaining = selectedBalance?.remaining ?? '0';
  const after = totalDays > 0 ? remainingAfter(balanceRemaining, totalDays) : null;
  const overQuota = totalDays > 0 && isOverQuota(balanceRemaining, totalDays);

  function validate() {
    const errs: Record<string, string> = {};
    if (!fromISO) errs.fromDate = 'กรุณาเลือกวันที่เริ่มลา';
    if (reason.trim().length > 0 && reason.trim().length < 5) {
      errs.reason = 'เหตุผลต้องมีอย่างน้อย 5 ตัวอักษร';
    }
    if (!reason.trim()) errs.reason = 'กรุณาระบุเหตุผล';
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Reformat ISO → BE/TH label BEFORE it reaches the History tab (verbatim render).
    const endISO = toISO || fromISO;
    const fromLabel = formatDate(fromISO, 'medium', 'th');
    const toLabel = formatDate(endISO, 'medium', 'th');

    submit({ kind, kindLabel, fromDate: fromLabel, toDate: toLabel, reason: reason.trim() });
    setFromISO('');
    setToISO('');
    setHalfDay(false);
    setReason('');
    setErrors({});
    onSubmitted('ส่งคำขอลางานเรียบร้อยแล้ว · สถานะ: รออนุมัติ');
  }

  function handleSaveDraft() {
    // Mockup: keep the current form values in place and confirm the draft was
    // saved (no draft store in this phase — toast feedback only).
    onSavedDraft('บันทึกร่างคำขอลาแล้ว · ยังไม่ส่งให้ผู้อนุมัติ');
  }

  return (
    <div className="pt-6">
      <CardTitle>ยื่นคำขอลางาน</CardTitle>
      <p className="mt-1 text-small text-ink-muted">
        คำขอที่น้อยกว่า 3 วัน ระบบจะส่งไปยังผู้จัดการของคุณโดยอัตโนมัติ
      </p>

      {/* Leave type selector */}
      <div
        role="radiogroup"
        aria-label="ประเภทการลา"
        className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {LEAVE_TYPES.map((opt) => {
          const selected = kind === opt.key;
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setKind(opt.key)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-[var(--radius-md)] border p-4 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                selected
                  ? 'border-ink bg-canvas-soft'
                  : 'border-hairline bg-surface hover:border-ink-faint'
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]',
                  opt.tileClass
                )}
              >
                <Icon size={16} />
              </span>
              <span className="text-body font-semibold text-ink">
                {opt.label}
              </span>
              <span className="text-small text-ink-muted">{opt.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Date range — selectable month calendar (range + weekend/holiday markers) */}
      <div className="mt-5">
        <p className="mb-2 text-small font-medium text-ink-soft">เลือกช่วงวันที่ลา *</p>
        <LeaveRangeCalendar
          from={fromISO}
          to={toISO}
          holidays={HUMI_TH_HOLIDAYS}
          onChange={({ from, to }) => {
            setFromISO(from);
            setToISO(to);
            if (halfDay && from && to && from !== to) setHalfDay(false);
          }}
        />
        {errors.fromDate && (
          <p role="alert" className="mt-1.5 flex items-center gap-1 text-[length:var(--text-eyebrow)] text-[color:var(--color-warning)]">
            <AlertCircle size={12} aria-hidden />
            {errors.fromDate}
          </p>
        )}

        {/* Half-day toggle (single working day only) */}
        {isSingleDay && fromISO && (
          <div className="mt-3">
            <Toggle
              checked={halfDay}
              onChange={setHalfDay}
              label="ลาครึ่งวัน"
              description="นับเป็น 0.5 วัน (เฉพาะการลาวันเดียว)"
            />
          </div>
        )}

        {/* Live day-count + remaining-after + over-quota chip */}
        {totalDays > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] bg-canvas-soft px-4 py-3">
            <div>
              <p className="text-[length:var(--text-eyebrow)] uppercase tracking-wide text-ink-muted">รวมวันลา</p>
              <p className="text-body font-semibold text-ink tabular-nums">{totalDays} วัน</p>
            </div>
            <div className="h-8 w-px bg-hairline" aria-hidden />
            <div>
              <p className="text-[length:var(--text-eyebrow)] uppercase tracking-wide text-ink-muted">คงเหลือหลังลา</p>
              <p className="text-body font-semibold text-ink tabular-nums">
                {after === null ? 'ไม่จำกัด' : `${after} วัน`}
              </p>
            </div>
            {overQuota && (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-danger-soft)] px-3 py-1 text-small font-semibold text-[color:var(--color-danger)]">
                <AlertCircle size={14} aria-hidden />
                เกินสิทธิ
              </span>
            )}
          </div>
        )}
      </div>

      {/* Reason */}
      <Field
        label="เหตุผล *"
        htmlFor="leave-reason"
        className="mt-3"
        error={errors.reason}
      >
        <textarea
          id="leave-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="อธิบายเหตุผลการลา (อย่างน้อย 5 ตัวอักษร)"
          aria-invalid={!!errors.reason}
          aria-describedby={errors.reason ? 'err-reason' : undefined}
          className={cn(inputClass, 'min-h-[80px] resize-y', errors.reason && 'border-[color:var(--color-warning)]')}
        />
      </Field>

      {/* Attachment placeholder */}
      <button
        type="button"
        className={cn(
          'humi-dropzone mt-3 flex min-h-[44px] items-center justify-center gap-2 text-small text-ink-muted',
          'w-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
        )}
      >
        <Paperclip size={14} aria-hidden />
        <span>แนบเอกสารประกอบ (ถ้ามี)</span>
      </button>
      <p className="mt-1 text-small text-ink-muted" data-testid="timeoff-attachment-boundary">
        {DOCUMENT_UPLOAD_HELPER_TH}
      </p>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" className="h-11" onClick={handleSubmit}>
          ส่งคำขอ
        </Button>
        <Button variant="ghost" onClick={handleSaveDraft}>บันทึกร่าง</Button>
        <p className="ml-auto text-small text-ink-muted">
          ผู้อนุมัติ: กฤตนัย อินทรเดช (หัวหน้าสายงาน)
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// History tab — reads from Zustand store
// ────────────────────────────────────────────────────────────

function HistoryRow({ h, locale }: { h: TimeoffHistoryItem; locale: string }) {
  const [expanded, setExpanded] = useState(false);
  const isoSubmittedAt = ISO_MAP[h.id];
  const audit = AUDIT_MAP[h.id];
  const days = daysWaiting(isoSubmittedAt);
  const activeStage = activeStageForStatus(h.status);

  const actionLabel = (action: string) => {
    if (action === 'submit') return locale === 'th' ? 'ส่งคำขอ' : 'Submitted';
    if (action === 'approve') return locale === 'th' ? 'อนุมัติ' : 'Approved';
    if (action === 'reject') return locale === 'th' ? 'ปฏิเสธ' : 'Rejected';
    return action;
  };

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={h.kindLabel} tone="teal" size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-ink">
              {h.fromDate}
              {h.toDate !== h.fromDate ? ` – ${h.toDate}` : ''}
            </p>
            <p className="text-small text-ink-muted">
              {h.kindLabel} · {h.reason}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end shrink-0">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] whitespace-nowrap',
              HISTORY_TONE[h.status]
            )}
          >
            {HISTORY_LABEL[h.status]}
          </span>
          {h.status === 'pending' && isoSubmittedAt && (
            <span className={`text-xs font-mono ${days > 3 ? 'text-amber-600 font-semibold' : 'text-ink-muted'}`}>
              {days} {locale === 'th' ? 'ด. รอ' : 'd. waiting'}
            </span>
          )}
        </div>
      </div>

      {/* Approval chain */}
      <div className="pl-0">
        <ApprovalChain chain={TIMEOFF_CHAIN} locale={locale} activeStage={activeStage} size="sm" />
      </div>

      {/* Audit timeline toggle */}
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
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor(entry.action)} mt-1.5 shrink-0`} />
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
    </li>
  );
}

function HistoryTab() {
  const history = useTimeoffStore((s) => s.history);
  const params = useParams();
  // locale is a path segment (/[locale]/timeoff), not a query param.
  const locale = (params?.locale as string) ?? 'th';

  if (history.length === 0) {
    return (
      <div className="py-12 text-center text-small text-ink-muted">
        ยังไม่มีประวัติการลา
      </div>
    );
  }

  return (
    <ul role="list" className="divide-y divide-hairline pt-2">
      {history.map((h: TimeoffHistoryItem) => (
        <HistoryRow key={h.id} h={h} locale={locale} />
      ))}
    </ul>
  );
}

// ──────── helpers (co-located) ────────

const inputClass = cn(
  'w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  'placeholder:text-ink-faint'
);

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-4 py-3 text-body font-medium transition-colors whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        active
          ? 'border-accent text-ink'
          : 'border-transparent text-ink-muted hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  className,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  className?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-small font-medium text-ink-soft"
      >
        {label}
        {optional && (
          <span className="ml-1 font-normal text-ink-faint">(ไม่บังคับ)</span>
        )}
      </label>
      {children}
      {error && (
        <p
          id={`err-${htmlFor}`}
          role="alert"
          className="flex items-center gap-1 text-[length:var(--text-eyebrow)] text-[color:var(--color-warning)]"
        >
          <AlertCircle size={12} aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
