'use client';

// SubjectReportBuilder — subject-selectable report builder (extends the legacy
// admin/system/reports/builder pattern: subject picker → filters → preview → CSV export).
//
// Persona-scoped: aggregates derive from the persona's entitled employee slice
// (filterEmployeesByPersona over ALL_PORTED_EMPLOYEES), matching the /reports posture.
// Benefits subjects read the fixed hrbp-reports mock pool (not persona-narrowed — mockup).
// Open route: NO AccessDenied here — data is scoped instead.
// MOCKUP ONLY: no backend, no persistence beyond the in-memory createReport store.

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Download } from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  type DataTableColumn,
} from '@/components/humi';
import { Inbox } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { ALL_PORTED_EMPLOYEES, EMP_BY_LOGIN } from '@/lib/all-ported-employees';
import { filterEmployeesByPersona } from '@/lib/scope-filter';
import {
  subjectsForScope,
  type ReportRow,
  type SubjectId,
} from '@/lib/report-builder-subjects';
import { exportToCSV, type CsvColumn } from '@/lib/admin/utils/csvExport';
import { useDataManagement } from '@/lib/admin/store/useDataManagement';

export function SubjectReportBuilder() {
  const t = useTranslations('reportBuilder');
  const locale = useLocale();
  const isTh = locale !== 'en';
  const { createReport } = useDataManagement();

  // ── Persona scope — same pattern as /reports ──
  const roles = useAuthStore((s) => s.roles);
  const email = useAuthStore((s) => s.email);
  const currentEmpId = email ? EMP_BY_LOGIN[email] ?? null : null;
  const scope = useMemo(
    () => filterEmployeesByPersona(ALL_PORTED_EMPLOYEES, roles, currentEmpId),
    [roles, currentEmpId],
  );

  // Subject SET is persona-scoped: a manager sees employee subjects only; HRBP+
  // additionally see the org-wide benefits subjects. So the available report set
  // is strictly smaller for lower-tier personas (data is scoped too — below).
  const subjects = useMemo(
    () => subjectsForScope(scope.employees, scope.mode),
    [scope.employees, scope.mode],
  );

  const [subjectId, setSubjectId] = useState<SubjectId>(subjects[0].id);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [reportName, setReportName] = useState('');
  const [saved, setSaved] = useState(false);

  // If the persona changes such that the current subject is no longer in the
  // available set, fall back to the first available subject.
  const subject = useMemo(
    () => subjects.find((s) => s.id === subjectId) ?? subjects[0],
    [subjects, subjectId],
  );
  if (subject.id !== subjectId) {
    // Reconcile state during render (no effect needed — derived-state pattern).
    setSubjectId(subject.id);
  }

  const rows: ReportRow[] = useMemo(
    () => subject.compute(scope.employees, activeFilters, locale),
    [subject, scope.employees, activeFilters, locale],
  );

  // Keep the on-screen preview tidy for high-cardinality subjects: cap to the
  // top PREVIEW_CAP rows (compute already sorts grouped subjects descending by
  // metric). CSV export still includes the full row set.
  const PREVIEW_CAP = 15;
  const previewRows = useMemo(() => rows.slice(0, PREVIEW_CAP), [rows]);

  const columns: DataTableColumn<ReportRow>[] = useMemo(
    () =>
      subject.columns.map((c) => ({
        id: c.id,
        header: isTh ? c.labelTh : c.labelEn,
        align: c.align,
        cell: (row: ReportRow) => (
          <span className={c.align === 'right' ? 'tabular-nums text-ink' : 'text-ink'}>
            {row[c.id] ?? '—'}
          </span>
        ),
        sortAccessor: (row: ReportRow) => row[c.id],
      })),
    [subject, isTh],
  );

  function changeSubject(id: SubjectId) {
    setSubjectId(id);
    setActiveFilters({}); // reset filters when subject changes
  }

  function handleExport() {
    const csvColumns: CsvColumn<ReportRow>[] = subject.columns.map((c) => ({
      header: isTh ? c.labelTh : c.labelEn,
      accessor: (row: ReportRow) => row[c.id],
    }));
    exportToCSV(rows, csvColumns, `${subject.id}-${new Date().toISOString().slice(0, 10)}`);
  }

  function handleSave() {
    if (!reportName.trim()) return;
    createReport({
      name: reportName.trim(),
      type: 'customize',
      isBuiltIn: false,
      owner: currentEmpId ?? 'EMP001',
      module: subject.id,
      fields: subject.columns.map((c) => c.id),
      filters: activeFilters,
      lastRun: null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const scopeNote = isTh
    ? scope.mode === 'all'
      ? 'ขอบเขต: ทั้งองค์กร'
      : scope.mode === 'bu'
        ? 'ขอบเขต: หน่วยงานของคุณ'
        : 'ขอบเขต: ทีมของคุณ'
    : scope.mode === 'all'
      ? 'Scope: organization-wide'
      : scope.mode === 'bu'
        ? 'Scope: your business unit'
        : 'Scope: your team';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {isTh ? 'HUMI • เครื่องมือสร้างรายงาน' : 'HUMI • REPORT BUILDER'}
        </span>
        <h1 className="font-display text-[length:var(--text-display-h2)] font-semibold tracking-tight text-ink">
          {t('title')}
        </h1>
        <p className="text-small text-ink-muted mt-1">{t('subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: config */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Subject picker */}
          <Card variant="raised" size="md">
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-ink">{t('subject')}</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('subject')}>
                {subjects.map((s) => {
                  const selected = s.id === subjectId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => changeSubject(s.id)}
                      className={[
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                        selected
                          ? 'border-accent bg-accent-soft text-accent-ink'
                          : 'border-hairline text-ink-muted hover:border-accent-soft',
                      ].join(' ')}
                    >
                      {isTh ? s.labelTh : s.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card variant="raised" size="md">
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-ink">{t('filters')}</h2>
              {subject.filters.length === 0 ? (
                <p className="text-small text-ink-faint">{t('noFilters')}</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {subject.filters.map((f) => (
                    <div key={f.id} className="flex flex-col gap-1">
                      <label
                        className="text-xs text-ink-muted"
                        htmlFor={`filter-${f.id}`}
                      >
                        {isTh ? f.labelTh : f.labelEn}
                      </label>
                      <select
                        id={`filter-${f.id}`}
                        value={activeFilters[f.id] ?? ''}
                        onChange={(e) =>
                          setActiveFilters((prev) => ({ ...prev, [f.id]: e.target.value }))
                        }
                        className="w-full rounded-[var(--radius-sm)] border border-hairline bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-soft"
                      >
                        <option value="">{t('allOption')}</option>
                        {f.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {isTh ? o.labelTh : o.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Save */}
          <Card variant="raised" size="md">
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-ink">{t('saveReport')}</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs text-ink-muted" htmlFor="rpt-name">
                    {t('reportName')}
                  </label>
                  <input
                    id="rpt-name"
                    type="text"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder={t('reportNamePlaceholder')}
                    className="w-full rounded-[var(--radius-sm)] border border-hairline bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-soft"
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSave}
                  disabled={!reportName.trim()}
                  leadingIcon={saved ? <Check size={16} aria-hidden /> : undefined}
                >
                  {saved ? t('saved') : t('save')}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: preview + export */}
        <div className="flex flex-col gap-3">
          <Card variant="raised" size="md" flush>
            <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-ink">{t('preview')}</h2>
                <span className="text-xs text-ink-faint">{scopeNote}</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleExport}
                disabled={rows.length === 0}
                leadingIcon={<Download size={14} aria-hidden />}
              >
                {t('exportCsv')}
              </Button>
            </div>
            <div className="px-2 py-1">
              <DataTable
                caption={isTh ? subject.labelTh : subject.labelEn}
                captionVisuallyHidden
                dense
                columns={columns}
                rows={previewRows}
                rowKey={(_r, i) => String(i)}
                emptyState={
                  <EmptyState
                    icon={Inbox}
                    titleTh="ไม่มีข้อมูลตามเงื่อนไข"
                    titleEn="No data for this selection"
                    descTh="ลองเปลี่ยนหัวข้อหรือตัวกรอง"
                    descEn="Try a different subject or filter."
                  />
                }
              />
            </div>
          </Card>
          <p className="text-xs text-ink-faint">
            {rows.length > PREVIEW_CAP
              ? t('previewCap', { shown: previewRows.length, total: rows.length })
              : t('rowCount', { count: rows.length })}
          </p>
        </div>
      </div>
    </div>
  );
}
