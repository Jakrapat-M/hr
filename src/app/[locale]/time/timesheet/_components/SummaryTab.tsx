'use client';

// SummaryTab — STA-239 Draft-2 rebuild of the My Timesheet summary:
//   • responsive stat WIDGETS (SummaryWidgets: grid on desktop, carousel on mobile)
//   • per-day table matching the CneXt mock with the Draft-2 renames applied:
//     วันที่ · กะเข้า · กะออก · บันทึกเข้า · บันทึกออก · ชั่วโมงงาน ·
//     สาย (was สายตามสถิติ) · ขาด (was สายแบบหักเงิน) · โอที · ลา
//   • hour cells always decimal X.XX (fmtHours — never X:XX)
//   • rows with multiple clock punches expand (chevron) to list each in/out pair
//   • the header row FREEZES: the table lives in a max-height scroll container
//     with a sticky thead
// All derived from the live attendance seed + leave overlay. Humi tokens only;
// deducted/absent = pumpkin (NO RED).

import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/humi';
import { cn } from '@/lib/utils';
import { getAttendanceForPeriod, ecPlanHoursFor } from '@/lib/time/attendance-seed';
import { lateMinutesFor, periodLateSummary } from '@/lib/time/attendance-math';
import { workedHours } from '@/lib/time/results-math';
import { getLeaveType } from '@/lib/time/leave-types';
import { DEMO_TODAY } from '@/lib/time/period';
import { useResultsInputs } from '@/hooks/use-results-inputs';
import { fmtHours } from '@/lib/time/leave-hours';
import { fmtDayShort } from './format';
import { SummaryWidgets, type SummaryWidgetItem } from './SummaryWidgets';

type Filter = 'all' | 'late' | 'ot' | 'leave';

// สาย (statistical) vs ขาด (deducted): a grace threshold splits the late minutes —
// at/under it the day is only counted statistically; over it the time is deducted.
const LATE_DEDUCT_THRESHOLD_MIN = 15;

type Row = {
  date: string;
  dayOff: boolean;
  isToday: boolean;
  isFuture: boolean;
  schedIn: string | null;
  schedOut: string | null;
  clockIn: string | null;
  clockOut: string | null;
  punchPairs?: { in: string; out: string | null }[];
  worked: number;
  lateStatHrs: number; // สาย — statistical late, hours
  deductHrs: number; // ขาด — deducted late / absence, hours
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
  isCurrentPeriod = true,
}: {
  empId: string;
  isTh: boolean;
  period: { start: string; end: string };
  /** Only the current demo period carries seeded attendance (mock phase). */
  isCurrentPeriod?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const days = useMemo(
    () => (isCurrentPeriod ? getAttendanceForPeriod(empId) : []),
    [empId, isCurrentPeriod],
  );
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
        const isFuture = d.date > DEMO_TODAY;
        // Absent = past working day with no punch and no approved leave → the
        // whole planned day lands in ขาด.
        const absent = !d.dayOff && !isFuture && d.date !== DEMO_TODAY && !d.actualIn && !lv;
        const lateStat = late <= LATE_DEDUCT_THRESHOLD_MIN ? late : 0;
        const lateDeduct = late > LATE_DEDUCT_THRESHOLD_MIN ? late : 0;
        return {
          date: d.date,
          dayOff: d.dayOff,
          isToday: d.date === DEMO_TODAY,
          isFuture,
          schedIn: d.scheduledIn,
          schedOut: d.scheduledOut,
          clockIn: d.actualIn,
          clockOut: d.actualOut,
          punchPairs: d.punchPairs,
          worked,
          lateStatHrs: Math.round((lateStat / 60) * 100) / 100,
          deductHrs: Math.round((lateDeduct / 60 + (absent ? plan : 0)) * 100) / 100,
          ot,
          leaveLabel: lv ? (isTh ? lvDef?.nameTh ?? lv.leaveCode : lvDef?.nameEn ?? lv.leaveCode) : null,
          leaveHours: lv ? Math.round(plan * lv.days * 100) / 100 : 0,
          hasLate: late > 0 || absent,
          hasOt: ot > 0,
          hasLeave: !!lv,
        };
      }),
    [days, plan, approvedLeaveByDate, isTh],
  );

  const scheduledDays = rows.filter((r) => !r.dayOff).length;
  const workedDays = rows.filter((r) => r.clockIn).length;
  const leaveDays = rows.reduce((n, r) => n + (r.hasLeave ? 1 : 0), 0);
  const otTotal = Math.round(rows.reduce((n, r) => n + r.ot, 0) * 100) / 100;
  const lateHours = Math.round((lateSummary.totalLateMin / 60) * 100) / 100;

  const visible = rows.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'late') return r.hasLate;
    if (filter === 'ot') return r.hasOt;
    return r.hasLeave;
  });

  function toggleExpand(date: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const widgets: SummaryWidgetItem[] = [
    {
      key: 'worked',
      label: isTh ? 'วันทำงาน' : 'Worked days',
      value: `${workedDays}`,
      unit: `/ ${scheduledDays} ${isTh ? 'วัน' : 'd'}`,
      sub: isTh ? `ปกติ ${workedDays - leaveDays} · ลา ${leaveDays}` : `Regular ${workedDays - leaveDays} · Leave ${leaveDays}`,
    },
    {
      key: 'late',
      label: isTh ? 'สาย / ขาด' : 'Late / absent',
      value: fmtHours(lateHours),
      unit: isTh ? 'ชม.' : 'h',
      sub: isTh ? `${lateSummary.lateDays} วันที่สาย` : `${lateSummary.lateDays} late day(s)`,
      tone: lateHours > 0 ? 'danger' : 'default',
    },
    {
      key: 'ot',
      label: isTh ? 'OT รวม' : 'Total OT',
      value: fmtHours(otTotal),
      unit: isTh ? 'ชม.' : 'h',
      sub: isTh ? `แผน/วัน ${fmtHours(plan)} ชม.` : `Plan/day ${fmtHours(plan)} h`,
      tone: otTotal > 0 ? 'accent' : 'default',
    },
    {
      key: 'leave',
      label: isTh ? 'ลา' : 'Leave',
      value: `${leaveDays}`,
      unit: isTh ? 'วัน' : 'd',
      sub: isTh ? 'ที่อนุมัติแล้ว' : 'Approved',
    },
  ];

  const chips: { key: Filter; th: string; en: string }[] = [
    { key: 'all', th: 'ทั้งหมด', en: 'All' },
    { key: 'late', th: 'มีสาย/ขาด', en: 'Late' },
    { key: 'ot', th: 'มี OT', en: 'OT' },
    { key: 'leave', th: 'มีลา', en: 'Leave' },
  ];

  const pill = (cls: string, text: string) => (
    <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums', cls)}>{text}</span>
  );

  return (
    <div className="space-y-4">
      {/* Responsive stat widgets (STA-239 ticket 2) */}
      <SummaryWidgets items={widgets} />

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
        {/* Sticky-header scroll container (STA-239 ticket 3.5): rows slide under
            the frozen thead inside this max-height scroller. */}
        <div className="max-h-[560px] overflow-y-auto overflow-x-auto" data-testid="summary-table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted">
                <th className="sticky top-0 z-[1] border-b border-hairline bg-surface px-3 py-2.5 font-semibold">{isTh ? 'วันที่' : 'Date'}</th>
                <th className="sticky top-0 z-[1] border-b border-hairline bg-surface px-3 py-2.5 text-center font-semibold">{isTh ? 'กะเข้า' : 'Shift in'}</th>
                <th className="sticky top-0 z-[1] border-b border-hairline bg-surface px-3 py-2.5 text-center font-semibold">{isTh ? 'กะออก' : 'Shift out'}</th>
                <th className="sticky top-0 z-[1] border-b border-hairline bg-surface px-3 py-2.5 text-center font-semibold">{isTh ? 'บันทึกเข้า' : 'Clock in'}</th>
                <th className="sticky top-0 z-[1] border-b border-hairline bg-surface px-3 py-2.5 text-center font-semibold">{isTh ? 'บันทึกออก' : 'Clock out'}</th>
                <th className="sticky top-0 z-[1] border-b border-hairline bg-surface px-3 py-2.5 text-right font-semibold">{isTh ? 'ชั่วโมงงาน' : 'Worked'}</th>
                <th className="sticky top-0 z-[1] border-b border-hairline bg-surface px-3 py-2.5 text-right font-semibold">{isTh ? 'สาย' : 'Late'}</th>
                <th className="sticky top-0 z-[1] border-b border-hairline bg-surface px-3 py-2.5 text-right font-semibold">{isTh ? 'ขาด' : 'Absent'}</th>
                <th className="sticky top-0 z-[1] border-b border-hairline bg-surface px-3 py-2.5 text-right font-semibold">{isTh ? 'โอที' : 'OT'}</th>
                <th className="sticky top-0 z-[1] border-b border-hairline bg-surface px-3 py-2.5 text-right font-semibold">{isTh ? 'ลา' : 'Leave'}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const expandable = (r.punchPairs?.length ?? 0) > 1;
                const isOpen = expanded.has(r.date);
                return (
                  <Fragment key={r.date}>
                    <tr
                      className={cn(
                        'border-b border-hairline last:border-0',
                        r.dayOff && 'bg-canvas-soft',
                        r.hasLeave && 'bg-[var(--color-accent-alt-soft)]/20',
                      )}
                    >
                      <td className={cn('px-3 py-2.5 font-medium', r.isToday ? 'text-[var(--color-accent-alt)]' : r.dayOff ? 'text-ink-muted' : 'text-ink')}>
                        <span className="inline-flex items-center gap-1">
                          {expandable && (
                            <button
                              type="button"
                              data-testid={`expand-${r.date}`}
                              aria-expanded={isOpen}
                              aria-label={isTh ? `ดูรายการลงเวลา ${r.date}` : `Show punches for ${r.date}`}
                              onClick={() => toggleExpand(r.date)}
                              className="-ml-1 rounded p-0.5 text-ink-muted transition hover:bg-canvas-soft hover:text-ink"
                            >
                              {isOpen ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                            </button>
                          )}
                          {fmtDayShort(r.date, isTh)}{r.isToday && ' ◀'}
                        </span>
                        {r.dayOff && <div className="text-xs font-normal text-ink-muted">{isTh ? 'วันหยุดประจำสัปดาห์' : 'Weekly day off'}</div>}
                      </td>
                      {r.isToday ? (
                        <td colSpan={9} className="px-3 py-2.5 text-center text-sm italic text-ink-faint">{isTh ? 'รอข้อมูล...' : 'Pending...'}</td>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-center tabular-nums text-ink-muted">{r.schedIn ?? '—'}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-ink-muted">{r.schedOut ?? '—'}</td>
                          <td className={cn('px-3 py-2.5 text-center tabular-nums', r.hasLate ? 'font-medium text-danger' : 'text-ink')}>{r.clockIn ?? '—'}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-ink">{r.clockOut ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-ink">{r.worked > 0 ? fmtHours(r.worked) : '—'}</td>
                          <td className="px-3 py-2.5 text-right">
                            {r.lateStatHrs > 0
                              ? pill('border-[var(--color-accent-alt)] bg-[var(--color-accent-alt-soft)] text-[var(--color-accent-alt)]', `${fmtHours(r.lateStatHrs)} ${isTh ? 'ชม.' : 'h'}`)
                              : <span className="text-ink-faint">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {r.deductHrs > 0
                              ? pill('border-danger bg-danger-soft text-danger', `${fmtHours(r.deductHrs)} ${isTh ? 'ชม.' : 'h'}`)
                              : <span className="text-ink-faint">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {r.hasOt
                              ? pill('border-accent bg-accent-soft text-accent', `${fmtHours(r.ot)} ${isTh ? 'ชม.' : 'h'}`)
                              : <span className="text-ink-faint">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {r.hasLeave
                              ? pill('border-[var(--color-accent-alt)] bg-[var(--color-accent-alt-soft)] text-[var(--color-accent-alt)]', `${r.leaveLabel} ${fmtHours(r.leaveHours)} ${isTh ? 'ชม.' : 'h'}`)
                              : <span className="text-ink-faint">—</span>}
                          </td>
                        </>
                      )}
                    </tr>
                    {/* Expanded multi-punch detail (STA-239 ticket 3.4) */}
                    {expandable && isOpen && (
                      <tr className="border-b border-hairline bg-canvas-soft/60" data-testid={`punches-${r.date}`}>
                        <td colSpan={10} className="px-4 py-2.5">
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                            {isTh ? 'รายการลงเวลาของวันนี้' : 'Punches this day'}
                          </p>
                          <ul className="flex flex-col gap-1">
                            {r.punchPairs!.map((p, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm tabular-nums text-ink">
                                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{isTh ? 'เข้า' : 'IN'}</span>
                                {p.in}
                                <span className="text-ink-faint">→</span>
                                <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-xs font-medium text-ink-muted">{isTh ? 'ออก' : 'OUT'}</span>
                                {p.out ?? '—'}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-ink-muted">{isTh ? 'ไม่มีข้อมูลในรอบนี้' : 'No data for this period'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
