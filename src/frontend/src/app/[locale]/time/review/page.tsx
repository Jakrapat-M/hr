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
import { ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';
import { filterEmployeesByPersona, resolveCurrentEmpId } from '@/lib/scope-filter';
import {
  buildTeamTimeSummary,
  type TeamTimeRow,
} from '@/lib/team-time-metrics';

// STA-65 — READ-ONLY manager/HR reporting view of submitted timesheets.
// This is status tracking, NOT an approval: no approve/reject controls here.
// Gated to manager / hrbp+ tiers (remove-not-hide).
//
// P3 — adds a read-only "Team time" dashboard section (late / absence / OT trend)
// scoped to the manager's direct reports via filterEmployeesByPersona. No writes.

export default function TimesheetReviewPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const t = useTranslations('timesheetReview');

  const roles = useAuthStore((s) => s.roles);
  const email = useAuthStore((s) => s.email);
  const submissions = useTimesheetSubmissions((s) => s.submissions);

  const canReview = hasAnyRole(roles, ['manager', 'hrbp', 'spd', 'hr_admin', 'hr_manager']);

  const currentEmpId = resolveCurrentEmpId(email);

  // P3 — scope the team to direct reports (manager) / BU (hrbp) / all (admin).
  const team = useMemo(() => {
    const scope = filterEmployeesByPersona(ALL_PORTED_EMPLOYEES, roles, currentEmpId);
    // Drop self — the manager themselves is not part of their own team metrics.
    return scope.employees.filter((e) => e.id !== currentEmpId);
  }, [roles, currentEmpId]);

  const teamTime = useMemo(() => buildTeamTimeSummary(team), [team]);

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

  // P3 — team-time per-report columns
  const teamColumns: DataTableColumn<TeamTimeRow>[] = [
    {
      id: 'name',
      header: t('ttColEmployee'),
      cell: (row) => <span className="font-medium text-ink">{row.name}</span>,
      sortAccessor: (row) => row.name,
    },
    {
      id: 'late',
      header: t('ttColLate'),
      align: 'right',
      cell: (row) => (
        <span
          className={
            row.lateCount >= 3
              ? 'tabular-nums font-medium text-[var(--color-danger)]'
              : 'tabular-nums text-ink'
          }
        >
          {row.lateCount}
        </span>
      ),
      sortAccessor: (row) => row.lateCount,
    },
    {
      id: 'absence',
      header: t('ttColAbsence'),
      align: 'right',
      cell: (row) => (
        <span
          className={
            row.absenceCount >= 1
              ? 'tabular-nums font-medium text-[var(--color-danger)]'
              : 'tabular-nums text-ink'
          }
        >
          {row.absenceCount}
        </span>
      ),
      sortAccessor: (row) => row.absenceCount,
    },
    {
      id: 'ot',
      header: t('ttColOt'),
      align: 'right',
      cell: (row) => (
        <span className="tabular-nums text-ink">{t('hours', { count: row.otHours })}</span>
      ),
      sortAccessor: (row) => row.otHours,
    },
    {
      id: 'flag',
      header: t('ttColFlag'),
      cell: (row) =>
        row.hasAlert ? (
          <span className="inline-flex items-center rounded-full bg-[var(--color-warning-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-danger-ink)]">
            {t('ttFlagAttention')}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-ink">
            {t('ttFlagOk')}
          </span>
        ),
    },
  ];

  const maxTrend = Math.max(1, ...teamTime.otTrend.map((p) => p.hours));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-0.5">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
        <p className="text-sm text-ink-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* P3 — Team time dashboard (read-only) */}
      <Card>
        <div className="p-4" data-testid="team-time-dashboard">
          <CardTitle className="text-base font-semibold mb-1">{t('ttTitle')}</CardTitle>
          <p className="text-sm text-ink-muted mb-4">
            {t('ttScope', { count: teamTime.headcount })}
          </p>

          {teamTime.headcount === 0 ? (
            <div className="py-10 text-center">
              <p className="text-base font-semibold text-ink">{t('ttEmptyTitle')}</p>
              <p className="mt-1 text-sm text-ink-muted">{t('ttEmptyDesc')}</p>
            </div>
          ) : (
            <>
              {/* Summary stat tiles */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-3">
                  <div className="text-xs text-ink-muted">{t('ttStatHeadcount')}</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-ink">
                    {teamTime.headcount}
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-3">
                  <div className="text-xs text-ink-muted">{t('ttStatLate')}</div>
                  <div
                    className={
                      teamTime.totalLate > 0
                        ? 'mt-1 text-xl font-bold tabular-nums text-[var(--color-danger)]'
                        : 'mt-1 text-xl font-bold tabular-nums text-ink'
                    }
                  >
                    {teamTime.totalLate}
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-3">
                  <div className="text-xs text-ink-muted">{t('ttStatAbsence')}</div>
                  <div
                    className={
                      teamTime.totalAbsence > 0
                        ? 'mt-1 text-xl font-bold tabular-nums text-[var(--color-danger)]'
                        : 'mt-1 text-xl font-bold tabular-nums text-ink'
                    }
                  >
                    {teamTime.totalAbsence}
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-3">
                  <div className="text-xs text-ink-muted">{t('ttStatOt')}</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-ink">
                    {t('hours', { count: teamTime.totalOtHours })}
                  </div>
                </div>
              </div>

              {/* OT trend — simple token bars */}
              <div className="mt-5">
                <div className="text-sm font-medium text-ink mb-2">{t('ttTrendTitle')}</div>
                <div
                  className="flex items-end gap-3 h-28"
                  role="img"
                  aria-label={t('ttTrendTitle')}
                >
                  {teamTime.otTrend.map((p) => (
                    <div key={p.month} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-xs tabular-nums text-ink-muted">{p.hours}</span>
                      <div
                        className="w-full rounded-t-[var(--radius-xs)] bg-accent"
                        style={{ height: `${Math.max(4, (p.hours / maxTrend) * 88)}px` }}
                      />
                      <span className="text-xs text-ink-muted">{p.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-report breakdown */}
              <div className="mt-6">
                <DataTable<TeamTimeRow>
                  caption={t('ttTableCaption')}
                  captionVisuallyHidden
                  columns={teamColumns}
                  rows={teamTime.rows as TeamTimeRow[]}
                  rowKey={(row) => row.employeeId}
                />
              </div>
            </>
          )}
        </div>
      </Card>

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
