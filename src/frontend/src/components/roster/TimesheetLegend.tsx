'use client';

// TimesheetLegend — STA-126 weekly Team Timesheet.
// One swatch per chip archetype the grid renders, bilingual + token-only (NO-RED).
// Mirrors the existing roster legend pattern (mono caption + tinted swatch).

import { cn } from '@/lib/utils';
import { CHIP_CLASS, type ChipKind } from '@/lib/time/clock-state';

type LegendEntry = { kind: ChipKind; th: string; en: string };

// Order mirrors the design reference's footer legend.
const LEGEND_ENTRIES: LegendEntry[] = [
  { kind: 'shift', th: 'กะ (แผน)', en: 'Shift (plan)' },
  { kind: 'clockOnTime', th: 'ตอก: มาจริง', en: 'Clock: on time' },
  { kind: 'clockLate', th: 'ตอก: สาย', en: 'Clock: late' },
  { kind: 'clockMismatch', th: 'ตอก: ไม่ตรงเวลา', en: 'Clock: mismatch' },
  { kind: 'clockAbsent', th: 'ตอก: ขาดงาน', en: 'Clock: absent' },
  { kind: 'ot', th: 'OT', en: 'OT' },
  { kind: 'dayOff', th: 'วันหยุดประจำ', en: 'Day off' },
  { kind: 'holiday', th: 'วันหยุดนักขัตฤกษ์', en: 'Holiday' },
];

export function TimesheetLegend({ isTh }: { isTh: boolean }) {
  return (
    <div
      data-testid="timesheet-legend"
      className="flex flex-wrap items-center gap-4 border-t border-hairline-soft px-5 py-3"
    >
      {LEGEND_ENTRIES.map((e) => (
        <span
          key={e.kind}
          className="inline-flex items-center gap-2 font-mono text-xs text-ink-muted"
        >
          <span
            className={cn(
              'inline-block h-2.5 w-4 rounded-sm border',
              CHIP_CLASS[e.kind],
            )}
            aria-hidden
          />
          {isTh ? e.th : e.en}
        </span>
      ))}
    </div>
  );
}

export { LEGEND_ENTRIES };
