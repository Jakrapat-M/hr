'use client';

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Send,
  Shield,
  User,
  Wallet,
} from 'lucide-react';
import { useProbationCase, type ProbationOutcome, type ProbationFailReason, type ProbationDecisionInput } from '@/hooks/use-probation';
import { formatDate } from '@/lib/date';

// STA-23 PO v2 — Manager Approve page
// Spec: Linear STA-23 PO comment 2026-05-15 08:32 UTC, Mockup 2 + Mockup 3

// ---------------------------------------------------------------------------
// Types + LOVs
// ---------------------------------------------------------------------------

// TODO(STA-23): replace fail reason LOV with real values from BA/HR
const FAIL_REASON_OPTIONS: { value: ProbationFailReason; labelEn: string; labelTh: string }[] = [
  { value: 'performance', labelEn: 'Performance below standard', labelTh: 'ผลงานต่ำกว่ามาตรฐาน' },
  { value: 'attitude', labelEn: 'Attitude / Behavior issue', labelTh: 'ทัศนคติ / พฤติกรรม' },
  { value: 'policy', labelEn: 'Policy violation', labelTh: 'ฝ่าฝืนระเบียบบริษัท' },
  { value: 'skill_mismatch', labelEn: 'Skill mismatch', labelTh: 'ทักษะไม่ตรงกับตำแหน่ง' },
  { value: 'other', labelEn: 'Other', labelTh: 'อื่นๆ' },
];

const OUTCOME_OPTIONS: { value: ProbationOutcome; labelEn: string; labelTh: string }[] = [
  { value: 'pass_normal', labelEn: 'Pass probation (Normal case)', labelTh: 'ผ่านทดลองงาน (ปกติ)' },
  { value: 'fail_normal', labelEn: 'Fail probation (Normal case)', labelTh: 'ไม่ผ่านทดลองงาน (ปกติ)' },
  { value: 'pass_before_due', labelEn: 'Pass probation before Due (Special case)', labelTh: 'ผ่านทดลองงานก่อนกำหนด (กรณีพิเศษ)' },
  { value: 'fail_before_due', labelEn: 'Fail probation before Due (Special case)', labelTh: 'ไม่ผ่านทดลองงานก่อนกำหนด (กรณีพิเศษ)' },
  { value: 'extend', labelEn: 'Extend probation (Special case)', labelTh: 'ขยายเวลาทดลองงาน (กรณีพิเศษ)' },
];

// Outcomes that require effectiveDate
const OUTCOMES_WITH_EFFECTIVE_DATE: ProbationOutcome[] = [
  'pass_before_due',
  'fail_before_due',
  'extend',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function eyebrow(text: string) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
      {text}
    </div>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
      {children} {required && <span className="text-accent">*</span>}
    </label>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-ink-muted">{children}</p>;
}

function FieldError({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}

const FIELD_INPUT_CLASS =
  'w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft';

const FIELD_TEXTAREA_CLASS = `${FIELD_INPUT_CLASS} resize-y min-h-[64px]`;

const FIELD_INPUT_ERROR_CLASS =
  'w-full rounded-[var(--radius-md)] border border-danger bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-danger focus:ring-2 focus:ring-danger-soft';

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
// Utils
// ---------------------------------------------------------------------------

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

/** Returns Day-120 default for extend: one day after probationEndDate */
function defaultExtendDate(probationEndDate?: string): string {
  if (!probationEndDate) return '';
  const d = new Date(probationEndDate);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProbationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();
  const locale = pathname.startsWith('/th') ? 'th' : 'en';
  const { probationCase: c, loading, submitDecision } = useProbationCase(id);

  // Form state — PO v2 fields
  const [outcome, setOutcome] = useState<ProbationOutcome | ''>('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [failReason, setFailReason] = useState<ProbationFailReason | ''>('');
  const [comment, setComment] = useState('');

  // Attachment (keep from previous implementation)
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive conditional visibility
  const showEffectiveDate = outcome !== '' && OUTCOMES_WITH_EFFECTIVE_DATE.includes(outcome as ProbationOutcome);
  const showFailReason = outcome === 'fail_normal';

  // Effective date validation
  const effectiveDateError = useMemo<string | null>(() => {
    if (!showEffectiveDate || !effectiveDate || !c?.probationEndDate) return null;
    const eff = new Date(effectiveDate).getTime();
    const end = new Date(c.probationEndDate).getTime();
    if (outcome === 'pass_before_due' || outcome === 'fail_before_due') {
      if (eff >= end) return locale === 'th'
        ? 'วันที่มีผลต้องอยู่ก่อนวันสิ้นสุดทดลองงานปกติ'
        : 'Effective date must be BEFORE the normal pass date';
    }
    if (outcome === 'extend') {
      if (eff <= end) return locale === 'th'
        ? 'วันที่มีผลต้องอยู่หลังวันสิ้นสุดทดลองงานปกติ'
        : 'Effective date must be AFTER the normal pass date';
    }
    return null;
  }, [showEffectiveDate, effectiveDate, outcome, c?.probationEndDate, locale]);

  // Submit disabled logic
  const submitDisabled = useMemo(() => {
    if (!outcome) return true;
    if (showEffectiveDate && (!effectiveDate || !!effectiveDateError)) return true;
    if (showFailReason && !failReason) return true;
    return false;
  }, [outcome, showEffectiveDate, effectiveDate, effectiveDateError, showFailReason, failReason]);

  // Days remaining + SLA banner
  const days = useMemo(() => {
    if (!c) return 0;
    return daysUntil(c.slaDeadline ?? c.probationEndDate);
  }, [c]);

  const showBanner = days <= 14;

  const handleOutcomeChange = (val: ProbationOutcome) => {
    setOutcome(val);
    // When switching to extend, seed effectiveDate default
    if (val === 'extend' && c?.probationEndDate) {
      setEffectiveDate(defaultExtendDate(c.probationEndDate));
    } else if (val !== outcome) {
      // Reset effectiveDate on outcome change (except extend keeps its default)
      if (val !== 'extend') setEffectiveDate('');
    }
    if (val !== 'fail_normal') setFailReason('');
  };

  const handleSubmit = () => {
    if (!outcome || submitDisabled) return;
    const input: ProbationDecisionInput = {
      outcome: outcome as ProbationOutcome,
      effectiveDate: showEffectiveDate ? effectiveDate : undefined,
      failReason: showFailReason ? (failReason as ProbationFailReason) : undefined,
      comment,
    };
    submitDecision(input);
  };

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAttachedFileName(f.name);
    // TODO: wire up real upload backend (document-service).
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

  const effectiveCutoff = c.probationEndDate
    ? formatDate(c.probationEndDate, 'long', locale)
    : '';

  const approvalSteps: ApprovalStep[] = [
    {
      label: `หัวหน้างาน · ${c.manager.name}`,
      sub: 'ผู้บังคับบัญชาโดยตรง',
      status: 'current',
      icon: User,
    },
    {
      label: `HR Admin · ${c.currentApprover.name ?? 'TBD'}`,
      sub: 'ตรวจสอบเอกสารและบันทึก EC',
      status: 'pending',
      icon: Shield,
    },
    {
      label: 'Payroll',
      sub: 'ส่งเข้าระบบจ่ายเงิน',
      status: 'pending',
      icon: Wallet,
    },
  ];

  const historyEvents = (c.timeline ?? []).slice(0, 3).map((entry) => {
    const isSystem = entry.actorRole === 'System';
    const isWarn = /SLA|escalate|ไม่ตอบ|14 วัน/i.test(entry.action);
    return {
      title: entry.action,
      timestamp: `${formatDate(entry.date, 'medium', locale)} · ${
        isSystem ? 'ระบบ Auto' : entry.actor
      }`,
      dotClass: isWarn ? 'bg-warning' : isSystem ? 'bg-ink-faint' : 'bg-accent',
    };
  });

  // Effective date help text
  const effectiveDateHelp = (() => {
    if (outcome === 'extend') {
      return locale === 'th'
        ? 'กรณีขยายเวลา: ระบุวันที่หลังจากวันสิ้นสุดทดลองงานปกติ (ค่าเริ่มต้น = วันที่ 120)'
        : 'Extend probation: please specify a date AFTER the normal pass date (default Day 120)';
    }
    return locale === 'th'
      ? 'กรณีพิเศษ: ระบุวันที่ก่อนวันสิ้นสุดทดลองงานปกติ'
      : 'Special case: please specify a date BEFORE the normal pass date';
  })();

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

      {/* Days-remaining banner (≤14 days) */}
      {showBanner && (
        <div
          role="status"
          className="mb-5 flex items-center gap-3 rounded-[var(--radius-md)] border border-danger bg-danger-soft px-4 py-3.5 text-[color:var(--color-danger-ink)]"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold">ใกล้ครบกำหนด — เหลือ {days} วัน</div>
            <div className="mt-0.5 text-xs">
              กรุณาบันทึกการประเมินก่อนวันที่ {effectiveCutoff} · หลังจากนั้นระบบจะ auto-pass
              อัตโนมัติ
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
                {eyebrow('ครบทดลองงาน')}
                <div className="mt-1 text-sm font-semibold text-ink">
                  {formatDate(c.probationEndDate, 'medium', locale)}
                </div>
              </div>
              <div>
                {eyebrow('หัวหน้าโดยตรง')}
                <div className="mt-1 text-sm font-semibold text-ink">{c.manager.name}</div>
              </div>
            </div>
          </div>

          {/* Decision form — PO v2 */}
          <div className="humi-card">
            {eyebrow('ผลการตัดสินใจ')}
            <h3 className="mt-1 mb-4 font-display text-lg font-semibold tracking-tight text-ink">
              บันทึกผลทดลองงาน
            </h3>

            <div className="flex flex-col gap-4">
              {/* Field 1: Final Probation Result */}
              <div>
                <FieldLabel required>
                  {locale === 'th' ? 'ผลการทดลองงาน' : 'Final Probation Result'}
                </FieldLabel>
                <select
                  value={outcome}
                  onChange={(e) => handleOutcomeChange(e.target.value as ProbationOutcome)}
                  aria-label={locale === 'th' ? 'ผลการทดลองงาน' : 'Final Probation Result'}
                  className={FIELD_INPUT_CLASS}
                >
                  <option value="">
                    {locale === 'th' ? 'เลือกผลการประเมิน...' : 'Select an outcome...'}
                  </option>
                  {OUTCOME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {locale === 'th' ? o.labelTh : o.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Effective Date (conditional — hidden for pass_normal + fail_normal) */}
              {showEffectiveDate && (
                <div>
                  <FieldLabel required>
                    {locale === 'th' ? 'วันที่มีผล' : 'Effective Date'}
                  </FieldLabel>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    aria-label={locale === 'th' ? 'วันที่มีผล' : 'Effective Date'}
                    placeholder={locale === 'th' ? 'เช่น 31/12/2026' : 'e.g. 31/12/2026'}
                    className={effectiveDateError ? FIELD_INPUT_ERROR_CLASS : FIELD_INPUT_CLASS}
                  />
                  {effectiveDateError ? (
                    <FieldError>{effectiveDateError}</FieldError>
                  ) : (
                    <FieldHint>{effectiveDateHelp}</FieldHint>
                  )}
                </div>
              )}

              {/* Field 3: Reason for Fail Probation (only when outcome = fail_normal) */}
              {showFailReason && (
                <div>
                  <FieldLabel required>
                    {locale === 'th'
                      ? 'เหตุผลการไม่ผ่านทดลองงาน (ใช้ภายในบริษัท)'
                      : "Reason for Fail Probation (company use only)"}
                  </FieldLabel>
                  <select
                    value={failReason}
                    onChange={(e) => setFailReason(e.target.value as ProbationFailReason)}
                    aria-label={
                      locale === 'th'
                        ? 'เหตุผลการไม่ผ่านทดลองงาน'
                        : 'Reason for Fail Probation'
                    }
                    className={FIELD_INPUT_CLASS}
                  >
                    <option value="">
                      {locale === 'th' ? 'เลือกเหตุผล...' : 'Select a reason...'}
                    </option>
                    {FAIL_REASON_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {locale === 'th' ? r.labelTh : r.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Field 4: Section Comments */}
              <div>
                <FieldLabel>
                  {locale === 'th' ? "ความคิดเห็นของผู้จัดการ" : "Manager's Comments"}
                </FieldLabel>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={locale === 'th' ? 'ระบุความเห็นเพิ่มเติม...' : 'Enter additional comments...'}
                  aria-label={locale === 'th' ? "ความคิดเห็นของผู้จัดการ" : "Manager's Comments"}
                  className={FIELD_TEXTAREA_CLASS}
                />
              </div>
            </div>
          </div>

          {/* Attachment */}
          <div className="humi-card">
            {eyebrow('เอกสารแนบ')}
            <h3 className="mt-1 mb-3.5 font-display text-base font-semibold tracking-tight text-ink">
              เอกสารแนบ (ถ้ามี)
            </h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-[var(--radius-md)] border-[1.5px] border-dashed border-hairline bg-canvas-soft px-4 py-5 text-center text-ink-muted transition hover:border-accent-soft"
            >
              <div className="text-sm font-semibold text-ink-soft">
                ลากเอกสารมาวาง หรือ <span className="text-accent">เลือกไฟล์</span>
              </div>
              <div className="mt-1 text-xs">
                เช่น บันทึกการสนทนา · ผลงาน · PDF / JPG / PNG · ไม่เกิน 10 MB
              </div>
              {attachedFileName && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-accent">
                  <Download className="h-3 w-3" /> {attachedFileName}
                </div>
              )}
            </button>
            {/* TODO: wire to document-service upload endpoint */}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFilePick}
              accept=".pdf,.jpg,.jpeg,.png"
              aria-label="เลือกไฟล์เอกสารแนบ"
            />
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div className="flex flex-col gap-5">
          {/* Approval chain */}
          <div className="humi-card">
            <div className="mb-3">{eyebrow('ขั้นตอนอนุมัติ')}</div>
            <div className="flex flex-col">
              {approvalSteps.map((step, i) => (
                <ApprovalChainStep
                  key={step.label}
                  step={step}
                  isLast={i === approvalSteps.length - 1}
                />
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
            <ul className="mt-2.5 flex list-none flex-col gap-1.5 p-0 text-xs text-[rgba(231,227,216,0.85)]">
              <li>• ระยะทดลอง 119 วัน (4 เดือน)</li>
              <li>• ขยายเวลาได้สูงสุด 60 วัน</li>
              <li>• ไม่ผ่าน → แจ้งล่วงหน้า 1 รอบจ่ายเงินเดือน</li>
              <li>• ผ่าน → Allowance ตามสัญญา</li>
            </ul>
            {/* TODO: replace with real policy doc route */}
            <a
              href="#"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent"
            >
              ดูฉบับเต็ม <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="sticky bottom-0 -mx-8 mt-5 flex items-center gap-3 border-t border-hairline bg-surface px-8 py-3.5"
        style={{ boxShadow: '0 -6px 20px rgba(14,27,44,0.05)' }}
      >
        <div className="text-xs text-ink-muted">
          {submitDisabled
            ? locale === 'th'
              ? 'กรุณากรอกข้อมูลที่จำเป็นให้ครบก่อนส่ง'
              : 'Please complete all required fields before submitting'
            : locale === 'th'
              ? 'พร้อมส่งผลการทดลองงาน'
              : 'Ready to submit probation result'}
        </div>
        <div className="flex-1" />
        <Link href={`/${locale}/workflows/probation`} className="humi-button humi-button--ghost">
          ยกเลิก
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitDisabled}
          aria-label={
            locale === 'th'
              ? 'ส่งผลทดลองงานไปยัง HRBP'
              : 'Submit Probation Result to HRBP'
          }
          className="humi-button humi-button--primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {locale === 'th' ? 'ส่งผลทดลองงานไปยัง HRBP' : 'Submit Probation Result to HRBP'}
        </button>
      </div>
    </div>
  );
}
