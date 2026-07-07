'use client';

// TeamOverviewDashboard — STA-245 (Time · Team Overview).
// The full manager attendance dashboard: 5 summary cards (on-time rate / late
// scans / absences + missed scans / OT hours with X1–X3 breakdown / current
// period) plus a PERIOD SWITCHER (this week / last week / this period) that
// re-aggregates every KPI. Numbers are derived from the canonical time-domain
// seeds via lib/time/team-stats, persona-scoped like /roster, and pinned to
// DEMO_TODAY — never wall-clock. Mockup only, HUMI tokens, NO-RED (pumpkin).

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useLocale } from 'next-intl';
import { Clock, AlarmClock, UserX, Timer, CalendarDays, type LucideIcon } from 'lucide-react';
import { Card, EmptyState } from '@/components/humi';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { ALL_PORTED_EMPLOYEES, EMP_BY_LOGIN } from '@/lib/all-ported-employees';
import { pickRosterScope } from '@/lib/roster-scope';
import { ROSTER_ROWS } from '@/data/roster/mock';
import { DEMO_OT_EMPLOYEE } from '@/lib/demo-seed';
import { useOvertimeRequests, type OTRequest } from '@/stores/overtime-requests';
import {
  teamStats,
  OT_MULTIPLIERS,
  type OtMultiplier,
  type TeamStats,
} from '@/lib/time/team-stats';
import {
  defaultWeekWindow,
  weekWindow,
  addWeeks,
  seededPeriodBounds,
  toUtcMidnight,
  formatWeekRangeBE,
  DEMO_TODAY,
  type WeekWindow,
} from '@/lib/time/week';

// SSR-safe client gate: getServerSnapshot → false, getSnapshot → true, so the
// persisted OT store is only read AFTER hydration (server + first client paint
// both see []), avoiding a hydration mismatch without a setState-in-effect.
const EMPTY_OT: readonly OTRequest[] = [];
const subscribeNoop = () => () => {};

type PeriodKey = 'this-week' | 'last-week' | 'this-period';

/** Build a WeekWindow-shaped window spanning an arbitrary [start,end] (used for
 *  the whole-payroll-period preset — teamStats only needs {start,end,days}). */
function spanWindow(start: Date, end: Date): WeekWindow {
  const days: Date[] = [];
  for (const d = new Date(start.getTime()); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(new Date(d.getTime()));
  }
  return { start, end, days };
}

/** Resolve the window for a period preset, clamped to the seeded data period. */
function windowForPeriod(key: PeriodKey): WeekWindow {
  if (key === 'this-period') {
    const b = seededPeriodBounds();
    return spanWindow(b.start, b.end);
  }
  if (key === 'last-week') {
    return weekWindow(addWeeks(toUtcMidnight(DEMO_TODAY), -1));
  }
  return defaultWeekWindow();
}

const PERIOD_LABEL: Record<PeriodKey, { th: string; en: string }> = {
  'this-week': { th: 'สัปดาห์นี้', en: 'This week' },
  'last-week': { th: 'สัปดาห์ก่อน', en: 'Last week' },
  'this-period': { th: 'รอบเดือนนี้', en: 'This period' },
};

const PERIOD_KEYS: PeriodKey[] = ['this-week', 'last-week', 'this-period'];

type Tone = 'accent' | 'warning' | 'danger' | 'indigo';

const TONE_CLASS: Record<Tone, { icon: string; value: string }> = {
  accent: { icon: 'bg-accent-soft text-accent', value: 'text-accent' },
  warning: { icon: 'bg-warning-soft text-warning', value: 'text-warning' },
  danger: {
    icon: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
    value: 'text-[var(--color-danger)]',
  },
  indigo: {
    icon: 'bg-[var(--color-accent-alt-soft)] text-[var(--color-accent-alt)]',
    value: 'text-[var(--color-accent-alt)]',
  },
};

// OT-multiplier chip tokens — NO-RED: x3 uses pumpkin (danger), never red.
const OT_CHIP_CLASS: Record<OtMultiplier, string> = {
  x1: 'bg-canvas-soft text-ink-muted border-hairline',
  'x1.5': 'bg-accent-soft text-accent border-accent',
  x2: 'bg-warning-soft text-warning border-warning',
  x3: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger)]',
};

const OT_CHIP_LABEL: Record<OtMultiplier, string> = {
  x1: 'X1',
  'x1.5': 'X1.5',
  x2: 'X2',
  x3: 'X3',
};

function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  testid,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  sub: string;
  testid: string;
  children?: React.ReactNode;
}) {
  const c = TONE_CLASS[tone];
  return (
    <Card variant="raised" size="md">
      <div data-testid={testid} className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="text-small font-medium text-ink-muted">{label}</div>
          <span
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
              c.icon,
            )}
            aria-hidden
          >
            <Icon size={18} />
          </span>
        </div>
        <div className={cn('font-display text-3xl font-semibold tracking-tight', c.value)}>
          {value}
        </div>
        <div className="text-xs text-ink-muted">{sub}</div>
        {children}
      </div>
    </Card>
  );
}

// ── Card registry ──────────────────────────────────────────────────────────
// Data-driven KPI card list: the grid below maps over this array instead of
// literal JSX, so a future card is one appended config object — no layout or
// markup surgery. `TeamOverviewCardContext` bundles everything a card body
// might need (the aggregated stats, locale flag, and the resolved period
// range label) so the registry can grow without changing this shape.
export type TeamOverviewCardContext = {
  stats: TeamStats;
  isTh: boolean;
  rangeLabel: string;
};

export interface TeamOverviewCard {
  id: string;
  testid: string;
  icon: LucideIcon;
  tone: Tone;
  label: (ctx: TeamOverviewCardContext) => string;
  value: (ctx: TeamOverviewCardContext) => string;
  sub: (ctx: TeamOverviewCardContext) => string;
  body?: (ctx: TeamOverviewCardContext) => React.ReactNode;
}

export const DEFAULT_TEAM_OVERVIEW_CARDS: TeamOverviewCard[] = [
  {
    id: 'on-time-rate',
    testid: 'kpi-on-time-rate',
    icon: Clock,
    tone: 'accent',
    label: ({ isTh }) => (isTh ? 'อัตราเข้างานตรงเวลา' : 'On-time rate'),
    value: ({ stats }) => `${stats.onTimeRatePct}%`,
    sub: ({ stats, isTh }) =>
      isTh
        ? `คำนวณจากทุกกะที่ตอกเข้า (${stats.onTime}/${stats.scheduledDays})`
        : `${stats.onTime} of ${stats.scheduledDays} scheduled shifts`,
  },
  {
    id: 'late-scans',
    testid: 'kpi-late-scans',
    icon: AlarmClock,
    tone: 'warning',
    label: ({ isTh }) => (isTh ? 'การสแกนเข้างานสาย' : 'Late scans'),
    value: ({ stats, isTh }) => (isTh ? `${stats.late} ครั้ง` : `${stats.late}`),
    sub: ({ isTh }) => (isTh ? 'ต้องการการตรวจสอบการตอก' : 'need punch review'),
  },
  {
    id: 'absences',
    testid: 'kpi-absences',
    icon: UserX,
    tone: 'danger',
    label: ({ isTh }) => (isTh ? 'การขาดงาน / ไม่แสกนนิ้ว' : 'Absences / missed scans'),
    value: ({ stats, isTh }) => (isTh ? `${stats.missedScans} ครั้ง` : `${stats.missedScans}`),
    sub: ({ stats, isTh }) =>
      isTh
        ? `ขาด ${stats.absent} · ไม่ครบ ${stats.mismatch} — หักค่าจ้างและประเมินผล`
        : `${stats.absent} absent · ${stats.mismatch} incomplete`,
  },
  {
    id: 'ot-hours',
    testid: 'kpi-ot-hours',
    icon: Timer,
    tone: 'indigo',
    label: ({ isTh }) => (isTh ? 'จำนวนชั่วโมงล่วงเวลา OT' : 'Overtime hours'),
    value: ({ stats, isTh }) => (isTh ? `${stats.otHours} ชม.` : `${stats.otHours} h`),
    sub: ({ isTh }) => (isTh ? 'แยกตามอัตราค่าล่วงเวลา' : 'by pay multiplier'),
    body: ({ stats, isTh }) => (
      <div className="flex flex-wrap gap-1.5">
        {OT_MULTIPLIERS.map((m) => (
          <span
            key={m}
            data-testid={`ot-mult-${m}`}
            className={cn(
              'inline-flex min-w-[3.25rem] flex-col items-center rounded-[var(--radius-sm)] border px-2 py-1',
              OT_CHIP_CLASS[m],
            )}
          >
            <span className="text-xs font-semibold uppercase tracking-wide">{OT_CHIP_LABEL[m]}</span>
            <span className="text-xs font-medium">
              {stats.otHoursByMultiplier[m]}
              {isTh ? ' ชม.' : 'h'}
            </span>
          </span>
        ))}
      </div>
    ),
  },
  {
    id: 'current-period',
    testid: 'kpi-current-period',
    icon: CalendarDays,
    tone: 'indigo',
    label: ({ isTh }) => (isTh ? 'ช่วงเวลาที่เลือก' : 'Selected period'),
    value: ({ rangeLabel }) => rangeLabel,
    sub: ({ stats, isTh }) =>
      isTh
        ? `มีวันหยุดนักขัตฤกษ์ ${stats.holidayCount} วัน · ลา ${stats.leaveCount} รายการ`
        : `${stats.holidayCount} public holiday(s) · ${stats.leaveCount} on leave`,
    body: ({ stats, isTh }) =>
      stats.holidayCount > 0 ? (
        <div className="text-xs font-medium text-[var(--color-danger)]">
          {isTh ? 'อัตราเงินพิเศษวันหยุด ×3' : 'Holiday premium ×3'}
        </div>
      ) : null,
  },
];

export function TeamOverviewDashboard({
  empIds: empIdsProp,
  cards = DEFAULT_TEAM_OVERVIEW_CARDS,
}: { empIds?: string[]; cards?: TeamOverviewCard[] } = {}) {
  const locale = useLocale();
  const isTh = locale !== 'en';

  // ── Persona scope (mirrors /roster) — narrow the cohort to the manager's slice.
  const roles = useAuthStore((s) => s.roles);
  const email = useAuthStore((s) => s.email);
  const currentEmpId = email ? EMP_BY_LOGIN[email] ?? null : null;
  const scope = useMemo(
    () => pickRosterScope(ALL_PORTED_EMPLOYEES, roles, currentEmpId, ROSTER_ROWS.length),
    [roles, currentEmpId],
  );
  const scopedIds = useMemo(() => {
    const pool = scope.employees.length ? [...scope.employees] : [...ALL_PORTED_EMPLOYEES];
    const scoped = pool.slice(0, Math.max(scope.visibleCount, 1)).map((e) => e.id);
    // Prepend the canonical OT-seeded demo employee so an OT figure is demonstrable.
    return Array.from(new Set([DEMO_OT_EMPLOYEE.id, ...scoped]));
  }, [scope]);
  const empIds = empIdsProp ?? scopedIds;

  // ── Period switcher state ──
  const [periodKey, setPeriodKey] = useState<PeriodKey>('this-week');
  const periodWindow = useMemo(() => windowForPeriod(periodKey), [periodKey]);

  // ── OT is store-backed (persisted); read it only after hydration so the SSR /
  //    first client paint (empty store) and the hydrated render agree.
  const storeOt = useOvertimeRequests((s) => s.requests);
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const stats = useMemo(
    () => teamStats(periodWindow, empIds, hydrated ? storeOt : EMPTY_OT),
    [periodWindow, empIds, hydrated, storeOt],
  );

  const rangeLabel = formatWeekRangeBE(periodWindow.start, periodWindow.end, isTh ? 'th' : 'en');

  if (empIds.length === 0) {
    return (
      <EmptyState
        icon={UserX}
        titleTh="ยังไม่มีสมาชิกในทีม"
        titleEn="No team members yet"
        descTh="เมื่อมีพนักงานในทีมของคุณ สรุปการเข้างานจะแสดงที่นี่"
        descEn="Once your team has members, their attendance summary appears here."
      />
    );
  }

  return (
    <section
      data-testid="team-overview-dashboard"
      aria-label={isTh ? 'ภาพรวมทีม' : 'Team overview'}
      className="flex flex-col gap-5"
    >
      {/* Period switcher */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={isTh ? 'เลือกช่วงเวลา' : 'Select period'}
      >
        {PERIOD_KEYS.map((key) => {
          const active = key === periodKey;
          return (
            <button
              key={key}
              type="button"
              data-testid={`period-${key}`}
              aria-pressed={active}
              onClick={() => setPeriodKey(key)}
              className={cn(
                'rounded-[var(--radius-md)] border px-3 py-1.5 text-small font-medium transition-colors',
                active
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-hairline bg-surface text-ink-soft hover:bg-canvas-soft',
              )}
            >
              {isTh ? PERIOD_LABEL[key].th : PERIOD_LABEL[key].en}
            </button>
          );
        })}
        <span className="ml-1 inline-flex items-center gap-1.5 text-small text-ink-muted">
          <CalendarDays size={14} aria-hidden />
          <span data-testid="period-range">{rangeLabel}</span>
        </span>
      </div>

      {/* Summary cards — registry-driven, see DEFAULT_TEAM_OVERVIEW_CARDS above. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const ctx: TeamOverviewCardContext = { stats, isTh, rangeLabel };
          return (
            <KpiCard
              key={card.id}
              testid={card.testid}
              icon={card.icon}
              tone={card.tone}
              label={card.label(ctx)}
              value={card.value(ctx)}
              sub={card.sub(ctx)}
            >
              {card.body?.(ctx)}
            </KpiCard>
          );
        })}
      </div>

      {/* Persona scope note (only when the cohort is narrowed and no explicit override) */}
      {!empIdsProp && scope.mode !== 'all' && (
        <div
          role="note"
          className="rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-4 py-2.5 text-small text-ink-muted"
        >
          {scope.mode === 'bu'
            ? isTh
              ? 'แสดงเฉพาะสมาชิกในหน่วยงานของคุณ'
              : 'Showing your business unit only'
            : isTh
              ? 'แสดงเฉพาะสมาชิกในทีมของคุณ'
              : 'Showing your team only'}
        </div>
      )}
    </section>
  );
}
