'use client';

// TeamAttendanceSummary — "TODAY ACROSS HQ / Team is ready" card, extracted from
// the home dashboard (STA-248) so it lives on the Time & Attendance hub instead.
// JSX moved verbatim from home/page.tsx; i18n keeps the `cnextHero` namespace
// (behavioral no-op — can be relocated to a time-scoped namespace later).

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { CNEXT_TODAY_PRESENCE } from '@/lib/cnext-mock-data';

const AVATAR_TONE_MAP = {
  teal: 'cnext-avatar cnext-avatar--teal',
  sage: 'cnext-avatar cnext-avatar--sage',
  butter: 'cnext-avatar cnext-avatar--butter',
  ink: 'cnext-avatar cnext-avatar--ink',
  indigo: 'cnext-avatar cnext-avatar--teal',
} as const;

export function TeamAttendanceSummary() {
  const t = useTranslations('cnextHero');
  const ringPct = Math.round(
    (CNEXT_TODAY_PRESENCE.workingCount / CNEXT_TODAY_PRESENCE.totalCount) * 100,
  );

  return (
    <div className="cnext-card">
      <div className="cnext-row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="cnext-eyebrow">{t('todayEyebrow')}</div>
          <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug tracking-tight text-ink">
            {t('todayTitle')}
          </h3>
        </div>
        <span className="cnext-tag cnext-tag--accent" style={{ marginLeft: 'auto' }}>
          {t('tagLive')}
        </span>
      </div>
      <div className="cnext-row" style={{ marginTop: 18, gap: 20 }}>
        <div
          className="cnext-ring"
          style={{ ['--p' as string]: ringPct } as React.CSSProperties}
          role="img"
          aria-label={`${CNEXT_TODAY_PRESENCE.workingCount} / ${CNEXT_TODAY_PRESENCE.totalCount} ${t('ringWorkingUnit')}`}
        >
          <div style={{ position: 'relative', textAlign: 'center', zIndex: 1 }}>
            <div className="cnext-ring-val">
              {CNEXT_TODAY_PRESENCE.workingCount.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-muted)',
              }}
            >
              {t('ringWorkingUnit')}
            </div>
          </div>
        </div>
        <div className="cnext-col" style={{ gap: 10, flex: 1 }}>
          <LegendRow
            dotColor="var(--color-accent)"
            label={t('legendPresent')}
            value={CNEXT_TODAY_PRESENCE.present}
          />
          <LegendRow
            dotColor="var(--color-warning)"
            label={t('legendAbsent')}
            value={CNEXT_TODAY_PRESENCE.absent}
          />
          <LegendRow
            dotColor="var(--color-hairline)"
            label={t('legendOffShift')}
            value={CNEXT_TODAY_PRESENCE.offShift}
          />
        </div>
      </div>
      <hr className="cnext-divider" />
      <div className="cnext-row" style={{ gap: 0 }}>
        {CNEXT_TODAY_PRESENCE.teamInitials.map((initials, idx) => (
          <span
            key={initials}
            className={cn(
              AVATAR_TONE_MAP[
                (['teal', 'sage', 'butter', 'ink', 'teal'] as const)[idx]
              ],
            )}
            style={{
              marginLeft: idx === 0 ? 0 : -8,
              border: '2px solid var(--color-surface)',
              width: 30,
              height: 30,
              fontSize: 11,
            }}
            aria-hidden
          >
            {initials}
          </span>
        ))}
        <span
          style={{
            fontSize: 13,
            color: 'var(--color-ink-muted)',
            marginLeft: 8,
          }}
        >
          {CNEXT_TODAY_PRESENCE.moreLabel}
        </span>
      </div>
    </div>
  );
}

function LegendRow({
  dotColor,
  label,
  value,
}: {
  dotColor: string;
  label: string;
  value: number;
}) {
  return (
    <div className="cnext-row" style={{ justifyContent: 'space-between' }}>
      <div className="cnext-row">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: dotColor,
          }}
          aria-hidden
        />
        <span style={{ color: 'var(--color-ink-soft)', fontSize: 13 }}>{label}</span>
      </div>
      <b style={{ color: 'var(--color-ink)', fontSize: 14 }}>{value.toLocaleString()}</b>
    </div>
  );
}
