'use client';

// STA-168 — one employee × day cell in the shift-assignment month grid.
//
// NO-RED colour system (design tokens only):
//   Working  → teal   (accent-soft)
//   Holiday  → indigo (accent-alt-soft)  — column/cell shading, assignment-agnostic
//   Day off  → neutral (canvas-soft, muted)
//   Empty    → surface
//   Selected → teal ring
//   Warning  → pumpkin (--color-danger) outline — OT overlap, never red
//   Read-only→ muted (no pointer, dimmed)

import { getShiftCode } from '@/lib/time/shift-codes';
import type { ShiftCell } from '@/lib/shift-groups';

export interface ShiftAssignCellProps {
  empId: string;
  date: string;
  cell?: ShiftCell;
  isHoliday: boolean;
  holidayLabel?: string;
  editable: boolean;
  selected: boolean;
  warning?: boolean;
  isTh: boolean;
  onToggle: () => void;
}

export function ShiftAssignCell({
  empId,
  date,
  cell,
  isHoliday,
  holidayLabel,
  editable,
  selected,
  warning,
  isTh,
  onToggle,
}: ShiftAssignCellProps) {
  const shift = getShiftCode(cell?.shiftCode ?? null);
  const dayOff = cell?.dayOff ?? false;
  const hasOt = Boolean(cell?.otStart && cell?.otEnd);

  // Background layer: assignment wins; holiday shades an otherwise unset cell.
  const bg = dayOff
    ? 'var(--color-canvas-soft)'
    : shift
      ? 'var(--color-accent-soft)'
      : isHoliday
        ? 'var(--color-accent-alt-soft)'
        : 'var(--color-surface)';
  const fg = dayOff
    ? 'var(--color-ink-muted)'
    : shift
      ? 'var(--color-accent)'
      : isHoliday
        ? 'var(--color-accent-alt)'
        : 'var(--color-ink-soft)';

  const label = dayOff
    ? isTh ? 'วันหยุด' : 'Day off'
    : shift
      ? `${shift.in}–${shift.out}`
      : isHoliday
        ? (isTh ? 'นักขัตฤกษ์' : 'Holiday')
        : '—';

  const title = holidayLabel
    ? `${isTh ? holidayLabel : holidayLabel}`
    : shift
      ? (isTh ? shift.nameTh : shift.nameEn)
      : undefined;

  const style: React.CSSProperties = {
    minWidth: 58,
    height: 44,
    fontSize: 11,
    lineHeight: 1.2,
    padding: '2px 4px',
    borderRadius: 'var(--radius-xs)',
    background: bg,
    color: fg,
    border: warning
      ? '2px solid var(--color-danger)'
      : selected
        ? '2px solid var(--color-accent)'
        : '1px solid var(--color-hairline)',
    boxShadow: selected ? '0 0 0 2px var(--color-accent-soft)' : undefined,
    cursor: editable ? 'pointer' : 'default',
    opacity: editable ? 1 : 0.85,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  };

  const content = (
    <>
      <span style={{ fontWeight: shift ? 600 : 400 }}>{label}</span>
      {hasOt && (
        <span style={{ fontSize: 9, color: 'var(--color-accent-alt)' }}>
          OT {cell?.otStart}–{cell?.otEnd}
        </span>
      )}
    </>
  );

  const testId = `sa-cell-${empId}-${date}`;

  if (!editable) {
    return (
      <div
        data-testid={testId}
        data-selected={selected ? 'true' : undefined}
        data-warning={warning ? 'true' : undefined}
        style={style}
        title={title}
        aria-label={`${date} ${label}`}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      data-selected={selected ? 'true' : undefined}
      data-warning={warning ? 'true' : undefined}
      onClick={onToggle}
      style={style}
      title={title}
      aria-pressed={selected}
      aria-label={`${date} ${label}`}
    >
      {content}
    </button>
  );
}
