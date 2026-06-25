'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Download, FileText } from 'lucide-react';

interface AttachmentViewPanelProps {
  /** Attachment filenames seeded on the request (resolved under /sample-claims). */
  attachments: string[];
}

/**
 * STA-147 req-1: Attachment View panel rendered beside Request Details for a claim.
 * Lists the request's attached files; "View" renders the selected PDF inline via an
 * <iframe> (mock viewer, no backend); "Download" is a plain <a download> anchor
 * (no alert/confirm dialog). Static public assets only.
 */
export function AttachmentViewPanel({ attachments }: AttachmentViewPanelProps) {
  const t = useTranslations('quick_approve_detail');
  const [selected, setSelected] = useState<string | null>(null);

  const publicUrl = (filename: string) => `/sample-claims/${filename}`;

  return (
    <div className="rounded-[var(--radius-lg)] border border-hairline bg-surface p-5">
      <h3 className="mb-4 text-base font-semibold text-ink">{t('attachmentsTitle')}</h3>

      {attachments.length === 0 ? (
        <p className="text-small text-ink-muted">{t('attachmentsEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((filename) => {
            const isOpen = selected === filename;
            return (
              <li
                key={filename}
                className="flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3 py-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-small text-ink">{filename}</span>
                <button
                  type="button"
                  onClick={() => setSelected(isOpen ? null : filename)}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-accent-soft px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent-soft/70"
                >
                  {isOpen ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {isOpen ? t('attachmentsHide') : t('attachmentsView')}
                </button>
                <a
                  href={publicUrl(filename)}
                  download={filename}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-info-soft px-2 py-1 text-xs font-medium text-info transition-colors hover:bg-info-soft/70"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  {t('attachmentsDownload')}
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-hairline">
          <iframe
            src={publicUrl(selected)}
            title={selected}
            className="h-[480px] w-full bg-canvas"
          />
        </div>
      )}
    </div>
  );
}
