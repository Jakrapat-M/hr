'use client';

// /time/corrections — P3 employee self-service timesheet/attendance correction
// form. Submitting pushes a pending correction into the time-corrections Zustand
// store; the record then surfaces as a 'time_correction' row in the unified
// /quick-approve queue (detail at /workflows/time-correction/[id]). No backend.
//
// Group C reshape:
//   • Reason dropdown from the 15-row CORRECTION_REASONS registry (C1).
//   • Correction type = in / out / both (C2) + read-only original-time display.
//   • SINGLE validate point blocks submit (pumpkin) on: non-clocking employee ·
//     timesheet locked (isTimesheetLocked) · conflicting correction (same date +
//     correctionType already pending/decided) (C3).
//   • Free-text reason note + ≥1 optional attachment (C4).
//
// Open to all personas (self-service). Humi primitives + tokens only.
// Danger = pumpkin (--color-danger). No hardcoded hex.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { getAttendanceForPeriod } from '@/lib/time/attendance-seed';
import { computeLateMinutes, formatLate } from '@/lib/time/attendance-math';
import { ChevronRight, Clock3, Paperclip, X } from 'lucide-react';
import { Card, Button, FormField, FormInput, Textarea, DemoValuesDisclaimer } from '@/components/humi';
import {
  useTimeCorrections,
  CORRECTION_TYPE_LABEL,
  type CorrectionType,
} from '@/stores/time-corrections';
import { CORRECTION_REASONS } from '@/lib/time/correction-reasons';
import { getEmployeeTimeAttrs } from '@/lib/time/employee-time-attrs';
import { isTimesheetLocked } from '@/lib/time/period';
import { useAuthStore } from '@/stores/auth-store';
import { resolveCurrentEmpId } from '@/lib/scope-filter';

const CORRECTION_TYPES: CorrectionType[] = ['in', 'out', 'both'];

export default function TimeCorrectionsPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const addRequest = useTimeCorrections((s) => s.addRequest);
  const allRequests = useTimeCorrections((s) => s.requests);

  const username = useAuthStore((s) => s.username);
  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);

  const empId = resolveCurrentEmpId(email) ?? userId ?? 'EMP000';
  const attrs = getEmployeeTimeAttrs(empId);

  const searchParams = useSearchParams();
  const attendance = useMemo(() => getAttendanceForPeriod(empId), [empId]);

  const [date, setDate] = useState(() => searchParams.get('date') ?? '');
  const [correctionType, setCorrectionType] = useState<CorrectionType>('in');
  const [reasonCode, setReasonCode] = useState<string>(CORRECTION_REASONS[0].payCode);
  const [originalTime, setOriginalTime] = useState('');
  const [correctedTime, setCorrectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [docs, setDocs] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  // Schedule + actual punch for the chosen day → drives the scheduled-vs-actual
  // comparison and the recomputed Late (wiki §7.5).
  const dayInfo = useMemo(() => attendance.find((d) => d.date === date) ?? null, [attendance, date]);
  useEffect(() => {
    // Prefill the "original" punch from the recorded clock-in when a date is chosen.
    if (dayInfo?.actualIn) setOriginalTime(dayInfo.actualIn);
  }, [dayInfo]);
  const originalLate = dayInfo ? computeLateMinutes(dayInfo.scheduledIn, dayInfo.actualIn) : null;
  const correctedLate = dayInfo && correctedTime ? computeLateMinutes(dayInfo.scheduledIn, correctedTime) : null;

  // Only the employee's own corrections matter for the conflict check.
  const myRequests = useMemo(
    () => allRequests.filter((r) => r.employeeId === empId),
    [allRequests, empId],
  );

  // SINGLE validate point (C3). Returns a localized blocking message or null.
  const blockReason = useMemo<string | null>(() => {
    if (attrs.employeeType !== 'clocking') {
      return isTh
        ? 'พนักงานประเภทไม่ต้องลงเวลา ไม่สามารถขอแก้ไขเวลาได้'
        : 'Non-clocking employees cannot request a time correction';
    }
    if (date && isTimesheetLocked(date)) {
      return isTh
        ? 'รอบเวลานี้ถูกล็อกแล้ว (ปิดงวดเงินเดือน) ไม่สามารถแก้ไขได้'
        : 'This timesheet period is locked (payroll closed)';
    }
    // Conflict — another correction for the same date + punch already exists.
    const hasConflict = myRequests.some(
      (r) =>
        r.date === date &&
        r.correctionType === correctionType &&
        r.status !== 'rejected',
    );
    if (date && hasConflict) {
      return isTh
        ? 'มีคำขอแก้ไขเวลาสำหรับวันและประเภทนี้อยู่แล้ว'
        : 'A correction for this date and punch already exists';
    }
    return null;
  }, [attrs.employeeType, date, correctionType, myRequests, isTh]);

  const fieldsFilled =
    date.trim() !== '' && correctedTime.trim() !== '' && reason.trim() !== '';
  const canSubmit = fieldsFilled && blockReason === null;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleAddFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setDocs((prev) => [...prev, ...Array.from(fileList).map((f) => f.name)]);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const id = addRequest({
      employeeId: empId,
      employeeName: username ?? (isTh ? 'พนักงาน' : 'Employee'),
      department: isTh ? 'ทีมของฉัน' : 'My Team',
      date,
      correctionType,
      reasonCode,
      originalTime: originalTime.trim() || undefined,
      correctedTime,
      reason,
      docs: docs.length > 0 ? docs : undefined,
    });
    setLastId(id);
    showToast(isTh ? 'ส่งคำขอแก้ไขเวลาแล้ว — รอหัวหน้าอนุมัติ' : 'Correction submitted — awaiting manager');
    // Reset the form (keep the date for convenience).
    setCorrectionType('in');
    setReasonCode(CORRECTION_REASONS[0].payCode);
    setOriginalTime('');
    setCorrectedTime('');
    setReason('');
    setDocs([]);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-ink-muted mb-4" aria-label="breadcrumb">
        <Link href={`/${locale}/time`} className="hover:text-ink transition">
          {isTh ? 'เวลางาน' : 'Time'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-ink font-medium">{isTh ? 'แก้ไขเวลา' : 'Time Correction'}</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] bg-accent-soft text-accent">
          <Clock3 className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {isTh ? 'ขอแก้ไขเวลาเข้า-ออกงาน' : 'Request a time correction'}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isTh
              ? 'ส่งคำขอแก้ไขเวลาที่บันทึกผิดพลาด คำขอจะถูกส่งให้หัวหน้างานอนุมัติ'
              : 'Submit a correction for a mis-recorded punch. Your manager will review it.'}
          </p>
        </div>
      </div>

      <DemoValuesDisclaimer />

      {/* Non-clocking gate banner (C3) — shown up-front so the block is obvious. */}
      {attrs.employeeType !== 'clocking' && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-ink">
          {isTh
            ? 'พนักงานประเภทไม่ต้องลงเวลา ไม่สามารถขอแก้ไขเวลาได้'
            : 'Non-clocking employees cannot request a time correction'}
        </div>
      )}

      {/* Form */}
      <Card className="mt-4">
        <div className="flex flex-col gap-4 p-5">
          <FormField label={isTh ? 'วันที่' : 'Date'} required>
            {(controlProps) => (
              <FormInput
                {...controlProps}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </FormField>

          <FormField label={isTh ? 'ประเภทการแก้ไข' : 'Correction type'} required>
            {(controlProps) => (
              <select
                {...controlProps}
                value={correctionType}
                onChange={(e) => setCorrectionType(e.target.value as CorrectionType)}
                className="h-10 w-full rounded-md border border-hairline bg-surface px-3 text-body text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {CORRECTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {isTh ? CORRECTION_TYPE_LABEL[t].th : CORRECTION_TYPE_LABEL[t].en}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField
            label={isTh ? 'เหตุผล (รหัสเหตุผล)' : 'Reason'}
            help={isTh ? 'เลือกเหตุผลตามรายการมาตรฐาน' : 'Pick a standard reason'}
            required
          >
            {(controlProps) => (
              <select
                {...controlProps}
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="h-10 w-full rounded-md border border-hairline bg-surface px-3 text-body text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {CORRECTION_REASONS.map((r) => (
                  <option key={r.payCode} value={r.payCode}>
                    {isTh ? r.reasonTh : r.reasonEn}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          {/* Scheduled-vs-actual + recomputed Late for the chosen day (wiki §7.5) */}
          {dayInfo && (
            <div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2.5 text-sm">
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                <span className="text-ink-muted">{isTh ? 'กะวันนั้น' : 'Shift'}: <span className="font-medium text-ink">{dayInfo.dayOff ? (isTh ? 'วันหยุด' : 'Day off') : dayInfo.scheduledIn ? `${dayInfo.scheduledIn}–${dayInfo.scheduledOut}` : '—'}</span></span>
                <span className="text-ink-muted">{isTh ? 'เข้าจริง' : 'Actual in'}: <span className="font-medium text-ink">{dayInfo.actualIn ?? '—'}</span></span>
                <span className="text-ink-muted">{isTh ? 'สายเดิม' : 'Late'}: <span className="font-medium text-danger">{formatLate(originalLate, isTh)}</span></span>
                {correctedLate !== null && (
                  <span className="text-ink-muted">{isTh ? 'สายหลังแก้' : 'After fix'}: <span className="font-semibold text-accent">{formatLate(correctedLate, isTh)}</span></span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={isTh ? 'เวลาเดิม (ถ้ามี)' : 'Original time (if any)'}
              help={isTh ? 'เวลาที่ระบบบันทึกไว้' : 'Time the system recorded'}
            >
              {(controlProps) => (
                <FormInput
                  {...controlProps}
                  type="time"
                  value={originalTime}
                  onChange={(e) => setOriginalTime(e.target.value)}
                />
              )}
            </FormField>

            <FormField label={isTh ? 'เวลาที่ถูกต้อง' : 'Corrected time'} required>
              {(controlProps) => (
                <FormInput
                  {...controlProps}
                  type="time"
                  value={correctedTime}
                  onChange={(e) => setCorrectedTime(e.target.value)}
                />
              )}
            </FormField>
          </div>

          {/* Before → After preview (C2) — read-only comparison of the punch. */}
          {(originalTime || correctedTime) && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2 text-sm">
              <span className="text-ink-muted">{isTh ? 'เวลาเดิม' : 'Original'}</span>
              <span className="font-medium text-ink">{originalTime || '—'}</span>
              <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
              <span className="text-ink-muted">{isTh ? 'แก้เป็น' : 'Corrected'}</span>
              <span className="font-semibold text-accent">{correctedTime || '—'}</span>
            </div>
          )}

          <FormField label={isTh ? 'รายละเอียดเพิ่มเติม' : 'Note'} required>
            {(controlProps) => (
              <Textarea
                {...controlProps}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isTh ? 'อธิบายสาเหตุของการแก้ไข' : 'Explain why this correction is needed'}
              />
            )}
          </FormField>

          {/* Optional attachments (C4) — filenames only (mock). */}
          <FormField
            label={isTh ? 'เอกสารแนบ (ไม่บังคับ)' : 'Attachments (optional)'}
            help={isTh ? 'แนบหลักฐานประกอบ เช่น รูปบัตร/ใบรับรอง' : 'Attach supporting evidence if available'}
          >
            {() => (
              <div className="flex flex-col gap-2">
                <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink hover:bg-canvas-soft transition">
                  <Paperclip className="h-4 w-4" aria-hidden />
                  {isTh ? 'เลือกไฟล์' : 'Choose files'}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleAddFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
                {docs.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {docs.map((doc, i) => (
                      <li
                        key={`${doc}-${i}`}
                        className="inline-flex items-center gap-1.5 text-sm text-ink-muted"
                      >
                        <Paperclip className="h-3.5 w-3.5" aria-hidden />
                        <span className="truncate">{doc}</span>
                        <button
                          type="button"
                          onClick={() => setDocs((prev) => prev.filter((_, j) => j !== i))}
                          className="text-ink-faint hover:text-danger transition"
                          aria-label={isTh ? 'ลบไฟล์' : 'Remove file'}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </FormField>

          {/* Inline blocking message (pumpkin) — C3 */}
          {fieldsFilled && blockReason && (
            <div className="rounded-[var(--radius-md)] border border-danger bg-danger-soft px-3 py-2 text-sm text-danger-ink">
              {blockReason}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Link href={`/${locale}/time`} className="humi-button humi-button--ghost" style={{ fontSize: 14 }}>
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </Link>
            <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
              {isTh ? 'ส่งคำขอ' : 'Submit request'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirmation link to the just-submitted row */}
      {lastId && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-4 py-3 text-sm text-ink-muted">
          {isTh ? 'ส่งคำขอแล้ว — ' : 'Submitted — '}
          <Link
            href={`/${locale}/workflows/time-correction/${lastId}`}
            className="text-accent font-medium hover:underline"
          >
            {isTh ? 'ดูคำขอ' : 'View request'}
          </Link>
        </div>
      )}

      {/* My recent corrections */}
      {myRequests.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
            {isTh ? 'คำขอล่าสุดของฉัน' : 'My recent requests'}
          </h2>
          <Card>
            <ul className="divide-y divide-hairline">
              {myRequests.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/${locale}/workflows/time-correction/${r.id}`}
                      className="text-sm font-medium text-ink hover:text-accent transition"
                    >
                      {r.date} · {isTh ? CORRECTION_TYPE_LABEL[r.correctionType].th : CORRECTION_TYPE_LABEL[r.correctionType].en}
                    </Link>
                    <div className="text-xs text-ink-muted truncate">{r.reason}</div>
                  </div>
                  <span
                    className={
                      r.status === 'approved'
                        ? 'humi-tag humi-tag--accent'
                        : r.status === 'rejected'
                          ? 'humi-tag'
                          : 'humi-tag humi-tag--butter'
                    }
                    style={{ fontSize: 12 }}
                  >
                    {r.status === 'approved'
                      ? isTh ? 'อนุมัติแล้ว' : 'Approved'
                      : r.status === 'rejected'
                        ? isTh ? 'ปฏิเสธ' : 'Rejected'
                        : isTh ? 'รออนุมัติ' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--radius-md)] border border-hairline bg-surface px-4 py-2 text-sm text-ink shadow-[var(--shadow-md)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
