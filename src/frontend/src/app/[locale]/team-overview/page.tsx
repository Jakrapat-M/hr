// Team Overview (STA-245) — manager-facing attendance dashboard for the Time
// module. Server shell renders the header idiom (eyebrow + two-tone display
// title, matching /roster); the persona-scoped KPI dashboard + period switcher
// live in the 'use client' child. Open route (menu show: manager+); the cohort
// the KPIs aggregate over is narrowed to the persona's scope inside the child,
// so there is no deny/dead-end. Mockup only, derived from lib/time seeds.

import { getLocale } from 'next-intl/server';
import { TeamOverviewDashboard } from '@/components/time/TeamOverviewDashboard';
import { TeamOverviewShortcuts } from '@/components/time/TeamOverviewShortcuts';

export default async function TeamOverviewPage() {
  const locale = await getLocale();
  const isTh = locale !== 'en';

  return (
    <div className="pb-8 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {isTh ? 'HUMI • บริหารทีม • ภาพรวมทีม' : 'HUMI • TEAM MANAGEMENT • TEAM OVERVIEW'}
        </span>
        <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
          Team <span className="italic font-medium text-accent">{isTh ? 'ภาพรวม' : 'Overview'}</span>
        </h1>
      </header>

      {/* Quick-jump buttons + shortcut groupings sit at the top of the page
          (STA-249); the summary dashboard follows. */}
      <TeamOverviewShortcuts />

      <TeamOverviewDashboard />
    </div>
  );
}
