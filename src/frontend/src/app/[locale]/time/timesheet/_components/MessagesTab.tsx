'use client';

// MessagesTab — notification cards for My Timesheet (STA-195, widened to 4 types
// under STA-232). Types: Error > Warning > Approve > Information (priority order).
// NO-RED guardrail: Error uses --color-danger (pumpkin), never red.

import type { LucideIcon } from 'lucide-react';
import { Check, Clock, Info, XCircle } from 'lucide-react';
import { Card } from '@/components/humi';
import { cn } from '@/lib/utils';

export type MessageLevel = 'error' | 'warning' | 'approve' | 'information';

export type TimesheetMessage = {
  level: MessageLevel;
  badgeTh: string;
  badgeEn: string;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  /** Display string for the card footer, e.g. "ระบบ · 2 มิ.ย. 2569". */
  date: string;
  /** ISO date (BE-safe, `date.ts`-formatted elsewhere) used only to order messages within a priority band. */
  dateRaw: string;
};

type MessageTypeMeta = {
  rank: number;
  icon: LucideIcon;
  chipClass: string;
  badgeClass: string;
  cardBorderClass: string;
};

// Priority order: Error(0) < Warning(1) < Approve(2) < Information(3) — lower rank renders first.
const MESSAGE_TYPE_META: Record<MessageLevel, MessageTypeMeta> = {
  error: {
    rank: 0,
    icon: XCircle,
    chipClass: 'bg-danger-soft text-danger',
    badgeClass: 'border-danger bg-danger-soft text-danger',
    cardBorderClass: 'border-danger',
  },
  warning: {
    rank: 1,
    icon: Clock,
    chipClass: 'bg-warning-soft text-warning',
    badgeClass: 'border-warning bg-warning-soft text-warning',
    cardBorderClass: 'border-warning',
  },
  approve: {
    rank: 2,
    icon: Check,
    chipClass: 'bg-accent-soft text-accent',
    badgeClass: 'border-accent bg-accent-soft text-accent',
    cardBorderClass: 'border-hairline',
  },
  information: {
    rank: 3,
    icon: Info,
    chipClass: 'bg-info-soft text-info',
    badgeClass: 'border-info bg-info-soft text-info',
    cardBorderClass: 'border-hairline',
  },
};

function sortByPriorityThenDate(messages: TimesheetMessage[]): TimesheetMessage[] {
  return [...messages].sort((a, b) => {
    const rankDiff = MESSAGE_TYPE_META[a.level].rank - MESSAGE_TYPE_META[b.level].rank;
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.dateRaw).getTime() - new Date(a.dateRaw).getTime();
  });
}

export function MessagesTab({ messages, isTh }: { messages: TimesheetMessage[]; isTh: boolean }) {
  if (messages.length === 0) {
    return (
      <Card>
        <p className="py-8 text-center text-ink-muted">{isTh ? 'ไม่มีข้อความในรอบนี้' : 'No messages this period'}</p>
      </Card>
    );
  }
  const sorted = sortByPriorityThenDate(messages);
  return (
    <div className="space-y-2">
      {sorted.map((m, i) => {
        const meta = MESSAGE_TYPE_META[m.level];
        const Icon = meta.icon;
        return (
          <div
            key={i}
            className={cn(
              'flex gap-3 rounded-[var(--radius-md)] border bg-surface p-3.5',
              meta.cardBorderClass,
            )}
          >
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]', meta.chipClass)}>
              <Icon size={18} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', meta.badgeClass)}>
                {isTh ? m.badgeTh : m.badgeEn}
              </span>
              <p className="mt-1 text-sm font-semibold text-ink">{isTh ? m.titleTh : m.titleEn}</p>
              <p className="mt-0.5 text-sm text-ink-muted">{isTh ? m.descTh : m.descEn}</p>
              <p className="mt-1 text-xs text-ink-faint">{m.date}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
