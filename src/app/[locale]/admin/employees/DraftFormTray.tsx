'use client';

// DraftFormTray.tsx — STA-114 "Draft Form" tab panel on /admin/employees.
// Lists saved hire drafts from hire-drafts-store: name · saved-at (Thai-BE) ·
// step · Resume / Delete. Resume hydrates the wizard then navigates to
// /admin/hire; Delete asks for confirmation (pumpkin destructive, never red).

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FileText, Play, Trash2 } from 'lucide-react';
import { Button, DataTable, EmptyState, Modal, type DataTableColumn } from '@/components/cnext';
import { useHireDraftsStore, type HireDraft } from '@/stores/hire-drafts-store';
import { useHireWizard } from '@/lib/admin/store/useHireWizard';
import { formatDate } from '@/lib/date';

function formatSavedAt(ts: number, locale: string): string {
  const datePart = formatDate(new Date(ts), 'medium', locale);
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${datePart} · ${hh}:${mm}`;
}

export function DraftFormTray() {
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const localeParam = (params?.locale as string) ?? 'th';
  const t = useTranslations('drafts');

  const drafts = useHireDraftsStore((s) => s.drafts);
  const removeDraft = useHireDraftsStore((s) => s.removeDraft);
  const hydrateFromDraft = useHireWizard((s) => s.hydrateFromDraft);

  const [pendingDelete, setPendingDelete] = useState<HireDraft | null>(null);

  const handleResume = (draft: HireDraft) => {
    hydrateFromDraft({
      draftId: draft.draftId,
      formData: draft.snapshot,
      step: draft.step,
      candidateContext: draft.candidateContext,
      schemaVersion: draft.schemaVersion,
    });
    router.push(`/${localeParam}/admin/hire`);
  };

  const handleConfirmDelete = () => {
    if (pendingDelete) removeDraft(pendingDelete.draftId);
    setPendingDelete(null);
  };

  const columns: DataTableColumn<HireDraft>[] = [
    {
      id: 'name',
      header: t('colName'),
      cell: (d) => (
        <span className="font-medium text-ink">
          {d.candidateName || <span className="text-ink-muted">—</span>}
        </span>
      ),
      sortAccessor: (d) => d.nameKey,
    },
    {
      id: 'savedAt',
      header: t('colSavedAt'),
      cell: (d) => <span className="text-ink-soft">{formatSavedAt(d.savedAt, locale)}</span>,
      sortAccessor: (d) => d.savedAt,
    },
    {
      id: 'step',
      header: t('colStep'),
      cell: (d) => <span className="text-ink-soft">{`${d.step}/3`}</span>,
      sortAccessor: (d) => d.step,
      align: 'center',
    },
    {
      id: 'actions',
      header: t('colActions'),
      align: 'right',
      cell: (d) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleResume(d)}
            leadingIcon={<Play size={14} aria-hidden />}
          >
            {t('resume')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setPendingDelete(d)}
            leadingIcon={<Trash2 size={14} aria-hidden />}
          >
            {t('delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="py-4">
      <DataTable
        caption={t('colName')}
        columns={columns}
        rows={drafts}
        rowKey={(d) => d.draftId}
        emptyState={
          <EmptyState
            icon={FileText}
            titleTh={t('empty.title')}
            titleEn={t('empty.title')}
            descTh={t('empty.body')}
            descEn={t('empty.body')}
          />
        }
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={t('deleteConfirm.title')}
      >
        <p className="text-body text-ink-soft">
          {t('deleteConfirm.body', { name: pendingDelete?.candidateName || '—' })}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>
            {t('deleteConfirm.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            leadingIcon={<Trash2 size={16} aria-hidden />}
          >
            {t('deleteConfirm.confirm')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
