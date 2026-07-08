'use client';

// OtScheduleModal — STA-260 (Team Timesheet Draft 4).
// The per-day "+OverTime" popup on /roster: a manager schedules (or edits) an
// OT window for one (employee, day). Same Humi modal aesthetic as
// ShiftTimeEditModal. Rules per the ticket:
//   • start/end times required, same-day (end after start)
//   • the window must NOT overlap any existing block that day — the scheduled
//     shift, another OT, or a leave block (validateRosterOt; touching allowed)
//   • an OT TYPE (x1 / x1.5 / x2 / x3) MUST be chosen before saving
// Errors render inline in pumpkin (--color-danger) — NO RED. Mockup only.

import { useState } from 'react';
import { Modal, Button } from '@/components/humi';
import { cn } from '@/lib/utils';
import { OT_RATE_TYPES, type OtRateType } from '@/stores/overtime-requests';
import {
  validateRosterOt,
  rosterOtHours,
  type BlockedWindow,
} from '@/lib/time/roster-ot';

export type OtSchedulePayload = {
  start: string;
  end: string;
  rateType: OtRateType;
  hours: number;
};

export interface OtScheduleModalProps {
  open: boolean;
  isTh: boolean;
  employeeName: string;
  /** ISO date of the day cell. */
  date: string;
  /** Existing blocked windows that day (shift / other OT / leave). */
  blocked: readonly BlockedWindow[];
  /** Present when EDITING an existing OT card (prefills the form). */
  existing?: { id: string; start: string; end: string; rateType?: OtRateType };
  onClose: () => void;
  onSave: (payload: OtSchedulePayload) => void;
}

export function OtScheduleModal({
  open,
  isTh,
  employeeName,
  date,
  blocked,
  existing,
  onClose,
  onSave,
}: OtScheduleModalProps) {
  const [start, setStart] = useState(existing?.start ?? '');
  const [end, setEnd] = useState(existing?.end ?? '');
  const [rateType, setRateType] = useState<OtRateType | null>(existing?.rateType ?? null);
  const [error, setError] = useState<string | null>(null);

  const hours = rosterOtHours(start, end);

  function handleSave() {
    // Mandatory OT type first (ticket 2: cannot finish without choosing one).
    if (!rateType) {
      setError(isTh ? 'กรุณาเลือกประเภท OT (x1 / x1.5 / x2 / x3)' : 'Choose an OT type (x1 / x1.5 / x2 / x3)');
      return;
    }
    const result = validateRosterOt(start, end, blocked);
    if (result) {
      switch (result.code) {
        case 'missing_time':
          setError(isTh ? 'กรุณาระบุเวลาเริ่มและสิ้นสุด' : 'Enter both start and end time');
          return;
        case 'bad_range':
          setError(isTh ? 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม' : 'End time must be after the start time');
          return;
        case 'overlap':
          setError(
            isTh
              ? `ช่วงเวลาทับซ้อนกับ${result.block.labelTh} (${result.block.start}–${result.block.end})`
              : `Overlaps the ${result.block.labelEn} (${result.block.start}–${result.block.end})`,
          );
          return;
      }
    }
    onSave({ start, end, rateType, hours });
  }

  const inputClass =
    'w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        existing
          ? isTh ? 'แก้ไขโอที (OT)' : 'Edit overtime'
          : isTh ? 'เพิ่มโอที (OT)' : 'Add overtime'
      }
      widthClass="max-w-md"
    >
      <div data-testid="ot-schedule-modal" className="flex flex-col gap-5">
        <p className="text-small text-ink-muted">
          {isTh ? 'พนักงาน' : 'Employee'}:{' '}
          <span className="font-medium text-ink">{employeeName}</span>
          <span className="mx-1.5 text-ink-faint">·</span>
          <span className="font-mono text-ink-soft">{date}</span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ot-start" className="text-small font-medium text-ink-soft">
              {isTh ? 'เวลาเริ่ม OT' : 'OT start'}
            </label>
            <input
              id="ot-start"
              data-testid="ot-start-input"
              type="time"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setError(null);
              }}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ot-end" className="text-small font-medium text-ink-soft">
              {isTh ? 'เวลาสิ้นสุด OT' : 'OT end'}
            </label>
            <input
              id="ot-end"
              data-testid="ot-end-input"
              type="time"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setError(null);
              }}
              className={inputClass}
            />
          </div>
        </div>

        {/* Mandatory OT type chips (x1 / x1.5 / x2 / x3). */}
        <div className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-ink-soft">
            {isTh ? 'ประเภท OT *' : 'OT type *'}
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label={isTh ? 'ประเภท OT' : 'OT type'}>
            {OT_RATE_TYPES.map((t) => {
              const active = rateType === t;
              return (
                <button
                  key={t}
                  type="button"
                  data-testid={`ot-rate-${t}`}
                  aria-pressed={active}
                  onClick={() => {
                    setRateType(t);
                    setError(null);
                  }}
                  className={cn(
                    'rounded-[var(--radius-md)] border px-3.5 py-1.5 text-small font-semibold uppercase transition-colors',
                    active
                      ? 'border-accent bg-accent text-white'
                      : 'border-hairline bg-surface text-ink-muted hover:border-accent hover:text-accent',
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Existing blocks that day — so the manager can see what to avoid. */}
        {blocked.length > 0 && (
          <div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2.5 text-xs text-ink-muted">
            <span className="font-semibold">{isTh ? 'ช่วงเวลาที่มีอยู่แล้ว:' : 'Existing blocks:'}</span>{' '}
            {blocked
              .map((b) => `${isTh ? b.labelTh : b.labelEn} ${b.start}–${b.end}`)
              .join(' · ')}
          </div>
        )}

        {/* Computed hours */}
        {hours > 0 && (
          <div className="text-small text-ink-muted">
            {isTh ? 'รวม' : 'Total'}:{' '}
            <span className="font-semibold text-ink tabular-nums">{hours.toFixed(2)}</span>{' '}
            {isTh ? 'ชม.' : 'h'}
          </div>
        )}

        {/* Inline validation error — pumpkin, never red. */}
        {error && (
          <div
            data-testid="ot-schedule-error"
            className="rounded-[var(--radius-md)] border border-danger bg-danger-soft px-3 py-2 text-sm text-danger-ink"
          >
            {error}
          </div>
        )}

        <div className="mt-1 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button variant="primary" data-testid="ot-schedule-save" onClick={handleSave}>
            {existing ? (isTh ? 'บันทึกการแก้ไข' : 'Save changes') : (isTh ? 'เพิ่ม OT' : 'Add OT')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
