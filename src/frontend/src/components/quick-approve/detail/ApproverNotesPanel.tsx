'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ApproverNotesPanelProps {
  /**
   * STA-147 req-2b: the persisted send-back reason for this request. Read-only;
   * defaults to "-" when the request has not been sent back.
   */
  sendBackComment?: string;
}

/**
 * STA-147 req-2: two boxes below Approval History.
 *  (a) Note — a free-text Textarea the approver can type into (in-session only).
 *  (b) Send Back Comment — READ-ONLY, default "-", auto-filled with the send-back
 *      reason once an approver returns the request.
 */
export function ApproverNotesPanel({ sendBackComment }: ApproverNotesPanelProps) {
  const t = useTranslations('quick_approve_detail');
  const [note, setNote] = useState('');

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-hairline bg-surface p-5">
      {/* (a) Note — free text, in-session */}
      <div>
        <label htmlFor="approver-note" className="mb-2 block text-base font-semibold text-ink">
          {t('noteTitle')}
        </label>
        <textarea
          id="approver-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('notePlaceholder')}
          className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas"
        />
      </div>

      {/* (b) Send Back Comment — read-only */}
      <div>
        <label htmlFor="send-back-comment" className="mb-2 block text-base font-semibold text-ink">
          {t('sendBackCommentTitle')}
        </label>
        <textarea
          id="send-back-comment"
          rows={2}
          readOnly
          value={sendBackComment && sendBackComment.trim() !== '' ? sendBackComment : '-'}
          className="w-full cursor-default rounded-md border border-hairline bg-canvas-soft px-3 py-2 text-body text-ink-secondary"
        />
      </div>
    </div>
  );
}
