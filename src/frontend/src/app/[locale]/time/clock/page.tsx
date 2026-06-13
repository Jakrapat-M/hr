'use client';

// /time/clock — mobile-first clock-in/out widget. A big tap target records an
// IN then an OUT punch for today (clock-punches store), with a live clock and
// today's punch list. Mockup: no backend / geofence. Humi tokens; success =
// teal, no red. Non-clocking employees see a gate (they have no punches).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, Clock, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/humi';
import { useAuthStore } from '@/stores/auth-store';
import { resolveCurrentEmpId } from '@/lib/scope-filter';
import { getEmployeeTimeAttrs } from '@/lib/time/employee-time-attrs';
import {
  useClockPunches,
  punchesForDay,
  nextPunchType,
  localDateKey,
} from '@/stores/clock-punches';

function fmtClock(d: Date, isTh: boolean): string {
  return d.toLocaleTimeString(isTh ? 'th-TH' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmtToday(d: Date, isTh: boolean): string {
  return d.toLocaleDateString(isTh ? 'th-TH' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtPunchTime(iso: string, isTh: boolean): string {
  return new Date(iso).toLocaleTimeString(isTh ? 'th-TH' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClockInOutPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const isTh = locale === 'th';

  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);
  const empId = resolveCurrentEmpId(email) ?? userId ?? 'EMP001';
  const attrs = getEmployeeTimeAttrs(empId);
  const isClocking = attrs.employeeType === 'clocking';

  const punches = useClockPunches((s) => s.punches);
  const doPunch = useClockPunches((s) => s.punch);

  // Live clock — tick every second. Initialised after mount to avoid an SSR/CSR
  // hydration mismatch on the time string.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const todayKey = now ? localDateKey(now) : '';
  const todayPunches = useMemo(
    () => (todayKey ? punchesForDay(punches, empId, todayKey) : []),
    [punches, empId, todayKey],
  );
  const next = nextPunchType(todayPunches);
  const inPunch = todayPunches.find((p) => p.type === 'in');
  const outPunch = todayPunches.find((p) => p.type === 'out');

  const statusLabel = !inPunch
    ? isTh ? 'ยังไม่ลงเวลาเข้า' : 'Not clocked in yet'
    : !outPunch
      ? isTh ? `เข้างานแล้ว · ${fmtPunchTime(inPunch.at, isTh)}` : `Clocked in · ${fmtPunchTime(inPunch.at, isTh)}`
      : isTh ? 'ลงเวลาครบแล้ววันนี้' : 'All clocked out for today';

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-ink-muted mb-4" aria-label="breadcrumb">
        <Link href={`/${locale}/time`} className="hover:text-ink transition">{isTh ? 'เวลางาน' : 'Time'}</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-ink font-medium">{isTh ? 'ลงเวลาเข้า-ออก' : 'Clock In / Out'}</span>
      </nav>
      <h1 className="sr-only">{isTh ? 'ลงเวลาเข้า-ออกงาน' : 'Clock In / Out'}</h1>

      {!isClocking ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Clock className="text-ink-faint" size={28} aria-hidden />
            <p className="text-body text-ink-muted">
              {isTh ? 'พนักงานประเภทไม่ต้องลงเวลา — ไม่ต้องลงเวลาเข้า-ออก' : 'Non-clocking employee — no clock-in needed.'}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col items-center gap-5 p-6 text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                {isTh ? 'ลงเวลาเข้า-ออกงาน' : 'Clock In / Out'}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{now ? fmtToday(now, isTh) : '—'}</p>
            </div>

            {/* Live clock */}
            <p className="text-5xl font-bold tabular-nums text-ink" aria-live="off">
              {now ? fmtClock(now, isTh) : '—'}
            </p>

            {/* Today status */}
            <div
              data-testid="clock-status"
              className={`w-full rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium ${
                !inPunch
                  ? 'bg-canvas-soft text-ink-muted'
                  : !outPunch
                    ? 'bg-accent-soft text-accent'
                    : 'bg-canvas-soft text-ink-muted'
              }`}
            >
              {statusLabel}
            </div>

            {/* Big punch button */}
            {next === 'done' ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-accent bg-accent-soft py-4 text-accent">
                <CheckCircle2 size={20} aria-hidden />
                <span className="font-semibold">{isTh ? 'ลงเวลาแล้ววันนี้' : 'Done for today'}</span>
              </div>
            ) : (
              <button
                type="button"
                data-testid="punch-button"
                onClick={() => doPunch(empId, next)}
                className={`flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] py-4 text-base font-semibold text-white transition active:scale-[0.99] ${
                  next === 'in' ? 'bg-accent hover:opacity-90' : 'bg-ink hover:opacity-90'
                }`}
              >
                {next === 'in' ? <LogIn size={20} aria-hidden /> : <LogOut size={20} aria-hidden />}
                {next === 'in'
                  ? isTh ? 'ลงเวลาเข้า' : 'Clock in'
                  : isTh ? 'ลงเวลาออก' : 'Clock out'}
              </button>
            )}

            {/* Today's punches */}
            <div className="w-full">
              <p className="mb-2 text-left text-xs font-semibold uppercase tracking-widest text-ink-muted">
                {isTh ? 'รายการวันนี้' : "Today's punches"}
              </p>
              {todayPunches.length === 0 ? (
                <p className="py-4 text-sm text-ink-muted">{isTh ? 'ยังไม่มีรายการ' : 'No punches yet'}</p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {todayPunches.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="inline-flex items-center gap-2">
                        {p.type === 'in' ? (
                          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{isTh ? 'เข้า' : 'IN'}</span>
                        ) : (
                          <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-xs font-medium text-ink-muted">{isTh ? 'ออก' : 'OUT'}</span>
                        )}
                      </span>
                      <span className="tabular-nums font-medium text-ink">{fmtPunchTime(p.at, isTh)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
