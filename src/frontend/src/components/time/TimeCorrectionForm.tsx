'use client';

// TimeCorrectionForm — the single-authority correction form, shared by the
// standalone /time/corrections page AND the inline modal on /time/timesheet
// (SF-parity: edit attendance in the same place you see the schedule). ALL
// safety-critical validation lives here so neither surface can drift:
//   • non-clocking gate · timesheet locked (isTimesheetLocked) · conflicting
//     correction (same date + type already pending/approved) · same-date-same-time
//     clash · intra-submission duplicate → single blockReason.
// The caller passes the SUBJECT employee id (whose timesheet is shown) + an
// optional prefill (date + detected punch type). No backend.
//
// Multi-day: the form is a repeatable "Correction Day N" row editor (Add / Remove).
// It submits ONE TimeCorrectionRequest using Convention X — day 0 is the top-level
// fields (row 0), days 1..n ride `days?: CorrectionDay[]`. A single row leaves
// `days` undefined → byte-identical to the original single-day request.

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronRight, Paperclip, X, Trash2 } from 'lucide-react';
import { Card, Button, FormField, FormInput, Textarea } from '@/components/humi';
import {
  useTimeCorrections,
  CORRECTION_TYPE_LABEL,
  materializeCorrectionDays,
  findCorrectionConflict,
  type CorrectionType,
  type CorrectionDay,
} from '@/stores/time-corrections';
import { CORRECTION_REASONS } from '@/lib/time/correction-reasons';
import { getEmployeeTimeAttrs } from '@/lib/time/employee-time-attrs';
import { isTimesheetLocked } from '@/lib/time/period';
import { getAttendanceForPeriod } from '@/lib/time/attendance-seed';
import { computeLateMinutes, formatLate } from '@/lib/time/attendance-math';
import { useAuthStore } from '@/stores/auth-store';

const CORRECTION_TYPES: CorrectionType[] = ['in', 'out', 'both'];

/** A single editable "Correction Day" row in the form. */
interface CorrectionRow {
  id: string;
  date: string;
  correctionType: CorrectionType;
  reasonCode: string;
  originalTime: string;
  correctedTime: string;
  reason: string;
  docs: string[];
}

let rowSeq = 0;
function newRow(seed?: { date?: string; correctionType?: CorrectionType }): CorrectionRow {
  return {
    id: `tcr-row-${++rowSeq}`,
    date: seed?.date ?? '',
    correctionType: seed?.correctionType ?? 'in',
    reasonCode: CORRECTION_REASONS[0].payCode,
    originalTime: '',
    correctedTime: '',
    reason: '',
    docs: [],
  };
}

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

  const [rows, setRows] = useState<CorrectionRow[]>(() => [
    newRow({ date: prefill?.date, correctionType: prefill?.correctionType }),
  ]);

  function updateRow(id: string, patch: Partial<CorrectionRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    // Never drop the last row — the form must always edit ≥1 day.
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.id !== id)));
  }
  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  const myRequests = useMemo(
    () => allRequests.filter((r) => r.employeeId === subjectEmpId),
    [allRequests, subjectEmpId],
  );

  // Auto-fill each row's original time from the seeded attendance for that date
  // (display convenience — the user can still override it).
  useEffect(() => {
    setRows((rs) =>
      rs.map((r) => {
        if (r.originalTime || !r.date) return r;
        const di = attendance.find((d) => d.date === r.date);
        return di?.actualIn ? { ...r, originalTime: di.actualIn } : r;
      }),
    );
  }, [attendance]);

  // SINGLE validate point — generalized over the full row-set (MF-5). Returns the
  // FIRST failing row's bilingual error. Compares each new row against the FULL
  // materialized day-set of every stored non-rejected request, DAY-0-INCLUSIVE so
  // day 0 is never dropped from the collision check.
  const blockReason = useMemo<string | null>(() => {
    if (attrs.employeeType !== 'clocking') {
      return isTh
        ? 'พนักงานประเภทไม่ต้องลงเวลา ไม่สามารถขอแก้ไขเวลาได้'
        : 'Non-clocking employees cannot request a time correction';
    }

    // Full materialized day-set of every stored non-rejected request (Convention X:
    // [day0, ...days] — day-0-inclusive via materializeCorrectionDays).
    const storedDays = myRequests
      .filter((r) => r.status !== 'rejected')
      .flatMap((r) => materializeCorrectionDays(r));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Per-row required fields.
      if (
        !row.date.trim() ||
        !row.correctionType ||
        !row.reasonCode.trim() ||
        !row.correctedTime.trim() ||
        !row.reason.trim()
      ) {
        return isTh
          ? 'แต่ละวันต้องระบุวันที่ ประเภท เหตุผล และเวลาที่ถูกต้อง'
          : 'Each day needs a date, type, reason and corrected time';
      }
      // Per-row locked-period gate.
      if (isTimesheetLocked(row.date)) {
        return isTh
          ? 'รอบเวลานี้ถูกล็อกแล้ว (ปิดงวดเงินเดือน) ไม่สามารถแก้ไขได้'
          : 'This timesheet period is locked (payroll closed)';
      }
      const candidate = {
        date: row.date,
        correctionType: row.correctionType,
        correctedTime: row.correctedTime,
      };
      // Compare against stored requests AND against the earlier rows of THIS
      // submission (two new rows can't collide either) — same idiom for both.
      const priorRows = rows.slice(0, i).map((other) => ({
        date: other.date,
        correctionType: other.correctionType,
        correctedTime: other.correctedTime,
      }));
      const conflict = findCorrectionConflict(candidate, [...storedDays, ...priorRows]);
      if (conflict === 'duplicate') {
        // Distinguish an intra-submission duplicate from a vs-existing one for a
        // clearer message; both are date+type collisions.
        const dupInSubmission = priorRows.some(
          (other) => other.date === row.date && other.correctionType === row.correctionType,
        );
        return dupInSubmission
          ? isTh
            ? 'มีวันแก้ไขซ้ำในคำขอนี้ (วันและประเภทเดียวกัน)'
            : 'Duplicate correction day in this request (same date and type)'
          : isTh
            ? 'มีคำขอแก้ไขเวลาสำหรับวันและประเภทนี้อยู่แล้ว'
            : 'A correction for this date and punch already exists';
      }
      if (conflict === 'time_clash') {
        return isTh
          ? 'ช่วงเวลาแก้ไขทับซ้อนกัน (วันและเวลาเดียวกัน)'
          : 'Time-correction periods overlap (same date and time)';
      }
    }
    return null;
  }, [attrs.employeeType, rows, myRequests, isTh]);

  const allFilled = rows.every(
    (r) => r.date.trim() !== '' && r.correctedTime.trim() !== '' && r.reason.trim() !== '',
  );
  const canSubmit = allFilled && blockReason === null;

  function handleAddFiles(rowId: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const names = Array.from(fileList).map((f) => f.name);
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, docs: [...r.docs, ...names] } : r)));
  }

  function toCorrectionDay(r: CorrectionRow): CorrectionDay {
    return {
      id: r.id,
      date: r.date,
      correctionType: r.correctionType,
      reasonCode: r.reasonCode,
      originalTime: r.originalTime.trim() || undefined,
      correctedTime: r.correctedTime,
      reason: r.reason,
      docs: r.docs.length > 0 ? r.docs : undefined,
    };
  }

  function handleSubmit() {
    if (!canSubmit) return;
    // Convention X: row 0 = top-level (day 0); days 1..n ride `days` ONLY.
    const day0 = rows[0];
    const days = rows.slice(1).map(toCorrectionDay);
    const id = addRequest({
      employeeId: subjectEmpId,
      employeeName: subjectName ?? username ?? (isTh ? 'พนักงาน' : 'Employee'),
      department: isTh ? 'ทีมของฉัน' : 'My Team',
      date: day0.date,
      correctionType: day0.correctionType,
      reasonCode: day0.reasonCode,
      originalTime: day0.originalTime.trim() || undefined,
      correctedTime: day0.correctedTime,
      reason: day0.reason,
      docs: day0.docs.length > 0 ? day0.docs : undefined,
      days: days.length ? days : undefined,
    });
    // Reset to a single fresh row; caller decides to close/toast.
    setRows([newRow()]);
    onSubmitted?.(id);
  }

  const isMultiRow = rows.length > 1;

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

      <div className="flex flex-col gap-4">
        {rows.map((row, idx) => {
          const dayInfo = attendance.find((d) => d.date === row.date) ?? null;
          const originalLate = dayInfo
            ? computeLateMinutes(dayInfo.scheduledIn, dayInfo.actualIn)
            : null;
          const correctedLate =
            dayInfo && row.correctedTime
              ? computeLateMinutes(dayInfo.scheduledIn, row.correctedTime)
              : null;
          return (
            <Card key={row.id}>
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {isTh ? `วันแก้ไขเวลา ${idx + 1}` : `Correction Day ${idx + 1}`}
                  </p>
                  {isMultiRow && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.id)}
                      className="text-[var(--color-danger)]"
                    >
                      <Trash2 className="h-4 w-4 mr-1" aria-hidden />
                      {isTh ? 'ลบ' : 'Remove'}
                    </Button>
                  )}
                </div>

                <FormField label={isTh ? 'วันที่' : 'Date'} required>
                  {(controlProps) => (
                    <FormInput
                      {...controlProps}
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.id, { date: e.target.value })}
                    />
                  )}
                </FormField>

                <FormField label={isTh ? 'ประเภทการแก้ไข' : 'Correction type'} required>
                  {(controlProps) => (
                    <select
                      {...controlProps}
                      value={row.correctionType}
                      onChange={(e) =>
                        updateRow(row.id, { correctionType: e.target.value as CorrectionType })
                      }
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
                      value={row.reasonCode}
                      onChange={(e) => updateRow(row.id, { reasonCode: e.target.value })}
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
                      <FormInput
                        {...controlProps}
                        type="time"
                        value={row.originalTime}
                        onChange={(e) => updateRow(row.id, { originalTime: e.target.value })}
                      />
                    )}
                  </FormField>

                  <FormField label={isTh ? 'เวลาที่ถูกต้อง' : 'Corrected time'} required>
                    {(controlProps) => (
                      <FormInput
                        {...controlProps}
                        type="time"
                        value={row.correctedTime}
                        onChange={(e) => updateRow(row.id, { correctedTime: e.target.value })}
                      />
                    )}
                  </FormField>
                </div>

                {(row.originalTime || row.correctedTime) && (
                  <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2 text-sm">
                    <span className="text-ink-muted">{isTh ? 'เวลาเดิม' : 'Original'}</span>
                    <span className="font-medium text-ink">{row.originalTime || '—'}</span>
                    <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
                    <span className="text-ink-muted">{isTh ? 'แก้เป็น' : 'Corrected'}</span>
                    <span className="font-semibold text-accent">{row.correctedTime || '—'}</span>
                  </div>
                )}

                <FormField label={isTh ? 'รายละเอียดเพิ่มเติม' : 'Note'} required>
                  {(controlProps) => (
                    <Textarea
                      {...controlProps}
                      rows={3}
                      value={row.reason}
                      onChange={(e) => updateRow(row.id, { reason: e.target.value })}
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
                            handleAddFiles(row.id, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {row.docs.length > 0 && (
                        <ul className="flex flex-col gap-1">
                          {row.docs.map((doc, i) => (
                            <li key={`${doc}-${i}`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                              <Paperclip className="h-3.5 w-3.5" aria-hidden />
                              <span className="truncate">{doc}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateRow(row.id, { docs: row.docs.filter((_, j) => j !== i) })
                                }
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
              </div>
            </Card>
          );
        })}

        <div>
          <Button variant="secondary" size="md" onClick={addRow}>
            {isTh ? '+ เพิ่มวันแก้ไขเวลา' : '+ Add Correction Day'}
          </Button>
        </div>

        {allFilled && blockReason && (
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
    </>
  );
}
