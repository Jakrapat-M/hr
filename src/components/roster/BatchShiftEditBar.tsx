'use client';

// BatchShiftEditBar — STA-254 (Team Timesheet batch shift edit).
// The action bar shown while /roster is in batch-edit mode: the selected-shift
// count + "Edit selected" (opens the shift-time modal in batch mode) + "Clear"
// + exit batch mode. Sticky to the bottom of the viewport so it stays reachable
// on long grids and on mobile. MOCKUP ONLY — the edit applies to local state.

import { CheckSquare, X } from 'lucide-react';
import { Button } from '@/components/humi';

export interface BatchShiftEditBarProps {
  count: number;
  isTh: boolean;
  onEditSelected: () => void;
  onClear: () => void;
  onExit: () => void;
}

export function BatchShiftEditBar({
  count,
  isTh,
  onEditSelected,
  onClear,
  onExit,
}: BatchShiftEditBarProps) {
  return (
    <div
      data-testid="batch-shift-edit-bar"
      role="region"
      aria-label={isTh ? 'แถบแก้ไขกะหลายรายการ' : 'Batch shift edit bar'}
      className="sticky bottom-4 z-20 mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-hairline bg-surface px-4 py-3 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center gap-2 text-small text-ink-soft">
        <CheckSquare size={16} className="text-accent" aria-hidden />
        <span data-testid="batch-selected-count" aria-live="polite" className="font-medium text-ink">
          {isTh ? `เลือกไว้ ${count} กะ` : `${count} shift${count === 1 ? '' : 's'} selected`}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClear}
          disabled={count === 0}
          data-testid="batch-clear"
        >
          {isTh ? 'ล้าง' : 'Clear'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onEditSelected}
          disabled={count === 0}
          data-testid="batch-edit-selected"
        >
          {isTh ? 'แก้ไขที่เลือก' : 'Edit selected'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          data-testid="batch-exit"
          leadingIcon={<X size={15} aria-hidden />}
        >
          {isTh ? 'ออกจากโหมดเลือก' : 'Exit'}
        </Button>
      </div>
    </div>
  );
}
