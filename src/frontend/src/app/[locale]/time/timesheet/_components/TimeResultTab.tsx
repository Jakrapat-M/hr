'use client';

// TimeResultTab — wage-type breakdown for My Timesheet (STA-195). Grouped-by-day
// rows with a mono wage code, coloured pay-code dot, dual base-10 / base-60 hours,
// Days, Amount, and a Total row. Sourced from the dedicated results-breakdown seed
// (the SF-parity codes have no producer in the time-math layer). LATE_DEDUCT
// negatives render pumpkin (danger), never red.

import { useMemo } from 'react';
import { Card } from '@/components/humi';
import { cn } from '@/lib/utils';
import { getResultsBreakdown, type DotKind } from '@/lib/time/results-breakdown-seed';
import { toBase60, resultAmount, resultsTotals } from '@/lib/time/results-display';

const DOT_COLOR: Record<DotKind, string> = {
  work: 'var(--color-info)',
  ot: 'var(--color-accent)',
  late: 'var(--color-warning)',
  leave: 'var(--color-accent-alt)',
  allow: 'var(--color-ink-muted)',
  dayoff: 'var(--color-ink-muted)',
  holiday: 'var(--color-warning)',
};

const TONE_ROW: Record<string, string> = {
  dayoff: 'bg-canvas-soft',
  holiday: 'bg-warning-soft/20',
  leave: 'bg-[var(--color-accent-alt-soft)]/15',
  today: 'bg-[var(--color-accent-alt-soft)]/10',
  normal: '',
};

const LEGEND: { dot: DotKind; th: string; en: string }[] = [
  { dot: 'work', th: 'ทำงานปกติ (REG_EXPORT)', en: 'Regular (REG_EXPORT)' },
  { dot: 'dayoff', th: 'วันหยุด (DAILY_RATE_OFF)', en: 'Day Off / Holiday (DAILY_RATE_OFF)' },
  { dot: 'late', th: 'สาย (LATE / LATE_DEDUCT)', en: 'Late (LATE / LATE_DEDUCT)' },
  { dot: 'leave', th: 'ลา (จ่ายเงิน)', en: 'Leave (paid)' },
  { dot: 'ot', th: 'OT (OT_10 / OT_15 / OT_30)', en: 'OT (OT_10 / OT_15 / OT_30)' },
  { dot: 'allow', th: 'เบี้ยเลี้ยง (SHIFT_PREMIUM / MEAL)', en: 'Allowance (SHIFT_PREMIUM / MEAL)' },
];

export function TimeResultTab({ empId, isTh }: { empId: string; isTh: boolean }) {
  const rows = useMemo(() => getResultsBreakdown(empId), [empId]);
  const totals = useMemo(() => resultsTotals(rows), [rows]);

  return (
    <div className="space-y-3">
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-muted">
                <th rowSpan={2} className="px-3 py-2.5 align-bottom font-semibold">{isTh ? 'วันที่' : 'Date'}</th>
                <th rowSpan={2} className="px-3 py-2.5 align-bottom font-semibold">Wage Type</th>
                <th rowSpan={2} className="px-3 py-2.5 align-bottom font-semibold">Pay Code</th>
                <th colSpan={2} className="border-l border-hairline px-3 pt-2.5 text-center font-semibold">{isTh ? 'ชั่วโมง' : 'Hours'}</th>
                <th rowSpan={2} className="px-3 py-2.5 text-right align-bottom font-semibold">Days</th>
                <th rowSpan={2} className="px-3 py-2.5 text-right align-bottom font-semibold">Amount</th>
              </tr>
              <tr className="border-b border-hairline text-left text-ink-muted">
                <th className="border-l border-hairline px-3 pb-2.5 text-right text-xs font-medium">{isTh ? 'ฐาน 10' : 'Decimal'}</th>
                <th className="px-3 pb-2.5 text-right text-xs font-medium">{isTh ? 'ฐาน 60' : 'HH:mm'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.date}-${i}`}
                  className={cn(
                    'text-ink',
                    TONE_ROW[r.tone] ?? '',
                    r.dayFirst ? 'border-t border-hairline' : '',
                    i === 0 ? 'border-t-0' : '',
                  )}
                >
                  <td className={cn('whitespace-nowrap px-3 py-2 align-top text-xs font-semibold', r.tone === 'today' ? 'text-[var(--color-accent-alt)]' : 'text-ink')}>
                    {r.dayFirst ? (
                      <>
                        {isTh ? r.dateLabelTh : r.dateLabelEn}{r.tone === 'today' && ' ◀'}
                        <div className="text-xs font-normal text-ink-muted">{isTh ? r.dateSubTh : r.dateSubEn}</div>
                      </>
                    ) : null}
                  </td>
                  {r.pending ? (
                    <td colSpan={5} className="px-3 py-3 text-xs italic text-ink-faint">{isTh ? 'รอผลการคำนวณ...' : 'Awaiting calculation...'}</td>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-mono text-xs font-bold text-ink">{r.wageCode}</td>
                      <td className="px-3 py-2 text-xs text-ink">
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: DOT_COLOR[r.dot] }} />
                        <span className={cn('align-middle', r.payKind === 'late_deduct' && 'text-danger')}>{r.payCode}</span>
                      </td>
                      <td className={cn('border-l border-hairline px-3 py-2 text-right font-mono text-xs tabular-nums', r.hours == null ? 'text-ink-faint' : r.hours < 0 ? 'text-danger' : 'text-ink')}>
                        {r.hours == null ? '—' : r.hours.toFixed(2)}
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono text-xs tabular-nums', r.hours == null ? 'text-ink-faint' : r.hours < 0 ? 'text-danger' : 'text-ink')}>
                        {r.hours == null ? '—' : toBase60(r.hours)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ink">{r.days}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ink">{resultAmount(r).toFixed(2)}</td>
                    </>
                  )}
                </tr>
              ))}
              {/* Total */}
              <tr className="border-t border-hairline bg-canvas-soft font-semibold text-ink">
                <td colSpan={3} className="px-3 py-2.5 text-xs">Total</td>
                <td className="border-l border-hairline px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                  {totals.base10.toFixed(2)}
                  <div className="text-xs font-normal text-ink-muted">(+{totals.positive.toFixed(2)} / -{totals.negative.toFixed(2)})</div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                  {totals.base60}
                  <div className="text-xs font-normal text-ink-muted">(+{toBase60(totals.positive)} / -{toBase60(totals.negative)})</div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{totals.days}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-accent">{totals.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
        {LEGEND.map((l) => (
          <span key={l.dot} className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: DOT_COLOR[l.dot] }} />
            {isTh ? l.th : l.en}
          </span>
        ))}
        <span className="text-danger">— {isTh ? 'สีส้ม = หักออก (LATE_DEDUCT)' : 'Pumpkin = deduction (LATE_DEDUCT)'}</span>
      </div>
    </div>
  );
}
