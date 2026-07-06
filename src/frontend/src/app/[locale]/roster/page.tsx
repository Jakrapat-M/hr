// Team Timesheet (STA-126) — DEFAULT /roster view is a weekly employees × 7-day
// matrix (Mon→Sun, BE dates) where each day cell stacks color-coded chips:
// Shift (planned) / Clock (actual + state) / OT / Day Off / Holiday. Derived from
// the canonical time-domain seeds (schedule-template + attendance-seed + OT store
// + HUMI_TH_HOLIDAYS), keyed on the empId namespace.
//
// The original 24h hourly Gantt (shift edit / swap / bulk / CSV) is KEPT IN-TREE
// and GATED behind ?view=hourly — reachable via a visible toggle. The swap modal
// stays TOP-LEVEL so ?panel=swap deep-links work regardless of view.
//
// MOCKUP ONLY: read-only chips this phase; all hourly actions resolve to a toast.

'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarRange, Download, Plus, ChevronLeft, ChevronRight, LayoutGrid, Clock } from 'lucide-react';
import { Card, Button, EmptyState } from '@/components/humi';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { ALL_PORTED_EMPLOYEES, EMP_BY_LOGIN } from '@/lib/all-ported-employees';
import { pickRosterScope, scopeRosterRows } from '@/lib/roster-scope';
import { useOvertimeRequests } from '@/stores/overtime-requests';
import { DEMO_OT_EMPLOYEE } from '@/lib/demo-seed';
import {
  weekWindow,
  defaultWeekWindow,
  addWeeks,
  formatWeekRangeBE,
  seededPeriodBounds,
  clampWeekToPeriod,
  weekIntersectsPeriod,
  toIsoDate,
  DEMO_TODAY,
} from '@/lib/time/week';
import {
  WeeklyTimesheetGrid,
  type TimesheetRow,
  type ClockFilter,
  type ShiftEditContext,
} from '@/components/roster/WeeklyTimesheetGrid';
import { TimesheetLegend } from '@/components/roster/TimesheetLegend';
import { RosterGantt } from '@/components/roster/RosterGantt';
import { CoverageStrip } from '@/components/roster/CoverageStrip';
import { ShiftEditorDrawer } from '@/components/roster/ShiftEditorDrawer';
import { ShiftTimeEditModal } from '@/components/roster/ShiftTimeEditModal';
import { ShiftSwapModal } from '@/components/roster/ShiftSwapModal';
import { BulkAssignModal } from '@/components/roster/BulkAssignModal';
import {
  ROSTER_ROWS,
  SHIFT_TYPE_LABELS,
  NOW_HOUR,
  NOW_MINUTE,
  rowTotalHours,
  type RosterRow,
  type RosterShift,
} from '@/data/roster/mock';
import type { HumiEmployee } from '@/lib/humi-mock-data';
import type { AvatarProps } from '@/components/humi/Avatar';

// Legend swatches for the hourly Gantt view (unchanged archetype tokens).
const LEGEND_CLASS: Record<string, string> = {
  manager: 'bg-[var(--color-accent-alt-soft)] border-[var(--color-accent-alt)]',
  partTime: 'bg-warning-soft border-warning',
  night: 'bg-[var(--color-ink)] border-[var(--color-ink)]',
  regular: 'bg-accent-soft border-accent',
};

// HumiEmployee.avatarTone → the Avatar primitive's supported tone set.
const AVATAR_TONES: AvatarProps['tone'][] = ['teal', 'sage', 'butter', 'ink'];
function toAvatarTone(tone: HumiEmployee['avatarTone']): AvatarProps['tone'] {
  return (AVATAR_TONES as string[]).includes(tone) ? (tone as AvatarProps['tone']) : 'teal';
}

function employeeName(e: HumiEmployee, isTh: boolean): string {
  if (isTh) return `${e.firstNameTh} ${e.lastNameTh}`.trim();
  const en = `${e.firstNameEn ?? e.firstNameTh} ${e.lastNameEn ?? e.lastNameTh}`.trim();
  return en || `${e.firstNameTh} ${e.lastNameTh}`.trim();
}

/** Map a scoped HumiEmployee to a TimesheetRow (empId-keyed). */
function toTimesheetRow(e: HumiEmployee, isTh: boolean): TimesheetRow {
  return {
    id: e.id,
    name: employeeName(e, isTh),
    roleTh: e.position,
    roleEn: e.jobTitle ?? e.position,
    department: e.department,
    avatarTone: toAvatarTone(e.avatarTone),
  };
}

// STA-235 Draft 2 — attendance filter reduced to exactly: all / absent / leave / late.
const CLOCK_FILTERS: ClockFilter[] = ['all', 'absent', 'leave', 'late'];

const CLOCK_FILTER_LABEL: Record<ClockFilter, { th: string; en: string }> = {
  all: { th: 'ทั้งหมด', en: 'All' },
  absent: { th: 'ขาด', en: 'Absent' },
  leave: { th: 'ลา', en: 'On leave' },
  late: { th: 'มาสาย', en: 'Late' },
};

export default function RosterPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const searchParams = useSearchParams();
  const isHourly = searchParams?.get('view') === 'hourly';

  // ── Persona scope (P2) — narrow the visible roster to the persona's slice ──
  const roles = useAuthStore((s) => s.roles);
  const email = useAuthStore((s) => s.email);
  const currentEmpId = email ? EMP_BY_LOGIN[email] ?? null : null;
  const otRequests = useOvertimeRequests((s) => s.requests);

  const scope = useMemo(
    () => pickRosterScope(ALL_PORTED_EMPLOYEES, roles, currentEmpId, ROSTER_ROWS.length),
    [roles, currentEmpId],
  );
  const isScoped = scope.mode !== 'all';

  // ── Weekly grid rows (empId namespace) — prepend the canonical OT-seeded demo
  //    employee so an OT chip is demonstrable, then the persona-scoped pool. ──
  const timesheetRows = useMemo<TimesheetRow[]>(() => {
    const pool = scope.employees.length ? [...scope.employees] : [...ALL_PORTED_EMPLOYEES];
    const scoped = pool.slice(0, Math.max(scope.visibleCount, 1)).map((e) => toTimesheetRow(e, isTh));
    const otRow: TimesheetRow = {
      id: DEMO_OT_EMPLOYEE.id,
      name: DEMO_OT_EMPLOYEE.name,
      roleTh: 'พนักงานหน้าร้าน',
      roleEn: 'Store associate',
      department: DEMO_OT_EMPLOYEE.department,
      avatarTone: 'sage',
    };
    return [otRow, ...scoped];
  }, [scope, isTh]);

  // ── Hourly Gantt rows (legacy mock, persona-sliced) ──
  const ganttRows = useMemo(() => scopeRosterRows(ROSTER_ROWS, scope), [scope]);

  // ── Week navigation state — anchored to DEMO_TODAY, clamped to the seed period.
  const periodBounds = useMemo(() => seededPeriodBounds(), []);
  const [week, setWeek] = useState(() => defaultWeekWindow());
  const [clockFilter, setClockFilter] = useState<ClockFilter>('all');

  const weekInPeriod = useMemo(
    () => weekIntersectsPeriod(week, periodBounds),
    [week, periodBounds],
  );

  const goPrev = () =>
    setWeek((w) => clampWeekToPeriod(w, weekWindow(addWeeks(w.start, -1)), periodBounds));
  const goNext = () =>
    setWeek((w) => clampWeekToPeriod(w, weekWindow(addWeeks(w.start, 1)), periodBounds));
  const goToday = () => setWeek(defaultWeekWindow());

  // ── Drawer + modal local state (mockup only) ──
  const [editor, setEditor] = useState<{ shift: RosterShift | null; employee: string } | null>(null);
  // STA-235 — weekly-grid shift-time modal (manager edits shift TIME only).
  const [shiftTimeCtx, setShiftTimeCtx] = useState<ShiftEditContext | null>(null);
  const [swapOpen, setSwapOpen] = useState(() => searchParams?.get('panel') === 'swap');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const panelSwap = searchParams?.get('panel') === 'swap';
  const swapVisible = swapOpen || panelSwap;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleShiftClick = (shift: RosterShift, row: RosterRow) => setEditor({ shift, employee: row.name });
  const handleEditorSave = () => {
    setEditor(null);
    flash(isTh ? 'บันทึกกะแล้ว (ตัวอย่าง)' : 'Shift saved (demo)');
  };
  const handleShiftTimeSave = () => {
    setShiftTimeCtx(null);
    flash(isTh ? 'บันทึกเวลากะแล้ว (ตัวอย่าง)' : 'Shift time saved (demo)');
  };
  const handleSwapSubmit = () => {
    setSwapOpen(false);
    flash(isTh ? 'ส่งคำขอสลับกะแล้ว (ตัวอย่าง)' : 'Swap requested (demo)');
  };
  const handleBulkApply = (ids: string[]) => {
    setBulkOpen(false);
    flash(isTh ? `กำหนดกะให้ ${ids.length} คนแล้ว (ตัวอย่าง)` : `Assigned ${ids.length} employees (demo)`);
  };

  // Hourly CSV export — client-side blob of the visible Gantt roster (no backend).
  const handleExport = () => {
    const header = isTh ? ['พนักงาน', 'รวมชั่วโมง', 'กะ'] : ['Employee', 'Total hours', 'Shifts'];
    const lines = ganttRows.map((r) => {
      const shifts = r.shifts.map((s) => `${s.start}-${s.end}`).join(' / ');
      return [r.name, rowTotalHours(r).toFixed(1), shifts]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(isTh ? `ส่งออกตารางกะ ${ganttRows.length} แถวแล้ว` : `Exported ${ganttRows.length} roster rows`);
  };

  const weekLabel = formatWeekRangeBE(week.start, week.end, isTh ? 'th' : 'en');

  // ── Hourly Gantt header meta (unchanged) ──
  const staffCount = ganttRows.length;
  const totalHrs = useMemo(() => ganttRows.reduce((n, r) => n + rowTotalHours(r), 0), [ganttRows]);
  const nowLabel = `${NOW_HOUR.toString().padStart(2, '0')}:${NOW_MINUTE.toString().padStart(2, '0')}`;
  const headerMeta = isTh
    ? `${staffCount} คน · ${totalHrs.toFixed(1)} ชม. · ตอนนี้ ${nowLabel}`
    : `${staffCount} STAFF · ${totalHrs.toFixed(1)} HRS · NOW ${nowLabel}`;
  const ganttLegend = Object.keys(SHIFT_TYPE_LABELS) as Array<keyof typeof SHIFT_TYPE_LABELS>;

  return (
    <div className="pb-8 flex flex-col gap-6">
      {/* Header — eyebrow + two-tone title + week range */}
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {isTh ? 'HUMI • บริหารทีม • ตารางกะ' : 'HUMI • TEAM MANAGEMENT • TEAM TIMESHEET'}
        </span>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            Team <span className="italic font-medium text-accent">Timesheet</span>
          </h1>
          {/* Hourly-view toggle — the ONLY path to shift edit / swap / bulk now. */}
          <Link
            href={isHourly ? '/roster' : '/roster?view=hourly'}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-small font-medium text-ink-soft transition-colors hover:bg-canvas-soft"
            data-testid="view-toggle"
          >
            {isHourly ? <LayoutGrid size={15} aria-hidden /> : <Clock size={15} aria-hidden />}
            {isHourly
              ? isTh ? 'มุมมองรายสัปดาห์' : 'Weekly view'
              : isTh ? 'มุมมองรายชั่วโมง' : 'Hourly view'}
          </Link>
        </div>
      </header>

      {/* Persona scope banner */}
      {isScoped && (
        <div role="note" className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-4 py-2.5 text-small text-ink-muted">
          {scope.mode === 'bu'
            ? isTh ? `แสดงเฉพาะตารางกะในหน่วยงานของคุณ` : `Showing roster for your business unit only`
            : isTh ? `แสดงเฉพาะตารางกะทีมของคุณ` : `Showing your team's roster only`}
        </div>
      )}

      {/* Transient mockup toast */}
      {toast && (
        <div role="status" className="rounded-[var(--radius-md)] border border-accent bg-accent-soft px-4 py-2.5 text-small font-medium text-accent">
          {toast}
        </div>
      )}

      {isHourly ? (
        // ════════════════ HOURLY GANTT VIEW (gated) ════════════════
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-small text-ink-soft">
              <select aria-label={isTh ? 'แผนก' : 'Department'} className="bg-transparent pr-1 text-small text-ink-soft focus-visible:outline-none" defaultValue="all">
                <option value="all">{isTh ? 'ทุกแผนก' : 'All departments'}</option>
                <option value="foh">FOH</option>
                <option value="boh">BOH</option>
                <option value="floor">{isTh ? 'หน้าร้าน' : 'Floor'}</option>
              </select>
            </label>
            <div className="ml-auto flex flex-wrap gap-3">
              <Button variant="secondary" leadingIcon={<Download size={16} />} onClick={handleExport}>
                {isTh ? 'ส่งออก' : 'Export'}
              </Button>
              <Button variant="primary" leadingIcon={<Plus size={16} />} onClick={() => setBulkOpen(true)}>
                {isTh ? 'กำหนดกะแบบกลุ่ม' : 'Bulk assign'}
              </Button>
            </div>
          </div>

          {ganttRows.length > 0 ? (
            <Card variant="raised" size="lg" flush>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                <h2 className="font-display text-[length:var(--text-display-h3)] font-semibold tracking-tight text-ink">
                  {isTh ? 'ตารางรายชั่วโมง' : 'Hourly schedule'}
                </h2>
                <span className="font-mono text-small uppercase tracking-[0.04em] text-ink-muted">{headerMeta}</span>
              </div>
              <RosterGantt rows={ganttRows} onShiftClick={handleShiftClick} />
              <CoverageStrip />
              <div className="flex flex-wrap items-center gap-4 border-t border-hairline-soft px-5 py-3">
                {ganttLegend.map((t) => (
                  <span key={t} className="inline-flex items-center gap-2 font-mono text-xs text-ink-muted">
                    <span className={cn('inline-block h-2.5 w-4 rounded-sm border', LEGEND_CLASS[t])} aria-hidden />
                    {isTh ? SHIFT_TYPE_LABELS[t].th : SHIFT_TYPE_LABELS[t].en}
                  </span>
                ))}
              </div>
              <div className="border-t border-hairline-soft px-5 py-3">
                <span className="text-small text-ink-muted">{isTh ? 'คลิกที่กะเพื่อแก้ไข' : 'Click a shift to override'}</span>
              </div>
            </Card>
          ) : (
            <EmptyState icon={CalendarRange} titleTh="ยังไม่มีตารางกะ" titleEn="No roster yet" descTh="เพิ่มกะให้พนักงานเพื่อเริ่มจัดตารางกะรายวัน" descEn="Assign shifts to employees to start building the daily roster." />
          )}
        </>
      ) : (
        // ════════════════ WEEKLY TEAM TIMESHEET (default) ════════════════
        <>
          {/* Week nav + filter toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-hairline bg-surface p-1">
              <button type="button" onClick={goPrev} aria-label={isTh ? 'สัปดาห์ก่อน' : 'Previous week'} className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-ink-soft hover:bg-canvas-soft">
                <ChevronLeft size={16} aria-hidden />
              </button>
              <span data-testid="week-range" className="px-2 text-small font-semibold text-ink min-w-[120px] text-center">{weekLabel}</span>
              <button type="button" onClick={goNext} aria-label={isTh ? 'สัปดาห์ถัดไป' : 'Next week'} className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-ink-soft hover:bg-canvas-soft">
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
            <Button variant="secondary" onClick={goToday}>{isTh ? 'วันนี้' : 'Today'}</Button>

            {/* Clock-state filter facet */}
            <label className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-small text-ink-soft">
              <CalendarRange size={15} className="text-ink-muted" aria-hidden />
              <select
                aria-label={isTh ? 'กรองสถานะการตอกบัตร' : 'Filter clock state'}
                className="bg-transparent pr-1 text-small text-ink-soft focus-visible:outline-none"
                value={clockFilter}
                onChange={(e) => setClockFilter(e.target.value as ClockFilter)}
              >
                {CLOCK_FILTERS.map((f) => (
                  <option key={f} value={f}>
                    {isTh ? CLOCK_FILTER_LABEL[f].th : CLOCK_FILTER_LABEL[f].en}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {weekInPeriod ? (
            <Card variant="raised" size="lg" flush>
              <WeeklyTimesheetGrid
                rows={timesheetRows}
                week={week}
                otRequests={otRequests}
                cutoffISO={DEMO_TODAY}
                clockFilter={clockFilter}
                isTh={isTh}
                onEditShift={setShiftTimeCtx}
              />
              <TimesheetLegend isTh={isTh} />
            </Card>
          ) : (
            <EmptyState
              icon={CalendarRange}
              titleTh="ไม่มีข้อมูลสำหรับสัปดาห์นี้"
              titleEn="No data for this week"
              descTh="สัปดาห์ที่เลือกอยู่นอกรอบเวลาที่มีข้อมูล กด “วันนี้” เพื่อกลับไปยังสัปดาห์ปัจจุบัน"
              descEn="The selected week is outside the data period. Press “Today” to return to the current week."
            />
          )}
        </>
      )}

      {/* Shift editor drawer (hourly view) */}
      <ShiftEditorDrawer
        open={editor !== null}
        shift={editor?.shift ?? null}
        employeeName={editor?.employee}
        onClose={() => setEditor(null)}
        onSave={handleEditorSave}
      />

      {/* STA-235 — weekly-grid shift-time edit modal (manager edits shift TIME only) */}
      {shiftTimeCtx && (
        <ShiftTimeEditModal
          key={`${shiftTimeCtx.employeeName}-${shiftTimeCtx.date}`}
          open
          employeeName={shiftTimeCtx.employeeName}
          date={shiftTimeCtx.date}
          scheduledIn={shiftTimeCtx.scheduledIn}
          scheduledOut={shiftTimeCtx.scheduledOut}
          breakStart={shiftTimeCtx.breakStart}
          breakEnd={shiftTimeCtx.breakEnd}
          isTh={isTh}
          onClose={() => setShiftTimeCtx(null)}
          onSave={handleShiftTimeSave}
        />
      )}

      {/* Swap modal — TOP-LEVEL, rendered regardless of view (?panel=swap deep-link) */}
      <ShiftSwapModal open={swapVisible} onClose={() => setSwapOpen(false)} onSubmit={handleSwapSubmit} />

      {/* Bulk assign modal (hourly view) */}
      <BulkAssignModal open={bulkOpen} onClose={() => setBulkOpen(false)} onApply={handleBulkApply} />
    </div>
  );
}
