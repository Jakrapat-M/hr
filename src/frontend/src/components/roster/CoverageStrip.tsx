// CoverageStrip — coverage row sibling to RosterGantt. Matches the reference:
//   [240px label][76px deficit][24 coverage cells] grid.
//   label = "COVERAGE" eyebrow + summary "12 gaps · Peak 13–16".
//   deficit slot = "−16 hrs" in pumpkin (text-danger, no bg).
//   cells: ok=bg-accent, gap=bg-danger (pumpkin), over=accent-alt opacity-60,
//   off=bg-hairline thin (4px). Tokens only — NO hex, NO Tailwind red.

'use client';

import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  COVERAGE,
  COVERAGE_SUMMARY,
  ROSTER_HOURS,
  type CoverageStatus,
} from '@/data/roster/mock';

// status -> token class (ref .cov-cell map; gap = pumpkin = --color-danger).
const COV_CELL_CLASS: Record<CoverageStatus, string> = {
  ok: 'bg-accent',
  gap: 'bg-danger',
  over: 'bg-[var(--color-accent-alt)] opacity-60',
  off: 'bg-hairline',
};

const COV_LABEL: Record<CoverageStatus, { th: string; en: string }> = {
  ok: { th: 'พอเพียง', en: 'Covered' },
  gap: { th: 'ขาดคน', en: 'Gap' },
  over: { th: 'เกินจำเป็น', en: 'Over' },
  off: { th: 'ปิดกะ', en: 'Off' },
};

const GRID_COLS = `240px 76px repeat(${ROSTER_HOURS}, minmax(0,1fr))`;

export function CoverageStrip({ coverage = COVERAGE }: { coverage?: CoverageStatus[] }) {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const { gaps, peakStart, peakEnd, deficitHrs } = COVERAGE_SUMMARY;

  const summary = isTh
    ? `${gaps} ช่องว่าง · พีค ${peakStart}–${peakEnd}`
    : `${gaps} gaps · Peak ${peakStart}–${peakEnd}`;

  return (
    <div
      data-testid="coverage-strip"
      className="grid items-stretch bg-canvas-soft"
      style={{ gridTemplateColumns: GRID_COLS }}
      role="row"
      aria-label={isTh ? 'ความครอบคลุมกะรายชั่วโมง' : 'Hourly shift coverage'}
    >
      {/* Label column */}
      <div className="flex flex-col justify-center gap-1 px-4 py-3.5">
        <span className="font-mono text-[length:var(--text-eyebrow)] font-bold uppercase tracking-[0.14em] text-ink-faint">
          {isTh ? 'ความครอบคลุม' : 'Coverage'}
        </span>
        <span
          data-testid="coverage-summary"
          className="font-display text-sm tracking-tight text-ink-soft"
        >
          {summary}
        </span>
      </div>

      {/* Deficit slot (aligns with the gantt TOTAL column) */}
      <div className="flex items-center gap-1 px-2 py-3.5">
        <span data-testid="coverage-deficit" className="font-mono font-bold text-danger">
          {deficitHrs} {isTh ? 'ชม.' : 'hrs'}
        </span>
      </div>

      {/* 24 coverage cells */}
      <div
        className="grid items-center gap-0.5 border-l border-hairline-soft py-3.5"
        style={{
          gridColumn: `3 / span ${ROSTER_HOURS}`,
          gridTemplateColumns: `repeat(${ROSTER_HOURS}, minmax(0,1fr))`,
        }}
      >
        {coverage.slice(0, ROSTER_HOURS).map((status, hour) => {
          const lbl = COV_LABEL[status];
          return (
            <div
              key={hour}
              data-testid="cov-cell"
              data-status={status}
              title={`${hour.toString().padStart(2, '0')}:00 · ${isTh ? lbl.th : lbl.en}`}
              aria-label={`${hour.toString().padStart(2, '0')}:00 ${isTh ? lbl.th : lbl.en}`}
              className={cn(
                'rounded',
                // off is a thin hairline rule; the rest fill the row height
                status === 'off' ? 'h-1' : 'h-[18px]',
                COV_CELL_CLASS[status],
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
