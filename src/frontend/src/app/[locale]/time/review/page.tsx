'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardTitle, DataTable, type DataTableColumn } from '@/components/humi';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole } from '@/lib/rbac';
import {
  useTimesheetSubmissions,
  selectSubmittedTimesheets,
  type TimesheetSubmission,
} from '@/stores/timesheet-submissions';

// STA-65 — READ-ONLY manager/HR reporting view of submitted timesheets.
// This is status tracking, NOT an approval: no approve/reject controls here.
// Gated to manager / hrbp+ tiers (remove-not-hide).

export default function TimesheetReviewPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const t = useTranslations('timesheetReview');

  const roles = useAuthStore((s) => s.roles);
  const submissions = useTimesheetSubmissions((s) => s.submissions);

  const canReview = hasAnyRole(roles, ['manager', 'hrbp', 'spd', 'hr_admin', 'hr_manager']);

  const rows = useMemo(() => selectSubmittedTimesheets(submissions), [submissions]);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { dateStyle: 'medium' }),
    [locale],
  );

  if (!canReview) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <div className="py-14 text-center">
            <p className="text-base font-semibold text-ink">{t('noAccessTitle')}</p>
            <p className="mt-1 text-sm text-ink-muted">{t('noAccessDesc')}</p>
          </div>
        </Card>
      </div>
    );
  }

  const columns: DataTableColumn<TimesheetSubmission>[] = [
    {
      id: 'employee',
      header: t('colEmployee'),
      cell: (row) => <span className="font-medium text-ink">{row.employeeName}</span>,
      sortAccessor: (row) => row.employeeName,
    },
    {
      id: 'week',
      header: t('colWeek'),
      cell: (row) => <span className="text-ink-muted">{dateFmt.format(new Date(row.weekStart))}</span>,
      sortAccessor: (row) => row.weekStart,
    },
    {
      id: 'total',
      header: t('colTotal'),
      align: 'right',
      cell: (row) => <span className="tabular-nums text-ink">{t('hours', { count: row.totalHours })}</span>,
      sortAccessor: (row) => row.totalHours,
    },
    {
      id: 'status',
      header: t('colStatus'),
      cell: () => (
        <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-ink">
          {t('statusSubmitted')}
        </span>
      ),
    },
    {
      id: 'submittedAt',
      header: t('colSubmittedAt'),
      cell: (row) => (
        <span className="text-ink-muted">{dateFmt.format(new Date(row.submittedAt))}</span>
      ),
      sortAccessor: (row) => row.submittedAt,
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-0.5">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
        <p className="text-sm text-ink-muted mt-1">{t('subtitle')}</p>
      </div>

      <Card>
        <div className="p-4">
          <CardTitle className="text-base font-semibold mb-3">{t('tableTitle')}</CardTitle>
          <DataTable<TimesheetSubmission>
            caption={t('tableCaption')}
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            emptyState={
              <div className="py-10 text-center">
                <p className="text-base font-semibold text-ink">{t('emptyTitle')}</p>
                <p className="mt-1 text-sm text-ink-muted">{t('emptyDesc')}</p>
              </div>
            }
          />
        </div>
      </Card>
    </div>
  );
}
