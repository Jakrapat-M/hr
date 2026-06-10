'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Download,
  ArrowRight,
} from 'lucide-react';
import { Card, Button, Avatar } from '@/components/humi';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProbationCases, STATUS_LABEL, type ProbationStatus } from '@/hooks/use-probation';
import { formatDate } from '@/lib/date';

type TierKey = 'all' | 'urgent' | 'warn' | 'normal';

const STATUS_BADGE: Record<ProbationStatus, 'warning' | 'info' | 'success' | 'error' | 'neutral'> = {
  pending_manager: 'warning',
  pending_hr: 'info',
  approved: 'success',
  rejected: 'error',
  extended: 'warning',
  escalated_ceo: 'error',
};

const STATUS_ICON: Record<ProbationStatus, React.ReactNode> = {
  pending_manager: <Clock className="h-4 w-4 text-warning" />,
  pending_hr: <AlertTriangle className="h-4 w-4 text-info" />,
  approved: <CheckCircle className="h-4 w-4 text-success" />,
  rejected: <XCircle className="h-4 w-4 text-danger" />,
  extended: <Clock className="h-4 w-4 text-warning" />,
  escalated_ceo: <AlertTriangle className="h-4 w-4 text-danger" />,
};

// Avatar tones to cycle through (Humi token-backed, NO raw hex).
const AVATAR_TONES = ['teal', 'sage', 'butter', 'ink'] as const;

// Probation approval chain: Manager → HR Director (2 stages)
const CHAIN_STAGES = [
  { key: 'manager', labelTh: 'หัวหน้างาน', labelEn: 'Manager' },
  { key: 'hr', labelTh: 'HR Director', labelEn: 'HR Director' },
];

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

function ProbationApprovalChain({
  status,
  locale,
}: {
  status: ProbationStatus;
  locale: string;
}) {
  const activeIdx =
    status === 'pending_manager' ? 0
    : status === 'pending_hr' || status === 'escalated_ceo' ? 1
    : -1;

  const doneUpTo =
    status === 'approved' ? 1
    : status === 'pending_hr' || status === 'escalated_ceo' ? 0
    : -1;

  const isRejected = status === 'rejected';
  const isExtended = status === 'extended';

  return (
    <div
      className="flex items-center gap-1.5 flex-wrap"
      aria-label={locale === 'th' ? 'ขั้นตอนอนุมัติ' : 'Approval chain'}
    >
      {CHAIN_STAGES.map((stage, idx) => {
        const label = locale === 'th' ? stage.labelTh : stage.labelEn;
        const isDone = idx <= doneUpTo;
        const isActive = idx === activeIdx;
        const isFailed = (isRejected || isExtended) && idx === 0;

        return (
          <div key={stage.key} className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium ${
                isFailed
                  ? 'bg-danger-soft text-danger-ink border border-danger'
                  : isActive
                  ? 'bg-warning-soft text-warning-ink border border-warning'
                  : isDone
                  ? 'bg-success-soft text-success-ink border border-success'
                  : 'bg-surface-raised text-ink-muted'
              }`}
            >
              {label}
            </span>
            {idx < CHAIN_STAGES.length - 1 && (
              <span aria-hidden className="text-ink-muted text-xs">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
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
  const [expanded, setExpanded] = useState(false);
  const daysRemaining = daysToProbationEnd(c.probationEndDate);
  const overdue = daysRemaining < 0;
  const tier = tierOf(daysRemaining);
  const isUrgent = tier === 'urgent';
  const isWarn = tier === 'warn';

  const dueColor = isUrgent ? 'text-danger-ink' : isWarn ? 'text-warning-ink' : 'text-ink-soft';

  const dotColor = (action: string) => {
    if (action.includes('อนุมัติ') || action.includes('approved') || action.includes('ผ่าน')) return 'bg-success';
    if (action.includes('ปฏิเสธ') || action.includes('reject') || action.includes('ไม่ผ่าน')) return 'bg-danger';
    return 'bg-accent-soft';
  };

  return (
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-1 ${isUrgent ? 'border-l-[3px] border-l-danger' : ''}`}
    >
      <div className="flex items-stretch">
        {/* Bulk-select checkbox */}
        <label className="flex items-center pl-4 pr-1 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`${locale === 'th' ? 'เลือก' : 'Select'} ${c.fullNameTh}`}
            className="h-4 w-4 accent-[var(--color-accent)] cursor-pointer"
          />
        </label>

        {/* Main clickable link area */}
        <a
          href={`/${locale}/workflows/probation/${c.id}`}
          className="block flex-1 min-w-0 py-4 pr-4 hover:bg-surface-raised/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Avatar
              size="md"
              tone={AVATAR_TONES[toneIdx % AVATAR_TONES.length]}
              name={c.fullNameEn}
              src={c.photo}
            />

            {/* Employee */}
            <div className="min-w-0 flex-[2.2]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold text-ink">{c.fullNameTh}</span>
                {STATUS_ICON[c.status]}
                <Badge variant={STATUS_BADGE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
              </div>
              <p className="text-sm text-ink-muted mt-0.5">
                {c.employeeId} · {c.fullNameEn}
              </p>
            </div>

            {/* Position · Branch */}
            <div className="min-w-0 flex-[1.4] hidden md:block">
              <div className="text-sm text-ink-soft truncate">
                {c.position} · {c.location ?? c.department}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                {t('probation.inbox.started')} {formatDate(c.hireDate, 'medium', locale)}
              </div>
            </div>

            {/* Due in */}
            <div className="shrink-0 w-28 hidden sm:block">
              <div className={`text-sm font-semibold ${dueColor}`}>
                {overdue
                  ? t('probation.inbox.daysOverdue', { days: Math.abs(daysRemaining) })
                  : t('probation.inbox.daysLeft', { days: daysRemaining })}
              </div>
              <div className="mt-0.5">
                <ProbationApprovalChain status={c.status} locale={locale} />
              </div>
            </div>

            {/* Note / status */}
            <div className="min-w-0 flex-[1.4] hidden lg:block">
              <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                {c.assessmentSummary ?? c.managerRemarks ?? '—'}
              </p>
            </div>

            {/* Action */}
            <div className="shrink-0 flex items-center gap-2">
              {isUrgent && (
                <span className="hidden xl:inline-flex items-center rounded-full bg-danger-soft text-danger-ink border border-danger px-2 py-0.5 text-xs font-medium">
                  {t('probation.inbox.tagUrgent')}
                </span>
              )}
              {isWarn && (
                <span className="hidden xl:inline-flex items-center rounded-full bg-warning-soft text-warning-ink px-2 py-0.5 text-xs font-medium">
                  {t('probation.inbox.tagWarn')}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                {t('probation.inbox.openCase')}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <ChevronRight className="h-4 w-4 text-ink-muted hidden sm:block" />
            </div>
          </div>
        </a>
      </div>

      {/* Audit history expand */}
      <div className="px-4 pb-2 pl-11">
        <button
          className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded
            ? <ChevronDown className="h-3 w-3" aria-hidden />
            : <ChevronRight className="h-3 w-3" aria-hidden />}
          {locale === 'th' ? 'ประวัติการดำเนินการ' : 'Audit history'}
          <span className="ml-1 text-ink-faint">({c.timeline.length})</span>
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-hairline bg-surface-raised/20">
          <ol className="space-y-2 mt-2">
            {c.timeline.map((entry, idx) => (
              <li key={idx} className="flex gap-3 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor(entry.action)} mt-1.5 shrink-0`} />
                <div>
                  <span className="font-medium text-ink">{entry.actor}</span>
                  {entry.actorRole !== 'System' && (
                    <span className="text-ink-faint ml-1">({entry.actorRole})</span>
                  )}
                  {' '}
                  <span className="text-ink-muted">{entry.action}</span>
                  <span className="ml-2 text-ink-faint">{formatDate(entry.date, 'medium', locale)}</span>
                  {entry.comment && (
                    <p className="text-ink-muted mt-0.5 italic">&ldquo;{entry.comment}&rdquo;</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
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
      {/* Title block */}
      <div className="mb-5 flex items-start gap-4">
        <div className="min-w-0">
          <div className="humi-eyebrow">{t('probation.inbox.eyebrow')}</div>
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

      {/* Cases list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-[var(--radius-md)]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-ink-muted">{t('probation.noItemsInCategory')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c, idx) => (
            <ProbationRow
              key={c.id}
              c={c}
              locale={locale}
              t={t}
              toneIdx={idx}
              selected={!!selected[c.id]}
              onToggle={() => setSelected((s) => ({ ...s, [c.id]: !s[c.id] }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
