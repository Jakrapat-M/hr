'use client';

// ScheduleTab — month calendar for My Timesheet (STA-195). Calendar-first per the
// BA mock: each cell shows the scheduled shift time + break, with Day Off / Holiday
// badges and a "today" ring. Reuses buildScheduleWeeks + the holiday overlay.

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/cnext';
import { cn } from '@/lib/utils';
import { getAttendanceForPeriod } from '@/lib/time/attendance-seed';
import { getShiftCode } from '@/lib/time/shift-codes';
import { buildScheduleWeeks, WEEKDAY_LABELS_EN, WEEKDAY_LABELS_TH } from '@/lib/time/schedule-calendar';
import { DEMO_TODAY } from '@/lib/time/period';
import { useResultsInputs } from '@/hooks/use-results-inputs';

const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthLabel(iso: string, isTh: boolean): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const m = d.getUTCMonth();
  const y = isTh ? d.getUTCFullYear() + 543 : d.getUTCFullYear();
  return `${isTh ? TH_MONTHS[m] : EN_MONTHS[m]} ${y}`;
}

function adjMonthName(iso: string, delta: number, isTh: boolean): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return isTh ? TH_MONTHS[d.getUTCMonth()] : EN_MONTHS[d.getUTCMonth()];
}

export function ScheduleTab({
  empId,
  isTh,
  period,
}: {
  empId: string;
  isTh: boolean;
  period: { start: string; end: string };
}) {
  const days = useMemo(() => getAttendanceForPeriod(empId), [empId]);
  const weeks = useMemo(() => buildScheduleWeeks(days), [days]);
  const { holidays } = useResultsInputs(empId, period);

  return (
    <div className="space-y-3">
      {/* Month nav (visual only this phase) */}
      <div className="flex items-center justify-between">
        <button type="button" aria-disabled className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-muted">
          <ChevronLeft size={14} aria-hidden />{adjMonthName(period.end, -1, isTh)}
        </button>
        <span className="text-base font-semibold text-ink">{monthLabel(period.end, isTh)}</span>
        <button type="button" aria-disabled className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-muted">
          {adjMonthName(period.end, 1, isTh)}<ChevronRight size={14} aria-hidden />
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 gap-1">
              {(isTh ? WEEKDAY_LABELS_TH : WEEKDAY_LABELS_EN).map((w) => (
                <div key={w} className="px-2 py-1 text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">{w}</div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((d, di) => {
                  if (!d) return <div key={di} className="min-h-[84px] rounded-[var(--radius-sm)]" />;
                  const sc = getShiftCode(d.shiftCode);
                  const dayNum = Number(d.date.slice(8, 10));
                  const holiday = holidays.get(d.date);
                  const isToday = d.date === DEMO_TODAY;
                  return (
                    <div
                      key={d.date}
                      className={cn(
                        'min-h-[84px] rounded-[var(--radius-sm)] border p-1.5 flex flex-col gap-1',
                        isToday
                          ? 'border-[var(--color-accent-alt)] border-[1.5px] bg-[var(--color-accent-alt-soft)]/20'
                          : holiday
                            ? 'border-warning/40 bg-warning-soft/30'
                            : d.dayOff
                              ? 'border-hairline bg-canvas-soft'
                              : 'border-hairline bg-surface',
                      )}
                    >
                      <div className={cn('text-xs font-semibold tabular-nums', isToday ? 'text-[var(--color-accent-alt)]' : holiday ? 'text-warning' : d.dayOff ? 'text-ink-muted' : 'text-ink')}>
                        {dayNum}{isToday && <span className="ml-0.5" aria-label={isTh ? 'วันนี้' : 'today'}>◀</span>}
                      </div>
                      {d.dayOff && (
                        <span className="inline-block w-full rounded-full border border-hairline bg-canvas px-1.5 py-0.5 text-center text-xs font-medium text-ink-muted">{isTh ? 'วันหยุด' : 'Day Off'}</span>
                      )}
                      {holiday && (
                        <span className="inline-block w-full truncate rounded-full border border-warning bg-warning-soft px-1.5 py-0.5 text-center text-xs font-medium text-warning" title={isTh ? holiday.nameTh : holiday.nameEn}>{isTh ? holiday.nameTh : holiday.nameEn}</span>
                      )}
                      {sc && <div className="text-xs font-medium tabular-nums text-ink">{sc.in}–{sc.out}</div>}
                      {sc?.breakStart && <div className="text-xs text-ink-muted tabular-nums">{isTh ? 'พัก' : 'Break'} {sc.breakStart}–{sc.breakEnd}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2.5 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] border border-hairline bg-surface" />{isTh ? 'วันทำงานปกติ' : 'Working day'}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] border border-hairline bg-canvas-soft" />{isTh ? 'วันหยุด' : 'Day Off'}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] border border-warning bg-warning-soft" />{isTh ? 'วันหยุดนักขัตฤกษ์' : 'Holiday'}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] border-[1.5px] border-[var(--color-accent-alt)]" />{isTh ? 'วันนี้' : 'Today'}</span>
      </div>
    </div>
  );
}
