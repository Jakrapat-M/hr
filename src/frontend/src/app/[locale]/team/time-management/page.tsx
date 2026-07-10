// Team Time management (STA-255, moved from /team-overview) — manager-facing
// time surface. Order per the Draft-1 update: (1) the approval / to-review
// action list FIRST, (2) the compact expandable KPI dashboard, (3) the shortcut
// tile groups in the /time-hub idiom. Server shell renders the header; the
// interactive pieces live in 'use client' children. Mockup only, lib/time seeds.

import { getLocale } from 'next-intl/server';
import { TeamApprovalsFirst } from '@/components/time/TeamApprovalsFirst';
import { TeamOverviewDashboard } from '@/components/time/TeamOverviewDashboard';
import { TeamOverviewShortcuts } from '@/components/time/TeamOverviewShortcuts';

export default async function TeamTimeManagementPage() {
  const locale = await getLocale();
  const isTh = locale !== 'en';

  return (
    <div className="pb-8 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {isTh ? 'HUMI • บริหารทีม • จัดการเวลา' : 'HUMI • TEAM MANAGEMENT • TIME MANAGEMENT'}
        </span>
        <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
          {isTh ? (
            <>จัดการ<span className="italic font-medium text-accent">เวลา</span></>
          ) : (
            <>Time <span className="italic font-medium text-accent">management</span></>
          )}
        </h1>
      </header>

      {/* 1 — approvals / to-review first (STA-255 layout order). */}
      <TeamApprovalsFirst />

      {/* 2 — shortcut tile groups (the /time-hub idiom; quick-jump row removed). */}
      <TeamOverviewShortcuts />

      {/* 3 — compact expandable KPI dashboard. */}
      <TeamOverviewDashboard />
    </div>
  );
}
