'use client';

// SummaryWidgets — STA-239 (ticket 2). Responsive stat-widget strip for the
// timesheet Summary tab: desktop (md+) = wrapping grid rows; mobile = horizontal
// snap-scroll carousel with dot indicators. ONE implementation via responsive
// classes. Hour figures are always decimal X.XX (never X:XX).

import { useRef, useState } from 'react';
import { Card } from '@/components/cnext';
import { cn } from '@/lib/utils';

export interface SummaryWidgetItem {
  key: string;
  label: string;
  /** Pre-formatted main figure (hours already X.XX via fmtHours). */
  value: string;
  unit?: string;
  sub?: string;
  /** Accent tone for the main figure. */
  tone?: 'default' | 'accent' | 'danger';
}

const TONE_CLASS: Record<NonNullable<SummaryWidgetItem['tone']>, string> = {
  default: 'text-ink',
  accent: 'text-accent',
  danger: 'text-danger',
};

export function SummaryWidgets({ items }: { items: SummaryWidgetItem[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  function onScroll() {
    const el = scroller.current;
    if (!el || el.children.length === 0) return;
    const cardW = (el.children[0] as HTMLElement).offsetWidth + 12; // gap-3
    setActiveIdx(Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / cardW))));
  }

  return (
    <div data-testid="summary-widgets">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-4"
      >
        {items.map((w) => (
          <div key={w.key} className="min-w-[76%] snap-center sm:min-w-[46%] md:min-w-0">
            <Card>
              <p className="text-xs text-ink-muted">{w.label}</p>
              <p className={cn('mt-1 text-2xl font-bold tabular-nums', TONE_CLASS[w.tone ?? 'default'])}>
                {w.value}
                {w.unit && <span className="ml-1 text-base font-normal text-ink-muted">{w.unit}</span>}
              </p>
              {w.sub && <p className="mt-0.5 text-xs text-ink-muted">{w.sub}</p>}
            </Card>
          </div>
        ))}
      </div>
      {/* Mobile carousel dots */}
      <div className="mt-2 flex justify-center gap-1.5 md:hidden" aria-hidden>
        {items.map((w, i) => (
          <span
            key={w.key}
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              i === activeIdx ? 'bg-accent' : 'bg-hairline',
            )}
          />
        ))}
      </div>
    </div>
  );
}
