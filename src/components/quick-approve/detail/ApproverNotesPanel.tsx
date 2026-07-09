'use client';

import { useTranslations } from 'next-intl';

interface ApproverNotesPanelProps {
  /**
   * STA-185: the shared "Approve / Send Back Comment" value, owned by the page.
   * This single controlled field feeds BOTH the Approve and Send Back actions
   * (dispatched through ActionPanel's confirm popup).
   */
  value: string;
  onChange: (value: string) => void;
}

/**
 * STA-185: a single controlled "Approve / Send Back Comment" field below the
 * 3-col layout. Supersedes the STA-147 two-box layout (the read-only Send Back
 * Comment box is removed); the comment is single-sourced by the page and shown
 * read-only inside the Approve/Send-Back confirm popups.
 */
export function ApproverNotesPanel({ value, onChange }: ApproverNotesPanelProps) {
  const t = useTranslations('quick_approve_detail');

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-hairline bg-surface p-5">
      <div>
        <label htmlFor="approver-note" className="mb-2 block text-base font-semibold text-ink">
          {t('approveSendBackCommentTitle')}
        </label>
        <textarea
          id="approver-note"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('approveSendBackCommentPlaceholder')}
          className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas"
        />
      </div>
    </div>
  );
}
