'use client';

// TimeCorrectionForm — the single-authority correction form, shared by the
// standalone /time/corrections page AND the inline modal on /time/timesheet
// (SF-parity: edit attendance in the same place you see the schedule). ALL
// safety-critical validation lives here so neither surface can drift:
//   • non-clocking gate · backdate floor (previous payroll cycle, STA-156
//     leave-parity) · conflicting correction (same date + type already
//     pending/approved) · same-date-same-time clash · intra-submission
//     duplicate → single blockReason.
// The caller passes the SUBJECT employee id (whose timesheet is shown) + an
// optional prefill (date + detected punch type). No backend.
//
// Multi-day: the form is a repeatable "Correction Day N" row editor (Add / Remove).
// It submits ONE TimeCorrectionRequest using Convention X — day 0 is the top-level
// fields (row 0), days 1..n ride `days?: CorrectionDay[]`. A single row leaves
// `days` undefined → byte-identical to the original single-day request.

import { useMemo, useState } from 'react';
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
import { previousPeriod } from '@/lib/time/period';
import { getAttendanceForPeriod } from '@/lib/time/attendance-seed';
import { computeLateMinutes, formatLate, type AttendanceDay } from '@/lib/time/attendance-math';
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
  // 'both' only — the dual clock-in/out pair (STA-171). Empty for in/out rows.
  originalClockIn: string;
  correctedClockIn: string;
  originalClockOut: string;
  correctedClockOut: string;
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
    originalClockIn: '',
    correctedClockIn: '',
    originalClockOut: '',
    correctedClockOut: '',
    reason: '',
    docs: [],
  };
}

/**
 * STA-171 — validate a `both` (In & out) row's dual corrected times. Pure so it is
 * unit-testable. Returns a bilingual error string, or null when valid. Both corrected
 * times are required; the corrected clock-OUT must be strictly later than the corrected
 * clock-IN (lexicographic on zero-padded "HH:mm"; cross-midnight is out of scope).
 */
export function validateBothCorrectionTimes(
  correctedClockIn: string,
  correctedClockOut: string,
  isTh: boolean,
): string | null {
  if (!correctedClockIn.trim() || !correctedClockOut.trim()) {
    return isTh
      ? 'ประเภทเข้า-ออกต้องระบุทั้งเวลาเข้าและเวลาออกที่ถูกต้อง'
      : 'In & out corrections need both a corrected clock-in and clock-out';
  }
  if (correctedClockOut <= correctedClockIn) {
    return isTh
      ? 'เวลาออกที่ถูกต้องต้องหลังเวลาเข้าที่ถูกต้อง'
      : 'Corrected clock-out must be later than corrected clock-in';
  }
  return null;
}

/**
 * STA-174 — the "Original" clock time is a PURE function of the seeded attendance
 * record + the correction type. It is never user-editable and never written via an
 * effect; render, summary and submit all call THIS one helper so they can't diverge.
 *   'in'  → actualIn      'out' → actualOut
 *   'both'→ dual: { clockIn: actualIn, clockOut: actualOut }  (STA-171's two read-only fields)
 * A null punch (forgot / day-off) → '' (blank read-only field; spec "(ถ้ามี)/if any").
 */
export function deriveOriginal(
  attendance: AttendanceDay[],
  date: string,
  type: CorrectionType,
): { single: string; clockIn: string; clockOut: string } {
  const di = date ? (attendance.find((d) => d.date === date) ?? null) : null;
  const inT = di?.actualIn ?? '';
  const outT = di?.actualOut ?? '';
  return {
    single: type === 'out' ? outT : inT, // 'in' (and fallthrough) → in; 'out' → out
    clockIn: inT, // 'both' read-only Original Clock In
    clockOut: outT, // 'both' read-only Original Clock Out
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

  // Earliest correctable date = start of the PREVIOUS payroll cycle, wall-clock —
  // identical to the leave backdate floor (LEAVE_BACKDATE_MIN), so the two backdate
  // surfaces stay in lock-step. Not demo-anchored: mirrors the shipped leave rule.
  const correctionMinDate = useMemo(() => previousPeriod().start, []);

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
      const isBoth = row.correctionType === 'both';
      // Per-row required fields. A 'both' row satisfies the corrected-time
      // requirement through its dual fields (validated just below), not correctedTime.
      if (
        !row.date.trim() ||
        !row.correctionType ||
        !row.reasonCode.trim() ||
        (!isBoth && !row.correctedTime.trim()) ||
        !row.reason.trim()
      ) {
        return isTh
          ? 'แต่ละวันต้องระบุวันที่ ประเภท เหตุผล และเวลาที่ถูกต้อง'
          : 'Each day needs a date, type, reason and corrected time';
      }
      // 'both' (STA-171): both corrected clock-in/out required + Out > In.
      if (isBoth) {
        const bothError = validateBothCorrectionTimes(
          row.correctedClockIn,
          row.correctedClockOut,
          isTh,
        );
        if (bothError) return bothError;
      }
      // Per-row backdate floor: previous payroll cycle onward (STA-170 retroactive rule).
      if (row.date && row.date < correctionMinDate) {
        return isTh
          ? 'เลือกย้อนหลังได้ถึงต้นรอบเวลาก่อนหน้าเท่านั้น'
          : 'You can only backdate to the start of the previous time period';
      }
      // For 'both', key the conflict guard on the corrected clock-IN (the mirror
      // anchor) so findCorrectionConflict receives a valid "HH:mm" value.
      const candidate = {
        date: row.date,
        correctionType: row.correctionType,
        correctedTime: isBoth ? row.correctedClockIn : row.correctedTime,
      };
      // Compare against stored requests AND against the earlier rows of THIS
      // submission (two new rows can't collide either) — same idiom for both.
      const priorRows = rows.slice(0, i).map((other) => ({
        date: other.date,
        correctionType: other.correctionType,
        correctedTime:
          other.correctionType === 'both' ? other.correctedClockIn : other.correctedTime,
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

  const allFilled = rows.every((r) => {
    if (r.date.trim() === '' || r.reason.trim() === '') return false;
    // A 'both' row is filled only when BOTH corrected dual times are present.
    return r.correctionType === 'both'
      ? r.correctedClockIn.trim() !== '' && r.correctedClockOut.trim() !== ''
      : r.correctedTime.trim() !== '';
  });
  const canSubmit = allFilled && blockReason === null;

  function handleAddFiles(rowId: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const names = Array.from(fileList).map((f) => f.name);
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, docs: [...r.docs, ...names] } : r)));
  }

  function toCorrectionDay(r: CorrectionRow): CorrectionDay {
    // STA-174: derive the Original(s) from the SAME helper the render uses so the
    // payload can never diverge from what the read-only fields showed.
    const o = deriveOriginal(attendance, r.date, r.correctionType);
    // 'both' (STA-171): emit the four dual fields + mirror the clock-IN half onto the
    // legacy originalTime/correctedTime so the conflict guard + legacy readers stay
    // coherent. in/out leave the four dual fields undefined (byte-identical).
    if (r.correctionType === 'both') {
      return {
        id: r.id,
        date: r.date,
        correctionType: r.correctionType,
        reasonCode: r.reasonCode,
        originalTime: o.clockIn || undefined,
        correctedTime: r.correctedClockIn,
        originalClockIn: o.clockIn || undefined,
        correctedClockIn: r.correctedClockIn,
        originalClockOut: o.clockOut || undefined,
        correctedClockOut: r.correctedClockOut,
        reason: r.reason,
        docs: r.docs.length > 0 ? r.docs : undefined,
      };
    }
    return {
      id: r.id,
      date: r.date,
      correctionType: r.correctionType,
      reasonCode: r.reasonCode,
      originalTime: o.single || undefined,
      correctedTime: r.correctedTime,
      reason: r.reason,
      docs: r.docs.length > 0 ? r.docs : undefined,
    };
  }

  function handleSubmit() {
    if (!canSubmit) return;
    // Convention X: row 0 = top-level (day 0); days 1..n ride `days` ONLY.
    const day0 = rows[0];
    const day0IsBoth = day0.correctionType === 'both';
    // STA-174: derive day-0's Original(s) from the SAME helper (single source of truth).
    const day0Orig = deriveOriginal(attendance, day0.date, day0.correctionType);
    const days = rows.slice(1).map(toCorrectionDay);
    const id = addRequest({
      employeeId: subjectEmpId,
      employeeName: subjectName ?? username ?? (isTh ? 'พนักงาน' : 'Employee'),
      department: isTh ? 'ทีมของฉัน' : 'My Team',
      date: day0.date,
      correctionType: day0.correctionType,
      reasonCode: day0.reasonCode,
      // 'both': mirror the clock-IN half onto the legacy single fields.
      originalTime: (day0IsBoth ? day0Orig.clockIn : day0Orig.single) || undefined,
      correctedTime: day0IsBoth ? day0.correctedClockIn : day0.correctedTime,
      originalClockIn: day0IsBoth ? day0Orig.clockIn || undefined : undefined,
      correctedClockIn: day0IsBoth ? day0.correctedClockIn : undefined,
      originalClockOut: day0IsBoth ? day0Orig.clockOut || undefined : undefined,
      correctedClockOut: day0IsBoth ? day0.correctedClockOut : undefined,
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
          // STA-174: the read-only Original(s), derived fresh each render (loop-safe,
          // re-derives on any date/type change). Same helper feeds summary + submit.
          const orig = deriveOriginal(attendance, row.date, row.correctionType);
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
                      min={correctionMinDate}
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

                {row.correctionType !== 'both' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        label={
                          row.correctionType === 'out'
                            ? isTh
                              ? 'เวลาออกเดิม'
                              : 'Original Clock Out Time'
                            : isTh
                              ? 'เวลาเข้าเดิม'
                              : 'Original Clock In Time'
                        }
                        help={isTh ? 'ระบบดึงจากบันทึกเวลาจริง' : 'Pulled from the actual clock record'}
                      >
                        {(controlProps) => (
                          <FormInput
                            {...controlProps}
                            type="time"
                            value={orig.single}
                            disabled
                            readOnly
                          />
                        )}
                      </FormField>

                      <FormField
                        label={
                          row.correctionType === 'out'
                            ? isTh
                              ? 'เวลาออกที่ถูกต้อง'
                              : 'Correct Clock Out Time'
                            : isTh
                              ? 'เวลาเข้าที่ถูกต้อง'
                              : 'Correct Clock In Time'
                        }
                        required
                      >
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

                    {(orig.single || row.correctedTime) && (
                      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2 text-sm">
                        <span className="text-ink-muted">{isTh ? 'เวลาเดิม' : 'Original'}</span>
                        <span className="font-medium text-ink">{orig.single || '—'}</span>
                        <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
                        <span className="text-ink-muted">{isTh ? 'แก้เป็น' : 'Corrected'}</span>
                        <span className="font-semibold text-accent">{row.correctedTime || '—'}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* STA-171 'both': two dual pairs — Clock In + Clock Out. */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        label={isTh ? 'เวลาเข้าเดิม' : 'Original Clock In'}
                        help={isTh ? 'เวลาที่ระบบบันทึกไว้' : 'Time the system recorded'}
                      >
                        {(controlProps) => (
                          <FormInput
                            {...controlProps}
                            type="time"
                            value={orig.clockIn}
                            disabled
                            readOnly
                          />
                        )}
                      </FormField>

                      <FormField label={isTh ? 'เวลาเข้าที่ถูกต้อง' : 'Correct Clock In'} required>
                        {(controlProps) => (
                          <FormInput
                            {...controlProps}
                            type="time"
                            value={row.correctedClockIn}
                            onChange={(e) => updateRow(row.id, { correctedClockIn: e.target.value })}
                          />
                        )}
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        label={isTh ? 'เวลาออกเดิม' : 'Original Clock Out'}
                        help={isTh ? 'เวลาที่ระบบบันทึกไว้' : 'Time the system recorded'}
                      >
                        {(controlProps) => (
                          <FormInput
                            {...controlProps}
                            type="time"
                            value={orig.clockOut}
                            disabled
                            readOnly
                          />
                        )}
                      </FormField>

                      <FormField label={isTh ? 'เวลาออกที่ถูกต้อง' : 'Correct Clock Out'} required>
                        {(controlProps) => (
                          <FormInput
                            {...controlProps}
                            type="time"
                            value={row.correctedClockOut}
                            onChange={(e) => updateRow(row.id, { correctedClockOut: e.target.value })}
                          />
                        )}
                      </FormField>
                    </div>

                    {(orig.clockIn || row.correctedClockIn) && (
                      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2 text-sm">
                        <span className="text-ink-muted">{isTh ? 'เวลาเข้า' : 'Clock In'}</span>
                        <span className="font-medium text-ink">{orig.clockIn || '—'}</span>
                        <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
                        <span className="text-ink-muted">{isTh ? 'แก้เป็น' : 'Corrected'}</span>
                        <span className="font-semibold text-accent">{row.correctedClockIn || '—'}</span>
                      </div>
                    )}
                    {(orig.clockOut || row.correctedClockOut) && (
                      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2 text-sm">
                        <span className="text-ink-muted">{isTh ? 'เวลาออก' : 'Clock Out'}</span>
                        <span className="font-medium text-ink">{orig.clockOut || '—'}</span>
                        <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
                        <span className="text-ink-muted">{isTh ? 'แก้เป็น' : 'Corrected'}</span>
                        <span className="font-semibold text-accent">{row.correctedClockOut || '—'}</span>
                      </div>
                    )}
                  </>
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
