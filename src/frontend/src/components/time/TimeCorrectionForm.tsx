'use client';

// TimeCorrectionForm — the single-authority correction form, shared by the
// standalone /time/corrections page AND the inline modal on /time/timesheet
// (SF-parity: edit attendance in the same place you see the schedule). ALL
// safety-critical validation lives here so neither surface can drift:
//   • non-clocking gate · timesheet locked (isTimesheetLocked) · conflicting
//     correction (same date + type already pending/approved) → single blockReason.
// The caller passes the SUBJECT employee id (whose timesheet is shown) + an
// optional prefill (date + detected punch type). No backend.

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronRight, Paperclip, X } from 'lucide-react';
import { Card, Button, FormField, FormInput, Textarea } from '@/components/humi';
import {
  useTimeCorrections,
  CORRECTION_TYPE_LABEL,
  type CorrectionType,
} from '@/stores/time-corrections';
import { CORRECTION_REASONS } from '@/lib/time/correction-reasons';
import { getEmployeeTimeAttrs } from '@/lib/time/employee-time-attrs';
import { isTimesheetLocked } from '@/lib/time/period';
import { getAttendanceForPeriod } from '@/lib/time/attendance-seed';
import { computeLateMinutes, formatLate } from '@/lib/time/attendance-math';
import { useAuthStore } from '@/stores/auth-store';

const CORRECTION_TYPES: CorrectionType[] = ['in', 'out', 'both'];

export interface TimeCorrectionFormProps {
  /** Employee whose timesheet this correction applies to. */
  subjectEmpId: string;
  /** Display name stored on the request (falls back to the auth username). */
  subjectName?: string;
  prefill?: { date?: string; correctionType?: CorrectionType };
  /** Called after a request is created (the new id). Caller closes modal / toasts. */
  onSubmitted?: (id: string) => void;
  /** When provided, the Cancel button calls this (modal close) instead of rendering nothing. */
  onCancel?: () => void;
}

export function TimeCorrectionForm({
  subjectEmpId,
  subjectName,
  prefill,
  onSubmitted,
  onCancel,
}: TimeCorrectionFormProps) {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const addRequest = useTimeCorrections((s) => s.addRequest);
  const allRequests = useTimeCorrections((s) => s.requests);
  const username = useAuthStore((s) => s.username);

  const attrs = getEmployeeTimeAttrs(subjectEmpId);
  const attendance = useMemo(() => getAttendanceForPeriod(subjectEmpId), [subjectEmpId]);

  const [date, setDate] = useState(() => prefill?.date ?? '');
  const [correctionType, setCorrectionType] = useState<CorrectionType>(prefill?.correctionType ?? 'in');
  const [reasonCode, setReasonCode] = useState<string>(CORRECTION_REASONS[0].payCode);
  const [originalTime, setOriginalTime] = useState('');
  const [correctedTime, setCorrectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [docs, setDocs] = useState<string[]>([]);

  const dayInfo = useMemo(() => attendance.find((d) => d.date === date) ?? null, [attendance, date]);
  useEffect(() => {
    if (dayInfo?.actualIn) setOriginalTime(dayInfo.actualIn);
  }, [dayInfo]);
  const originalLate = dayInfo ? computeLateMinutes(dayInfo.scheduledIn, dayInfo.actualIn) : null;
  const correctedLate = dayInfo && correctedTime ? computeLateMinutes(dayInfo.scheduledIn, correctedTime) : null;

  const myRequests = useMemo(
    () => allRequests.filter((r) => r.employeeId === subjectEmpId),
    [allRequests, subjectEmpId],
  );

  // SINGLE validate point — unchanged semantics from the original page.
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
    const hasConflict = myRequests.some(
      (r) => r.date === date && r.correctionType === correctionType && r.status !== 'rejected',
    );
    if (date && hasConflict) {
      return isTh
        ? 'มีคำขอแก้ไขเวลาสำหรับวันและประเภทนี้อยู่แล้ว'
        : 'A correction for this date and punch already exists';
    }
    return null;
  }, [attrs.employeeType, date, correctionType, myRequests, isTh]);

  const fieldsFilled = date.trim() !== '' && correctedTime.trim() !== '' && reason.trim() !== '';
  const canSubmit = fieldsFilled && blockReason === null;

  function handleAddFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setDocs((prev) => [...prev, ...Array.from(fileList).map((f) => f.name)]);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const id = addRequest({
      employeeId: subjectEmpId,
      employeeName: subjectName ?? username ?? (isTh ? 'พนักงาน' : 'Employee'),
      department: isTh ? 'ทีมของฉัน' : 'My Team',
      date,
      correctionType,
      reasonCode,
      originalTime: originalTime.trim() || undefined,
      correctedTime,
      reason,
      docs: docs.length > 0 ? docs : undefined,
    });
    // Reset the form (keep the date for convenience); caller decides to close/toast.
    setCorrectionType('in');
    setReasonCode(CORRECTION_REASONS[0].payCode);
    setOriginalTime('');
    setCorrectedTime('');
    setReason('');
    setDocs([]);
    onSubmitted?.(id);
  }

  return (
    <>
      {/* Non-clocking gate banner — shown up-front so the block is obvious. */}
      {attrs.employeeType !== 'clocking' && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-ink">
          {isTh
            ? 'พนักงานประเภทไม่ต้องลงเวลา ไม่สามารถขอแก้ไขเวลาได้'
            : 'Non-clocking employees cannot request a time correction'}
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-4 p-5">
          <FormField label={isTh ? 'วันที่' : 'Date'} required>
            {(controlProps) => (
              <FormInput {...controlProps} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
                <FormInput {...controlProps} type="time" value={originalTime} onChange={(e) => setOriginalTime(e.target.value)} />
              )}
            </FormField>

            <FormField label={isTh ? 'เวลาที่ถูกต้อง' : 'Corrected time'} required>
              {(controlProps) => (
                <FormInput {...controlProps} type="time" value={correctedTime} onChange={(e) => setCorrectedTime(e.target.value)} />
              )}
            </FormField>
          </div>

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
                      <li key={`${doc}-${i}`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
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

          {fieldsFilled && blockReason && (
            <div className="rounded-[var(--radius-md)] border border-danger bg-danger-soft px-3 py-2 text-sm text-danger-ink">
              {blockReason}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            {onCancel && (
              <button type="button" onClick={onCancel} className="humi-button humi-button--ghost" style={{ fontSize: 14 }}>
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
            )}
            <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
              {isTh ? 'ส่งคำขอ' : 'Submit request'}
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
