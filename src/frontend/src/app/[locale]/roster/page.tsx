// Team Timesheet (STA-126, re-issued STA-252) — /roster is a weekly employees ×
// 7-day matrix (Mon→Sun, BE dates) where each day cell stacks color-coded chips:
// Shift (planned) / Clock (actual + state) / OT / Day Off / Holiday. Derived from
// the canonical time-domain seeds (schedule-template + attendance-seed + OT store
// + HUMI_TH_HOLIDAYS), keyed on the empId namespace.
//
// STA-252 N3 — the 24h hourly Gantt (shift edit / swap-panel-only / bulk / CSV)
// has been REMOVED; the weekly grid is the only view now. The swap modal stays
// TOP-LEVEL so the ?panel=swap deep-link keeps working.
//
// MOCKUP ONLY: read-only chips this phase; the shift-time modal resolves to a toast.

'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, EmptyState } from '@/components/humi';
import { useAuthStore } from '@/stores/auth-store';
import { ALL_PORTED_EMPLOYEES, EMP_BY_LOGIN } from '@/lib/all-ported-employees';
import { pickRosterScope } from '@/lib/roster-scope';
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
  DEMO_TODAY,
} from '@/lib/time/week';
import {
  WeeklyTimesheetGrid,
  POSITION_FILTER_ALL,
  positionKey,
  type TimesheetRow,
  type ClockFilter,
  type ShiftEditContext,
} from '@/components/roster/WeeklyTimesheetGrid';
import { TimesheetLegend } from '@/components/roster/TimesheetLegend';
import { ShiftTimeEditModal } from '@/components/roster/ShiftTimeEditModal';
import { ShiftSwapModal } from '@/components/roster/ShiftSwapModal';
import { ROSTER_ROWS } from '@/data/roster/mock';
import type { HumiEmployee } from '@/lib/humi-mock-data';
import type { AvatarProps } from '@/components/humi/Avatar';

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

  // ── STA-252 N2 — distinct ตำแหน่ง options from the scoped rows, keyed on the
  //    stable positionKey (roleTh) so the select filters correctly regardless of
  //    which locale label is shown. ──
  const positionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of timesheetRows) {
      const key = positionKey(row);
      if (!map.has(key)) map.set(key, isTh ? row.roleTh : row.roleEn);
    }
    return Array.from(map, ([key, label]) => ({ key, label })).sort((a, b) =>
      a.label.localeCompare(b.label, isTh ? 'th' : 'en'),
    );
  }, [timesheetRows, isTh]);
  const [positionFilter, setPositionFilter] = useState<string>(POSITION_FILTER_ALL);

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

  // ── Modal local state (mockup only) ──
  // STA-235 — weekly-grid shift-time modal (manager edits shift TIME only).
  const [shiftTimeCtx, setShiftTimeCtx] = useState<ShiftEditContext | null>(null);
  const [swapOpen, setSwapOpen] = useState(() => searchParams?.get('panel') === 'swap');
  const [toast, setToast] = useState<string | null>(null);

  const panelSwap = searchParams?.get('panel') === 'swap';
  const swapVisible = swapOpen || panelSwap;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleShiftTimeSave = () => {
    setShiftTimeCtx(null);
    flash(isTh ? 'บันทึกเวลากะแล้ว (ตัวอย่าง)' : 'Shift time saved (demo)');
  };
  const handleSwapSubmit = () => {
    setSwapOpen(false);
    flash(isTh ? 'ส่งคำขอสลับกะแล้ว (ตัวอย่าง)' : 'Swap requested (demo)');
  };

  const weekLabel = formatWeekRangeBE(week.start, week.end, isTh ? 'th' : 'en');

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

        {/* STA-252 N2 — ตำแหน่ง (position) filter facet */}
        <label className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-hairline bg-surface px-3 py-2 text-small text-ink-soft">
          <select
            aria-label={isTh ? 'กรองตำแหน่ง' : 'Filter position'}
            className="bg-transparent pr-1 text-small text-ink-soft focus-visible:outline-none"
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
          >
            <option value={POSITION_FILTER_ALL}>{isTh ? 'ทั้งหมด' : 'All'}</option>
            {positionOptions.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
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
            positionFilter={positionFilter}
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

      {/* Swap modal — TOP-LEVEL (?panel=swap deep-link) */}
      <ShiftSwapModal open={swapVisible} onClose={() => setSwapOpen(false)} onSubmit={handleSwapSubmit} />
    </div>
  );
}
