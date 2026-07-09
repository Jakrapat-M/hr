'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardTitle, Button, DataTable, type DataTableColumn } from '@/components/cnext';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyRole, hasRole } from '@/lib/rbac';
import { exportToCSV, type CsvColumn } from '@/lib/admin/utils/csvExport';
import { formatDate } from '@/lib/date';
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
import { getExceptionsForPeriod } from '@/lib/time/exceptions';

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

  // Exception-first inbox — surface team members with current-period anomalies
  // up front, so a manager acts on problems instead of scanning the whole grid.
  const teamExceptions = useMemo(
    () =>
      team
        .map((e) => ({ emp: e, items: getExceptionsForPeriod(e.id) }))
        .filter((x) => x.items.length > 0)
        .sort((a, b) => b.items.length - a.items.length),
    [team],
  );

  const rows = useMemo(() => selectSubmittedTimesheets(submissions), [submissions]);

  const canImport = hasRole(roles, 'hr_admin');

  // Export submitted timesheets to CSV (UTF-8 BOM + Thai headers via shared
  // util). Buddhist-era dates via formatDate. No sensitive PII in timesheet
  // rows, so no masking needed here.
  const handleExportCsv = () => {
    const cols: CsvColumn<TimesheetSubmission>[] = [
      { header: t('csvColEmployeeId'), accessor: (r) => r.employeeId },
      { header: t('csvColEmployee'), accessor: (r) => r.employeeName },
      { header: t('csvColWeek'), accessor: (r) => formatDate(r.weekStart, 'medium', locale === 'th' ? 'th' : 'en') },
      { header: t('csvColTotal'), accessor: (r) => r.totalHours },
      { header: t('csvColSubmittedAt'), accessor: (r) => formatDate(r.submittedAt, 'medium', locale === 'th' ? 'th' : 'en') },
    ];
    const stamp = new Date().toISOString().slice(0, 10);
    exportToCSV(rows, cols, `timesheets-${stamp}.csv`);
  };

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

      {/* Exception-first inbox — act on problems before scanning the grid */}
      <Card>
        <div className="p-4" data-testid="needs-attention">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
            <CardTitle className="text-base font-semibold">
              {locale === 'th' ? 'ต้องจัดการ' : 'Needs attention'}
            </CardTitle>
            {teamExceptions.length > 0 && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-[var(--color-danger-ink)]">
                {teamExceptions.length}
              </span>
            )}
          </div>

          {teamExceptions.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-sm text-ink-muted">
              <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden />
              {locale === 'th'
                ? 'ไม่มีรายการที่ต้องจัดการในรอบนี้'
                : 'No exceptions to act on this period'}
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {teamExceptions.slice(0, 8).map(({ emp, items }) => {
                const name =
                  locale === 'th'
                    ? `${emp.firstNameTh} ${emp.lastNameTh}`
                    : `${emp.firstNameEn ?? emp.firstNameTh} ${emp.lastNameEn ?? emp.lastNameTh}`;
                return (
                  <li
                    key={emp.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <span className="font-medium text-ink">{name}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {items.slice(0, 4).map((ex, i) => (
                        <span
                          key={`${ex.date}-${ex.type}-${i}`}
                          className={
                            ex.severity === 'danger'
                              ? 'rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger'
                              : 'rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-[var(--color-danger-ink)]'
                          }
                        >
                          {locale === 'th' ? ex.th : ex.en}
                        </span>
                      ))}
                      {items.length > 4 && (
                        <span className="text-xs text-ink-muted">
                          +{items.length - 4}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
              {teamExceptions.length > 8 && (
                <li className="pt-2.5 text-sm text-ink-muted">
                  {locale === 'th'
                    ? `และอีก ${teamExceptions.length - 8} คนที่ต้องจัดการ`
                    : `and ${teamExceptions.length - 8} more need attention`}
                </li>
              )}
            </ul>
          )}
        </div>
      </Card>

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
          <div className="mb-3 flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">{t('tableTitle')}</CardTitle>
            <div className="flex items-center gap-2">
              {canImport && (
                <a href={`/${locale}/time/import`} aria-label={t('importAria')}>
                  <Button variant="secondary" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    {t('importCsv')}
                  </Button>
                </a>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCsv}
                disabled={rows.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('exportCsv')}
              </Button>
            </div>
          </div>
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
