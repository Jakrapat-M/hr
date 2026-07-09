'use client';

import { Download, FileText } from 'lucide-react';
import { Modal } from '@/components/humi';
import type { AttachedFile } from '@/components/admin/AttachmentDropzone/AttachmentDropzone';
import type { TerminationRequest } from '@/stores/termination-approvals';

export type TerminationSummaryLocale = 'en' | 'th';

function formatDate(iso: string, locale: TerminationSummaryLocale): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function TerminationAttachmentPreview({
  file,
  request,
  locale,
  onClose,
}: {
  readonly file: AttachedFile | null;
  readonly request: TerminationRequest;
  readonly locale: TerminationSummaryLocale;
  readonly onClose: () => void;
}) {
  return (
    <Modal open={file !== null} onClose={onClose} title={file?.name ?? ''} widthClass="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="rounded-[var(--radius-md)] border border-hairline bg-surface px-8 py-7 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex items-center gap-2 text-eyebrow uppercase tracking-wide text-ink-muted">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {locale === 'th' ? 'ตัวอย่างเอกสาร' : 'Sample document'}
          </div>
          <div className="space-y-2.5 text-sm leading-relaxed text-ink-soft">
            <p>{locale === 'th' ? 'เรียน ฝ่ายทรัพยากรบุคคล' : 'To: Human Resources'}</p>
            <p>
              {locale === 'th'
                ? `เอกสารประกอบคำขอสิ้นสุดสภาพของ ${request.employeeName}`
                : `Supporting document for ${request.employeeName}'s termination request.`}
            </p>
            <p>{locale === 'th' ? 'วันทำงานวันสุดท้าย' : 'Last working day'}: {formatDate(request.requestedLastDay, locale)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            {locale === 'th' ? 'เอกสารตัวอย่างสำหรับการตรวจสอบ' : 'Sample document for review'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (!file) return;
              const a = document.createElement('a');
              if (file.dataUrl) {
                a.href = file.dataUrl;
                a.download = file.name;
                a.click();
                return;
              }
              const blob = new Blob(
                [`${file.name}\n\n${request.employeeName}\n${request.requestedLastDay}`],
                { type: 'text/plain' },
              );
              const url = URL.createObjectURL(blob);
              a.href = url;
              a.download = file.name.replace(/\.pdf$/i, '.txt');
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-hairline bg-surface px-3.5 py-2 text-sm font-semibold text-ink-soft transition hover:bg-canvas-soft"
          >
            <Download className="h-3.5 w-3.5" aria-hidden /> {locale === 'th' ? 'ดาวน์โหลด' : 'Download'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
