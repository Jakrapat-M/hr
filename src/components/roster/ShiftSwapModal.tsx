// ShiftSwapModal — request to swap a shift between two employees.
// Opens via ?panel=swap (page wiring) or a row action. Submit = onSubmit +
// close (parent fires a toast). MOCKUP ONLY — no persistence, no API.

'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Modal, Button } from '@/components/cnext';
import { ROSTER_ROWS } from '@/data/roster/mock';

export interface ShiftSwapModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (from: string, to: string) => void;
}

export function ShiftSwapModal({ open, onClose, onSubmit }: ShiftSwapModalProps) {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const [from, setFrom] = useState(ROSTER_ROWS[0]?.id ?? '');
  const [to, setTo] = useState(ROSTER_ROWS[1]?.id ?? '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isTh ? 'ขอสลับกะ' : 'Request shift swap'}
    >
      <div data-testid="shift-swap-modal" className="flex flex-col gap-4">
        <p className="text-small text-ink-muted">
          {isTh
            ? 'เลือกพนักงานสองคนเพื่อขอสลับกะระหว่างกัน'
            : 'Pick two employees to request a shift swap between them.'}
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-small font-medium text-ink-soft">
            {isTh ? 'จากพนักงาน' : 'From employee'}
          </label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {ROSTER_ROWS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-small font-medium text-ink-soft">
            {isTh ? 'ไปยังพนักงาน' : 'To employee'}
          </label>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {ROSTER_ROWS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-1 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button variant="primary" onClick={() => onSubmit(from, to)}>
            {isTh ? 'ขอสลับกะ' : 'Request swap'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
