'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  Clock,
  CornerUpLeft,
  Shield,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import {
  useProbationCase,
  type ProbationOutcome,
  type ProbationDecisionInput,
} from '@/hooks/use-probation';
import { useAuthStore } from '@/stores/auth-store';
import { personaTiers } from '@/lib/persona-tiers';
import { formatDate } from '@/lib/date';
import { Modal } from '@/components/humi';

// Probation Manager Approve — ref design layout (prod-probation.jsx · ProbationApprove)
// reconciled to the BA-approved field set: 3 outcome cards + conditional BA fields.
// Intentionally NO attachment / star rating / qualitative trio (trimmed per June BA feedback).

// ---------------------------------------------------------------------------
// Outcome cards (ref: pass / extend / no_pass)
// ---------------------------------------------------------------------------

type OutcomeCard = 'pass' | 'pass_before_due' | 'extend' | 'no_pass';

const OUTCOME_CARDS: {
  value: OutcomeCard;
  labelTh: string;
  labelEn: string;
  subTh: string;
  subEn: string;
  icon: typeof Check;
  tone: 'accent' | 'warning' | 'danger';
}[] = [
  {
    value: 'pass',
    labelTh: 'ผ่านทดลองงาน',
    labelEn: 'Pass probation',
    subTh: 'พนักงานจะถูกบรรจุเป็น Permanent',
    subEn: 'Employee becomes permanent',
    icon: Check,
    tone: 'accent',
  },
  {
    value: 'pass_before_due',
    labelTh: 'ผ่านทดลองงาน (ก่อนกำหนด)',
    labelEn: 'Pass probation before due date (special)',
    subTh: 'บรรจุก่อนวันครบกำหนดทดลองงาน',
    subEn: 'Confirm permanent before the due date',
    icon: CalendarCheck,
    tone: 'accent',
  },
  {
    value: 'extend',
    labelTh: 'ขยายเวลา',
    labelEn: 'Extend',
    subTh: 'ทดลองต่ออีก 30–60 วัน',
    subEn: 'Extend 30–60 more days',
    icon: Clock,
    tone: 'warning',
  },
  {
    value: 'no_pass',
    labelTh: 'ไม่ผ่าน',
    labelEn: 'Did not pass',
    subTh: 'พนักงานจะสิ้นสภาพหลังบันทึก',
    subEn: 'Employment ends after recording',
    icon: X,
    tone: 'danger',
  },
];

// Map ref outcome card → store ProbationOutcome (keeps existing store wiring intact).
const OUTCOME_TO_STORE: Record<OutcomeCard, ProbationOutcome> = {
  pass: 'pass_normal',
  pass_before_due: 'pass_before_due',
  extend: 'extend',
  no_pass: 'fail_normal',
};

// Effective-date direction per outcome: hidden for normal pass/fail, earlier-than-due for
// pass-before-due, later-than-due for extend.
type EffectiveRule = 'earlier' | 'later' | null;

function deriveOutcomeRules(outcome: OutcomeCard): {
  showEffective: boolean;
  effectiveRule: EffectiveRule;
  showFailReason: boolean;
} {
  switch (outcome) {
    case 'pass_before_due':
      return { showEffective: true, effectiveRule: 'earlier', showFailReason: false };
    case 'extend':
      return { showEffective: true, effectiveRule: 'later', showFailReason: false };
    case 'no_pass':
      return { showEffective: false, effectiveRule: null, showFailReason: true };
    case 'pass':
    default:
      return { showEffective: false, effectiveRule: null, showFailReason: false };
  }
}

const EXTEND_DURATIONS = ['30 วัน', '45 วัน', '60 วัน'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function eyebrow(text: string) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{text}</div>
  );
}

const FIELD_LABEL_CLASS = 'mb-1.5 block text-xs font-semibold text-ink-soft';
const FIELD_INPUT_CLASS =
  'w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft';
const FIELD_TEXTAREA_CLASS = `${FIELD_INPUT_CLASS} resize-y min-h-[64px]`;
const FIELD_INPUT_ERROR_CLASS =
  'w-full rounded-[var(--radius-md)] border border-danger bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-danger focus:ring-2 focus:ring-danger-soft';

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className={FIELD_LABEL_CLASS}>
      {children} {required && <span className="text-accent">*</span>}
    </label>
  );
}

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Calendar tenure since hire date — "{m} เดือน {d} วัน". */
function tenureText(hireDate: string, locale: string): string {
  const start = new Date(hireDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) months = 0;
  if (days < 0) days = 0;
  return locale === 'th' ? `${months} เดือน ${days} วัน` : `${months}mo ${days}d`;
}

/** Day-120 default for extend: one day after probationEndDate. */
function defaultExtendDate(probationEndDate?: string): string {
  if (!probationEndDate) return '';
  const d = new Date(probationEndDate);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Approval chain
// ---------------------------------------------------------------------------

type ApprovalStepStatus = 'done' | 'current' | 'pending';

interface ApprovalStep {
  label: string;
  sub: string;
  status: ApprovalStepStatus;
  icon: typeof User;
}

function ApprovalChainStep({ step, isLast }: { step: ApprovalStep; isLast: boolean }) {
  const { status, icon: Icon } = step;
  const isCurrent = status === 'current';
  const isDone = status === 'done';

  const dotClass = isCurrent
    ? 'bg-accent text-white border-accent'
    : isDone
      ? 'bg-success text-white border-success'
      : 'bg-surface text-ink-faint border-hairline';

  const connectorClass = isDone ? 'bg-success' : 'bg-hairline';

  return (
    <div className="relative flex items-start gap-3 py-1">
      <div className="flex flex-shrink-0 flex-col items-center">
        <div
          className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] ${dotClass}`}
        >
          {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
        </div>
        {!isLast && <div className={`w-0.5 flex-1 min-h-[28px] -my-px ${connectorClass}`} />}
      </div>
      <div className="min-w-0 flex-1 pb-[18px]">
        <div className={`text-sm font-semibold ${isCurrent ? 'text-accent' : 'text-ink'}`}>
          {step.label}
          {isCurrent && (
            <span className="humi-tag humi-tag--accent ml-1.5 text-xs">กำลังดำเนินการ</span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-ink-muted">{step.sub}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProbationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();
  const locale = pathname.startsWith('/th') ? 'th' : 'en';
  const isTh = locale === 'th';
  const {
    probationCase: c,
    loading,
    submitDecision,
    hrbpApprove,
    sendBackToManager,
    markExemptPassed,
  } = useProbationCase(id);

  // STA-23 — viewer persona tier (B = hrbp/spd) gates the HRBP action seam.
  const roles = useAuthStore((s) => s.roles);
  const isHrbpViewer = personaTiers(roles).includes('B');

  // Outcome + conditional BA fields
  const [outcome, setOutcome] = useState<OutcomeCard>('pass');
  const [passBeforeDueDate, setPassBeforeDueDate] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [extendDuration, setExtendDuration] = useState(EXTEND_DURATIONS[1]);
  const [failReasonText, setFailReasonText] = useState('');
  const [comment, setComment] = useState('');

  const [policyOpen, setPolicyOpen] = useState(false);

  // STA-23 — HRBP send-back reason input
  const [sendBackReason, setSendBackReason] = useState('');

  const { effectiveRule, showFailReason } = deriveOutcomeRules(outcome);

  const handleOutcomeChange = (val: OutcomeCard) => {
    setOutcome(val);
    if (val === 'extend' && c?.probationEndDate && !extendDate) {
      setExtendDate(defaultExtendDate(c.probationEndDate));
    }
    // Clear stale date/reason state when switching INTO a hide-effective outcome so the
    // hidden field's value cannot be evaluated by effectiveDateError and silently block submit.
    const nextRules = deriveOutcomeRules(val);
    if (!nextRules.showEffective) {
      setPassBeforeDueDate('');
      setExtendDate('');
    }
    if (!nextRules.showFailReason) setFailReasonText('');
  };

  // The chosen effective date for the active outcome (pass-before-due → earlier, extend → later).
  const effectiveDateValue =
    effectiveRule === 'earlier' ? passBeforeDueDate : effectiveRule === 'later' ? extendDate : '';

  // Unified effective-date validation. 'earlier' (pass-before-due): >= hireDate AND < due.
  // 'later' (extend): > due. Compared against probationEndDate (canonical due date).
  const effectiveDateError = useMemo<string | null>(() => {
    if (!effectiveRule || !effectiveDateValue || !c?.probationEndDate) return null;
    const due = new Date(c.probationEndDate).getTime();
    const picked = new Date(effectiveDateValue).getTime();

    if (effectiveRule === 'earlier') {
      if (c.hireDate && picked < new Date(c.hireDate).getTime()) {
        return isTh
          ? 'วันที่บรรจุต้องไม่ก่อนวันเริ่มงาน'
          : 'Effective date cannot be before the hire date';
      }
      if (picked >= due) {
        return isTh
          ? 'ต้องเป็นวันก่อนวันครบกำหนดทดลองงาน'
          : 'Must be EARLIER than the normal probation due date';
      }
      return null;
    }

    // 'later' (extend) — keep existing message verbatim.
    if (picked <= due) {
      return isTh
        ? 'วันที่ขยายต้องอยู่หลังวันสิ้นสุดทดลองงานปกติ'
        : 'Extend date must be AFTER the normal pass date';
    }
    return null;
  }, [effectiveRule, effectiveDateValue, c?.probationEndDate, c?.hireDate, isTh]);

  const submitDisabled = useMemo(() => {
    if (outcome === 'extend' && (!extendDate || !!effectiveDateError)) return true;
    if (outcome === 'pass_before_due' && (!passBeforeDueDate || !!effectiveDateError)) return true;
    if (outcome === 'no_pass' && !failReasonText.trim()) return true;
    return false;
  }, [outcome, extendDate, passBeforeDueDate, effectiveDateError, failReasonText]);

  const days = useMemo(() => {
    if (!c) return 0;
    return daysUntil(c.slaDeadline ?? c.probationEndDate);
  }, [c]);
  const showBanner = days <= 14;

  const handleSubmit = () => {
    if (!c || submitDisabled) return;
    const input: ProbationDecisionInput = {
      outcome: OUTCOME_TO_STORE[outcome],
      effectiveDate:
        outcome === 'pass_before_due'
          ? passBeforeDueDate || undefined
          : outcome === 'extend'
            ? extendDate || undefined
            : undefined,
      failReasonText: outcome === 'no_pass' ? failReasonText.trim() || undefined : undefined,
      comment,
    };
    submitDecision(input);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-canvas-soft" />
        <div className="h-40 w-full animate-pulse rounded bg-canvas-soft" />
        <div className="h-60 w-full animate-pulse rounded bg-canvas-soft" />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="humi-card text-center">
        <p className="text-ink-muted">ไม่พบเคส {id}</p>
      </div>
    );
  }

  const effectiveCutoff = c.probationEndDate ? formatDate(c.probationEndDate, 'long', locale) : '';

  const approvalSteps: ApprovalStep[] = [
    { label: `หัวหน้างาน · ${c.manager.name}`, sub: 'ผู้บังคับบัญชาโดยตรง', status: 'current', icon: User },
    { label: `HRBP · ${c.currentApprover.name ?? 'TBD'}`, sub: 'อนุมัติผลและบันทึก EC', status: 'pending', icon: UserCheck },
  ];

  const historyEvents = (c.timeline ?? []).slice(0, 3).map((entry) => {
    const isSystem = entry.actorRole === 'System';
    const isWarn = /SLA|escalate|ไม่ตอบ|14 วัน/i.test(entry.action);
    return {
      title: entry.action,
      timestamp: `${formatDate(entry.date, 'medium', locale)} · ${isSystem ? 'ระบบ Auto' : entry.actor}`,
      dotClass: isWarn ? 'bg-warning' : isSystem ? 'bg-ink-faint' : 'bg-accent',
    };
  });

  return (
    <div className="pb-8">
      {/* Back nav */}
      <Link
        href={`/${locale}/workflows/probation`}
        className="mb-3.5 inline-flex items-center gap-1.5 text-sm text-ink-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>กลับไปคิวประเมิน</span>
      </Link>

      {/* Title */}
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] bg-accent-soft text-accent">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          {eyebrow(`การดำเนินการ · ${c.id}`)}
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            ประเมินทดลองงาน
          </h1>
        </div>
      </div>

      {/* Days-remaining banner (≤14 days) — NO-RED: pumpkin danger token */}
      {showBanner && (
        <div
          role="status"
          className="mb-5 flex items-center gap-3 rounded-[var(--radius-md)] border border-danger bg-danger-soft px-4 py-3.5 text-[color:var(--color-danger-ink)]"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold">ใกล้ครบกำหนด — เหลือ {days} วัน</div>
            <div className="mt-0.5 text-xs">
              กรุณาบันทึกการประเมินก่อนวันที่ {effectiveCutoff} · หลังจากนั้นระบบจะ auto-pass อัตโนมัติ
            </div>
          </div>
        </div>
      )}

      {/* Two-column body */}
      <div className="grid grid-cols-[1.6fr_1fr] gap-5">
        {/* LEFT — main form */}
        <div className="flex flex-col gap-5">
          {/* Employee snapshot */}
          <div className="humi-card humi-card--cream">
            <div className="flex items-start gap-3.5">
              <div className="humi-avatar humi-avatar--teal flex h-14 w-14 flex-shrink-0 items-center justify-center text-base">
                {initials(c.fullNameEn || c.fullNameTh)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5">{eyebrow(c.employeeId)}</div>
                <div className="font-display text-xl font-semibold tracking-tight text-ink">
                  {c.fullNameTh}
                </div>
                <div className="text-xs text-ink-muted">{c.fullNameEn}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3.5 border-t border-hairline-soft pt-4">
              <div>
                {eyebrow('ตำแหน่ง')}
                <div className="mt-1 text-sm font-semibold text-ink">{c.position}</div>
              </div>
              <div>
                {eyebrow('วันเริ่มงาน')}
                <div className="mt-1 text-sm font-semibold text-ink">
                  {formatDate(c.hireDate, 'medium', locale)}
                </div>
              </div>
              <div>
                {eyebrow('อายุงาน')}
                <div className="mt-1 text-sm font-semibold text-ink">{tenureText(c.hireDate, locale)}</div>
              </div>
              <div>
                {eyebrow('หัวหน้าโดยตรง')}
                <div className="mt-1 text-sm font-semibold text-ink">{c.manager.name}</div>
              </div>
            </div>
          </div>

          {/* Outcome decision */}
          <div className="humi-card">
            <div className="mb-2">{eyebrow('การตัดสินใจ')}</div>
            <h3 className="mb-3.5 font-display text-lg font-semibold tracking-tight text-ink">
              ผลการประเมิน <span className="text-accent">*</span>
            </h3>

            <div role="radiogroup" className="grid grid-cols-2 gap-2.5">
              {OUTCOME_CARDS.map((o) => {
                const Glyph = o.icon;
                const sel = outcome === o.value;
                const borderTone =
                  o.tone === 'accent' ? 'border-accent' : o.tone === 'warning' ? 'border-warning' : 'border-danger';
                const iconBg =
                  o.tone === 'accent' ? 'bg-accent' : o.tone === 'warning' ? 'bg-warning' : 'bg-danger';
                const iconText =
                  o.tone === 'accent' ? 'text-accent' : o.tone === 'warning' ? 'text-warning-ink' : 'text-danger-ink';
                return (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => handleOutcomeChange(o.value)}
                    aria-pressed={sel}
                    className={`flex flex-col gap-2 rounded-[var(--radius-lg)] border-[1.5px] p-4 text-left transition ${
                      sel ? `${borderTone} bg-canvas-soft` : 'border-hairline bg-surface hover:border-ink-faint'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] ${
                          sel ? `${iconBg} text-white` : `bg-canvas-soft ${iconText}`
                        }`}
                      >
                        <Glyph className="h-4 w-4" />
                      </span>
                      <span
                        className={`h-4 w-4 rounded-full border-[1.5px] ${
                          sel ? `${borderTone} ${iconBg}` : 'border-hairline'
                        }`}
                        aria-hidden
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold tracking-tight text-ink">
                        {isTh ? o.labelTh : o.labelEn}
                      </div>
                      <div className="mt-1 text-xs leading-snug text-ink-muted">
                        {isTh ? o.subTh : o.subEn}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Conditional — pass before due: required EARLIER-than-due effective date */}
            {outcome === 'pass_before_due' && (
              <div className="mt-4">
                <FieldLabel required>
                  {isTh ? 'วันที่บรรจุ (ก่อนกำหนด)' : 'Effective date (before due)'}
                </FieldLabel>
                <input
                  type="date"
                  value={passBeforeDueDate}
                  onChange={(e) => setPassBeforeDueDate(e.target.value)}
                  aria-label={isTh ? 'วันที่บรรจุก่อนกำหนด' : 'Effective date before due'}
                  className={effectiveDateError ? FIELD_INPUT_ERROR_CLASS : FIELD_INPUT_CLASS}
                />
                {effectiveDateError ? (
                  <p className="mt-1 text-xs text-danger">{effectiveDateError}</p>
                ) : (
                  <p className="mt-1 text-xs text-ink-muted">
                    {isTh
                      ? 'เลือกวันระหว่างวันเริ่มงานถึงก่อนวันครบกำหนดทดลองงาน'
                      : 'Pick a date between the hire date and before the probation due date'}
                  </p>
                )}
              </div>
            )}

            {/* Conditional — extend: until-date + duration (BA) */}
            {outcome === 'extend' && (
              <div className="mt-4 grid grid-cols-2 gap-3.5 rounded-[var(--radius-md)] border border-warning bg-warning-soft p-3.5">
                <div>
                  <FieldLabel required>{isTh ? 'ขยายถึงวันที่' : 'Extend until'}</FieldLabel>
                  <input
                    type="date"
                    value={extendDate}
                    onChange={(e) => setExtendDate(e.target.value)}
                    aria-label={isTh ? 'ขยายถึงวันที่' : 'Extend until'}
                    className={effectiveDateError ? FIELD_INPUT_ERROR_CLASS : FIELD_INPUT_CLASS}
                  />
                  {effectiveDateError ? (
                    <p className="mt-1 text-xs text-danger">{effectiveDateError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-ink-muted">
                      {isTh ? 'ต้องไม่เกินวันเริ่มงาน + 119 วัน' : 'Must not exceed hire date + 119 days'}
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel required>{isTh ? 'ระยะเวลา' : 'Duration'}</FieldLabel>
                  <select
                    value={extendDuration}
                    onChange={(e) => setExtendDuration(e.target.value)}
                    aria-label={isTh ? 'ระยะเวลา' : 'Duration'}
                    className={FIELD_INPUT_CLASS}
                  >
                    {EXTEND_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Conditional — no_pass: free-text fail reason (required) */}
            {showFailReason && (
              <div className="mt-4">
                <FieldLabel required>
                  {isTh ? 'เหตุผลการไม่ผ่านทดลองงาน' : 'Reason for fail probation'}
                </FieldLabel>
                <textarea
                  rows={3}
                  value={failReasonText}
                  onChange={(e) => setFailReasonText(e.target.value)}
                  placeholder={
                    isTh ? 'ระบุเหตุผลการไม่ผ่านทดลองงาน...' : 'Enter the reason for fail probation...'
                  }
                  aria-label={isTh ? 'เหตุผลการไม่ผ่านทดลองงาน' : 'Reason for fail probation'}
                  className={FIELD_TEXTAREA_CLASS}
                />
              </div>
            )}

            {/* Manager comment (BA) */}
            <div className="mt-4">
              <FieldLabel>{isTh ? 'ความคิดเห็นของผู้จัดการ' : "Manager's Comments"}</FieldLabel>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={isTh ? 'ระบุความเห็นเพิ่มเติม...' : 'Enter additional comments...'}
                aria-label={isTh ? 'ความคิดเห็นของผู้จัดการ' : "Manager's Comments"}
                className={FIELD_TEXTAREA_CLASS}
              />
            </div>
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div className="flex flex-col gap-5">
          {/* HRBP action seam — tier B viewer on a pending_hr case (STA-23) */}
          {isHrbpViewer && c.status === 'pending_hr' && (
            <div className="humi-card">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
                  <UserCheck className="h-4 w-4" />
                </span>
                {eyebrow(isTh ? 'การดำเนินการของ HRBP' : 'HRBP action')}
              </div>

              {c.isProbationExempt ? (
                <>
                  <p className="mb-3 text-sm text-ink-soft">
                    {isTh
                      ? 'พนักงานกลุ่มยกเว้นทดลองงาน — บรรจุได้ทันที โดยใช้วันเริ่มงานเป็นวันบรรจุ'
                      : 'Probation-exempt employee — mark passed now with the hire date as the pass date.'}
                  </p>
                  <div className="mb-3 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2.5 text-xs">
                    <span className="text-ink-muted">
                      {isTh ? 'วันบรรจุ (= วันเริ่มงาน): ' : 'Pass date (= hire date): '}
                    </span>
                    <span className="font-semibold text-ink">
                      {formatDate(c.hireDate, 'long', locale)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => markExemptPassed()}
                    className="humi-button humi-button--primary inline-flex w-full items-center justify-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isTh ? 'บรรจุ (ยกเว้นทดลองงาน)' : 'Mark passed (exempt)'}
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-ink-soft">
                    {isTh
                      ? 'ตรวจสอบผลที่หัวหน้างานส่งมา แล้วอนุมัติ หรือส่งกลับให้แก้ไข'
                      : "Review the manager's result, then approve or send it back for revision."}
                  </p>
                  <button
                    type="button"
                    onClick={() => hrbpApprove()}
                    className="humi-button humi-button--primary mb-3 inline-flex w-full items-center justify-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isTh ? 'อนุมัติ (HRBP)' : 'Approve (HRBP)'}
                  </button>

                  <div className="rounded-[var(--radius-md)] border border-warning bg-warning-soft p-3">
                    <FieldLabel required>
                      {isTh ? 'เหตุผลในการส่งกลับ' : 'Reason to send back'}
                    </FieldLabel>
                    <textarea
                      rows={2}
                      value={sendBackReason}
                      onChange={(e) => setSendBackReason(e.target.value)}
                      placeholder={
                        isTh ? 'ระบุสิ่งที่หัวหน้างานต้องแก้ไข...' : 'What the manager should revise...'
                      }
                      aria-label={isTh ? 'เหตุผลในการส่งกลับ' : 'Reason to send back'}
                      className={FIELD_TEXTAREA_CLASS}
                    />
                    <button
                      type="button"
                      onClick={() => sendBackToManager(sendBackReason.trim())}
                      disabled={!sendBackReason.trim()}
                      className="humi-button humi-button--ghost mt-2.5 inline-flex w-full items-center justify-center gap-1.5 border border-warning text-warning-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                      {isTh ? 'ส่งกลับให้หัวหน้างาน' : 'Send back to manager'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Approval chain */}
          <div className="humi-card">
            <div className="mb-3">{eyebrow('ขั้นตอนอนุมัติ')}</div>
            <div className="flex flex-col">
              {approvalSteps.map((step, i) => (
                <ApprovalChainStep key={step.label} step={step} isLast={i === approvalSteps.length - 1} />
              ))}
            </div>
          </div>

          {/* History */}
          <div className="humi-card humi-card--cream">
            <div className="mb-2.5">{eyebrow('ประวัติเคส')}</div>
            <div className="flex flex-col gap-3">
              {historyEvents.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${h.dotClass}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink">{h.title}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">{h.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Policy ink-card */}
          <div className="humi-card humi-card--ink relative overflow-hidden">
            <div
              className="humi-blob humi-blob--teal"
              style={{ width: 80, height: 100, right: -25, bottom: -30, opacity: 0.5 }}
            />
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
              เกณฑ์อ้างอิง
            </div>
            <h4 className="mt-2 font-display text-base font-semibold text-canvas-soft">
              นโยบายทดลองงาน · ฉบับ 2569
            </h4>
            <ul className="mt-2.5 flex list-none flex-col gap-1.5 p-0 text-xs text-canvas-soft/80">
              <li>• ระยะทดลอง 119 วัน (4 เดือน)</li>
              <li>• ขยายเวลาได้สูงสุด 60 วัน</li>
              <li>• ไม่ผ่าน → แจ้งล่วงหน้า 1 รอบจ่ายเงินเดือน</li>
              <li>• ผ่าน → Allowance ตามสัญญา</li>
            </ul>
            <button
              type="button"
              onClick={() => setPolicyOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent"
            >
              {isTh ? 'ดูฉบับเต็ม' : 'View full policy'} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 -mx-8 mt-5 flex items-center gap-3 border-t border-hairline bg-surface px-8 py-3.5 shadow-[var(--shadow-md)]">
        <div className="text-xs text-ink-muted">
          {submitDisabled
            ? isTh
              ? 'กรุณากรอกข้อมูลที่จำเป็นให้ครบก่อนส่ง'
              : 'Please complete all required fields before submitting'
            : isTh
              ? 'บันทึกร่างอัตโนมัติ · พร้อมส่งผลการทดลองงาน'
              : 'Auto-saved draft · ready to submit'}
        </div>
        <div className="flex-1" />
        <Link href={`/${locale}/workflows/probation`} className="humi-button humi-button--ghost">
          ยกเลิก
        </Link>
        <button type="button" className="humi-button humi-button--ghost">
          {isTh ? 'บันทึกร่าง' : 'Save draft'}
        </button>
        {outcome === 'no_pass' ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="humi-button inline-flex items-center gap-1.5 bg-danger text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            {isTh ? 'ยืนยัน ไม่ผ่านทดลองงาน' : 'Confirm — did not pass'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="humi-button humi-button--primary inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            {isTh ? 'อนุมัติและส่งให้ HRBP' : 'Approve & send to HRBP'}
          </button>
        )}
      </div>

      {/* Probation policy modal — full reference text */}
      <Modal
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title={isTh ? 'นโยบายทดลองงาน · ฉบับ 2569' : 'Probation Policy · 2026 Edition'}
      >
        <div className="space-y-4 text-sm text-ink-soft leading-relaxed">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              {isTh
                ? 'ระยะทดลองงานมาตรฐาน 119 วัน (ประมาณ 4 เดือน) นับจากวันเริ่มงาน'
                : 'Standard probation period is 119 days (about 4 months) from the hire date.'}
            </li>
            <li>
              {isTh
                ? 'สามารถขยายเวลาทดลองงานได้สูงสุด 60 วัน โดยต้องระบุเหตุผลและวันที่มีผล'
                : 'Probation may be extended up to 60 days, with a stated reason and effective date.'}
            </li>
            <li>
              {isTh
                ? 'กรณีไม่ผ่าน ต้องแจ้งล่วงหน้าอย่างน้อย 1 รอบการจ่ายเงินเดือน'
                : 'A fail outcome requires at least one payroll cycle of advance notice.'}
            </li>
            <li>
              {isTh
                ? 'กรณีผ่าน พนักงานจะได้รับ Allowance ตามเงื่อนไขในสัญญาจ้าง'
                : 'On pass, the employee receives the allowance per the employment contract.'}
            </li>
            <li>
              {isTh
                ? 'หากผู้จัดการไม่บันทึกผลภายในกำหนด ระบบจะ auto-pass อัตโนมัติ'
                : 'If the manager does not record an outcome by the deadline, the system auto-passes.'}
            </li>
          </ul>
          <p className="text-xs text-ink-muted">
            {isTh
              ? 'อ้างอิงระเบียบบริษัทว่าด้วยการทดลองงาน · ฉบับปรับปรุง 2569'
              : 'Reference: Company probation policy · 2026 revision'}
          </p>
        </div>
      </Modal>
    </div>
  );
}
