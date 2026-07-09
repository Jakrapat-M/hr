'use client';

// AttendanceKpiCards — STA-235 (Team Timesheet Draft 2).
// The three attendance summary widgets relocated OFF the Team Timesheet page and
// onto Home (manager view): อัตราเข้างานตรงเวลา (on-time rate) / การสแกนเข้างานสาย
// (late scans) / การขาดงาน–ไม่สแกนนิ้ว (absences + missed scans). Derived from the
// canonical time-domain seeds (schedule + attendance) over the demo period, pinned
// to DEMO_TODAY — never wall-clock. Mockup only, CNEXT tokens, NO-RED (pumpkin).

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { Clock, AlarmClock, UserX, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/cnext';
import { cn } from '@/lib/utils';
import { getAttendanceForPeriod } from '@/lib/time/attendance-seed';
import { classifyClock } from '@/lib/time/clock-state';
import { DEMO_TODAY } from '@/lib/time/period';
import { ALL_PORTED_EMPLOYEES } from '@/lib/all-ported-employees';
import { DEMO_OT_EMPLOYEE } from '@/lib/demo-seed';

export type AttendanceKpis = {
  onTime: number;
  late: number;
  mismatch: number;
  absent: number;
  scheduledDays: number;
  onTimeRatePct: number;
};

/** Aggregate on-time / late / mismatch / absent counts across a cohort's seeds. */
export function computeAttendanceKpis(empIds: string[], cutoffISO: string): AttendanceKpis {
  let onTime = 0;
  let late = 0;
  let mismatch = 0;
  let absent = 0;
  for (const id of empIds) {
    for (const day of getAttendanceForPeriod(id)) {
      const state = classifyClock(day, cutoffISO);
      if (state === 'on-time') onTime += 1;
      else if (state === 'late') late += 1;
      else if (state === 'mismatch') mismatch += 1;
      else if (state === 'absent') absent += 1;
    }
  }
  const scheduledDays = onTime + late + mismatch + absent;
  const onTimeRatePct = scheduledDays > 0 ? Math.round((onTime / scheduledDays) * 100) : 0;
  return { onTime, late, mismatch, absent, scheduledDays, onTimeRatePct };
}

// A stable manager-team cohort: the pinned demo employee + a slice of the pool.
const COHORT_IDS = [DEMO_OT_EMPLOYEE.id, ...ALL_PORTED_EMPLOYEES.slice(0, 24).map((e) => e.id)];

type Tone = 'accent' | 'warning' | 'danger';

const TONE_CLASS: Record<Tone, { icon: string; value: string }> = {
  accent: { icon: 'bg-accent-soft text-accent', value: 'text-accent' },
  warning: { icon: 'bg-warning-soft text-warning', value: 'text-warning' },
  danger: {
    icon: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
    value: 'text-[var(--color-danger)]',
  },
};

function KpiTile({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  testid,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  sub: string;
  testid: string;
}) {
  const c = TONE_CLASS[tone];
  return (
    <Card variant="raised" size="md">
      <div data-testid={testid} className="flex items-start gap-3">
        <span
          className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]', c.icon)}
          aria-hidden
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <div className="text-small font-medium text-ink-muted">{label}</div>
          <div className={cn('mt-1 font-display text-2xl font-semibold tracking-tight', c.value)}>
            {value}
          </div>
          <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>
        </div>
      </div>
    </Card>
  );
}

export function AttendanceKpiCards() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const kpis = useMemo(() => computeAttendanceKpis(COHORT_IDS, DEMO_TODAY), []);
  const missed = kpis.absent + kpis.mismatch;

  return (
    <section aria-label={isTh ? 'สรุปการเข้างานของทีม' : 'Team attendance summary'}>
      <div className="mb-3 font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {isTh ? 'สรุปการเข้างานของทีม' : 'Team attendance summary'}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiTile
          testid="kpi-on-time-rate"
          icon={Clock}
          tone="accent"
          label={isTh ? 'อัตราเข้างานตรงเวลา' : 'On-time rate'}
          value={`${kpis.onTimeRatePct}%`}
          sub={
            isTh
              ? `ตรงเวลา ${kpis.onTime} จาก ${kpis.scheduledDays} วันทำงาน`
              : `${kpis.onTime} of ${kpis.scheduledDays} scheduled days`
          }
        />
        <KpiTile
          testid="kpi-late-scans"
          icon={AlarmClock}
          tone="warning"
          label={isTh ? 'การสแกนเข้างานสาย' : 'Late scans'}
          value={`${kpis.late}`}
          sub={isTh ? 'ครั้งในรอบนี้' : 'this period'}
        />
        <KpiTile
          testid="kpi-absences"
          icon={UserX}
          tone="danger"
          label={isTh ? 'การขาดงาน–ไม่สแกนนิ้ว' : 'Absences · missed scans'}
          value={`${missed}`}
          sub={
            isTh
              ? `ขาด ${kpis.absent} · ไม่ครบ ${kpis.mismatch}`
              : `${kpis.absent} absent · ${kpis.mismatch} incomplete`
          }
        />
      </div>
    </section>
  );
}
