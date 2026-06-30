'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Check, Plus, Paperclip, AlertCircle, ChevronDown, ChevronRight, Sun, X } from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  CardEyebrow,
  CardTitle,
  Modal,
  LeaveRangeCalendar,
} from '@/components/humi';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date';
import { countLeaveDays } from '@/lib/leave-math';
import { DOCUMENT_UPLOAD_HELPER_TH, DOCUMENT_UPLOAD_HELPER_EN } from '@/lib/document-boundary';
import {
  HUMI_TH_HOLIDAYS,
  HUMI_MY_PROFILE,
  type LeaveKind,
} from '@/lib/humi-mock-data';
import { useTimeoffStore, type TimeoffHistoryItem } from '@/stores/humi-timeoff-slice';
import { ApprovalChain } from '@/components/quick-approve/ApprovalChain';
import type { ApproverStage } from '@/data/benefits/plan-registry';
import {
  LEAVE_TYPES,
  type LeaveTypeDef,
  getLeaveType,
  quotaTrackedTypes,
  LEAVE_CODE_TO_BALANCE_KIND,
} from '@/lib/time/leave-types';
import { requiredDocsFor } from '@/lib/time/doc-rules';
import { validateLeaveRequest } from '@/lib/time/leave-validation';
import { deriveEmployeeEligibility } from '@/lib/time/employee-eligibility';
import { levelsForLeaveType, appliedChainFor } from '@/lib/time/approval-rules';
import { isBookableLeaveDate, LEAVE_BOOKING_HORIZON_DAYS } from '@/lib/time/period';
import { getEmployeeTimeAttrs } from '@/lib/time/employee-time-attrs';
import {
  useLeaveApprovals,
  leaveStageLabel,
  type LeaveRequest,
  type LeaveStatus as ApprovalLeaveStatus,
} from '@/stores/leave-approvals';
import { useRemainingFor, useLeaveBalances } from '@/stores/leave-balances';
import type { PendingRequest } from '@/lib/quick-approve-api';
import { routingStagesFor } from '@/lib/approval-routing';

// Timeoff approval chain pills: manager → hr_admin (2-step max for the preview).
const TIMEOFF_CHAIN: ApproverStage[] = ['manager', 'hr_admin'];

// Demo employee identity for the ESS request portal (Tier D persona).
const DEMO_EMPLOYEE = { id: 'EMP001', name: 'สมชาย ใจดี' };

// Project a registry leave `code` (23 types) onto the legacy history `LeaveKind`
// union (8 buckets), so the History tab shows the right icon/category per type
// instead of always 'vacation'. Substring matching keeps paid/unpaid variants on
// the same bucket; anything unmatched falls back to 'unpaid' (the neutral bucket).
export function leaveCodeToHistoryKind(code: string): LeaveKind {
  if (code.startsWith('annual')) return 'vacation';
  if (code.startsWith('sick')) return 'sick';
  if (code.startsWith('personnel')) return 'personal';
  if (code === 'priesthood_leave' || code === 'priesthood_leave_unpaid') return 'ordination';
  if (code === 'military_train_leave') return 'military';
  if (code === 'maternity_risk_case') return 'parental';
  if (code.startsWith('maternity')) return 'maternity';
  return 'unpaid';
}

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

function activeStageForStatus(status: 'pending' | 'approved' | 'rejected'): ApproverStage | undefined {
  if (status === 'pending') return 'manager';
  return undefined;
}

// ════════════════════════════════════════════════════════════
// /timeoff — Leave request portal (Group A reconcile)
// ESS submit + status tracking ONLY. Approval happens in /quick-approve +
// /workflows/leave/[id] (no inline approve/reject here).
// Drives the 23-type registry, doc rules, quota reserve, and validation.
// ════════════════════════════════════════════════════════════

type TabKey = 'request' | 'history';

const HISTORY_TONE: Record<'approved' | 'rejected' | 'pending', string> = {
  approved: 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]',
  rejected: 'bg-warning-soft text-[color:var(--color-warning)]',
  pending: 'bg-accent-soft text-[color:var(--color-accent-ink)]',
} as const;

const HISTORY_LABEL_TH: Record<'approved' | 'rejected' | 'pending', string> = {
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
  pending: 'รออนุมัติ',
} as const;

const HISTORY_LABEL_EN: Record<'approved' | 'rejected' | 'pending', string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
} as const;

// Bar colors cycled across the quota cards (token-only — teal / indigo / sage).
const QUOTA_BAR_CLASSES = [
  'bg-accent',
  'bg-[color:var(--color-accent-alt)]',
  'bg-[color:var(--color-sage)]',
] as const;

// Resolve the active ESS employee id the same way the submit gate does, so the
// quota cards read the identical leave-balances bucket the form reserves against.
function useEssEmployeeId(): string {
  return useAuthStore((s) => s.userId) ?? DEMO_EMPLOYEE.id;
}

// Quota summary cards — registry-driven (quotaTracked types) + reactive to the
// leave-balances store. Same numbers + same display names as the submit gate.
// STA-117 — curated top-3 leave types (by registry code, not array index): Sick → Annual → Personal.
const TOP_LEAVE_CODES = ['sick_leave', 'annual_leave', 'personnel_leave'] as const;

function QuotaCards({ isTh }: { isTh: boolean }) {
  const employeeId = useEssEmployeeId();
  const balances = useLeaveBalances((s) => s.balances);
  const quotaTypes = useMemo(() => quotaTrackedTypes(), []);

  return (
    <section
      aria-label={isTh ? 'ยอดวันลาคงเหลือ' : 'Leave balances'}
      className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3"
    >
      {quotaTypes.map((t, i) => {
        const kind = LEAVE_CODE_TO_BALANCE_KIND[t.code] ?? t.code;
        const bucket = balances[`${employeeId}:${kind}`];
        const initial = bucket ? bucket.initial + bucket.credits : 0;
        const remaining = bucket
          ? bucket.initial + bucket.credits - bucket.debits - bucket.reserved
          : 0;
        const percentUsed =
          initial > 0 ? Math.min(100, Math.round(((initial - remaining) / initial) * 100)) : 0;
        // STA-118 — Used is exact by construction: used = debits + reserved = Total − Remaining.
        const used = initial - remaining;
        const label = isTh ? t.nameTh : t.nameEn;
        const note =
          initial > 0
            ? isTh
              ? `จาก ${initial} วันต่อปี`
              : `of ${initial} days per year`
            : isTh
              ? 'ยังไม่กำหนดโควต้า'
              : 'No quota allocated yet';
        return (
          <Card key={t.code} variant="raised" size="md">
            <CardEyebrow>{label}</CardEyebrow>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={cn(
                  'font-display font-semibold text-ink tabular-nums whitespace-nowrap',
                  'text-[length:var(--text-display-h1)] leading-[var(--text-display-h1--line-height)]'
                )}
              >
                {remaining}
              </span>
              <span className="text-small text-ink-muted">
                {isTh ? 'วันคงเหลือ' : 'days left'}
              </span>
            </div>
            {percentUsed > 0 && (
              <div
                role="progressbar"
                aria-valuenow={percentUsed}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label}
                className="humi-progress mt-3"
              >
                <div
                  className={cn('h-full rounded-full', QUOTA_BAR_CLASSES[i % QUOTA_BAR_CLASSES.length])}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            )}
            {initial > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
                {[
                  { lbl: isTh ? 'รวมสิทธิ์' : 'Total', val: initial, over: false },
                  { lbl: isTh ? 'ใช้ไป' : 'Used', val: used, over: false },
                  // STA-118 — over-used remaining renders in pumpkin (--color-danger), never red.
                  { lbl: isTh ? 'คงเหลือ' : 'Remaining', val: remaining, over: remaining < 0 },
                ].map((s) => (
                  <div key={s.lbl} className="flex flex-col gap-0.5">
                    <span className="text-eyebrow uppercase tracking-wide text-ink-muted">{s.lbl}</span>
                    <span
                      className={cn(
                        'text-body font-semibold tabular-nums',
                        s.over ? 'text-[color:var(--color-danger)]' : 'text-ink',
                      )}
                    >
                      {s.val}
                    </span>
                  </div>
                ))}
                <p className="col-span-3 mt-1 text-small text-ink-muted">{note}</p>
              </div>
            ) : (
              <p className="mt-2 text-small text-ink-muted">{note}</p>
            )}
          </Card>
        );
      })}
    </section>
  );
}

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
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const isTh = locale !== 'en';
  const searchParams = useSearchParams();
  // ?tab=approve is no longer a valid surface here (approval moved to
  // /quick-approve). Any deep-link to it falls back to the request tab.
  const requestedTab = searchParams.get('tab');
  const initialTab: TabKey = requestedTab === 'history' ? 'history' : 'request';
  const [tab, setTab] = useState<TabKey>(initialTab);
  const { toast, show: showToast } = useToast();
  const [policyOpen, setPolicyOpen] = useState(false);
  // Post-submit feedback: the id of the just-created request, so the status tab
  // can briefly ring-highlight its new row. Cleared once it fades / on next tab.
  const [highlightId, setHighlightId] = useState<string | null>(null);

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

      {/* Breadcrumb — back to the Time hub (parent), matching /time/corrections */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-ink-muted" aria-label="breadcrumb">
        <Link href={`/${locale}/time`} className="hover:text-ink transition">
          {isTh ? 'เวลางาน' : 'Time'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-ink font-medium">{isTh ? 'การลา' : 'Time Off'}</span>
      </nav>

      {/* Page header */}
      <header className="humi-page-head mb-8">
        <div className="flex flex-col gap-1">
          <CardEyebrow>{isTh ? 'ลางาน' : 'Time Off'}</CardEyebrow>
          <h1
            className={cn(
              'font-display font-semibold tracking-tight text-ink',
              'text-[length:var(--text-display-h1)] leading-[var(--text-display-h1--line-height)]'
            )}
          >
            {isTh ? 'ยื่นคำขอ · ติดตามสถานะ' : 'Request · Track status'}
          </h1>
        </div>
        <div className="humi-spacer" />
        <Button
          variant="primary"
          leadingIcon={<Plus size={16} />}
          onClick={() => setTab('request')}
        >
          {isTh ? 'สร้างคำขอใหม่' : 'New request'}
        </Button>
      </header>

      {/* Balance KPIs — read the SAME leave-balances store the submit gate uses,
          so the cards never contradict the form's remaining-quota check. */}
      <QuotaCards isTh={isTh} />

      {/* Main grid: form (1.2fr) + right column (1fr) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Left — tabs + panel */}
        <Card variant="raised" size="lg">
          <div
            role="tablist"
            aria-label={isTh ? 'มุมมองคำขอลางาน' : 'Leave request views'}
            className="flex flex-wrap gap-1 border-b border-hairline"
          >
            <TabButton active={tab === 'request'} onClick={() => setTab('request')}>
              {isTh ? 'คำขอใหม่' : 'New request'}
            </TabButton>
            <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
              {isTh ? 'สถานะคำขอของฉัน' : 'My request status'}
            </TabButton>
          </div>

          {tab === 'request' && (
            <RequestTab
              onSubmitted={(msg, newId) => {
                // Close the loop: surface the toast, jump to the status tab, and
                // flag the new row so it ring-highlights on first render.
                showToast(msg);
                setHighlightId(newId);
                setTab('history');
              }}
              onSavedDraft={(msg) => showToast(msg)}
            />
          )}

          {tab === 'history' && (
            <HistoryTab
              highlightId={highlightId}
              onHighlightClear={() => setHighlightId(null)}
            />
          )}
        </Card>

        {/* Right column */}
        <aside className="flex flex-col gap-6">
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
            <CardEyebrow className="relative text-accent">{isTh ? 'นโยบาย' : 'Policy'}</CardEyebrow>
            <h3
              className={cn(
                'relative mt-1 font-display font-semibold tracking-tight',
                'text-[length:var(--text-display-h3)] leading-[var(--text-display-h3--line-height)]',
                'text-canvas'
              )}
            >
              {isTh ? 'นโยบายวันลา' : 'Leave policy'}
            </h3>
            <p className="relative mt-2 text-small text-canvas/70 leading-relaxed">
              {isTh
                ? 'วันลาพักร้อนที่ไม่ได้ใช้จะไม่ยกยอดไปปีถัดไป — สิทธิ์รีเซ็ตเป็นโควตาใหม่ทุกต้นปี กรุณาใช้ให้ครบภายในปีปฏิทิน'
                : 'Unused annual leave does not carry over to the next year — entitlement resets to a fresh quota each year, so use it within the calendar year.'}
            </p>
            <div className="relative mt-4">
              <Button variant="primary" onClick={() => setPolicyOpen(true)}>
                {isTh ? 'อ่านนโยบายฉบับเต็ม' : 'Read the full policy'}
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {/* Policy modal — full leave-carryover policy text */}
      <Modal
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title={isTh ? 'นโยบายวันลา · ฉบับเต็ม' : 'Leave policy · Full text'}
      >
        <div className="space-y-4 text-body text-ink-soft leading-relaxed">
          {isTh ? (
            <p>
              วันลาพักร้อนที่ไม่ได้ใช้ภายในปีปฏิทิน <strong className="text-ink">จะไม่ยกยอดไปปีถัดไป</strong>
              {' '}สิทธิ์จะถูกรีเซ็ตเป็นโควตาใหม่เมื่อขึ้นปีใหม่ จึงควรวางแผนใช้สิทธิ์ให้ครบภายในปี
            </p>
          ) : (
            <p>
              Unused annual leave within the calendar year{' '}
              <strong className="text-ink">does not carry over</strong> to the next year.
              Entitlement resets to a fresh quota at the start of each year, so plan to use it within the year.
            </p>
          )}
          <ul className="list-disc space-y-2 pl-5">
            {isTh ? (
              <>
                <li>วันลาทุกประเภทรีเซ็ตเป็นโควตาใหม่ทุกต้นปี (ไม่ยกยอด)</li>
                <li>ควรวางแผนใช้สิทธิ์ให้ครบก่อนสิ้นปีปฏิทิน</li>
                <li>ดูยอดคงเหลือของแต่ละประเภทได้จากการ์ดด้านบนของหน้านี้</li>
              </>
            ) : (
              <>
                <li>All leave types reset to a fresh quota at the start of each year (no carryover).</li>
                <li>Plan to use your entitlement before the calendar year ends.</li>
                <li>Check the remaining balance for each type from the cards at the top of this page.</li>
              </>
            )}
          </ul>
          <p className="text-small text-ink-muted">
            {isTh
              ? 'อ้างอิงระเบียบบริษัทว่าด้วยการลา · ฉบับปรับปรุง 2569'
              : 'Per the company leave policy · 2026 revision'}
          </p>
        </div>
      </Modal>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Inclusive calendar-day count (incl. weekends + holidays) — used when a leave
// type's dayCountMode is 'CalendarDay' (e.g. maternity). WorkingDay mode reuses
// the shared leave-math `countLeaveDays` (weekend + holiday excluding).
// ────────────────────────────────────────────────────────────
function calendarDayCount(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

// ────────────────────────────────────────────────────────────
// Request tab — registry-driven form + full validation + quota reserve
// ────────────────────────────────────────────────────────────

function RequestTab({
  onSubmitted,
}: {
  onSubmitted: (msg: string, newId: string) => void;
  onSavedDraft: (msg: string) => void;
}) {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const isTh = locale !== 'en';
  const addRequest = useLeaveApprovals((s) => s.addRequest);
  const existingRequests = useLeaveApprovals((s) => s.requests);
  const submitHistory = useTimeoffStore((s) => s.submit);

  const userId = useAuthStore((s) => s.userId) ?? DEMO_EMPLOYEE.id;
  const userName = useAuthStore((s) => s.username) ?? DEMO_EMPLOYEE.name;
  const employeeId = userId;
  const attrs = getEmployeeTimeAttrs(employeeId);

  // The selectable leave types: filter store-only ones unless the employee is on
  // a Store calendar (special_leave is offered to Store staff only).
  const selectableTypes = useMemo(
    () => LEAVE_TYPES.filter((t) => !t.storeOnly || attrs.calendarType === 'Store'),
    [attrs.calendarType],
  );

  const [code, setCode] = useState<string>(selectableTypes[0]?.code ?? 'sick_leave');
  // STA-117 — default to the top-3 most-used types; "More" reveals the rest.
  const [showAll, setShowAll] = useState(false);
  const topTypes = useMemo(
    () =>
      TOP_LEAVE_CODES.map((c) => selectableTypes.find((t) => t.code === c)).filter(
        (t): t is LeaveTypeDef => Boolean(t),
      ),
    [selectableTypes],
  );
  const visibleTypes = showAll ? selectableTypes : topTypes;
  const def = getLeaveType(code);
  const [fromISO, setFromISO] = useState('');
  const [toISO, setToISO] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [halfSlot, setHalfSlot] = useState<'morning' | 'afternoon'>('morning');
  const [reason, setReason] = useState('');
  // Mock attachments — the names the employee "attached". The doc-rule check
  // matches required-doc names against this list.
  const [attachments, setAttachments] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isHalfUnit = def?.minUnit === 'half-day';
  const isSingleDay = !!fromISO && (!toISO || toISO === fromISO);
  const useHalf = isHalfUnit && isSingleDay && halfDay;

  // Day count honors the type's dayCountMode (CalendarDay incl. holidays vs
  // WorkingDay excl.). Half-day collapses a single working day to 0.5.
  const totalDays = useMemo(() => {
    if (!fromISO) return 0;
    const end = toISO || fromISO;
    if (def?.dayCountMode === 'CalendarDay') {
      return calendarDayCount(fromISO, end);
    }
    return countLeaveDays(fromISO, end, {
      holidays: HUMI_TH_HOLIDAYS,
      halfDay: useHalf ? halfSlot : 'none',
    });
  }, [fromISO, toISO, def?.dayCountMode, useHalf, halfSlot]);

  // Quota: only quotaTracked types draw a balance bucket.
  const balanceKind = def?.quotaTracked ? LEAVE_CODE_TO_BALANCE_KIND[code] : undefined;
  const remaining = useRemainingFor(employeeId, balanceKind ?? '__none__');
  const overQuota = !!balanceKind && totalDays > 0 && remaining < totalDays;
  // STA-131 — DISPLAY-ONLY clamp so the "Remaining after" chip never shows a
  // negative number. The blocking gate (overQuota) keeps using RAW values; this
  // floor is strictly cosmetic and must NOT feed any predicate.
  const remainingAfter = Math.max(0, remaining - totalDays);

  // Doc rule: the named documents this request must attach.
  const requiredDocs = useMemo(
    () => (code ? requiredDocsFor(code, totalDays) : []),
    [code, totalDays],
  );
  const missingDocs = requiredDocs.filter((d) => !attachments.includes(d));

  // Entitlement: the selected type must be in the persona's selectable set.
  const hasEntitlement = selectableTypes.some((t) => t.code === code);

  // Bookable window: leave supports SF-style advance booking (today..+90d), so it
  // is NOT gated by the payroll period (21→20) — that lock is for time corrections.
  // Both ends of the selected range must fall inside the bookable window.
  const outsideBookable =
    (!!fromISO && !isBookableLeaveDate(fromISO)) ||
    (!!toISO && !isBookableLeaveDate(toISO));

  // The employee's own non-rejected leave intervals — reused for BOTH the submit
  // gate (range clash) and the calendar's per-day overlap markers.
  const ownIntervals = useMemo(
    () =>
      existingRequests
        .filter(
          (r) =>
            r.employeeId === employeeId &&
            r.status !== 'rejected' &&
            !!r.startDate &&
            !!r.endDate,
        )
        .map((r) => ({ start: r.startDate as string, end: r.endDate as string })),
    [existingRequests, employeeId],
  );

  // Overlap (gate): does the selected range clash with any existing interval?
  const overlaps = useMemo(() => {
    if (!fromISO) return false;
    const start = fromISO;
    const end = toISO || fromISO;
    // inclusive interval overlap
    return ownIntervals.some((iv) => iv.start <= end && iv.end >= start);
  }, [ownIntervals, fromISO, toISO]);

  // STA-131 — new restriction predicates (day-off, min/max, service, gender,
  // marital, one-time). Eligibility from the clean HUMI_MY_PROFILE enums; YoS via
  // calcYearOfService. One-time looks at the employee's own non-rejected history
  // for a prior request of the SAME leave code. Each predicate no-ops when the
  // type carries no matching restriction, so the other types are unaffected.
  const eligibility = useMemo(
    () =>
      deriveEmployeeEligibility({
        gender: HUMI_MY_PROFILE.gender,
        maritalStatus: HUMI_MY_PROFILE.maritalStatus,
        hireDate: HUMI_MY_PROFILE.hireDate,
      }),
    [],
  );
  const hasPriorSameCodeRequest = useMemo(
    () =>
      existingRequests.some(
        (r) =>
          r.employeeId === employeeId &&
          r.status !== 'rejected' &&
          // Match on the canonical 23-registry code only. `leaveType` is a coarse
          // enum label (sick/other), a different namespace — never use it as a
          // fallback here or the one-time check silently mis-fires/no-ops.
          r.leaveCode === code,
      ),
    [existingRequests, employeeId, code],
  );
  const extraReasons = useMemo(
    () =>
      validateLeaveRequest({
        type: def,
        totalDays,
        hasRange: !!fromISO,
        eligibility,
        hasPriorSameCodeRequest,
      }).reasons,
    [def, totalDays, fromISO, eligibility, hasPriorSameCodeRequest],
  );

  // Overlap (calendar): the exact ISO days covered by existing requests, so the
  // calendar can mark them. Expanded across each interval (inclusive).
  const overlapDates = useMemo(() => {
    const days: string[] = [];
    for (const iv of ownIntervals) {
      const cursor = new Date(`${iv.start}T00:00:00Z`);
      const last = new Date(`${iv.end}T00:00:00Z`);
      // Guard against pathological ranges (cap at one year of expansion).
      let guard = 0;
      while (cursor <= last && guard < 366) {
        days.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        guard += 1;
      }
    }
    return days;
  }, [ownIntervals]);

  // Calendar pre-disables any day outside the bookable leave window.
  const isCalendarDateDisabled = useMemo(
    () => (iso: string) => !isBookableLeaveDate(iso),
    [],
  );

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!fromISO) errs.fromDate = isTh ? 'กรุณาเลือกวันที่เริ่มลา' : 'Select a start date';
    if (!reason.trim()) errs.reason = isTh ? 'กรุณาระบุเหตุผล' : 'Reason is required';
    else if (reason.trim().length < 5)
      errs.reason = isTh ? 'เหตุผลต้องมีอย่างน้อย 5 ตัวอักษร' : 'At least 5 characters';
    if (!hasEntitlement)
      errs.entitlement = isTh
        ? 'คุณไม่มีสิทธิ์ลาประเภทนี้'
        : 'You are not entitled to this leave type';
    if (overQuota)
      errs.quota = isTh
        ? `เกินสิทธิ — คงเหลือ ${remaining} วัน แต่ขอลา ${totalDays} วัน`
        : `Over quota — ${remaining} day(s) left but requesting ${totalDays}`;
    if (overlaps)
      errs.overlap = isTh
        ? 'ช่วงวันนี้ทับซ้อนกับคำขอลาที่รออนุมัติหรืออนุมัติแล้ว'
        : 'This range overlaps a pending/approved leave';
    if (outsideBookable)
      errs.period = isTh
        ? `จองล่วงหน้าได้ไม่เกิน ${LEAVE_BOOKING_HORIZON_DAYS} วัน และต้องไม่ใช่วันที่ผ่านมาแล้ว`
        : `Bookable only from today up to ${LEAVE_BOOKING_HORIZON_DAYS} days ahead (no past dates)`;
    if (missingDocs.length > 0)
      errs.docs = isTh
        ? `ต้องแนบเอกสาร: ${missingDocs.join(', ')}`
        : `Attach required document(s): ${missingDocs.join(', ')}`;
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const endISO = toISO || fromISO;
    const fromLabel = formatDate(fromISO, 'medium', 'th');
    const toLabel = formatDate(endISO, 'medium', 'th');
    const levels = levelsForLeaveType(code);
    const unit: '30min' | 'half-day' | '1-day' = useHalf ? 'half-day' : def?.minUnit ?? '1-day';

    // Build the canonical queue snapshot so the request surfaces in the unified
    // /quick-approve inbox with the correct (sliced) approval chain.
    const chain = appliedChainFor('leave', code);
    const queueSnapshot: PendingRequest = {
      id: '', // filled below from the generated id
      type: 'leave',
      requester: {
        id: employeeId,
        name: userName,
        position: isTh ? (def?.nameTh ?? code) : (def?.nameEn ?? code),
        department: attrs.calendarType === 'Store' ? 'Store' : 'Head Office',
      },
      description: `${isTh ? (def?.nameTh ?? code) : (def?.nameEn ?? code)} — ${fromLabel}${
        endISO !== fromISO ? ` – ${toLabel}` : ''
      } · ${totalDays} ${isTh ? 'วัน' : 'day(s)'}`,
      submittedAt: new Date().toISOString(),
      urgency: 'normal',
      waitingDays: 0,
      attachments: attachments.length > 0 ? attachments : undefined,
      details: { leaveType: code, startDate: fromISO, endDate: endISO, reason: reason.trim() },
      approvalTimeline: chain.map((step, i) => ({
        step: i + 1,
        approver: isTh ? step.labelTh : step.labelEn,
        status: 'pending' as const,
      })),
    };

    const id = addRequest({
      employeeId,
      employeeName: userName,
      leaveType: code,
      leaveCode: code,
      startDate: fromISO,
      endDate: endISO,
      reason: reason.trim(),
      unit,
      days: totalDays,
      halfDay: useHalf,
      docs: attachments,
      queueSnapshot: { ...queueSnapshot, id: '' },
    });
    // Backfill the queueSnapshot id now that we have the generated id.
    useLeaveApprovals.setState((s) => ({
      requests: s.requests.map((r) =>
        r.id === id && r.queueSnapshot ? { ...r, queueSnapshot: { ...r.queueSnapshot, id } } : r,
      ),
    }));

    // Mirror into the legacy history list so the History tab shows it too.
    submitHistory({
      kind: leaveCodeToHistoryKind(code),
      kindLabel: isTh ? (def?.nameTh ?? code) : (def?.nameEn ?? code),
      fromDate: fromLabel,
      toDate: toLabel,
      reason: reason.trim(),
    });

    setFromISO('');
    setToISO('');
    setHalfDay(false);
    setReason('');
    setAttachments([]);
    setErrors({});
    onSubmitted(
      levels === 2
        ? isTh
          ? 'ส่งคำขอลาแล้ว · จองสิทธิ์ไว้ · รอหัวหน้างาน → ฝ่ายบุคคล'
          : 'Leave submitted · quota reserved · awaiting Manager → HR'
        : isTh
          ? 'ส่งคำขอลาแล้ว · จองสิทธิ์ไว้ · รอหัวหน้างานอนุมัติ'
          : 'Leave submitted · quota reserved · awaiting manager',
      id,
    );
  }

  const blocking =
    !hasEntitlement ||
    overQuota ||
    overlaps ||
    outsideBookable ||
    missingDocs.length > 0 ||
    extraReasons.length > 0;

  // Live block reasons — derived from the SAME predicates that compute `blocking`,
  // so every state where Submit is disabled visibly says WHY + what to do. These
  // surface immediately (not only after a submit attempt), since the button is
  // already `disabled={blocking}`, which would otherwise make validate()'s
  // messages unreachable.
  const liveBlocks: Array<{ key: string; msg: string }> = [];
  if (!hasEntitlement)
    liveBlocks.push({
      key: 'entitlement',
      msg: isTh
        ? 'คุณไม่มีสิทธิ์ลาประเภทนี้ — เลือกประเภทการลาอื่น'
        : 'You are not entitled to this leave type — pick another type',
    });
  if (overQuota)
    liveBlocks.push({
      key: 'quota',
      msg: isTh
        ? `ยอดวันลาไม่เพียงพอ — คงเหลือ ${remaining} วัน แต่ขอลา ${totalDays} วัน ลองลดจำนวนวันหรือเลือกวันอื่น`
        : `Insufficient Leave Balance — ${remaining} day(s) left but requesting ${totalDays}. Reduce the days or pick another range`,
    });
  if (overlaps)
    liveBlocks.push({
      key: 'overlap',
      msg: isTh
        ? 'ช่วงวันนี้ทับซ้อนกับคำขอลาที่รออนุมัติหรืออนุมัติแล้ว — เลือกช่วงวันที่ว่าง'
        : 'This range overlaps a pending/approved leave — choose an open range',
    });
  if (outsideBookable)
    liveBlocks.push({
      key: 'period',
      msg: isTh
        ? `จองล่วงหน้าได้ไม่เกิน ${LEAVE_BOOKING_HORIZON_DAYS} วัน และต้องไม่ใช่วันที่ผ่านมาแล้ว — เลือกวันในช่วงที่จองได้`
        : `Bookable only from today up to ${LEAVE_BOOKING_HORIZON_DAYS} days ahead (no past dates) — pick a date in range`,
    });
  if (missingDocs.length > 0)
    liveBlocks.push({
      key: 'docs',
      msg: isTh
        ? `ต้องแนบเอกสาร: ${missingDocs.join(', ')} — กดปุ่ม “แนบ” ในรายการเอกสารด้านบน`
        : `Attach required document(s): ${missingDocs.join(', ')} — use the "Attach" buttons above`,
    });
  // STA-131 — new restriction reasons (day-off, min/max, service, gender,
  // marital, one-time). The seeded gender restriction (Maternity = Female) is
  // a SAMPLE pending BA, so its block carries an explicit "sample rule" label so
  // HR does not read it as confirmed policy.
  for (const r of extraReasons) {
    const isSeededGenderSample = r.key === 'gender' && !!def?.genderRestriction;
    const sampleLabel = isTh ? ' · ตัวอย่าง (รอยืนยันจาก BA)' : ' · sample rule (pending BA confirmation)';
    liveBlocks.push({
      key: r.key,
      msg: (isTh ? r.msgTh : r.msgEn) + (isSeededGenderSample ? sampleLabel : ''),
    });
  }

  return (
    <div className="pt-6">
      <CardTitle>{isTh ? 'ยื่นคำขอลางาน' : 'Request leave'}</CardTitle>
      <p className="mt-1 text-small text-ink-muted">
        {isTh
          ? 'เลือกประเภทการลา ช่วงวันที่ และแนบเอกสารตามที่ระบบกำหนด'
          : 'Pick a leave type, the date range, and attach any required documents.'}
      </p>

      {/* Leave type selector — registry-driven (23 types) */}
      <div
        role="radiogroup"
        aria-label={isTh ? 'ประเภทการลา' : 'Leave type'}
        className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {visibleTypes.map((opt) => {
          const selected = code === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setCode(opt.code);
                setAttachments([]);
                setHalfDay(false);
              }}
              className={cn(
                'flex items-start gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                selected
                  ? 'border-ink bg-canvas-soft'
                  : 'border-hairline bg-surface hover:border-ink-faint'
              )}
            >
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent"
              >
                <Sun size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-body font-semibold text-ink truncate">
                  {isTh ? opt.nameTh : opt.nameEn}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold',
                      opt.paid
                        ? 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]'
                        : 'bg-[color:var(--color-butter-soft)] text-ink-muted',
                    )}
                  >
                    {opt.paid ? (isTh ? 'รับค่าจ้าง' : 'Paid') : isTh ? 'ไม่รับค่าจ้าง' : 'Unpaid'}
                  </span>
                  {opt.quotaTracked && (
                    <span className="text-[length:var(--text-eyebrow)] text-ink-muted">
                      {isTh ? 'มีโควต้า' : 'Quota'}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {selectableTypes.length > topTypes.length && (
        <div className="mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
          >
            {showAll ? (isTh ? 'แสดงน้อยลง' : 'Show less') : (isTh ? 'ดูทั้งหมด' : 'Show all')}
          </Button>
        </div>
      )}

      {/* Date range — selectable month calendar (range + weekend/holiday markers) */}
      <div className="mt-5">
        <p className="mb-2 text-small font-medium text-ink-soft">
          {isTh ? 'เลือกช่วงวันที่ลา *' : 'Select date range *'}
        </p>
        <LeaveRangeCalendar
          from={fromISO}
          to={toISO}
          holidays={HUMI_TH_HOLIDAYS}
          locale={locale}
          isDateDisabled={isCalendarDateDisabled}
          overlapDates={overlapDates}
          onChange={({ from, to }) => {
            setFromISO(from);
            setToISO(to);
            if (halfDay && from && to && from !== to) setHalfDay(false);
          }}
        />
        {errors.fromDate && <InlineError msg={errors.fromDate} />}

        {/* Duration — explicit full-day / half-day choice on every single-day leave.
            Half-day is enabled only for types whose minUnit allows it; 1-day-min
            types show the choice with half-day disabled + a hint. */}
        {isSingleDay && fromISO && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-small font-medium text-ink-soft">
              {isTh ? 'ระยะเวลา *' : 'Duration *'}
            </p>
            <div role="radiogroup" aria-label={isTh ? 'ระยะเวลาการลา' : 'Leave duration'} className="flex gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={!halfDay}
                onClick={() => setHalfDay(false)}
                className={cn(
                  'rounded-[var(--radius-sm)] border px-4 py-1.5 text-small font-medium transition-colors',
                  !halfDay
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-hairline bg-surface text-ink-muted hover:border-ink-faint',
                )}
              >
                {isTh ? 'เต็มวัน' : 'Full day'}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={halfDay}
                disabled={!isHalfUnit}
                onClick={() => isHalfUnit && setHalfDay(true)}
                title={!isHalfUnit ? (isTh ? 'ประเภทนี้ลาขั้นต่ำ 1 วัน' : 'This type has a 1-day minimum') : undefined}
                className={cn(
                  'rounded-[var(--radius-sm)] border px-4 py-1.5 text-small font-medium transition-colors',
                  halfDay
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-hairline bg-surface text-ink-muted hover:border-ink-faint',
                  !isHalfUnit && 'cursor-not-allowed opacity-50',
                )}
              >
                {isTh ? 'ครึ่งวัน' : 'Half day'}
              </button>
            </div>
            {!isHalfUnit && (
              <p className="text-small text-ink-muted">
                {isTh ? 'ประเภทการลานี้ลาขั้นต่ำ 1 วัน (นับเป็นเต็มวัน)' : 'This leave type has a 1-day minimum (counts as full day)'}
              </p>
            )}
            {halfDay && isHalfUnit && (
              <div role="radiogroup" aria-label={isTh ? 'ช่วงครึ่งวัน' : 'Half-day slot'} className="flex gap-2">
                {(['morning', 'afternoon'] as const).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    role="radio"
                    aria-checked={halfSlot === slot}
                    onClick={() => setHalfSlot(slot)}
                    className={cn(
                      'rounded-[var(--radius-sm)] border px-3 py-1.5 text-small font-medium transition-colors',
                      halfSlot === slot
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-hairline bg-surface text-ink-muted hover:border-ink-faint',
                    )}
                  >
                    {slot === 'morning'
                      ? isTh ? 'ครึ่งเช้า' : 'Morning'
                      : isTh ? 'ครึ่งบ่าย' : 'Afternoon'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live day-count + remaining + over-quota chip */}
        {totalDays > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] bg-canvas-soft px-4 py-3">
            <div>
              <p className="text-[length:var(--text-eyebrow)] uppercase tracking-wide text-ink-muted">
                {isTh ? 'รวมวันลา' : 'Total days'}
              </p>
              <p className="text-body font-semibold text-ink tabular-nums">
                {totalDays} {isTh ? 'วัน' : 'd'}
              </p>
            </div>
            {balanceKind && (
              <>
                <div className="h-8 w-px bg-hairline" aria-hidden />
                <div>
                  <p className="text-[length:var(--text-eyebrow)] uppercase tracking-wide text-ink-muted">
                    {isTh ? 'คงเหลือหลังลา' : 'Remaining after'}
                  </p>
                  <p className="text-body font-semibold text-ink tabular-nums">
                    {remainingAfter} {isTh ? 'วัน' : 'd'}
                  </p>
                </div>
              </>
            )}
            {overQuota && (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-danger-soft)] px-3 py-1 text-small font-semibold text-[color:var(--color-danger)]">
                <AlertCircle size={14} aria-hidden />
                {isTh ? 'เกินสิทธิ' : 'Over quota'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Reason */}
      <Field
        label={isTh ? 'เหตุผล *' : 'Reason *'}
        htmlFor="leave-reason"
        className="mt-3"
        error={errors.reason}
      >
        <textarea
          id="leave-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={isTh ? 'อธิบายเหตุผลการลา (อย่างน้อย 5 ตัวอักษร)' : 'Describe the reason (min 5 chars)'}
          aria-invalid={!!errors.reason}
          aria-describedby={errors.reason ? 'err-reason' : undefined}
          className={cn(inputClass, 'min-h-[80px] resize-y', errors.reason && 'border-[color:var(--color-warning)]')}
        />
      </Field>

      {/* Required-document checklist (Doc Rule) */}
      {requiredDocs.length > 0 && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-3">
          <p className="text-[length:var(--text-eyebrow)] uppercase tracking-wide text-ink-muted">
            {isTh ? 'เอกสารที่ต้องแนบ' : 'Required documents'}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {requiredDocs.map((doc) => {
              const present = attachments.includes(doc);
              return (
                <li key={doc} className="flex items-center justify-between gap-2 text-small">
                  <span className="flex items-center gap-1.5 text-ink">
                    {present ? (
                      <Check size={14} className="text-[color:var(--color-success)]" aria-hidden />
                    ) : (
                      <AlertCircle size={14} className="text-[color:var(--color-danger)]" aria-hidden />
                    )}
                    {doc}
                  </span>
                  {!present && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAttachments((prev) => [...prev, doc])}
                    >
                      {isTh ? 'แนบ' : 'Attach'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Optional attachment (non-required types allow ≥1) */}
      <button
        type="button"
        onClick={() =>
          setAttachments((prev) => [
            ...prev,
            `${isTh ? 'เอกสารแนบ' : 'Attachment'} ${prev.length + 1}`,
          ])
        }
        className={cn(
          'humi-dropzone mt-3 flex min-h-[44px] items-center justify-center gap-2 text-small text-ink-muted',
          'w-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
        )}
      >
        <Paperclip size={14} aria-hidden />
        <span>{isTh ? 'แนบเอกสารประกอบ (ถ้ามี)' : 'Attach a supporting document (optional)'}</span>
      </button>
      {attachments.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <li
              key={`${a}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-small text-accent"
            >
              <Paperclip size={12} aria-hidden />
              {a}
              <button
                type="button"
                aria-label={isTh ? 'ลบไฟล์แนบ' : 'Remove attachment'}
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                className="hover:text-ink"
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-small text-ink-muted" data-testid="timeoff-attachment-boundary">
        {isTh ? DOCUMENT_UPLOAD_HELPER_TH : DOCUMENT_UPLOAD_HELPER_EN}
      </p>

      {/* Live block reasons (pumpkin / danger — never red). Shown as soon as a
          blocking condition holds, so the disabled Submit always says WHY +
          how to fix it. */}
      {liveBlocks.length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-4 flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--color-danger)] bg-[color:var(--color-danger-soft)] p-3"
        >
          <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-wide text-[color:var(--color-danger)]">
            {isTh ? 'ยังส่งคำขอไม่ได้' : 'Cannot submit yet'}
          </p>
          {liveBlocks.map((b) => (
            <InlineError key={b.key} msg={b.msg} />
          ))}
        </div>
      )}

      {/* Pre-submit approval chain preview */}
      <div className="mt-5 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-4">
        <p className="text-[length:var(--text-eyebrow)] uppercase tracking-wide text-ink-muted">
          {isTh ? 'เส้นทางอนุมัติ' : 'Approval route'}
        </p>
        <div className="mt-2">
          <ApprovalChain
            chain={(routingStagesFor('leave').slice(0, levelsForLeaveType(code))) as ApproverStage[]}
            locale={locale}
            activeStage={undefined}
            size="sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" className="h-11" onClick={handleSubmit} disabled={blocking}>
          {isTh ? 'ส่งคำขอ' : 'Submit'}
        </Button>
        <p className="ml-auto text-small text-ink-muted">
          {isTh ? 'อนุมัติที่หน้า คิวอนุมัติ' : 'Approved in the Approvals queue'}
        </p>
      </div>
    </div>
  );
}

function InlineError({ msg }: { msg: string }) {
  return (
    <p
      role="alert"
      className="flex items-center gap-1 text-small font-medium text-[color:var(--color-danger)]"
    >
      <AlertCircle size={13} aria-hidden />
      {msg}
    </p>
  );
}

// ────────────────────────────────────────────────────────────
// History / status tab — live status from leave-approvals, plus the legacy
// seeded history. Shows pending → (awaiting HR) → approved | rejected.
// ────────────────────────────────────────────────────────────

const APPROVAL_STATUS_TONE: Record<ApprovalLeaveStatus, string> = HISTORY_TONE;

function liveStatusLabel(r: LeaveRequest, isTh: boolean): { label: string; tone: string } {
  const tone =
    r.status === 'approved'
      ? HISTORY_TONE.approved
      : r.status === 'rejected'
        ? HISTORY_TONE.rejected
        : HISTORY_TONE.pending;
  // Single source of truth — narrates the manager → HR stage on 2-level chains.
  return { label: leaveStageLabel(r.status, r.awaitingNext, isTh), tone };
}

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
              APPROVAL_STATUS_TONE[h.status]
            )}
          >
            {(locale === 'th' ? HISTORY_LABEL_TH : HISTORY_LABEL_EN)[h.status]}
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

function HistoryTab({
  highlightId,
  onHighlightClear,
}: {
  highlightId?: string | null;
  onHighlightClear?: () => void;
} = {}) {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const isTh = locale !== 'en';
  const history = useTimeoffStore((s) => s.history);
  const userId = useAuthStore((s) => s.userId) ?? DEMO_EMPLOYEE.id;

  // Post-submit highlight: ring the new row, then fade it after ~2.4s. Clearing
  // the parent's flag prevents the ring from re-applying on later re-renders.
  const [ringActive, setRingActive] = useState(false);
  useEffect(() => {
    if (!highlightId) return;
    setRingActive(true);
    const t = setTimeout(() => {
      setRingActive(false);
      onHighlightClear?.();
    }, 2400);
    return () => clearTimeout(t);
  }, [highlightId, onHighlightClear]);
  // Select raw array — filtering inside the selector returns a new reference every snapshot,
  // triggering the "getSnapshot should be cached" infinite-loop crash. Filter via useMemo instead.
  const allRequests = useLeaveApprovals((s) => s.requests);
  const liveRequests = useMemo(
    () =>
      allRequests.filter(
        (r) => r.employeeId === userId && r.queueSnapshot?.type === 'leave' && !!r.leaveCode,
      ),
    [allRequests, userId],
  );

  if (history.length === 0 && liveRequests.length === 0) {
    return (
      <div className="py-12 text-center text-small text-ink-muted">
        {isTh ? 'ยังไม่มีคำขอลา' : 'No leave requests yet'}
      </div>
    );
  }

  return (
    <div className="pt-2">
      {/* Live (this-session) requests with reserved/awaiting status */}
      {liveRequests.length > 0 && (
        <ul role="list" className="divide-y divide-hairline">
          {liveRequests.map((r) => {
            const def = getLeaveType(r.leaveCode ?? '');
            const { label, tone } = liveStatusLabel(r, isTh);
            const isHighlighted = ringActive && r.id === highlightId;
            return (
              <li
                key={r.id}
                data-testid={isHighlighted ? 'timeoff-new-row-highlight' : undefined}
                className={cn(
                  'flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:gap-3',
                  isHighlighted &&
                    'rounded-[var(--radius-md)] px-3 ring-2 ring-accent-soft bg-accent-soft/30 transition-all duration-500',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={(isTh ? def?.nameTh : def?.nameEn) ?? r.leaveType} tone="teal" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-semibold text-ink">
                      {formatDate(r.startDate, 'medium', locale)}
                      {r.endDate !== r.startDate ? ` – ${formatDate(r.endDate, 'medium', locale)}` : ''}
                    </p>
                    <p className="text-small text-ink-muted">
                      {(isTh ? def?.nameTh : def?.nameEn) ?? r.leaveType} · {r.days ?? 0} {isTh ? 'วัน' : 'd'}
                      {' · '}
                      {r.reason}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end shrink-0">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] whitespace-nowrap',
                      tone,
                    )}
                  >
                    {label}
                  </span>
                  {r.status === 'pending' && (r.reservedDays ?? 0) > 0 && (
                    <span className="text-[length:var(--text-eyebrow)] text-ink-muted">
                      {isTh ? `จองสิทธิ์ ${r.reservedDays} วัน` : `Reserved ${r.reservedDays}d`}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Legacy seeded history */}
      {history.length > 0 && (
        <ul role="list" className="divide-y divide-hairline">
          {history.map((h: TimeoffHistoryItem) => (
            <HistoryRow key={h.id} h={h} locale={locale} />
          ))}
        </ul>
      )}
    </div>
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
  className,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
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
