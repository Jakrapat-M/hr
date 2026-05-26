// ShiftEditorDrawer — right-side drawer opened on shift-cell click.
// Prefilled from the clicked shift (local state only). Save = onSave + close
// (parent fires a toast). No persistence, no API — MOCKUP ONLY.

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/humi';
import { cn } from '@/lib/utils';
import {
  SHIFT_TYPE_LABELS,
  type RosterShift,
  type ShiftType,
} from '@/data/roster/mock';

const SHIFT_TYPES: ShiftType[] = ['manager', 'partTime', 'night', 'regular'];

export interface ShiftEditorDrawerProps {
  open: boolean;
  shift: RosterShift | null;
  employeeName?: string;
  onClose: () => void;
  onSave: (draft: { type: ShiftType; start: number; end: number }) => void;
}

export function ShiftEditorDrawer({
  open,
  shift,
  employeeName,
  onClose,
  onSave,
}: ShiftEditorDrawerProps) {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const [type, setType] = useState<ShiftType>('regular');
  const [start, setStart] = useState(9);
  const [end, setEnd] = useState(18);

  // Prefill from the clicked shift each time the drawer opens.
  useEffect(() => {
    if (open && shift) {
      setType(shift.type);
      setStart(shift.start);
      setEnd(shift.end);
    }
  }, [open, shift]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? 'แก้ไขกะ' : 'Edit shift'}
      className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-testid="shift-editor-drawer"
        className={cn(
          'flex h-full w-full max-w-md flex-col bg-surface shadow-[var(--shadow-lg)]',
          'border-l border-hairline',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-6 py-4">
          <h2 className="font-display text-[length:var(--text-display-h3)] font-semibold tracking-tight text-ink">
            {isTh ? 'แก้ไขกะ' : 'Edit shift'}
          </h2>
          <button
            type="button"
            aria-label={isTh ? 'ปิด' : 'Close'}
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {employeeName && (
            <p className="mb-4 text-small text-ink-muted">
              {isTh ? 'พนักงาน' : 'Employee'}:{' '}
              <span className="font-medium text-ink">{employeeName}</span>
            </p>
          )}

          {/* Shift type */}
          <label className="mb-1.5 block text-small font-medium text-ink-soft">
            {isTh ? 'ประเภทกะ' : 'Shift type'}
          </label>
          <div className="mb-5 grid grid-cols-2 gap-2">
            {SHIFT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                data-testid={`type-${t}`}
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={cn(
                  'rounded-md border px-3 py-2 text-small font-medium transition-colors',
                  type === t
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-hairline bg-surface text-ink-soft hover:bg-canvas-soft',
                )}
              >
                {isTh ? SHIFT_TYPE_LABELS[t].th : SHIFT_TYPE_LABELS[t].en}
              </button>
            ))}
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-small font-medium text-ink-soft">
                {isTh ? 'เริ่ม (ชม.)' : 'Start (hr)'}
              </label>
              <input
                type="number"
                min={0}
                max={23}
                value={start}
                onChange={(e) => setStart(Number(e.target.value))}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-small font-medium text-ink-soft">
                {isTh ? 'สิ้นสุด (ชม.)' : 'End (hr)'}
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={end}
                onChange={(e) => setEnd(Number(e.target.value))}
                className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-hairline px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button variant="primary" onClick={() => onSave({ type, start, end })}>
            {isTh ? 'บันทึก' : 'Save'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
