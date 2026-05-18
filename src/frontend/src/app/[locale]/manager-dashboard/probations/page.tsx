'use client';

// manager-dashboard/probations/page.tsx — Manager probation evaluation list
// Lists direct reports on probation; manager submits evaluation → probation-approvals store.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowLeft, ClipboardCheck, Star, ChevronRight } from 'lucide-react';
import { useEmployees } from '@/lib/admin/store/useEmployees';
import { useProbationApprovals, type ProbationOutcome } from '@/stores/probation-approvals';
import { useAuthStore } from '@/stores/auth-store';
import type { MockEmployee } from '@/mocks/employees';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTh(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function calcDaysRemaining(hireDate: string): number {
  const end = new Date(hireDate);
  end.setDate(end.getDate() + 119);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - today.getTime()) / 86_400_000));
}

// ─── EvaluationForm modal ──────────────────────────────────────────────────────

interface EvalFormState {
  outcome: ProbationOutcome | '';
  rating: number;
  strengths: string;
  areasToImprove: string;
  recommendation: string;
  extendUntil: string;
  extensionReason: string;
}

const EMPTY_FORM: EvalFormState = {
  outcome: '',
  rating: 0,
  strengths: '',
  areasToImprove: '',
  recommendation: '',
  extendUntil: '',
  extensionReason: '',
};

interface EvaluationModalProps {
  employee: MockEmployee;
  onClose: () => void;
  onSubmit: (form: EvalFormState) => void;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="humi-row" style={{ gap: 4 }} role="radiogroup" aria-label="คะแนนประเมิน">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} ดาว`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            color: n <= value ? 'var(--color-warning, #F59E0B)' : 'var(--color-hairline, #D1D5DB)',
          }}
        >
          <Star size={22} fill={n <= value ? 'currentColor' : 'none'} aria-hidden />
        </button>
      ))}
      {value > 0 && (
        <span className="text-small text-ink-muted" style={{ marginLeft: 4 }}>
          {value}/5
        </span>
      )}
    </div>
  );
}

function EvaluationModal({ employee, onClose, onSubmit }: EvaluationModalProps) {
  const [form, setForm] = useState<EvalFormState>(EMPTY_FORM);
  const locale = useLocale();

  const probationEndDate = addDays(employee.hire_date, 119);
  const isExtend = form.outcome === 'extend';

  const isValid =
    !!form.outcome &&
    form.rating > 0 &&
    !!form.strengths.trim() &&
    !!form.areasToImprove.trim() &&
    !!form.recommendation.trim() &&
    (!isExtend || (!!form.extendUntil && !!form.extensionReason.trim()));

  const patch = (partial: Partial<EvalFormState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const OUTCOME_OPTIONS: { value: ProbationOutcome; labelTh: string; labelEn: string }[] = [
    { value: 'pass',     labelTh: 'ผ่าน',                labelEn: 'Pass' },
    { value: 'no_pass',  labelTh: 'ไม่ผ่าน',             labelEn: 'No Pass' },
    { value: 'extend',   labelTh: 'ขยายระยะเวลา',        labelEn: 'Extend' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="eval-dialog-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
        overflowY: 'auto',
        padding: '40px 16px',
      }}
    >
      <div
        className="humi-card"
        style={{ maxWidth: 520, width: '100%', marginBottom: 40 }}
      >
        {/* Header */}
        <div className="humi-row" style={{ gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--color-accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'var(--color-accent)',
            }}
          >
            <ClipboardCheck size={16} aria-hidden />
          </div>
          <div style={{ flex: 1 }}>
            <h2
              id="eval-dialog-title"
              className="font-display text-[16px] font-semibold text-ink"
            >
              {locale === 'en' ? 'Probation Evaluation' : 'ประเมินทดลองงาน'}
            </h2>
            <div className="text-small text-ink-muted">
              {employee.first_name_th} {employee.last_name_th}
            </div>
          </div>
          <button
            onClick={onClose}
            className="humi-btn humi-btn--ghost"
            style={{ padding: '4px 8px', fontSize: 12 }}
            aria-label="ปิด"
          >
            {locale === 'en' ? 'Close' : 'ปิด'}
          </button>
        </div>

        <hr className="humi-divider" />

        {/* Outcome buttons */}
        <div style={{ marginBottom: 20 }}>
          <div className="text-body font-semibold text-ink" style={{ marginBottom: 8 }}>
            {locale === 'en' ? 'Outcome' : 'ผลการประเมิน'}
            {' '}<span style={{ color: 'var(--color-danger)' }}>*</span>
          </div>
          <div className="humi-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {OUTCOME_OPTIONS.map(({ value, labelTh, labelEn }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ outcome: value, extendUntil: '', extensionReason: '' })}
                className={`humi-btn ${form.outcome === value ? 'humi-btn--primary' : 'humi-btn--ghost'}`}
                style={{ fontSize: 13 }}
              >
                {locale === 'en' ? labelEn : labelTh}
              </button>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div style={{ marginBottom: 20 }}>
          <div className="text-body font-semibold text-ink" style={{ marginBottom: 8 }}>
            {locale === 'en' ? 'Rating' : 'คะแนน'}
            {' '}<span style={{ color: 'var(--color-danger)' }}>*</span>
          </div>
          <StarRating value={form.rating} onChange={(v) => patch({ rating: v })} />
        </div>

        {/* Strengths */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="eval-strengths" className="text-body font-semibold text-ink" style={{ display: 'block', marginBottom: 6 }}>
            {locale === 'en' ? 'Strengths' : 'จุดเด่น'}
            {' '}<span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <textarea
            id="eval-strengths"
            value={form.strengths}
            onChange={(e) => patch({ strengths: e.target.value })}
            rows={2}
            placeholder={locale === 'en' ? 'Key strengths observed…' : 'จุดเด่นที่สังเกตได้...'}
            className="humi-input"
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {/* Areas to improve */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="eval-areas" className="text-body font-semibold text-ink" style={{ display: 'block', marginBottom: 6 }}>
            {locale === 'en' ? 'Areas to Improve' : 'จุดที่ต้องพัฒนา'}
            {' '}<span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <textarea
            id="eval-areas"
            value={form.areasToImprove}
            onChange={(e) => patch({ areasToImprove: e.target.value })}
            rows={2}
            placeholder={locale === 'en' ? 'Areas needing development…' : 'สิ่งที่ควรปรับปรุง...'}
            className="humi-input"
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {/* Recommendation */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="eval-recommendation" className="text-body font-semibold text-ink" style={{ display: 'block', marginBottom: 6 }}>
            {locale === 'en' ? 'Recommendation' : 'ข้อเสนอแนะ'}
            {' '}<span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <textarea
            id="eval-recommendation"
            value={form.recommendation}
            onChange={(e) => patch({ recommendation: e.target.value })}
            rows={2}
            placeholder={locale === 'en' ? 'Overall recommendation…' : 'ข้อเสนอแนะโดยรวม...'}
            className="humi-input"
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {/* Extend fields (conditional) */}
        {isExtend && (
          <div
            style={{
              background: 'var(--color-canvas-soft, #F9FAFB)',
              border: '1.5px solid var(--color-hairline, #D1D5DB)',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 16,
            }}
          >
            <div className="humi-eyebrow" style={{ marginBottom: 10 }}>
              {locale === 'en' ? 'Extension Details' : 'รายละเอียดการขยายเวลา'}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="eval-extend-until" className="text-body font-semibold text-ink" style={{ display: 'block', marginBottom: 6 }}>
                {locale === 'en' ? 'New Probation End Date' : 'วันสิ้นสุดใหม่'}
                {' '}<span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="eval-extend-until"
                type="date"
                value={form.extendUntil}
                min={probationEndDate}
                onChange={(e) => patch({ extendUntil: e.target.value })}
                className="humi-input"
                style={{ maxWidth: 220 }}
              />
              <p className="text-small text-ink-muted mt-1">
                {locale === 'en'
                  ? `Must be after current end ${formatDateTh(probationEndDate)}`
                  : `ต้องหลังวันสิ้นสุดเดิม ${formatDateTh(probationEndDate)}`}
              </p>
            </div>
            <div>
              <label htmlFor="eval-extend-reason" className="text-body font-semibold text-ink" style={{ display: 'block', marginBottom: 6 }}>
                {locale === 'en' ? 'Extension Reason' : 'เหตุผลการขยาย'}
                {' '}<span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                id="eval-extend-reason"
                value={form.extensionReason}
                onChange={(e) => patch({ extensionReason: e.target.value })}
                rows={2}
                placeholder={locale === 'en' ? 'Reason for extending probation…' : 'เหตุผลที่ขยายระยะทดลองงาน...'}
                className="humi-input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="humi-row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} className="humi-btn humi-btn--ghost">
            {locale === 'en' ? 'Cancel' : 'ยกเลิก'}
          </button>
          <button
            type="button"
            onClick={() => isValid && onSubmit(form)}
            disabled={!isValid}
            className="humi-btn humi-btn--primary"
            aria-disabled={!isValid}
          >
            {locale === 'en' ? 'Submit Evaluation' : 'ส่งผลการประเมิน'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Days-remaining chip ───────────────────────────────────────────────────────

function DaysChip({ days }: { days: number }) {
  let bg: string, color: string;
  if (days === 0) {
    bg = 'var(--color-accent-soft)'; color = 'var(--color-accent)';
  } else if (days <= 14) {
    bg = '#FEF2F2'; color = '#B91C1C';
  } else if (days <= 29) {
    bg = '#FFFBEB'; color = '#92400E';
  } else {
    bg = 'var(--color-canvas-soft, #F3F4F6)'; color = 'var(--color-ink-muted)';
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {days === 0 ? 'ครบกำหนด' : `${days} วัน`}
    </span>
  );
}

// ─── Mock probation employees (direct reports on probation) ───────────────────
// Using deterministic IDs that match the mock dataset's in_probation employees.
const MOCK_DIRECT_REPORT_IDS = [
  'EMP0011', 'EMP0023', 'EMP0047', 'EMP0058', 'EMP0072', 'EMP0089',
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagerProbationsPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const allEmployees = useEmployees((s) => s.all);
  const username = useAuthStore((s) => s.username) ?? 'Manager';
  const userId = useAuthStore((s) => s.userId) ?? 'MGR001';

  const addEvaluation = useProbationApprovals((s) => s.addEvaluation);
  const evaluations = useProbationApprovals((s) => s.evaluations);

  // Get probation employees — prefer actual in_probation employees from the store,
  // fall back to mock IDs for demo purposes.
  const probationEmployees = useMemo(() => {
    const fromStore = allEmployees.filter(
      (e) =>
        (e.probation_status === 'in_probation' || e.probation_status === 'extended') &&
        e.status === 'active',
    );
    // Take up to 6 for the manager view
    return fromStore.slice(0, 6);
  }, [allEmployees]);

  const [evaluatingEmployee, setEvaluatingEmployee] = useState<MockEmployee | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleSubmitEvaluation = (form: EvalFormState) => {
    if (!evaluatingEmployee || !form.outcome) return;

    addEvaluation({
      employeeId: evaluatingEmployee.employee_id,
      employeeName: `${evaluatingEmployee.first_name_th} ${evaluatingEmployee.last_name_th}`,
      managerId: userId,
      managerName: username,
      outcome: form.outcome as ProbationOutcome,
      rating: form.rating,
      strengths: form.strengths,
      areasToImprove: form.areasToImprove,
      recommendation: form.recommendation,
      extendUntil: form.extendUntil || undefined,
      extensionReason: form.extensionReason || undefined,
    });

    setSubmittedIds((prev) => new Set([...prev, evaluatingEmployee.employee_id]));
    setEvaluatingEmployee(null);
    setSuccessBanner(
      isTh
        ? `ส่งผลประเมิน ${evaluatingEmployee.first_name_th} แล้ว — รอ HR Admin อนุมัติ`
        : `Evaluation for ${evaluatingEmployee.first_name_en} submitted — pending HR Admin review`,
    );
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <>
      {evaluatingEmployee && (
        <EvaluationModal
          employee={evaluatingEmployee}
          onClose={() => setEvaluatingEmployee(null)}
          onSubmit={(form) => handleSubmitEvaluation(form)}
        />
      )}

      <div className="pb-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Back nav */}
        <div>
          <Link
            href={`/${locale}/manager-dashboard`}
            className="humi-row text-body text-ink-muted hover:text-accent transition-colors"
            style={{ display: 'inline-flex', gap: 6 }}
          >
            <ArrowLeft size={16} aria-hidden />
            <span>{isTh ? 'แดชบอร์ดผู้จัดการ' : 'Manager Dashboard'}</span>
          </Link>
        </div>

        {/* Page title */}
        <div className="humi-row" style={{ gap: 10, alignItems: 'center' }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--color-accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'var(--color-accent)',
            }}
          >
            <ClipboardCheck size={18} aria-hidden />
          </div>
          <div>
            <div className="humi-eyebrow">
              {isTh ? 'การดำเนินการ' : 'Actions'}
            </div>
            <h1 className="font-display text-[20px] font-semibold text-ink">
              {isTh ? 'ทดลองงานของทีม' : 'Team Probations'}
            </h1>
          </div>
        </div>

        {/* Success banner */}
        {successBanner && (
          <div className="humi-card humi-card--success p-4">
            <div className="text-small text-ink">{successBanner}</div>
          </div>
        )}

        {/* Info card */}
        <div className="humi-card humi-card--cream px-4 py-3">
          <div className="text-small text-ink-muted">
            {isTh
              ? 'รายการพนักงานในทีมที่อยู่ในช่วงทดลองงาน — คลิก "ประเมิน" เพื่อส่งผลให้ HR Admin'
              : 'Direct reports currently on probation — click "Evaluate" to submit to HR Admin queue.'}
          </div>
        </div>

        {/* Probation list */}
        {probationEmployees.length === 0 ? (
          <div className="humi-card" style={{ textAlign: 'center', padding: 48 }}>
            <ClipboardCheck size={36} style={{ color: 'var(--color-hairline)', margin: '0 auto 12px' }} aria-hidden />
            <div className="text-body font-medium text-ink" style={{ marginBottom: 4 }}>
              {isTh ? 'ไม่มีพนักงานในช่วงทดลองงาน' : 'No employees on probation'}
            </div>
            <div className="text-small text-ink-muted">
              {isTh ? 'ทีมของคุณผ่านทดลองงานแล้วทั้งหมด' : 'All team members have passed probation.'}
            </div>
          </div>
        ) : (
          <div className="humi-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="humi-eyebrow" style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--color-hairline-soft)' }}>
              {isTh
                ? `${probationEmployees.length} คนในช่วงทดลองงาน`
                : `${probationEmployees.length} on probation`}
            </div>
            <ul role="list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {probationEmployees.map((emp, idx) => {
                const daysRemaining = calcDaysRemaining(emp.hire_date);
                const probationEnd = addDays(emp.hire_date, 119);
                const alreadyEvaluated =
                  submittedIds.has(emp.employee_id) ||
                  evaluations.some(
                    (e) =>
                      e.employeeId === emp.employee_id &&
                      e.status === 'pending_hr',
                  );

                return (
                  <li
                    key={emp.employee_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 20px',
                      borderBottom:
                        idx < probationEmployees.length - 1
                          ? '1px solid var(--color-hairline-soft)'
                          : 'none',
                    }}
                  >
                    {/* Avatar */}
                    <span
                      className="humi-avatar humi-avatar--teal"
                      aria-hidden
                      style={{ flexShrink: 0 }}
                    >
                      {emp.first_name_en[0]}{emp.last_name_en[0]}
                    </span>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink)' }}>
                        {emp.first_name_th} {emp.last_name_th}
                      </div>
                      <div
                        className="humi-row"
                        style={{ gap: 8, marginTop: 3, flexWrap: 'wrap' }}
                      >
                        <span className="text-small text-ink-muted">{emp.position_title}</span>
                        <span style={{ color: 'var(--color-hairline)' }}>·</span>
                        <span className="text-small text-ink-muted">
                          {isTh ? 'เริ่ม' : 'Start'} {formatDateTh(emp.hire_date)}
                        </span>
                        <span style={{ color: 'var(--color-hairline)' }}>·</span>
                        <span className="text-small text-ink-muted">
                          {isTh ? 'ครบ' : 'End'} {formatDateTh(probationEnd)}
                        </span>
                      </div>
                    </div>

                    {/* Days remaining chip */}
                    <DaysChip days={daysRemaining} />

                    {/* Status or Evaluate button */}
                    {alreadyEvaluated ? (
                      <span className="humi-tag humi-tag--butter" style={{ fontSize: 12 }}>
                        {isTh ? 'รอ HR ตรวจสอบ' : 'Pending HR'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEvaluatingEmployee(emp)}
                        className="humi-btn humi-btn--primary"
                        style={{ fontSize: 13, flexShrink: 0 }}
                      >
                        {isTh ? 'ประเมิน' : 'Evaluate'}
                      </button>
                    )}

                    {/* Link to admin profile — keep inbox/list entry separate from the
                        employee-specific probation action form. */}
                    <Link
                      href={`/${locale}/admin/employees/${emp.employee_id}`}
                      aria-label={`${isTh ? 'ดูรายละเอียด' : 'View details'} ${emp.first_name_th}`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-hairline)',
                        color: 'var(--color-ink-soft)', flexShrink: 0,
                      }}
                    >
                      <ChevronRight size={14} aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
