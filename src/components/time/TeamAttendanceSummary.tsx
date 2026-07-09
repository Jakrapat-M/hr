'use client';

// TeamAttendanceSummary — "TODAY ACROSS HQ / Team is ready" card, extracted from
// the home dashboard (STA-248) so it lives on the Time & Attendance hub instead.
// JSX moved verbatim from home/page.tsx; i18n keeps the `humiHero` namespace
// (behavioral no-op — can be relocated to a time-scoped namespace later).

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { HUMI_TODAY_PRESENCE } from '@/lib/humi-mock-data';

const AVATAR_TONE_MAP = {
  teal: 'humi-avatar humi-avatar--teal',
  sage: 'humi-avatar humi-avatar--sage',
  butter: 'humi-avatar humi-avatar--butter',
  ink: 'humi-avatar humi-avatar--ink',
  indigo: 'humi-avatar humi-avatar--teal',
} as const;

export function TeamAttendanceSummary() {
  const t = useTranslations('humiHero');
  const ringPct = Math.round(
    (HUMI_TODAY_PRESENCE.workingCount / HUMI_TODAY_PRESENCE.totalCount) * 100,
  );

  return (
    <div className="humi-card">
      <div className="humi-row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="humi-eyebrow">{t('todayEyebrow')}</div>
          <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug tracking-tight text-ink">
            {t('todayTitle')}
          </h3>
        </div>
        <span className="humi-tag humi-tag--accent" style={{ marginLeft: 'auto' }}>
          {t('tagLive')}
        </span>
      </div>
      <div className="humi-row" style={{ marginTop: 18, gap: 20 }}>
        <div
          className="humi-ring"
          style={{ ['--p' as string]: ringPct } as React.CSSProperties}
          role="img"
          aria-label={`${HUMI_TODAY_PRESENCE.workingCount} / ${HUMI_TODAY_PRESENCE.totalCount} ${t('ringWorkingUnit')}`}
        >
          <div style={{ position: 'relative', textAlign: 'center', zIndex: 1 }}>
            <div className="humi-ring-val">
              {HUMI_TODAY_PRESENCE.workingCount.toLocaleString()}
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
        <div className="humi-col" style={{ gap: 10, flex: 1 }}>
          <LegendRow
            dotColor="var(--color-accent)"
            label={t('legendPresent')}
            value={HUMI_TODAY_PRESENCE.present}
          />
          <LegendRow
            dotColor="var(--color-warning)"
            label={t('legendAbsent')}
            value={HUMI_TODAY_PRESENCE.absent}
          />
          <LegendRow
            dotColor="var(--color-hairline)"
            label={t('legendOffShift')}
            value={HUMI_TODAY_PRESENCE.offShift}
          />
        </div>
      </div>
      <hr className="humi-divider" />
      <div className="humi-row" style={{ gap: 0 }}>
        {HUMI_TODAY_PRESENCE.teamInitials.map((initials, idx) => (
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
          {HUMI_TODAY_PRESENCE.moreLabel}
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
    <div className="humi-row" style={{ justifyContent: 'space-between' }}>
      <div className="humi-row">
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
