'use client';

// SummaryTab — period roll-up for My Timesheet (STA-195): 4 stat cards + client
// filter chips (all/late/ot/leave) + a per-day table. All derived from the live
// attendance seed + leave overlay (periodLateSummary / workedHours / plan hours).

import { useMemo, useState } from 'react';
import { Card } from '@/components/humi';
import { cn } from '@/lib/utils';
import { getAttendanceForPeriod, ecPlanHoursFor } from '@/lib/time/attendance-seed';
import { lateMinutesFor, periodLateSummary } from '@/lib/time/attendance-math';
import { workedHours } from '@/lib/time/results-math';
import { getShiftCode } from '@/lib/time/shift-codes';
import { getLeaveType } from '@/lib/time/leave-types';
import { DEMO_TODAY } from '@/lib/time/period';
import { useResultsInputs } from '@/hooks/use-results-inputs';
import { toBase60 } from '@/lib/time/results-display';
import { fmtDayShort } from './format';

type Filter = 'all' | 'late' | 'ot' | 'leave';

type Row = {
  date: string;
  dayOff: boolean;
  isToday: boolean;
  isFuture: boolean;
  schedIn: string | null;
  schedOut: string | null;
  clockIn: string | null;
  clockOut: string | null;
  worked: number;
  lateMin: number;
  ot: number;
  leaveLabel: string | null;
  leaveHours: number;
  hasLate: boolean;
  hasOt: boolean;
  hasLeave: boolean;
};

export function SummaryTab({
  empId,
  isTh,
  period,
}: {
  empId: string;
  isTh: boolean;
  period: { start: string; end: string };
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const days = useMemo(() => getAttendanceForPeriod(empId), [empId]);
  const plan = ecPlanHoursFor(empId);
  const lateSummary = useMemo(() => periodLateSummary(days), [days]);
  const { approvedLeaveByDate } = useResultsInputs(empId, period);

  const rows: Row[] = useMemo(
    () =>
      days.map((d) => {
        const late = lateMinutesFor(d) ?? 0;
        const worked = workedHours(d);
        const ot = worked > 0 ? Math.max(0, Math.round((worked - plan) * 10) / 10) : 0;
        const lv = approvedLeaveByDate.get(d.date);
        const lvDef = lv ? getLeaveType(lv.leaveCode) : undefined;
        return {
          date: d.date,
          dayOff: d.dayOff,
          isToday: d.date === DEMO_TODAY,
          isFuture: d.date > DEMO_TODAY,
          schedIn: d.scheduledIn,
          schedOut: d.scheduledOut,
          clockIn: d.actualIn,
          clockOut: d.actualOut,
          worked,
          lateMin: late,
          ot,
          leaveLabel: lv ? (isTh ? lvDef?.nameTh ?? lv.leaveCode : lvDef?.nameEn ?? lv.leaveCode) : null,
          leaveHours: lv ? Math.round(plan * lv.days * 10) / 10 : 0,
          hasLate: late > 0,
          hasOt: ot > 0,
          hasLeave: !!lv,
        };
      }),
    [days, plan, approvedLeaveByDate, isTh],
  );

  const scheduledDays = rows.filter((r) => !r.dayOff).length;
  const workedDays = rows.filter((r) => r.clockIn).length;
  const leaveDays = rows.reduce((n, r) => n + (r.hasLeave ? 1 : 0), 0);
  const otTotal = Math.round(rows.reduce((n, r) => n + r.ot, 0) * 10) / 10;
  const lateHours = Math.round((lateSummary.totalLateMin / 60) * 100) / 100;

  const visible = rows.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'late') return r.hasLate;
    if (filter === 'ot') return r.hasOt;
    return r.hasLeave;
  });

  const chips: { key: Filter; th: string; en: string }[] = [
    { key: 'all', th: 'ทั้งหมด', en: 'All' },
    { key: 'late', th: 'มีสาย/ขาด', en: 'Late' },
    { key: 'ot', th: 'มี OT', en: 'OT' },
    { key: 'leave', th: 'มีลา', en: 'Leave' },
  ];

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-ink-muted">{isTh ? 'วันทำงาน' : 'Worked days'}</p>
          <p className="mt-1 text-2xl font-bold text-ink tabular-nums">{workedDays} <span className="text-base font-normal text-ink-muted">/ {scheduledDays} {isTh ? 'วัน' : 'd'}</span></p>
          <p className="mt-0.5 text-xs text-ink-muted">{isTh ? `ปกติ ${workedDays - leaveDays} · ลา ${leaveDays}` : `Regular ${workedDays - leaveDays} · Leave ${leaveDays}`}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-muted">{isTh ? 'สาย / ขาด' : 'Late / absent'}</p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', lateHours > 0 ? 'text-danger' : 'text-ink')}>{lateHours.toFixed(2)} <span className="text-base font-normal text-ink-muted">{isTh ? 'ชม.' : 'h'}</span></p>
          <p className="mt-0.5 text-xs text-ink-muted">{isTh ? `สาย ${toBase60(lateHours)} · วัน ${lateSummary.lateDays}` : `Late ${toBase60(lateHours)} · ${lateSummary.lateDays} d`}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-muted">{isTh ? 'OT รวม' : 'Total OT'}</p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', otTotal > 0 ? 'text-accent' : 'text-ink')}>{otTotal.toFixed(1)} <span className="text-base font-normal text-ink-muted">{isTh ? 'ชม.' : 'h'}</span></p>
          <p className="mt-0.5 text-xs text-ink-muted">{isTh ? `แผน/วัน ${plan.toFixed(1)} ชม.` : `Plan/day ${plan.toFixed(1)} h`}</p>
        </Card>
        <Card>
          <p className="text-xs text-ink-muted">{isTh ? 'ลา' : 'Leave'}</p>
          <p className="mt-1 text-2xl font-bold text-ink tabular-nums">{leaveDays} <span className="text-base font-normal text-ink-muted">{isTh ? 'วัน' : 'd'}</span></p>
          <p className="mt-0.5 text-xs text-ink-muted">{isTh ? 'ที่อนุมัติแล้ว' : 'Approved'}</p>
        </Card>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-ink-muted">{isTh ? 'แสดงเฉพาะ:' : 'Show only:'}</span>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={filter === c.key}
            onClick={() => setFilter(c.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === c.key ? 'border-accent bg-accent text-white' : 'border-hairline bg-surface text-ink-muted hover:text-ink',
            )}
          >
            {isTh ? c.th : c.en}
          </button>
        ))}
      </div>

      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-muted">
                <th className="px-3 py-2.5 font-semibold">{isTh ? 'วันที่' : 'Date'}</th>
                <th className="px-3 py-2.5 text-center font-semibold">{isTh ? 'เข้ากะ' : 'Shift in'}</th>
                <th className="px-3 py-2.5 text-center font-semibold">{isTh ? 'ออกกะ' : 'Shift out'}</th>
                <th className="px-3 py-2.5 text-center font-semibold">Clock In</th>
                <th className="px-3 py-2.5 text-center font-semibold">Clock Out</th>
                <th className="px-3 py-2.5 text-right font-semibold">{isTh ? 'ชม.ทำงาน' : 'Worked'}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{isTh ? 'สาย/ขาด' : 'Late'}</th>
                <th className="px-3 py-2.5 text-right font-semibold">OT</th>
                <th className="px-3 py-2.5 text-right font-semibold">{isTh ? 'ลา' : 'Leave'}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.date}
                  className={cn(
                    'border-b border-hairline last:border-0',
                    r.dayOff && 'bg-canvas-soft',
                    r.hasLeave && 'bg-[var(--color-accent-alt-soft)]/20',
                  )}
                >
                  <td className={cn('px-3 py-2.5 font-medium', r.isToday ? 'text-[var(--color-accent-alt)]' : r.dayOff ? 'text-ink-muted' : 'text-ink')}>
                    {fmtDayShort(r.date, isTh)}{r.isToday && ' ◀'}
                    {r.dayOff && <div className="text-xs font-normal text-ink-muted">{isTh ? 'วันหยุด' : 'Day Off'}</div>}
                  </td>
                  {r.isToday ? (
                    <td colSpan={8} className="px-3 py-2.5 text-center text-sm italic text-ink-faint">{isTh ? 'รอข้อมูล...' : 'Pending...'}</td>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 text-center tabular-nums text-ink-muted">{r.schedIn ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-ink-muted">{r.schedOut ?? '—'}</td>
                      <td className={cn('px-3 py-2.5 text-center tabular-nums', r.hasLate ? 'text-danger font-medium' : 'text-ink')}>{r.clockIn ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-ink">{r.clockOut ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink">{r.worked > 0 ? toBase60(r.worked) : '—'}</td>
                      <td className="px-3 py-2.5 text-right">{r.hasLate ? <span className="rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">{toBase60(r.lateMin / 60)}</span> : <span className="text-ink-faint">—</span>}</td>
                      <td className="px-3 py-2.5 text-right">{r.hasOt ? <span className="rounded-full border border-accent bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{toBase60(r.ot)}</span> : <span className="text-ink-faint">—</span>}</td>
                      <td className="px-3 py-2.5 text-right">{r.hasLeave ? <span className="rounded-full border border-[var(--color-accent-alt)] bg-[var(--color-accent-alt-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent-alt)]">{r.leaveLabel} {toBase60(r.leaveHours)}</span> : <span className="text-ink-faint">—</span>}</td>
                    </>
                  )}
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-ink-muted">{isTh ? 'ไม่มีรายการตามตัวกรอง' : 'No rows match this filter'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
