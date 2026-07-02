'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Check, Paperclip, AlertCircle, ChevronRight, Sun, X } from 'lucide-react';
import {
  Button,
  Card,
  CardEyebrow,
  CardTitle,
  LeaveRangeCalendar,
} from '@/components/humi';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date';
import {
  countLeaveDays,
  durationMinutes as spanMinutes,
  hourlyLeaveFraction,
  isValidHourlySpan,
  timeOptions,
  endTimeOptions,
} from '@/lib/leave-math';
import { DOCUMENT_UPLOAD_HELPER_TH, DOCUMENT_UPLOAD_HELPER_EN } from '@/lib/document-boundary';
import {
  HUMI_TH_HOLIDAYS,
  HUMI_MY_PROFILE,
  type LeaveKind,
} from '@/lib/humi-mock-data';
import { useTimeoffStore } from '@/stores/humi-timeoff-slice';
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
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useRemainingFor, useLeaveBalances } from '@/stores/leave-balances';
import type { PendingRequest } from '@/lib/quick-approve-api';
import { routingStagesFor } from '@/lib/approval-routing';

// Demo employee identity for the ESS request portal (Tier D persona).
const DEMO_EMPLOYEE = { id: 'EMP001', name: 'สมชาย ใจดี' };

// Project a registry leave `code` (23 types) onto the legacy history `LeaveKind`
// union (8 buckets), so the My Request list shows the right icon/category per type
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

// ════════════════════════════════════════════════════════════
// /timeoff — Leave request portal (Group A reconcile)
// Create-only: ESS submit a new leave request. Status/history lives on
// /time/my-requests; approval happens in /quick-approve + /workflows/leave/[id].
// Drives the 23-type registry, doc rules, quota reserve, and validation.
// ════════════════════════════════════════════════════════════

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

// STA-151/STA-152 — leave types that get the Full/Half/Hourly duration cards
// (sick types only). 'sick_leave_unpaid' is quotaTracked:false, so its hourly
// fractional amount is display-only and never decrements a balance.
const HOURLY_DURATION_CODES = ['sick_leave', 'sick_leave_unpaid'] as const;

function QuotaCards({ isTh }: { isTh: boolean }) {
  const employeeId = useEssEmployeeId();
  const balances = useLeaveBalances((s) => s.balances);
  const quotaTypes = useMemo(() => quotaTrackedTypes(), []);
  // STA-150 — default to the curated top-3 (Sick → Annual → Personal); the rest
  // live behind a View All / Show Less toggle (mirrors the RequestTab pattern).
  const [showAllBalances, setShowAllBalances] = useState(false);
  const topCodes = TOP_LEAVE_CODES as readonly string[];
  const visible = showAllBalances
    ? quotaTypes
    : quotaTypes.filter((t) => topCodes.includes(t.code));
  const hasMore = quotaTypes.length > topCodes.length;

  return (
    <>
    <section
      aria-label={isTh ? 'ยอดวันลาคงเหลือ' : 'Leave balances'}
      className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3"
    >
      {visible.map((t, i) => {
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
                  className={cn('h-full rounded-full', QUOTA_BAR_CLASSES[quotaTypes.indexOf(t) % QUOTA_BAR_CLASSES.length])}
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
    {hasMore && (
      <div className="mb-8 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={showAllBalances}
          aria-label={
            showAllBalances
              ? (isTh ? 'แสดงยอดวันลาน้อยลง' : 'Show fewer leave balances')
              : (isTh ? 'ดูยอดวันลาทั้งหมด' : 'View all leave balances')
          }
          onClick={() => setShowAllBalances((v) => !v)}
        >
          {showAllBalances ? (isTh ? 'แสดงน้อยลง' : 'Show less') : (isTh ? 'ดูทั้งหมด' : 'View all')}
        </Button>
      </div>
    )}
    </>
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
  const router = useRouter();
  const { toast, show: showToast } = useToast();

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
            {isTh ? 'ยื่นคำขอลางาน' : 'Request time off'}
          </h1>
        </div>
      </header>

      {/* Balance KPIs — read the SAME leave-balances store the submit gate uses,
          so the cards never contradict the form's remaining-quota check. */}
      <QuotaCards isTh={isTh} />

      {/* Create-only: single centered column. Status + history live on
          /time/my-requests, so this page just submits a new request. */}
      <div className="mx-auto w-full max-w-3xl">
        <Card variant="raised" size="lg">
          <RequestTab
            onSubmitted={(msg, newId) => {
              // Surface the toast, then hand off to the status list where the
              // newly-created request now lives.
              showToast(msg);
              router.push(`/${locale}/time/my-requests?new=${newId}`);
            }}
            onSavedDraft={(msg) => showToast(msg)}
          />
        </Card>
      </div>
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
  // STA-151 — single source of truth for leave duration. Replaces the old
  // `halfDay` bool so `half` and `hourly` can never both be truthy.
  const [durationMode, setDurationMode] = useState<'full' | 'half' | 'hourly'>('full');
  const [halfSlot, setHalfSlot] = useState<'morning' | 'afternoon'>('morning');
  // STA-151 — hourly window (Sick only). 30-min increments, default 08:00–18:00.
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  // Mock attachments — the names the employee "attached". The doc-rule check
  // matches required-doc names against this list.
  const [attachments, setAttachments] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isHalfUnit = def?.minUnit === 'half-day';
  const isSingleDay = !!fromISO && (!toISO || toISO === fromISO);
  // STA-151/STA-152 — Sick (paid + unpaid) is minUnit '1-day' in the registry,
  // so Half is dead for it. Enable Half + Hourly via a Sick-specific override
  // (NOT a minUnit change, which would ripple into quota/docs/the registry).
  // Both 'sick_leave' (paid) and 'sick_leave_unpaid' get Full/Half/Hourly; the
  // unpaid type is quotaTracked:false so its fractional amount is display-only.
  // Half is available when the type allows it OR it's a sick type; Hourly is
  // sick-only.
  const isSick = (HOURLY_DURATION_CODES as readonly string[]).includes(code);
  const halfEnabled = isHalfUnit || isSick;
  const hourlyEnabled = isSick;
  const useHalf = durationMode === 'half' && halfEnabled && isSingleDay;
  const useHourly = durationMode === 'hourly' && hourlyEnabled && isSingleDay;

  // STA-151 — hourly span → fractional day (Sick only, single day).
  const hourlyMinutes = useHourly ? spanMinutes(startTime, endTime) : null;
  const hourlySpanValid = isValidHourlySpan(hourlyMinutes);
  // End-time options are gated by the chosen start (min 30 / max 4h / end>start).
  const endTimeChoices = useMemo(() => endTimeOptions(startTime), [startTime]);

  // Day count honors the type's dayCountMode (CalendarDay incl. holidays vs
  // WorkingDay excl.). Half-day collapses a single working day to 0.5. Hourly
  // (Sick only) bypasses countLeaveDays and uses a fractional-day amount.
  const totalDays = useMemo(() => {
    if (!fromISO) return 0;
    if (useHourly) {
      return hourlySpanValid && hourlyMinutes !== null
        ? hourlyLeaveFraction(hourlyMinutes)
        : 0;
    }
    const end = toISO || fromISO;
    if (def?.dayCountMode === 'CalendarDay') {
      return calendarDayCount(fromISO, end);
    }
    return countLeaveDays(fromISO, end, {
      holidays: HUMI_TH_HOLIDAYS,
      halfDay: useHalf ? halfSlot : 'none',
    });
  }, [fromISO, toISO, def?.dayCountMode, useHalf, halfSlot, useHourly, hourlySpanValid, hourlyMinutes]);

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

  // Bookable window (STA-156): from the start of the PREVIOUS payroll cycle
  // (the backdate floor — retroactive leave is allowed up to 1 previous cycle,
  // cycle = 21st→20th) through +90d advance booking. Both ends of the selected
  // range must fall inside it. (The timesheet-correction lock is separate, see
  // period.ts.)
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
            r.status !== 'cancelled' &&
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
          r.status !== 'cancelled' &&
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
    // STA-176 — reason is OPTIONAL for sick leave (visible but not required).
    // Non-sick types keep the existing reason-required rule.
    if (!isSick) {
      if (!reason.trim()) errs.reason = isTh ? 'กรุณาระบุเหตุผล' : 'Reason is required';
      else if (reason.trim().length < 5)
        errs.reason = isTh ? 'เหตุผลต้องมีอย่างน้อย 5 ตัวอักษร' : 'At least 5 characters';
    }
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
        ? `จองย้อนหลังได้ถึงต้นรอบจ่ายเงินเดือนก่อนหน้า (1 รอบ) จนถึงล่วงหน้า ${LEAVE_BOOKING_HORIZON_DAYS} วัน`
        : `Bookable from the start of the previous payroll cycle (1 cycle back) up to ${LEAVE_BOOKING_HORIZON_DAYS} days ahead`;
    if (missingDocs.length > 0)
      errs.docs = isTh
        ? `ต้องแนบเอกสาร: ${missingDocs.join(', ')}`
        : `Attach required document(s): ${missingDocs.join(', ')}`;
    // STA-151 — hourly span gate (distinct from STA-130's errs.period). Require
    // both times; span must be 30 ≤ minutes ≤ 240 (inclusive), end > start.
    if (useHourly && (!startTime || !endTime || !hourlySpanValid))
      errs.hourly = isTh
        ? 'เลือกเวลาเริ่มและสิ้นสุด — ลารายชั่วโมงต้องไม่ต่ำกว่า 30 นาที และไม่เกิน 4 ชั่วโมง'
        : 'Pick a start and end time — hourly leave must be 30 minutes to 4 hours';
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
    // STA-151 — derive unit from durationMode (overrides def.minUnit for the
    // Sick half/hourly cases that minUnit can't express). hourly → '30min'.
    const unit: '30min' | 'half-day' | '1-day' = useHourly
      ? '30min'
      : useHalf
        ? 'half-day'
        : def?.minUnit ?? '1-day';

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
      // STA-151 — carry the hourly span on the payload (Sick only).
      ...(useHourly && hourlyMinutes !== null
        ? { startTime, endTime, durationMinutes: hourlyMinutes }
        : {}),
      docs: attachments,
      queueSnapshot: { ...queueSnapshot, id: '' },
    });
    // Backfill the queueSnapshot id now that we have the generated id.
    useLeaveApprovals.setState((s) => ({
      requests: s.requests.map((r) =>
        r.id === id && r.queueSnapshot ? { ...r, queueSnapshot: { ...r.queueSnapshot, id } } : r,
      ),
    }));

    // Mirror into the legacy history list so the My Request list (/time/my-requests) shows it too.
    submitHistory({
      kind: leaveCodeToHistoryKind(code),
      kindLabel: isTh ? (def?.nameTh ?? code) : (def?.nameEn ?? code),
      fromDate: fromLabel,
      toDate: toLabel,
      reason: reason.trim(),
    });

    setFromISO('');
    setToISO('');
    setDurationMode('full');
    setStartTime('');
    setEndTime('');
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
        ? `จองย้อนหลังได้ถึงต้นรอบจ่ายเงินเดือนก่อนหน้า (1 รอบ) จนถึงล่วงหน้า ${LEAVE_BOOKING_HORIZON_DAYS} วัน — เลือกวันในช่วงที่จองได้`
        : `Bookable from the start of the previous payroll cycle (1 cycle back) up to ${LEAVE_BOOKING_HORIZON_DAYS} days ahead — pick a date in range`,
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
                setDurationMode('full');
                setStartTime('');
                setEndTime('');
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
            // Half / hourly only apply to a single day — drop them on a range.
            if (durationMode !== 'full' && from && to && from !== to) {
              setDurationMode('full');
            }
          }}
        />
        {errors.fromDate && <InlineError msg={errors.fromDate} />}

        {/* Duration — Full / Half / Hourly cards on every single-day leave.
            STA-151: Half is enabled for half-day types OR Sick (Sick-specific
            override). Hourly is Sick-only. Full is always available. */}
        {isSingleDay && fromISO && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-small font-medium text-ink-soft">
              {isTh ? 'ระยะเวลา *' : 'Duration *'}
            </p>
            <div
              role="radiogroup"
              aria-label={isTh ? 'ระยะเวลาการลา' : 'Leave duration'}
              className="flex flex-wrap gap-2"
            >
              {([
                { mode: 'full', enabled: true, labelTh: 'เต็มวัน', labelEn: 'Full day' },
                { mode: 'half', enabled: halfEnabled, labelTh: 'ครึ่งวัน', labelEn: 'Half day' },
                { mode: 'hourly', enabled: hourlyEnabled, labelTh: 'รายชั่วโมง', labelEn: 'Hourly' },
              ] as const).map((opt) => {
                const active = durationMode === opt.mode;
                const disabledHint = !opt.enabled
                  ? opt.mode === 'hourly'
                    ? isTh ? 'ลารายชั่วโมงรองรับเฉพาะลาป่วย' : 'Hourly is available for Sick Leave only'
                    : isTh ? 'ประเภทนี้ลาขั้นต่ำ 1 วัน' : 'This type has a 1-day minimum'
                  : undefined;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!opt.enabled}
                    onClick={() => opt.enabled && setDurationMode(opt.mode)}
                    title={disabledHint}
                    className={cn(
                      'rounded-[var(--radius-sm)] border px-4 py-1.5 text-small font-medium transition-colors',
                      active
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-hairline bg-surface text-ink-muted hover:border-ink-faint',
                      !opt.enabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {isTh ? opt.labelTh : opt.labelEn}
                  </button>
                );
              })}
            </div>

            {/* AM/PM slot — Half day only */}
            {durationMode === 'half' && halfEnabled && (
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

            {/* Hourly — Start + End selects. End options gated by start
                (min 30 min / max 4 hr / end > start). */}
            {durationMode === 'hourly' && hourlyEnabled && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-small font-medium text-ink-soft">
                      {isTh ? 'เวลาเริ่ม' : 'Start time'}
                    </span>
                    <select
                      value={startTime}
                      onChange={(e) => {
                        const next = e.target.value;
                        setStartTime(next);
                        // Drop a now-invalid end so the gate stays consistent.
                        if (endTime && !endTimeOptions(next).includes(endTime)) {
                          setEndTime('');
                        }
                      }}
                      className="rounded-[var(--radius-sm)] border border-hairline bg-surface px-3 py-1.5 text-small text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <option value="">{isTh ? 'เลือกเวลา' : 'Select'}</option>
                      {/* cap last start at 17:30 so every start admits a valid ≥30min end ≤18:00 */}
                      {timeOptions(8, 17.5).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-small font-medium text-ink-soft">
                      {isTh ? 'เวลาสิ้นสุด' : 'End time'}
                    </span>
                    <select
                      value={endTime}
                      disabled={!startTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={cn(
                        'rounded-[var(--radius-sm)] border border-hairline bg-surface px-3 py-1.5 text-small text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        !startTime && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <option value="">{isTh ? 'เลือกเวลา' : 'Select'}</option>
                      {endTimeChoices.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="text-small text-ink-muted">
                  {isTh
                    ? 'ลารายชั่วโมง: ขั้นต่ำ 30 นาที สูงสุด 4 ชั่วโมง'
                    : 'Hourly leave: minimum 30 minutes, maximum 4 hours'}
                </p>
                {errors.hourly && <InlineError msg={errors.hourly} />}
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
        label={`${isTh ? 'เหตุผล' : 'Reason'}${isSick ? '' : ' *'}`}
        htmlFor="leave-reason"
        className="mt-3"
        error={errors.reason}
      >
        <textarea
          id="leave-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={
            isSick
              ? isTh
                ? 'อธิบายเหตุผลการลา (ถ้ามี)'
                : 'Describe the reason (optional)'
              : isTh
                ? 'อธิบายเหตุผลการลา (อย่างน้อย 5 ตัวอักษร)'
                : 'Describe the reason (min 5 chars)'
          }
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

// ──────── helpers (co-located) ────────

const inputClass = cn(
  'w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  'placeholder:text-ink-faint'
);

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
