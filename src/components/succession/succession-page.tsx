'use client';

// ════════════════════════════════════════════════════════════
// Succession Planning — reskinned from shadcn primitives → Cnext tokens.
// Ken UAT 2026-04-22: "ดูเป็นคนละระบบ" — shadcn Card/Badge/Skeleton felt
// visually foreign to Cnext cream+teal language. Reskin uses cnext-card,
// cnext-tag (sage/butter/coral/accent variants), cnext-eyebrow, cnext-divider
// so the page reads as one system with /home, /profile, /timeoff etc.
// Data + hook contract (useSuccession, RiskLevel, Readiness) unchanged.
// ════════════════════════════════════════════════════════════

import { useTranslations } from 'next-intl';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSuccession, type Readiness, type RiskLevel } from '@/hooks/use-succession';

// Map SF risk/readiness ontology → Cnext tag variants. NO RED tokens used
// (coral + butter already map through warning-amber / butter-soft per rule).
const RISK_TAG: Record<RiskLevel, string> = {
  high: 'cnext-tag--coral',
  medium: 'cnext-tag--butter',
  low: 'cnext-tag--sage',
};
const READINESS_TAG: Record<Readiness, string> = {
  ready_now: 'cnext-tag--sage',
  '1_2_years': 'cnext-tag--accent',
  '3_plus_years': 'cnext-tag',
};

export function SuccessionPage() {
  const t = useTranslations('succession');
  const { plans, stats, loading } = useSuccession();

  if (loading) {
    return (
      <div className="cnext-col" style={{ gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="cnext-card"
            style={{ height: 160, background: 'var(--color-canvas-soft)' }}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Page header — eyebrow + display h1 matches other Cnext pages (/home, /profile) */}
      <div className="mb-8">
        <div className="cnext-eyebrow">{t('title')}</div>
        <h1
          className="mt-1 text-ink"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          {t('subtitle')}
        </h1>
      </div>

      {/* Stats row — 4 tiles with cnext-card, token-only colors (no text-brand red) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile value={stats.totalPositions} label={t('criticalPositions')} tone="ink" />
        <StatTile value={stats.highRisk} label={t('highRisk')} tone="coral" />
        <StatTile value={`${stats.coverageRatio}%`} label={t('coverageRatio')} tone="accent" />
        <StatTile value={`${stats.readyNowRatio}%`} label={t('readyNowRatio')} tone="sage" />
      </div>

      {/* Plans list */}
      <div className="cnext-col" style={{ gap: 20 }}>
        {plans.map((plan) => (
          <div key={plan.id} className="cnext-card">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Left — position + incumbent */}
              <div className="lg:w-1/3">
                <div className="cnext-eyebrow">{t('criticalPositions')}</div>
                <div className="mt-1 flex items-start gap-3">
                  <span
                    className="cnext-avatar cnext-avatar--ink"
                    style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0 }}
                    aria-hidden="true"
                  >
                    <Shield size={18} />
                  </span>
                  <div>
                    <h3
                      className="text-ink"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 18,
                        fontWeight: 700,
                        lineHeight: 1.25,
                      }}
                    >
                      {plan.positionTitle}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginTop: 2 }}>
                      {plan.department}
                    </div>
                  </div>
                </div>

                <hr className="cnext-divider" />

                {/* Incumbent row */}
                <div className="cnext-row">
                  {plan.incumbentPhoto && (
                    <img
                      src={plan.incumbentPhoto}
                      alt=""
                      className="rounded-full"
                      style={{ width: 34, height: 34, flexShrink: 0 }}
                    />
                  )}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                      {plan.incumbentName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>
                      {plan.yearsInRole} {t('yearsInRole')}
                    </div>
                  </div>
                </div>

                {/* Risk chip + reason */}
                <div className="cnext-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                  <span className={cn('cnext-tag', RISK_TAG[plan.riskLevel])}>
                    {t(`flightRisk.${plan.riskLevel}` as never)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>
                    {plan.riskReason}
                  </span>
                </div>
              </div>

              {/* Right — successors */}
              <div className="flex-1 min-w-0">
                <div className="cnext-eyebrow">
                  {t('identifiedSuccessors')} · {plan.successors.length}
                </div>
                {plan.successors.length === 0 ? (
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--color-ink-muted)',
                      marginTop: 8,
                    }}
                  >
                    {t('noSuccessorsIdentified')}
                  </p>
                ) : (
                  <div className="cnext-col" style={{ gap: 10, marginTop: 10 }}>
                    {plan.successors.map((s) => (
                      <div
                        key={s.id}
                        className="cnext-card cnext-card--cream cnext-card--tight"
                        style={{ padding: 14 }}
                      >
                        <div className="cnext-row" style={{ gap: 12 }}>
                          {s.photo && (
                            <img
                              src={s.photo}
                              alt=""
                              className="rounded-full"
                              style={{ width: 36, height: 36, flexShrink: 0 }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div
                              className="truncate"
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: 'var(--color-ink)',
                              }}
                            >
                              {s.name}
                            </div>
                            <div
                              className="truncate"
                              style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}
                            >
                              {s.position} · {s.department}
                            </div>
                          </div>
                          <span
                            className={cn('cnext-tag', READINESS_TAG[s.readiness])}
                            style={{ flexShrink: 0 }}
                          >
                            {s.readiness === 'ready_now'
                              ? t('readyNow')
                              : s.readiness === '1_2_years'
                                ? t('ready1To2Years')
                                : t('ready3PlusYears')}
                          </span>
                        </div>
                        {s.gaps.length > 0 && (
                          <div
                            className="cnext-row"
                            style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}
                          >
                            {s.gaps.map((g) => (
                              <span key={g} className="cnext-tag cnext-tag--butter">
                                {g}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── StatTile — small helper so the 4 header tiles share typography rhythm
// without re-declaring inline styles 4× in the main JSX.
function StatTile({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: 'ink' | 'coral' | 'accent' | 'sage';
}) {
  const valueColor =
    tone === 'ink'
      ? 'var(--color-ink)'
      : tone === 'coral'
        ? 'var(--color-warning)'
        : tone === 'accent'
          ? 'var(--color-accent)'
          : 'var(--color-success)';
  return (
    <div className="cnext-card cnext-card--tight" style={{ textAlign: 'center' }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.1,
          color: valueColor,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-ink-muted)',
          marginTop: 4,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </div>
    </div>
  );
}
