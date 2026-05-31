'use client';

// ════════════════════════════════════════════════════════════
// /hrbp/doc-review — SPD document-review queue
// Pending-review documents (pending + processing) → review/act in mock.
// Split out of /admin/documents (P2 follow-up): SPD owns this surface;
// HR Admin keeps the full request queue at /admin/documents.
// NOT an approval inbox — this is a document review surface (unified
// approvals stay under /quick-approve).
// ════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FileText, ClipboardCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/humi';
import { useToast } from '@/components/ui/toast';
import {
  DOCUMENT_TEMPLATES,
  MOCK_DOC_REQUESTS,
  type DocRequest,
} from '@/data/documents/templates';

// Review queue = documents still awaiting an SPD review decision.
// 'pending' (not yet picked up) + 'processing' (in review) are the review-pending set;
// 'ready'/'delivered' have already cleared review.
const REVIEW_PENDING_STATUSES = ['pending', 'processing'] as const;

function templateName(templateId: string, locale: string): string {
  const tpl = DOCUMENT_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return templateId;
  return locale === 'th' ? tpl.nameTh : tpl.nameEn;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function HrbpDocReviewPage() {
  const locale = useLocale();
  const t = useTranslations('doc_review');
  const { toast } = useToast();

  // Mock-only review state: ids the reviewer has marked reviewed this session.
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const queue = useMemo<DocRequest[]>(
    () =>
      MOCK_DOC_REQUESTS.filter((r) =>
        (REVIEW_PENDING_STATUSES as readonly string[]).includes(r.status),
      ),
    [],
  );

  const outstanding = queue.filter((r) => !reviewed.has(r.id));

  function handleMarkReviewed(req: DocRequest) {
    setReviewed((prev) => {
      const next = new Set(prev);
      next.add(req.id);
      return next;
    });
    toast(
      'success',
      locale === 'th'
        ? `ตรวจเอกสาร ${req.id} เรียบร้อย`
        : `Reviewed ${req.id}`,
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="text-small font-medium uppercase tracking-wide text-ink-muted">
            {t('eyebrow')}
          </p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t('subtitle')}</p>
          <p className="mt-2 max-w-2xl text-small text-ink-muted" data-testid="doc-review-boundary">
            {t('boundary')}
          </p>
        </div>
        {outstanding.length > 0 && (
          <span
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-small font-semibold text-white"
            data-testid="doc-review-count"
          >
            {outstanding.length}
          </span>
        )}
      </div>

      {/* Review queue */}
      {outstanding.length === 0 ? (
        <div
          data-testid="doc-review-empty"
          className="humi-card p-12 text-center text-ink-muted"
        >
          <CheckCircle2 size={36} aria-hidden className="mx-auto mb-3 block opacity-30" />
          <p>{t('empty')}</p>
        </div>
      ) : (
        <div className="humi-card overflow-hidden p-0">
          <table className="w-full border-collapse" data-testid="doc-review-table">
            <thead>
              <tr className="bg-surface-muted text-xs text-ink-muted">
                <th className="px-3.5 py-2.5 text-left font-semibold">{t('colRequestId')}</th>
                <th className="px-3.5 py-2.5 text-left font-semibold">{t('colEmployee')}</th>
                <th className="px-3.5 py-2.5 text-left font-semibold">{t('colDocType')}</th>
                <th className="px-3.5 py-2.5 text-left font-semibold">{t('colPurpose')}</th>
                <th className="px-3.5 py-2.5 text-left font-semibold">{t('colSubmitted')}</th>
                <th className="px-3.5 py-2.5 text-left font-semibold">{t('colStatus')}</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">{t('colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((req) => {
                const isReviewed = reviewed.has(req.id);
                return (
                  <tr
                    key={req.id}
                    data-testid={`doc-review-row-${req.id}`}
                    className="border-t border-ink-faint"
                  >
                    <td className="px-3.5 py-3 font-mono text-xs text-ink-muted">{req.id}</td>
                    <td className="px-3.5 py-3">
                      <div className="text-sm font-medium text-ink">{req.employeeName}</div>
                      <div className="text-xs text-ink-muted">{req.employeeDept}</div>
                    </td>
                    <td className="px-3.5 py-3 text-sm text-ink">
                      {templateName(req.templateId, locale)}
                    </td>
                    <td
                      className="max-w-[180px] truncate px-3.5 py-3 text-xs text-ink-muted"
                      title={req.purpose}
                    >
                      {req.purpose}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-xs text-ink-muted">
                      {formatDate(req.submittedAt, locale)}
                    </td>
                    <td className="px-3.5 py-3">
                      {isReviewed ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas-soft px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                          <ClipboardCheck size={13} aria-hidden />
                          {t('statusReviewed')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent-soft bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-ink">
                          <Clock size={13} aria-hidden />
                          {t('statusAwaiting')}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      {isReviewed ? (
                        <span className="text-xs text-ink-muted">{t('done')}</span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          leadingIcon={<FileText size={14} />}
                          onClick={() => handleMarkReviewed(req)}
                          data-testid={`doc-review-action-${req.id}`}
                        >
                          {t('markReviewed')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
