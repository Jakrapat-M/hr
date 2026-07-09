'use client';

import { useState } from 'react';
import { FileText, Paperclip } from 'lucide-react';
import { Card, CardEyebrow, CardTitle } from '@/components/cnext';
import type { AttachedFile } from '@/components/admin/AttachmentDropzone/AttachmentDropzone';
import {
  TERMINATION_REASON_LABEL,
  type TerminationRequest,
} from '@/stores/termination-approvals';
import {
  TerminationAttachmentPreview,
  type TerminationSummaryLocale,
} from './TerminationAttachmentPreview';
import { normalizeTerminationReason, terminationSubReasonLabel } from '@/lib/termination-request';
import { cn } from '@/lib/utils';

type Label = {
  readonly th: string;
  readonly en: string;
};

type SummaryRow = {
  readonly id: string;
  readonly label: Label;
  readonly value: React.ReactNode;
};

function isSummaryRow(row: SummaryRow | undefined): row is SummaryRow {
  return row !== undefined;
}

const LABELS = {
  resignedDate: { th: 'วันที่ทำงานวันสุดท้าย', en: 'Resigned Date' },
  terminationDate: { th: 'วันที่สิ้นสุดสภาพ', en: 'Termination date' },
  terminationReason: { th: 'เหตุผลการสิ้นสุดสภาพ', en: 'Termination Reason' },
  voluntary: { th: 'สมัครใจ / ไม่สมัครใจ', en: 'Voluntary/Involuntary' },
  reasonForTermination: { th: 'เหตุผลย่อยในการสิ้นสุดสภาพ', en: 'Reason for termination' },
  transferOutTo: { th: 'โอนย้ายออกไปยัง', en: 'Transfer out to' },
  okToRehire: { th: 'จ้างกลับได้หรือไม่', en: 'OK to Rehire' },
  additionalInfo: { th: 'ข้อมูลเพิ่มเติม', en: 'Additional Information' },
  personalEmail: { th: 'อีเมลส่วนตัว + หมายเหตุ', en: 'Personal Email + remark' },
  attachments: { th: 'เอกสารแนบ', en: 'Attachments' },
} as const;

const PERSONAL_EMAIL_REMARK: Label = {
  th: 'อีเมลนี้ใช้สำหรับรับหนังสือรับรองการทำงาน (Employment Letter), สลิปเงินเดือน (Payslip) และ 50 ทวิ (50BIS)',
  en: 'This email is used to receive the Employment Letter, Payslip and 50BIS.',
};

function textFor(label: Label, locale: TerminationSummaryLocale): { readonly primary: string; readonly secondary: string } {
  return locale === 'th'
    ? { primary: label.th, secondary: label.en }
    : { primary: label.en, secondary: label.th };
}

function formatDate(iso: string, locale: TerminationSummaryLocale): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function voluntaryLabel(value: NonNullable<TerminationRequest['voluntary']>, locale: TerminationSummaryLocale): string {
  if (value === 'voluntary') return locale === 'th' ? 'สมัครใจ' : 'Voluntary';
  return locale === 'th' ? 'ไม่สมัครใจ' : 'Involuntary';
}

function okToRehireLabel(value: boolean, locale: TerminationSummaryLocale): string {
  return value ? (locale === 'th' ? 'ได้' : 'Yes') : (locale === 'th' ? 'ไม่ได้' : 'No');
}

function AttachmentList({
  files,
  onPreview,
}: {
  readonly files: readonly AttachedFile[];
  readonly onPreview: (file: AttachedFile) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {files.map((file) => (
        <li key={file.id}>
          <button
            type="button"
            onClick={() => onPreview(file)}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-hairline',
              'bg-canvas-soft px-3.5 py-2.5 text-left text-sm text-ink transition',
              'hover:border-accent hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft',
            )}
          >
            <Paperclip className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
            <span className="truncate">{file.name}</span>
            <FileText className="ml-auto h-4 w-4 shrink-0 text-ink-muted transition group-hover:text-accent" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function TerminationRequestSummary({
  request,
  locale = 'th',
  className,
}: {
  readonly request: TerminationRequest;
  readonly locale?: TerminationSummaryLocale;
  readonly className?: string;
}) {
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const reasonCode = normalizeTerminationReason(request.reasonCode);
  const rowCandidates: Array<SummaryRow | undefined> = [
    {
      id: 'resignedDate',
      label: LABELS.resignedDate,
      value: formatDate(request.requestedLastDay, locale),
    },
    request.terminationDate
      ? {
          id: 'terminationDate',
          label: LABELS.terminationDate,
          value: formatDate(request.terminationDate, locale),
        }
      : undefined,
    {
      id: 'terminationReason',
      label: LABELS.terminationReason,
      value: TERMINATION_REASON_LABEL[reasonCode],
    },
    request.voluntary
      ? {
          id: 'voluntary',
          label: LABELS.voluntary,
          value: voluntaryLabel(request.voluntary, locale),
        }
      : undefined,
    request.reasonForTermination || request.reasonText
      ? {
          id: 'reasonForTermination',
          label: LABELS.reasonForTermination,
          value:
            terminationSubReasonLabel(request.reasonCode, request.reasonForTermination) ??
            request.reasonText,
        }
      : undefined,
    request.transferOutTo
      ? {
          id: 'transferOutTo',
          label: LABELS.transferOutTo,
          value: request.transferOutTo,
        }
      : undefined,
    request.okToRehire !== undefined
      ? {
          id: 'okToRehire',
          label: LABELS.okToRehire,
          value: okToRehireLabel(request.okToRehire, locale),
        }
      : undefined,
    request.additionalInfo
      ? {
          id: 'additionalInfo',
          label: LABELS.additionalInfo,
          value: request.additionalInfo,
        }
      : undefined,
    request.personalEmail
      ? {
          id: 'personalEmail',
          label: LABELS.personalEmail,
          value: (
            <div className="space-y-1">
              <div className="font-medium text-ink">{request.personalEmail}</div>
              <div className="text-xs leading-relaxed text-ink-muted">{textFor(PERSONAL_EMAIL_REMARK, locale).primary}</div>
              <div className="text-xs leading-relaxed text-ink-faint">{textFor(PERSONAL_EMAIL_REMARK, locale).secondary}</div>
            </div>
          ),
        }
      : undefined,
    request.attachments?.length
      ? {
          id: 'attachments',
          label: LABELS.attachments,
          value: <AttachmentList files={request.attachments} onPreview={setPreviewFile} />,
        }
      : undefined,
  ];
  const rows = rowCandidates.filter(isSummaryRow);

  return (
    <>
      <Card
        variant="flat"
        className={className}
        header={
          <div>
            <CardEyebrow>{locale === 'th' ? 'ข้อมูลคำขอ' : 'Request summary'}</CardEyebrow>
            <CardTitle>{locale === 'th' ? 'รายละเอียดการสิ้นสุดสภาพ' : 'Termination details'}</CardTitle>
          </div>
        }
      >
        <dl className="divide-y divide-hairline-soft">
          {rows.map((row) => {
            const label = textFor(row.label, locale);
            return (
              <div key={row.id} className="grid gap-2 py-3 md:grid-cols-[220px_1fr] md:gap-6">
                <dt className="text-sm font-semibold text-ink-soft">
                  <span>{label.primary}</span>
                  <span className="mt-0.5 block text-xs font-normal text-ink-muted">{label.secondary}</span>
                </dt>
                <dd className="min-w-0 text-sm leading-relaxed text-ink">{row.value}</dd>
              </div>
            );
          })}
        </dl>
      </Card>

      <TerminationAttachmentPreview
        file={previewFile}
        request={request}
        locale={locale}
        onClose={() => setPreviewFile(null)}
      />
    </>
  );
}
