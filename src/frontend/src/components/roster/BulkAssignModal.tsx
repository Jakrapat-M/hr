// BulkAssignModal — select multiple employees + a shift type, Apply assigns to
// all selected. Apply = onApply + close (parent fires a toast). MOCKUP ONLY.

'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Modal, Button } from '@/components/humi';
import { cn } from '@/lib/utils';
import {
  ROSTER_ROWS,
  SHIFT_TYPE_LABELS,
  type ShiftType,
} from '@/data/roster/mock';

const SHIFT_TYPES: ShiftType[] = ['manager', 'partTime', 'night', 'regular'];

export interface BulkAssignModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (rowIds: string[], type: ShiftType) => void;
}

export function BulkAssignModal({ open, onClose, onApply }: BulkAssignModalProps) {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const [selected, setSelected] = useState<string[]>([]);
  const [type, setType] = useState<ShiftType>('regular');

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isTh ? 'กำหนดกะแบบกลุ่ม' : 'Bulk assign shifts'}
    >
      <div data-testid="bulk-assign-modal" className="flex flex-col gap-4">
        {/* Shift type */}
        <div>
          <label className="mb-1.5 block text-small font-medium text-ink-soft">
            {isTh ? 'ประเภทกะ' : 'Shift type'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SHIFT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
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
        </div>

        {/* Employee picker */}
        <div>
          <label className="mb-1.5 block text-small font-medium text-ink-soft">
            {isTh ? 'เลือกพนักงาน' : 'Select employees'}
          </label>
          <ul className="max-h-56 overflow-y-auto rounded-[var(--radius-md)] border border-hairline">
            {ROSTER_ROWS.map((r) => {
              const checked = selected.includes(r.id);
              return (
                <li key={r.id}>
                  <label className="flex cursor-pointer items-center gap-3 border-b border-hairline/60 px-3 py-2.5 last:border-b-0 hover:bg-canvas-soft">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(r.id)}
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                    <span className="text-body text-ink">{r.name}</span>
                    <span className="ml-auto text-small text-ink-muted">
                      {isTh ? r.roleTh : r.roleEn}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-small text-ink-muted">
            {isTh
              ? `เลือกแล้ว ${selected.length} คน`
              : `${selected.length} selected`}
          </span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              disabled={selected.length === 0}
              onClick={() => onApply(selected, type)}
            >
              {isTh ? 'นำไปใช้' : 'Apply'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
