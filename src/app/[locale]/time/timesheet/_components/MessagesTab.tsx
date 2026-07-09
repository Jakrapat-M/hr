'use client';

// MessagesTab — notification cards for My Timesheet (STA-195, widened to 4 types
// under STA-232; grouped + filterable + collapsible under STA-253).
// NO-RED guardrail: Error uses --color-danger (pumpkin), never red.

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, ChevronDown, Clock, Info, XCircle } from 'lucide-react';
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
  typeLabelTh: string;
  typeLabelEn: string;
  chipClass: string;
  badgeClass: string;
  cardBorderClass: string;
};

// Priority order: Error(0) < Warning(1) < Approve(2) < Information(3) — lower rank renders first.
const MESSAGE_TYPE_META: Record<MessageLevel, MessageTypeMeta> = {
  error: {
    rank: 0,
    icon: XCircle,
    typeLabelTh: 'ข้อผิดพลาด',
    typeLabelEn: 'Error',
    chipClass: 'bg-danger-soft text-danger',
    badgeClass: 'border-danger bg-danger-soft text-danger',
    cardBorderClass: 'border-danger',
  },
  warning: {
    rank: 1,
    icon: Clock,
    typeLabelTh: 'แจ้งเตือน',
    typeLabelEn: 'Warning',
    chipClass: 'bg-warning-soft text-warning',
    badgeClass: 'border-warning bg-warning-soft text-warning',
    cardBorderClass: 'border-warning',
  },
  approve: {
    rank: 2,
    icon: Check,
    typeLabelTh: 'อนุมัติ',
    typeLabelEn: 'Approve',
    chipClass: 'bg-accent-soft text-accent',
    badgeClass: 'border-accent bg-accent-soft text-accent',
    cardBorderClass: 'border-hairline',
  },
  information: {
    rank: 3,
    icon: Info,
    typeLabelTh: 'ข้อมูล',
    typeLabelEn: 'Information',
    chipClass: 'bg-info-soft text-info',
    badgeClass: 'border-info bg-info-soft text-info',
    cardBorderClass: 'border-hairline',
  },
};

// Grouping / filter order — Error → Warning → Approve → Information (matches MESSAGE_TYPE_META rank).
const LEVELS_BY_PRIORITY: MessageLevel[] = ['error', 'warning', 'approve', 'information'];

function sortByPriorityThenDate(messages: TimesheetMessage[]): TimesheetMessage[] {
  return [...messages].sort((a, b) => {
    const rankDiff = MESSAGE_TYPE_META[a.level].rank - MESSAGE_TYPE_META[b.level].rank;
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.dateRaw).getTime() - new Date(a.dateRaw).getTime();
  });
}

function MessageCard({ m, isTh }: { m: TimesheetMessage; isTh: boolean }) {
  const meta = MESSAGE_TYPE_META[m.level];
  const Icon = meta.icon;
  return (
    <div className={cn('flex gap-3 rounded-[var(--radius-md)] border bg-surface p-3.5', meta.cardBorderClass)}>
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]', meta.chipClass)}>
        <Icon size={18} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <span
          data-testid="message-badge"
          className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', meta.badgeClass)}
        >
          {isTh ? m.badgeTh : m.badgeEn}
        </span>
        <p data-testid="message-title" className="mt-1 text-sm font-semibold text-ink">
          {isTh ? m.titleTh : m.titleEn}
        </p>
        <p className="mt-0.5 text-sm text-ink-muted">{isTh ? m.descTh : m.descEn}</p>
        <p className="mt-1 text-xs text-ink-faint">{m.date}</p>
      </div>
    </div>
  );
}

export function MessagesTab({ messages, isTh }: { messages: TimesheetMessage[]; isTh: boolean }) {
  const [selectedTypes, setSelectedTypes] = useState<Set<MessageLevel>>(() => new Set(LEVELS_BY_PRIORITY));
  const [collapsedTypes, setCollapsedTypes] = useState<Set<MessageLevel>>(() => new Set());

  if (messages.length === 0) {
    return (
      <Card>
        <p className="py-8 text-center text-ink-muted">{isTh ? 'ไม่มีข้อความในรอบนี้' : 'No messages this period'}</p>
      </Card>
    );
  }

  const sorted = sortByPriorityThenDate(messages);
  const groups = LEVELS_BY_PRIORITY.map((level) => ({ level, items: sorted.filter((m) => m.level === level) })).filter(
    (g) => g.items.length > 0,
  );
  const visibleGroups = groups.filter((g) => selectedTypes.has(g.level));
  const allSelected = selectedTypes.size === LEVELS_BY_PRIORITY.length;

  function toggleType(level: MessageLevel) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function toggleCollapse(level: MessageLevel) {
    setCollapsedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div role="group" aria-label={isTh ? 'กรองประเภทข้อความ' : 'Filter message types'} className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedTypes(new Set(LEVELS_BY_PRIORITY))}
          aria-pressed={allSelected}
          className={cn(
            'inline-flex min-h-[40px] items-center rounded-full border px-3.5 text-xs font-medium transition-colors',
            allSelected
              ? 'border-accent bg-accent text-canvas'
              : 'border-hairline bg-surface text-ink-muted hover:bg-canvas-soft hover:text-ink',
          )}
        >
          {isTh ? 'ทั้งหมด' : 'All'}
        </button>
        {LEVELS_BY_PRIORITY.map((level) => {
          const meta = MESSAGE_TYPE_META[level];
          const active = selectedTypes.has(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => toggleType(level)}
              aria-pressed={active}
              className={cn(
                'inline-flex min-h-[40px] items-center gap-1 rounded-full border px-3.5 text-xs font-medium transition-colors',
                active ? meta.badgeClass : 'border-hairline bg-surface text-ink-muted hover:bg-canvas-soft hover:text-ink',
              )}
            >
              {isTh ? meta.typeLabelTh : meta.typeLabelEn}
            </button>
          );
        })}
      </div>

      {visibleGroups.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-ink-muted">
            {isTh ? 'ไม่มีข้อความตามตัวกรองที่เลือก' : 'No messages match the selected filter'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((group) => {
            const meta = MESSAGE_TYPE_META[group.level];
            const collapsed = collapsedTypes.has(group.level);
            const contentId = `messages-group-${group.level}`;
            return (
              <div key={group.level} className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleCollapse(group.level)}
                  aria-expanded={!collapsed}
                  aria-controls={contentId}
                  className="flex min-h-[40px] w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-3.5 py-2"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                        meta.badgeClass,
                      )}
                    >
                      {isTh ? meta.typeLabelTh : meta.typeLabelEn}
                    </span>
                    <span className="text-xs text-ink-muted">{group.items.length}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={cn('shrink-0 text-ink-muted transition-transform', collapsed ? '-rotate-90' : 'rotate-0')}
                  />
                </button>
                <div id={contentId} className="space-y-2">
                  {!collapsed && group.items.map((m, i) => <MessageCard key={i} m={m} isTh={isTh} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
