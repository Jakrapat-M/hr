'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CheckCircle, ChevronRight, Download, ArrowRight } from 'lucide-react';
import { Card, Button, Avatar } from '@/components/cnext';
import { useProbationCases } from '@/hooks/use-probation';
import { formatDate } from '@/lib/date';

type TierKey = 'all' | 'urgent' | 'warn' | 'normal';

// Avatar tones to cycle through (Cnext token-backed, NO raw hex).
const AVATAR_TONES = ['teal', 'sage', 'butter', 'ink'] as const;

// Shared CSS grid template — header + body rows stay column-aligned (ref prod-probation.jsx).
const ROW_GRID = '40px 2.2fr 1.4fr 1fr 1.4fr 150px';

/** Days remaining until probation end date. Negative = overdue. */
function daysToProbationEnd(probationEndDate: string): number {
  return Math.ceil((new Date(probationEndDate).getTime() - Date.now()) / 86400000);
}

/** Tier bucket from days-remaining. Overdue (≤14, incl. negative) = urgent. */
function tierOf(daysRemaining: number): Exclude<TierKey, 'all'> {
  if (daysRemaining <= 14) return 'urgent';
  if (daysRemaining <= 29) return 'warn';
  return 'normal';
}

/** Calendar tenure since hire date, rendered as "{m} เดือน {d} วัน". */
function tenureText(hireDate: string, locale: string): string {
  const start = new Date(hireDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) months = 0;
  if (days < 0) days = 0;
  return locale === 'th' ? `${months} เดือน ${days} วัน` : `${months}mo ${days}d`;
}

type ProbationCaseT = ReturnType<typeof useProbationCases>['cases'][number];

function ProbationRow({
  c,
  locale,
  t,
  toneIdx,
  selected,
  onToggle,
}: {
  c: ProbationCaseT;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  toneIdx: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const daysRemaining = daysToProbationEnd(c.probationEndDate);
  const overdue = daysRemaining < 0;
  const tier = tierOf(daysRemaining);
  const isUrgent = tier === 'urgent';
  const isWarn = tier === 'warn';

  const dueColor = isUrgent ? 'text-danger-ink' : isWarn ? 'text-warning-ink' : 'text-ink-soft';

  return (
    <div
      className="grid items-center gap-2 border-b border-hairline-soft px-[18px] py-4 transition-colors hover:bg-surface-raised/30"
      style={{ gridTemplateColumns: ROW_GRID }}
    >
      {/* Bulk-select checkbox */}
      <label className="flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`${locale === 'th' ? 'เลือก' : 'Select'} ${c.fullNameTh}`}
          className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
        />
      </label>

      {/* Employee */}
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          size="md"
          tone={AVATAR_TONES[toneIdx % AVATAR_TONES.length]}
          name={c.fullNameEn}
          src={c.photo}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-ink">{c.fullNameTh}</div>
          <div className="mt-0.5 truncate text-xs text-ink-muted">
            {c.employeeId} · {c.fullNameEn}
          </div>
        </div>
      </div>

      {/* Position · Branch */}
      <div className="min-w-0">
        <div className="truncate text-sm text-ink-soft">
          {c.position} · {c.location ?? c.department}
        </div>
        <div className="mt-0.5 text-xs text-ink-muted">
          {t('probation.inbox.started')} {formatDate(c.hireDate, 'medium', locale)}
        </div>
      </div>

      {/* Due in + tenure */}
      <div>
        <div className={`text-sm font-semibold ${dueColor}`}>
          {overdue
            ? t('probation.inbox.daysOverdue', { days: Math.abs(daysRemaining) })
            : t('probation.inbox.daysLeft', { days: daysRemaining })}
        </div>
        <div className="mt-0.5 text-xs text-ink-muted">{tenureText(c.hireDate, locale)}</div>
      </div>

      {/* Latest note */}
      <div className="min-w-0 text-xs leading-relaxed text-ink-muted line-clamp-2">
        {c.assessmentSummary ?? c.managerRemarks ?? '—'}
      </div>

      {/* Tag + open-case action */}
      <div className="flex items-center justify-end gap-1.5">
        {isUrgent && (
          <span className="hidden items-center rounded-full border border-danger bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-ink xl:inline-flex">
            {t('probation.inbox.tagUrgent')}
          </span>
        )}
        {isWarn && (
          <span className="hidden items-center rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-ink xl:inline-flex">
            {t('probation.inbox.tagWarn')}
          </span>
        )}
        <Link
          href={`/${locale}/workflows/probation/${c.id}`}
          className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-hairline px-3 py-1.5 text-xs font-medium text-ink transition hover:border-ink-faint hover:bg-surface-raised"
        >
          {t('probation.inbox.openCase')}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export default function ProbationListPage() {
  const [filter, setFilter] = useState<TierKey>('all');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const { cases, loading } = useProbationCases();
  const pathname = usePathname();
  const locale = pathname.startsWith('/th') ? 'th' : 'en';
  const t = useTranslations();

  const counts = useMemo(() => {
    const c = { all: cases.length, urgent: 0, warn: 0, normal: 0 };
    for (const k of cases) {
      c[tierOf(daysToProbationEnd(k.probationEndDate))] += 1;
    }
    return c;
  }, [cases]);

  const filtered = useMemo(
    () =>
      cases.filter((c) =>
        filter === 'all' ? true : tierOf(daysToProbationEnd(c.probationEndDate)) === filter,
      ),
    [cases, filter],
  );

  const selectedIds = filtered.filter((c) => selected[c.id]).map((c) => c.id);
  const selectedCount = selectedIds.length;

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 4000);
  }

  const tiers: { key: TierKey; label: string; count: number; sub: string; tone: string }[] = [
    { key: 'all', label: t('probation.inbox.tierAll'), count: counts.all, sub: t('probation.inbox.tierAllSub'), tone: 'text-ink-muted' },
    { key: 'urgent', label: t('probation.inbox.tierUrgent'), count: counts.urgent, sub: t('probation.inbox.tierUrgentSub'), tone: 'text-danger-ink' },
    { key: 'warn', label: t('probation.inbox.tierWarn'), count: counts.warn, sub: t('probation.inbox.tierWarnSub'), tone: 'text-warning-ink' },
    { key: 'normal', label: t('probation.inbox.tierNormal'), count: counts.normal, sub: t('probation.inbox.tierNormalSub'), tone: 'text-success-ink' },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-8">
      {/* Breadcrumb */}
      <nav className="mb-2 flex items-center gap-2 text-sm text-ink-muted" aria-label="breadcrumb">
        <span>{t('probation.inbox.breadcrumbHub')}</span>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span>{t('probation.inbox.breadcrumbSection')}</span>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-ink">{t('probation.inbox.breadcrumbCurrent')}</span>
      </nav>

      {/* Title block */}
      <div className="mb-5 flex items-start gap-4">
        <div className="min-w-0">
          <div className="cnext-eyebrow">{t('probation.inbox.eyebrow')}</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink mt-1">
            {t('probation.inbox.title')}
          </h1>
          <p className="text-sm text-ink-muted mt-1.5">
            {t('probation.inbox.subtitle', { team: counts.all, urgent: counts.urgent })}
          </p>
        </div>
        <div className="ml-auto shrink-0">
          <Button variant="ghost" onClick={() => showFlash(t('probation.inbox.exportToast'))}>
            <Download className="h-4 w-4" />
            {t('probation.inbox.export')}
          </Button>
        </div>
      </div>

      {/* Tier summary cards (clickable filters) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {tiers.map((tier) => {
          const active = filter === tier.key;
          return (
            <button
              key={tier.key}
              onClick={() => setFilter(tier.key)}
              aria-pressed={active}
              className={`text-left rounded-[var(--radius-lg)] p-4 border transition ${
                active
                  ? 'bg-canvas-soft border-ink'
                  : 'bg-surface border-hairline hover:border-ink-faint'
              }`}
            >
              <div className={`text-sm font-bold uppercase tracking-wider ${tier.tone}`}>{tier.label}</div>
              <div className="font-display text-3xl font-bold tracking-tight text-ink mt-1">
                {tier.count}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">{tier.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="mb-3.5 rounded-[var(--radius-lg)] bg-ink text-canvas px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold">
            {t('probation.inbox.selectedCount', { count: selectedCount })}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => showFlash(t('probation.inbox.bulkOpenToast', { count: selectedCount }))}
              className="inline-flex items-center rounded-[var(--radius-md)] border border-canvas/30 px-3 py-1.5 text-sm font-medium text-canvas hover:bg-canvas/10 transition"
            >
              {t('probation.inbox.bulkOpen')}
            </button>
            <button
              onClick={() => showFlash(t('probation.inbox.bulkApproveToast', { count: selectedCount }))}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90 transition"
            >
              <CheckCircle className="h-4 w-4" />
              {t('probation.inbox.bulkApprove')}
            </button>
          </div>
        </div>
      )}

      {/* Flash (demo feedback) */}
      {flash && (
        <div
          role="status"
          className="mb-3.5 rounded-[var(--radius-md)] bg-accent-tint border border-accent-soft px-4 py-2.5 text-sm text-ink"
        >
          {flash}
        </div>
      )}

      {/* Cases table (single card, column-aligned — ref ProbationInbox) */}
      <Card className="p-0 overflow-hidden">
        {/* Column header */}
        <div
          className="grid items-center gap-2 border-b border-hairline bg-canvas-soft px-[18px] py-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted"
          style={{ gridTemplateColumns: ROW_GRID }}
        >
          <span aria-hidden />
          <div>{t('probation.inbox.colEmployee')}</div>
          <div>{t('probation.inbox.colPosition')}</div>
          <div>{t('probation.inbox.colDue')}</div>
          <div>{t('probation.inbox.colNote')}</div>
          <div />
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-9 w-9 animate-pulse rounded-full bg-canvas-soft" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-canvas-soft" />
                  <div className="h-3 w-32 animate-pulse rounded bg-canvas-soft" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">{t('probation.noItemsInCategory')}</div>
        ) : (
          filtered.map((c, idx) => (
            <ProbationRow
              key={c.id}
              c={c}
              locale={locale}
              t={t}
              toneIdx={idx}
              selected={!!selected[c.id]}
              onToggle={() => setSelected((s) => ({ ...s, [c.id]: !s[c.id] }))}
            />
          ))
        )}
      </Card>
    </div>
  );
}
