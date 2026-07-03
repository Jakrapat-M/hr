'use client';

// MessagesTab — notification cards for My Timesheet (STA-195). Warn cards use the
// amber warning tokens, ok cards use accent; no red anywhere.

import { Clock, Check, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/humi';
import { cn } from '@/lib/utils';

export type TimesheetMessage = {
  level: 'warn' | 'ok';
  badgeTh: string;
  badgeEn: string;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  date: string;
};

export function MessagesTab({ messages, isTh }: { messages: TimesheetMessage[]; isTh: boolean }) {
  if (messages.length === 0) {
    return (
      <Card>
        <p className="py-8 text-center text-ink-muted">{isTh ? 'ไม่มีข้อความในรอบนี้' : 'No messages this period'}</p>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {messages.map((m, i) => {
        const warn = m.level === 'warn';
        return (
          <div
            key={i}
            className={cn(
              'flex gap-3 rounded-[var(--radius-md)] border bg-surface p-3.5',
              warn ? 'border-warning' : 'border-hairline',
            )}
          >
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]', warn ? 'bg-warning-soft text-warning' : 'bg-accent-soft text-accent')}>
              {warn ? <Clock size={18} aria-hidden /> : <Check size={18} aria-hidden />}
            </div>
            <div className="flex-1">
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', warn ? 'border-warning bg-warning-soft text-warning' : 'border-accent bg-accent-soft text-accent')}>
                {warn && <AlertTriangle size={11} aria-hidden />}{isTh ? m.badgeTh : m.badgeEn}
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
