// RosterGantt — employee rows × 24 hour columns, with a TOTAL column.
// Faithful to roster-ref-2026-05-25.png:
//   grid = [240px employee][76px total][repeat(24,1fr) hours]
//   shift cell shows the TIME RANGE (left, mono) + DURATION (right, dimmed);
//   shift TYPE is conveyed by COLOR only (no type-name text).
//   break window = diagonal-hatch overlay; NOW = thin pumpkin vertical line.
// Tokens only: NO hardcoded hex, NO Tailwind red/rose/pink (danger = pumpkin),
// text sizes via the Tailwind scale (Humi R4 contract — no arbitrary px text).

'use client';

import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  ROSTER_HOURS,
  NOW_HOUR,
  NOW_MINUTE,
  AVATAR_BG,
  rowTotalHours,
  shiftHours,
  type RosterRow,
  type RosterShift,
  type ShiftType,
} from '@/data/roster/mock';

// Shift archetype -> tokenized class set (AC1.2 / AC1.8 mapping):
//   manager  indigo -> accent-alt-soft bg + accent-alt border
//   partTime amber  -> warning-soft bg + warning border  (NEVER bg-warning-tint)
//   night    navy   -> ink bg + LIGHT canvas-soft text (NOT text-ink)
//   regular  teal   -> accent-soft bg + accent text + accent border
export const SHIFT_TYPE_CLASS: Record<ShiftType, string> = {
  manager:
    'bg-[var(--color-accent-alt-soft)] border-[var(--color-accent-alt)] text-ink',
  partTime: 'bg-warning-soft border-warning text-ink',
  night: 'bg-[var(--color-ink)] text-[var(--color-canvas-soft)] border-[var(--color-ink)]',
  regular: 'bg-accent-soft text-accent border-accent',
};

const GRID_COLS = `240px 76px repeat(${ROSTER_HOURS}, minmax(0,1fr))`;

function pct(hour: number): number {
  return (hour / ROSTER_HOURS) * 100;
}

function fmtHour(h: number): string {
  return `${Math.floor(h).toString().padStart(2, '0')}:00`;
}

function fmtHours(n: number): string {
  return `${n.toFixed(1)}h`;
}

export interface RosterGanttProps {
  rows: RosterRow[];
  onShiftClick?: (shift: RosterShift, row: RosterRow) => void;
}

export function RosterGantt({ rows, onShiftClick }: RosterGanttProps) {
  const locale = useLocale();
  const isTh = locale !== 'en';
  // Hour axis labels 01..24 (ref style), one per column.
  const hourLabels = Array.from({ length: ROSTER_HOURS }, (_, i) => i + 1);
  const nowLeft = ((NOW_HOUR + NOW_MINUTE / 60) / ROSTER_HOURS) * 100;

  return (
    <div data-testid="roster-gantt" className="overflow-x-auto">
      <div className="min-w-[980px]">
        {/* Hour header */}
        <div
          className="grid items-center border-b border-hairline"
          style={{ gridTemplateColumns: GRID_COLS }}
          role="row"
        >
          <div className="px-4 py-2.5 font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            {isTh ? 'พนักงาน' : 'Employee'}
          </div>
          <div className="px-2 py-2.5 font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            {isTh ? 'รวม' : 'Total'}
          </div>
          {hourLabels.map((h) => (
            <div
              key={h}
              data-testid="hour-col"
              className="border-l border-hairline-soft py-2.5 text-center font-mono text-[length:var(--text-eyebrow)] font-semibold text-ink-faint"
            >
              {h.toString().padStart(2, '0')}
            </div>
          ))}
        </div>

        {/* Rows + a single NOW line overlay spanning all rows */}
        <div className="relative">
          {/* NOW line — thin pumpkin vertical marker with a dot at the top */}
          <div
            data-testid="now-line"
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-danger"
            style={{
              // offset into the hours track: 240 + 76 = 316px label columns,
              // then nowLeft% of the remaining width.
              left: `calc(316px + (100% - 316px) * ${nowLeft / 100})`,
            }}
          >
            <span className="absolute -left-[3px] -top-[3px] h-2 w-2 rounded-full bg-danger" />
          </div>

          {rows.map((row) => {
            const total = rowTotalHours(row);
            const under = total < row.targetHours;
            return (
              <div
                key={row.id}
                data-testid="roster-row"
                className="grid items-stretch border-b border-hairline-soft"
                style={{ gridTemplateColumns: GRID_COLS }}
                role="row"
              >
                {/* Employee cell — avatar + name + mono meta line */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className={cn(
                      'inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                      AVATAR_BG[row.id] ?? 'bg-accent',
                    )}
                    aria-hidden
                  >
                    {row.initials}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-base font-semibold leading-tight tracking-tight text-ink">
                      {row.name}
                    </span>
                    <span className="mt-0.5 truncate font-mono text-xs uppercase tracking-[0.02em] text-ink-muted">
                      {row.employmentType} · {isTh ? row.roleTh : row.roleEn} ·{' '}
                      {row.location}
                    </span>
                  </span>
                </div>

                {/* TOTAL cell — pumpkin when under target */}
                <div className="flex items-center px-2 py-3.5">
                  <span
                    data-testid="total-cell"
                    data-under={under ? 'true' : 'false'}
                    className={cn(
                      'font-mono text-sm font-bold tracking-[0.02em]',
                      under ? 'text-danger' : 'text-ink',
                    )}
                  >
                    {fmtHours(total)}
                  </span>
                </div>

                {/* Shift track — spans all 24 hour columns */}
                <div
                  data-testid="shift-track"
                  className="relative min-h-[58px]"
                  style={{ gridColumn: `3 / span ${ROSTER_HOURS}` }}
                >
                  {/* faint hour gridlines */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 grid"
                    style={{ gridTemplateColumns: `repeat(${ROSTER_HOURS}, minmax(0,1fr))` }}
                  >
                    {Array.from({ length: ROSTER_HOURS }, (_, i) => (
                      <span key={i} className="border-l border-hairline-soft first:border-l-0" />
                    ))}
                  </div>

                  {row.shifts.map((s) => {
                    const left = pct(s.start);
                    const width = pct(s.end - s.start);
                    const dur = shiftHours(s);
                    const hasBreak = s.breakStart != null && s.breakEnd != null;
                    // break position relative to the shift cell width
                    const span = s.end - s.start;
                    const brkLeft = hasBreak ? ((s.breakStart! - s.start) / span) * 100 : 0;
                    const brkWidth = hasBreak
                      ? ((s.breakEnd! - s.breakStart!) / span) * 100
                      : 0;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        data-testid="shift-cell"
                        data-shift-type={s.type}
                        onClick={() => onShiftClick?.(s, row)}
                        title={`${fmtHour(s.start)} – ${fmtHour(s.end)} · ${fmtHours(dur)}`}
                        aria-label={`${row.name} ${fmtHour(s.start)}–${fmtHour(s.end)} ${fmtHours(dur)}`}
                        className={cn(
                          'absolute top-[11px] bottom-[11px] z-10 overflow-hidden rounded-[7px] border px-2.5',
                          'flex items-center justify-between font-mono text-xs font-semibold tracking-[0.02em]',
                          'shadow-[var(--shadow-sm)] transition-[filter] hover:brightness-[0.97]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                          SHIFT_TYPE_CLASS[s.type],
                        )}
                        style={{ left: `${left}%`, width: `calc(${width}% - 4px)` }}
                      >
                        {/* break stripe — tokenized diagonal hatch (no hex) */}
                        {hasBreak && (
                          <span
                            data-testid="break-stripe"
                            aria-hidden
                            className="pointer-events-none absolute top-[3px] bottom-[3px] rounded-[4px] [background:repeating-linear-gradient(45deg,color-mix(in_oklab,currentColor_55%,transparent)_0_3px,transparent_3px_6px)]"
                            style={{ left: `${brkLeft}%`, width: `${brkWidth}%` }}
                          />
                        )}
                        <span className="relative z-10 truncate">
                          {fmtHour(s.start)} – {fmtHour(s.end)}
                        </span>
                        <span className="relative z-10 ml-2 shrink-0 font-medium opacity-65">
                          {fmtHours(dur)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
