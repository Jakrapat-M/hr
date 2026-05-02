'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  User,
} from 'lucide-react';
import { Card } from '@/components/humi';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProbationCases, STATUS_LABEL, type ProbationStatus } from '@/hooks/use-probation';
import { formatDate } from '@/lib/date';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

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

// Probation approval chain: Manager → HR Director (2 stages)
const CHAIN_STAGES = [
  { key: 'manager', labelTh: 'หัวหน้างาน', labelEn: 'Manager' },
  { key: 'hr', labelTh: 'HR Director', labelEn: 'HR Director' },
];

function ProbationApprovalChain({
  status,
  locale,
}: {
  status: ProbationStatus;
  locale: string;
}) {
  // Map status to active/done stage
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
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : isDone
                  ? 'bg-green-50 text-green-700 border border-green-200'
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

function daysWaiting(hireDate: string): number {
  return Math.floor((Date.now() - new Date(hireDate).getTime()) / 86400000);
}

function ProbationRow({
  c,
  locale,
  t,
}: {
  c: ReturnType<typeof useProbationCases>['cases'][0];
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending =
    c.status === 'pending_manager' ||
    c.status === 'pending_hr' ||
    c.status === 'escalated_ceo';
  const slaMs = new Date(c.slaDeadline).getTime() - Date.now();
  const slaHours = Math.max(0, Math.round(slaMs / (1000 * 60 * 60)));
  const isUrgent = isPending && slaHours < 12;
  const days = daysWaiting(c.hireDate);

  const dotColor = (action: string) => {
    if (action.includes('อนุมัติ') || action.includes('approved') || action.includes('ผ่าน')) return 'bg-success';
    if (action.includes('ปฏิเสธ') || action.includes('reject') || action.includes('ไม่ผ่าน')) return 'bg-danger';
    return 'bg-accent-soft';
  };

  return (
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-1 ${isUrgent ? 'border-l-[3px] border-l-danger' : ''}`}
    >
      {/* Main row — clickable link area */}
      <a
        href={`/${locale}/workflows/probation/${c.id}`}
        className="block p-4 hover:bg-surface-raised/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-[var(--radius-md)] overflow-hidden bg-accent-tint shrink-0">
            {c.photo ? (
              <img src={c.photo} alt={c.fullNameEn} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-accent">
                {c.fullNameEn.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info block */}
          <div className="flex-1 min-w-0">
            {/* Name + status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-ink">{c.fullNameTh}</span>
              <span className="text-xs text-ink-muted">{c.fullNameEn}</span>
              <div className="flex items-center gap-1.5 ml-auto">
                {STATUS_ICON[c.status]}
                <Badge variant={STATUS_BADGE[c.status]}>
                  {STATUS_LABEL[c.status]}
                </Badge>
              </div>
            </div>

            {/* Position + department + hire date */}
            <p className="text-xs text-ink-muted mt-0.5">
              {c.position} · {c.department} · {locale === 'th' ? 'เริ่มงาน' : 'Hired'}{' '}
              {formatDate(c.hireDate, 'medium', locale)}
            </p>

            {/* Approval chain (compact) */}
            <div className="mt-1.5">
              <ProbationApprovalChain status={c.status} locale={locale} />
            </div>

            {/* Current stage label + days waiting + SLA */}
            <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted flex-wrap">
              {isPending && (
                <>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {c.currentApprover.name}
                  </span>
                  <span className={`font-mono ${isUrgent ? 'text-danger font-semibold' : 'text-ink-muted'}`}>
                    SLA {slaHours}h
                  </span>
                  <span className={`font-mono ${days > 180 ? 'text-warning' : 'text-ink-muted'}`}>
                    {days} {locale === 'th' ? 'ด.' : 'd.'}
                  </span>
                </>
              )}
              {!isPending && (
                <span className="font-mono text-ink-faint">
                  {days} {locale === 'th' ? 'ด. นับจากวันเริ่มงาน' : 'd. since hire'}
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-ink-muted shrink-0 hidden sm:block" />
        </div>
      </a>

      {/* Expand/collapse timeline toggle */}
      <div className="px-4 pb-2">
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

      {/* Collapsible timeline */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-hairline bg-surface-raised/20">
          <ol className="space-y-2 mt-2">
            {c.timeline.map((entry, idx) => (
              <li key={idx} className="flex gap-3 text-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${dotColor(entry.action)} mt-1.5 shrink-0`}
                />
                <div>
                  <span className="font-medium text-ink">{entry.actor}</span>
                  {entry.actorRole !== 'System' && (
                    <span className="text-ink-faint ml-1">({entry.actorRole})</span>
                  )}
                  {' '}
                  <span className="text-ink-muted">{entry.action}</span>
                  <span className="ml-2 text-ink-faint">
                    {formatDate(entry.date, 'medium', locale)}
                  </span>
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
  const [filter, setFilter] = useState<FilterTab>('all');
  const { cases, loading } = useProbationCases();
  const pathname = usePathname();
  const locale = pathname.startsWith('/th') ? 'th' : 'en';
  const t = useTranslations();

  const filtered = cases.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'pending')
      return (
        c.status === 'pending_manager' ||
        c.status === 'pending_hr' ||
        c.status === 'escalated_ceo'
      );
    if (filter === 'approved') return c.status === 'approved';
    if (filter === 'rejected') return c.status === 'rejected' || c.status === 'extended';
    return true;
  });

  const pendingCount = cases.filter(
    (c) => c.status === 'pending_manager' || c.status === 'pending_hr',
  ).length;

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: t('probation.allCases'), count: cases.length },
    { key: 'pending', label: t('probation.pendingApproval'), count: pendingCount },
    { key: 'approved', label: t('probation.passed') },
    { key: 'rejected', label: t('probation.failedOrExtended') },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Probation Approval</h1>
        <p className="text-sm text-ink-muted mt-1">
          {locale === 'th'
            ? 'อนุมัติผลการทดลองงาน — ระบบจะแจ้งเตือนอัตโนมัติเมื่อพนักงานครบกำหนด probation'
            : 'Approve probation outcomes — system auto-notifies when employees reach probation end date'}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-hairline">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              filter === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-muted hover:text-ink-soft hover:border-hairline'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  filter === tab.key
                    ? 'bg-brand-tint text-brand'
                    : 'bg-surface-raised text-ink-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

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
          {filtered.map((c) => (
            <ProbationRow key={c.id} c={c} locale={locale} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
