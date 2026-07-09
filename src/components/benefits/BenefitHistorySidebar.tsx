'use client';

// STA-102 / STA-107 — History panel shown beside a benefit plan's / rule's current
// info. Each entry (top→bottom): effective-date headline · action chip + change
// date & time · field-level diff · who (actor name). Newest at top, grouped by
// change date. NO-RED guardrail: delete uses the pumpkin --color-danger token.
// Entries without effectiveDate/changes degrade gracefully (old-shape rendering).

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date';
import {
  useBenefitHistoryStore,
  type BenefitHistoryAction,
  type BenefitHistoryEntry,
  type BenefitHistoryTargetType,
} from '@/stores/benefit-history-store';

interface BenefitHistorySidebarProps {
  targetType: BenefitHistoryTargetType;
  targetId: string;
  isTh: boolean;
  className?: string;
}

// ── Action chip styles (Humi tokens only — delete = pumpkin, never red) ──────
const ACTION_CHIP_STYLE: Record<BenefitHistoryAction, string> = {
  create: 'bg-accent-soft text-accent border border-accent/30',
  insert: 'bg-info-tint text-info border border-info/30',
  delete: 'bg-danger-soft text-danger border border-danger/30',
};

const ACTION_DOT_STYLE: Record<BenefitHistoryAction, string> = {
  create: 'bg-accent',
  insert: 'bg-info',
  delete: 'bg-danger',
};

function formatTime(iso: string, isTh: boolean): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(isTh ? 'th-TH' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BenefitHistorySidebar({
  targetType,
  targetId,
  isTh,
  className,
}: BenefitHistorySidebarProps) {
  const t = useTranslations('benefitHistory');
  // Select the raw array (stable reference) and derive the filtered/sorted view
  // in useMemo — passing a fresh-array selector straight to the store hook causes
  // an infinite re-render loop (getSnapshot not cached).
  const allEntries = useBenefitHistoryStore((s) => s.entries);
  const entries = useMemo(
    () =>
      allEntries
        .filter((e) => e.targetType === targetType && e.targetId === targetId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [allEntries, targetType, targetId],
  );

  // Group newest-first entries by calendar day, preserving order.
  const groups = useMemo(() => {
    const out: { dateKey: string; label: string; rows: BenefitHistoryEntry[] }[] = [];
    for (const e of entries) {
      const dateKey = e.timestamp.slice(0, 10);
      const last = out[out.length - 1];
      if (last && last.dateKey === dateKey) {
        last.rows.push(e);
      } else {
        out.push({
          dateKey,
          label: formatDate(e.timestamp, 'long', isTh ? 'th' : 'en'),
          rows: [e],
        });
      }
    }
    return out;
  }, [entries, isTh]);

  const actionLabel = (a: BenefitHistoryAction) => t(`action_${a}`);

  return (
    <aside
      className={cn(
        'rounded-[var(--radius-md)] border border-hairline bg-surface p-4',
        className,
      )}
      aria-label={t('title')}
    >
      <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.1em] text-ink-muted">
        {t('eyebrow')}
      </p>
      <h3 className="mt-0.5 text-body font-semibold text-ink">{t('title')}</h3>

      {groups.length === 0 ? (
        <p className="mt-4 text-small text-ink-muted">{t('empty')}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((g) => (
            <div key={g.dateKey}>
              <p className="mb-2 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                {g.label}
              </p>
              <ol className="relative space-y-3 border-l border-hairline pl-4">
                {g.rows.map((entry) => {
                  // STA-107 — combined "4 March 2026, 15:15" change datetime.
                  const changeDateTime = `${formatDate(entry.timestamp, 'long', isTh ? 'th' : 'en')}, ${formatTime(entry.timestamp, isTh)}`;
                  return (
                    <li key={entry.id} className="relative">
                      <span
                        className={cn(
                          'absolute -left-[1.3125rem] top-1 h-3 w-3 rounded-full border-2 border-surface',
                          ACTION_DOT_STYLE[entry.action],
                        )}
                        aria-hidden
                      />
                      <div className="flex flex-col gap-1.5">
                        {/* 1. Effective-date headline (BA: users care when the change takes effect). */}
                        {entry.effectiveDate && (
                          <p className="text-small font-semibold text-ink">
                            {t('effectiveOn', {
                              date: formatDate(entry.effectiveDate, 'long', isTh ? 'th' : 'en'),
                            })}
                          </p>
                        )}
                        {/* 2. Action chip + change date & time on one line. */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.06em]',
                              ACTION_CHIP_STYLE[entry.action],
                            )}
                          >
                            {actionLabel(entry.action)}
                          </span>
                          <span className="text-xs text-ink-muted tabular-nums">
                            {changeDateTime}
                          </span>
                        </div>
                        {/* 3. Field-level diff (when present). NO-RED: muted label + ink values. */}
                        {entry.changes && entry.changes.length > 0 && (
                          <ul className="space-y-0.5">
                            {entry.changes.map((c, i) => (
                              <li key={`${c.field}-${i}`} className="text-small text-ink">
                                {t.rich('changeLine', {
                                  field: c.field,
                                  from: c.from,
                                  to: c.to,
                                  label: (chunks) => (
                                    <span className="font-semibold text-ink-muted">{chunks}</span>
                                  ),
                                  val: (chunks) => (
                                    <span className="font-medium text-ink">{chunks}</span>
                                  ),
                                })}
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* 4. Who. */}
                        <span className="text-small text-ink">
                          <span className="text-ink-muted">{t('who')}: </span>
                          <span className="font-medium">{entry.actorName}</span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
