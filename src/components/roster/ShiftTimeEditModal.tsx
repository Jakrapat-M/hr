'use client';

// ShiftTimeEditModal — STA-235 (Team Timesheet Draft 2).
// The ONLY manager-editable dimension on the weekly Team Timesheet: shift TIME.
// Inputs: เวลาเริ่มเข้ากะ (start) + รูปแบบการเบรค (break pattern). The break start
// defaults to start + 4h (overridable) and the เวลาออกกะ (end) auto-computes from
// the employee's contracted span (8h/9h from the seed). Leave / OT are NOT editable
// here (employee uses Time Correction; OT is its own approval). MOCKUP ONLY — save
// resolves to a parent toast, no backend.

import { useState } from 'react';
import { Modal, Button } from '@/components/humi';
import type { ShiftCell } from './WeeklyTimesheetGrid';
import {
  breakStartFromShiftStart,
  shiftEndFromStart,
  breakRangeLabel,
  spanHours,
  BREAK_PATTERN_LABEL,
  BREAK_PATTERN_MINUTES,
  type BreakPattern,
} from '@/lib/time/shift-time-calc';

/** The edited values the modal hands back on save (single + batch). */
export type ShiftTimeEditPayload = {
  start: string;
  pattern: BreakPattern;
  breakStart: string;
};

export interface ShiftTimeEditModalProps {
  open: boolean;
  isTh: boolean;
  onClose: () => void;
  onSave: (payload: ShiftTimeEditPayload) => void;
  // ── Single-cell edit (omitted in batch mode) ──
  employeeName?: string;
  /** ISO date (display context). */
  date?: string;
  scheduledIn?: string;
  scheduledOut?: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  // ── STA-254 batch edit ──
  /** When true, edit every cell in `cells` at once (mixed contracts handled). */
  batch?: boolean;
  cells?: ShiftCell[];
}

const BREAK_PATTERNS: BreakPattern[] = ['break1h', 'break90m', 'none'];

/** Round a cell's in→out span to its contracted hours (8 / 9), min 9 fallback. */
function contractOf(inTime: string, outTime: string): number {
  return Math.round(spanHours(inTime, outTime)) || 9;
}

/** Infer the initial break pattern from the seed break window length. */
function inferBreakPattern(breakStart: string | null, breakEnd: string | null): BreakPattern {
  if (!breakStart || !breakEnd) return 'none';
  const mins = spanHours(breakStart, breakEnd) * 60;
  if (mins >= BREAK_PATTERN_MINUTES.break90m) return 'break90m';
  return 'break1h';
}

export function ShiftTimeEditModal({
  open,
  employeeName,
  date,
  scheduledIn,
  scheduledOut,
  breakStart,
  breakEnd,
  isTh,
  onClose,
  onSave,
  batch = false,
  cells = [],
}: ShiftTimeEditModalProps) {
  const isBatch = batch && cells.length > 0;

  // Batch seeds from the first selected cell; single from its own seed shift.
  const seedIn = isBatch ? cells[0].scheduledIn : (scheduledIn ?? '08:00');
  const seedOut = isBatch ? cells[0].scheduledOut : (scheduledOut ?? '17:00');
  const seedBreakStart = isBatch ? cells[0].breakStart : (breakStart ?? null);
  const seedBreakEnd = isBatch ? cells[0].breakEnd : (breakEnd ?? null);

  // Contracted span (8h / 9h) read from the seed shift — drives the auto end time.
  const contractHours = contractOf(seedIn, seedOut);

  // Batch mixed-contract handling — the auto end differs per employee (8h vs 9h),
  // so surface the computed end for EACH unique contract span in the selection.
  const uniqueContracts = isBatch
    ? Array.from(new Set(cells.map((c) => contractOf(c.scheduledIn, c.scheduledOut)))).sort(
        (a, b) => a - b,
      )
    : [];

  // Seeded once at mount; the parent remounts (via `key`) per shift, so a new
  // shift always gets a fresh form without a setState-in-effect re-seed.
  const [start, setStart] = useState(seedIn);
  const [pattern, setPattern] = useState<BreakPattern>(() =>
    inferBreakPattern(seedBreakStart, seedBreakEnd),
  );
  const [breakStartTime, setBreakStartTime] = useState(
    () => seedBreakStart ?? breakStartFromShiftStart(seedIn),
  );
  const [breakTouched, setBreakTouched] = useState(false);

  // Live-recompute the auto break-start (unless overridden) + the read-only end.
  const effectiveBreakStart = breakTouched ? breakStartTime : breakStartFromShiftStart(start);
  const end = shiftEndFromStart(start, contractHours);
  const breakRange = breakRangeLabel(pattern, effectiveBreakStart);

  const handleSave = () =>
    onSave({ start, pattern, breakStart: effectiveBreakStart });

  const inputClass =
    'w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isBatch
          ? isTh ? 'แก้ไขเวลากะหลายรายการ' : 'Edit shift time — batch'
          : isTh ? 'แก้ไขเวลากะ' : 'Edit shift time'
      }
      widthClass="max-w-md"
    >
      <div data-testid="shift-time-edit-modal" className="flex flex-col gap-5">
        {isBatch ? (
          <p data-testid="batch-modal-summary" className="text-small text-ink-muted">
            {isTh
              ? `เลือกไว้ ${cells.length} กะ`
              : `${cells.length} shift${cells.length === 1 ? '' : 's'} selected`}
            <span className="mx-1.5 text-ink-faint">·</span>
            {isTh
              ? 'เวลาออกกะคำนวณตามสัญญาจ้างของแต่ละคน'
              : 'End time is computed per employee’s contract'}
          </p>
        ) : (
          <p className="text-small text-ink-muted">
            {isTh ? 'พนักงาน' : 'Employee'}:{' '}
            <span className="font-medium text-ink">{employeeName}</span>
            <span className="mx-1.5 text-ink-faint">·</span>
            <span className="font-mono text-ink-soft">{date}</span>
          </p>
        )}

        {/* เวลาเริ่มเข้ากะ */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="shift-start" className="text-small font-medium text-ink-soft">
            {isTh ? 'เวลาเริ่มเข้ากะ' : 'Shift start'}
          </label>
          <input
            id="shift-start"
            data-testid="shift-start-input"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* รูปแบบการเบรค */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="break-pattern" className="text-small font-medium text-ink-soft">
            {isTh ? 'รูปแบบการเบรค' : 'Break pattern'}
          </label>
          <select
            id="break-pattern"
            data-testid="break-pattern-select"
            value={pattern}
            onChange={(e) => setPattern(e.target.value as BreakPattern)}
            className={inputClass}
          >
            {BREAK_PATTERNS.map((p) => (
              <option key={p} value={p}>
                {isTh ? BREAK_PATTERN_LABEL[p].th : BREAK_PATTERN_LABEL[p].en}
              </option>
            ))}
          </select>
        </div>

        {/* เวลาเริ่มเบรค — auto (+4h) but overridable; hidden for the no-break pattern */}
        {pattern !== 'none' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="break-start" className="text-small font-medium text-ink-soft">
              {isTh ? 'เวลาเริ่มเบรค' : 'Break start'}
              <span className="ml-1.5 text-xs font-normal text-ink-faint">
                {breakTouched
                  ? isTh ? '(กำหนดเอง)' : '(manual)'
                  : isTh ? '(อัตโนมัติ +4 ชม.)' : '(auto +4h)'}
              </span>
            </label>
            <input
              id="break-start"
              data-testid="break-start-input"
              type="time"
              value={effectiveBreakStart}
              onChange={(e) => {
                setBreakTouched(true);
                setBreakStartTime(e.target.value);
              }}
              className={inputClass}
            />
            {breakRange && (
              <span className="text-xs text-ink-muted">
                {isTh ? 'ช่วงเบรค' : 'Break range'}: {breakRange}
              </span>
            )}
          </div>
        )}

        {/* เวลาออกกะ — read-only, auto-computed from the contracted span. In batch
            mode with mixed contracts, show the computed end for EACH span. */}
        <div className="flex flex-col gap-1.5">
          <label className="text-small font-medium text-ink-soft">
            {isTh ? 'เวลาออกกะ (คำนวณอัตโนมัติ)' : 'Shift end (auto)'}
          </label>
          <div
            data-testid="shift-end-value"
            aria-live="polite"
            className="w-full rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2.5 text-body font-medium text-ink"
          >
            {isBatch ? (
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {uniqueContracts.map((h) => (
                  <span key={h}>
                    {shiftEndFromStart(start, h)}
                    <span className="ml-1.5 text-xs font-normal text-ink-muted">
                      {isTh ? `(กะ ${h} ชม.)` : `(${h}h span)`}
                    </span>
                  </span>
                ))}
              </span>
            ) : (
              <>
                {end}
                <span className="ml-2 text-xs font-normal text-ink-muted">
                  {isTh ? `(กะ ${contractHours} ชม.)` : `(${contractHours}h span)`}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button variant="primary" data-testid="shift-time-save" onClick={handleSave}>
            {isBatch
              ? isTh ? `บันทึก ${cells.length} กะ` : `Save ${cells.length} shifts`
              : isTh ? 'บันทึก' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
