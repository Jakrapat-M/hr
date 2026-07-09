'use client';

// /time/clock — mobile-first clock-in/out widget. A big tap target records an
// IN then an OUT punch for today (clock-punches store), with a live clock and
// today's punch list. Multiple in/out pairs per day are allowed.
//
// Geofence is SIMULATED (mockup — no real GPS / notification / backend). A
// deterministic default (within) drives the result; an admin-only demo selector
// can flip it to outside / disabled to demo the 3 cases. Humi tokens; success =
// teal, warning = amber, error = pumpkin (NO RED). Non-clocking employees see a
// gate (they have no punches).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, Clock, LogIn, LogOut } from 'lucide-react';
import { Card } from '@/components/humi';
import { useAuthStore } from '@/stores/auth-store';
import { personaTiers } from '@/lib/persona-tiers';
import { resolveCurrentEmpId } from '@/lib/scope-filter';
import { getEmployeeTimeAttrs } from '@/lib/time/employee-time-attrs';
import {
  useClockPunches,
  punchesForDay,
  nextPunchType,
  clockButtonState,
  localDateKey,
  type PunchType,
} from '@/stores/clock-punches';
import {
  evaluateGeofence,
  defaultGeoSim,
  type GeoResult,
} from '@/lib/time/geofence-sim';
import {
  ClockResultModal,
  type ClockResultVariant,
} from './_components/ClockResultModal';

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

const SIM_OPTIONS: GeoResult[] = ['within', 'outside', 'disabled'];

interface ClockResultState {
  variant: ClockResultVariant;
  punchType: 'in' | 'out';
  time: string;
  distanceM: number | null;
}

export default function ClockInOutPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const isTh = locale === 'th';

  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);
  const roles = useAuthStore((s) => s.roles);
  const empId = resolveCurrentEmpId(email) ?? userId ?? 'EMP001';
  const attrs = getEmployeeTimeAttrs(empId);
  const isClocking = attrs.employeeType === 'clocking';

  // Demo geofence selector is admin-only (Tier A). RBAC "remove, not hide":
  // employees/managers/partners never see it at all.
  const isAdmin = personaTiers(roles).includes('A');

  const punches = useClockPunches((s) => s.punches);
  const doPunch = useClockPunches((s) => s.punch);

  // Simulated geofence source — deterministic default; the admin selector flips it.
  const [sim, setSim] = useState<GeoResult>(() => defaultGeoSim());
  const [result, setResult] = useState<ClockResultState | null>(null);

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
  // Latest in/out of the day — with multiple pairs the status must reflect the
  // CURRENT pair, not the first (todayPunches is oldest-first, so take the last).
  const inPunch = todayPunches.filter((p) => p.type === 'in').at(-1);
  const outPunch = todayPunches.filter((p) => p.type === 'out').at(-1);

  const statusLabel = !inPunch
    ? isTh ? 'ยังไม่ลงเวลาเข้า' : 'Not clocked in yet'
    : next === 'out'
      ? isTh ? `เข้างานแล้ว · ${fmtPunchTime(inPunch.at, isTh)}` : `Clocked in · ${fmtPunchTime(inPunch.at, isTh)}`
      : isTh ? `ออกงานแล้ว · ${outPunch ? fmtPunchTime(outPunch.at, isTh) : ''}` : `Clocked out · ${outPunch ? fmtPunchTime(outPunch.at, isTh) : ''}`;

  // STA-251 dual-button matrix, derived from today's punches + timestamps.
  const buttons = clockButtonState(todayPunches, now ? now.getTime() : Date.now());

  function handlePunch(type: PunchType) {
    const evalResult = evaluateGeofence(sim);
    // Case 3 — GPS disabled/denied: block, no punch, error popup.
    if (evalResult.result === 'disabled') {
      setResult({
        variant: 'error',
        punchType: type,
        time: now ? fmtClock(now, isTh) : '',
        distanceM: null,
      });
      return;
    }
    // Cases 1 & 2 — record the punch, then show success / warning.
    const outside = evalResult.result === 'outside';
    const created = doPunch(empId, type, {
      withinRadius: !outside,
      distanceM: evalResult.distanceM ?? 0,
      notifiedSupervisor: outside,
    });
    if (!created) return; // illegal transition guard (no-op)
    setResult({
      variant: outside ? 'warning' : 'success',
      punchType: created.type,
      time: fmtPunchTime(created.at, isTh),
      distanceM: evalResult.distanceM,
    });
  }

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
                inPunch && next === 'out' ? 'bg-accent-soft text-accent' : 'bg-canvas-soft text-ink-muted'
              }`}
            >
              {statusLabel}
            </div>

            {/* Admin-only demo geofence selector (RBAC: absent for non-admins). */}
            {isAdmin && (
              <div className="w-full text-left" data-testid="geo-sim-selector">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  {isTh ? 'จำลองตำแหน่ง (เดโม)' : 'Simulate location (demo)'}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {SIM_OPTIONS.map((opt) => {
                    const label =
                      opt === 'within'
                        ? isTh ? 'ในพื้นที่' : 'Within'
                        : opt === 'outside'
                          ? isTh ? 'นอกพื้นที่' : 'Outside'
                          : isTh ? 'ปิด GPS' : 'GPS off';
                    const active = sim === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        data-testid={`geo-sim-${opt}`}
                        aria-pressed={active}
                        onClick={() => setSim(opt)}
                        className={`rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-hairline text-ink-muted hover:bg-canvas-soft'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STA-251 — two large, clearly separated buttons. Enable/disable
                follows the dual-button matrix (2-hour in-cooldown; out needs an
                unmatched in). Both lock while a result popup is open. */}
            <div className="grid w-full grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  data-testid="clock-in-button"
                  disabled={result !== null || !buttons.canIn}
                  onClick={() => handlePunch('in')}
                  className={`flex h-16 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-base font-semibold transition active:scale-[0.99] ${
                    buttons.canIn && result === null
                      ? 'bg-accent text-white hover:opacity-90'
                      : 'cursor-not-allowed bg-canvas-soft text-ink-faint'
                  }`}
                >
                  <LogIn size={20} aria-hidden />
                  {isTh ? 'ลงเวลาเข้า' : 'Clock in'}
                </button>
                {buttons.inReason === 'cooldown' && (
                  <p data-testid="clock-in-helper" className="text-xs text-ink-muted">
                    {isTh
                      ? 'ลงเวลาเข้าได้อีกครั้งหลังจากเข้างานครบ 2 ชั่วโมง'
                      : 'You can clock in again 2 hours after your last clock-in'}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  data-testid="clock-out-button"
                  disabled={result !== null || !buttons.canOut}
                  onClick={() => handlePunch('out')}
                  className={`flex h-16 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-base font-semibold transition active:scale-[0.99] ${
                    buttons.canOut && result === null
                      ? 'bg-ink text-white hover:opacity-90'
                      : 'cursor-not-allowed bg-canvas-soft text-ink-faint'
                  }`}
                >
                  <LogOut size={20} aria-hidden />
                  {isTh ? 'ลงเวลาออก' : 'Clock out'}
                </button>
                {buttons.outReason === 'needsIn' && (
                  <p data-testid="clock-out-helper" className="text-xs text-ink-muted">
                    {isTh
                      ? 'ต้องลงเวลาเข้าก่อน จึงจะลงเวลาออกได้'
                      : 'Clock in first before clocking out'}
                  </p>
                )}
              </div>
            </div>

            {/* Today's punches */}
            <div className="w-full">
              <p className="mb-2 text-left text-xs font-semibold uppercase tracking-widest text-ink-muted">
                {isTh ? 'รายการวันนี้' : "Today's punches"}
              </p>
              {todayPunches.length === 0 ? (
                <p className="py-4 text-sm text-ink-muted">{isTh ? 'ยังไม่มีรายการ' : 'No punches yet'}</p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {todayPunches.map((p) => {
                    const outside = p.geo ? !p.geo.withinRadius : false;
                    return (
                      <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="inline-flex items-center gap-2">
                          {p.type === 'in' ? (
                            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{isTh ? 'เข้า' : 'IN'}</span>
                          ) : (
                            <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-xs font-medium text-ink-muted">{isTh ? 'ออก' : 'OUT'}</span>
                          )}
                          {outside && (
                            <span
                              data-testid="punch-outside-tag"
                              className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning"
                            >
                              {isTh ? 'นอกพื้นที่ · แจ้งหัวหน้าแล้ว' : 'Outside · supervisor notified'}
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums font-medium text-ink">{fmtPunchTime(p.at, isTh)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Result popups (success / warning / error+retry) */}
      <ClockResultModal
        open={result !== null}
        variant={result?.variant ?? 'success'}
        punchType={result?.punchType ?? 'in'}
        time={result?.time ?? ''}
        distanceM={result?.distanceM ?? null}
        onClose={() => setResult(null)}
        onRetry={() => setResult(null)}
      />
    </div>
  );
}
