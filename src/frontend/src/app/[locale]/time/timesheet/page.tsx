'use client';

// /time/timesheet — Time Entry (WFS "Manager Time Entry" IA, wiki §1/§7.5/§8).
// Tabs on ONE screen so clock-in can be compared against the scheduled shift and
// the Late is visible — the core requirement the old project-hours timesheet missed:
//   • Time Entry — actual IN/OUT per day vs the scheduled shift + Late badge.
//   • Schedule   — the assigned shift (IN/OUT + break) per day (DWS shift codes).
//   • Late       — late-day roll-up for the payroll period.
//   • ชั่วโมงรายสัปดาห์ — the legacy weekly project-hours grid, preserved so the
//     manager review (/time/review), import, and submissions store keep working.
// Mockup: deterministic seeds, no backend. Humi tokens; Late = pumpkin, never red.

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Plus, AlertTriangle, Clock, PencilLine } from 'lucide-react';
import { Card, CardTitle, Button } from '@/components/humi';
import { cn } from '@/lib/utils';
import { useTimesheet } from '@/hooks/use-time';
import { useAuthStore } from '@/stores/auth-store';
import { resolveCurrentEmpId } from '@/lib/scope-filter';
import { getEmployeeTimeAttrs } from '@/lib/time/employee-time-attrs';
import { currentPeriod } from '@/lib/time/period';
import { getAttendanceForPeriod, ecPlanHoursFor } from '@/lib/time/attendance-seed';
import { getShiftCode } from '@/lib/time/shift-codes';
import { templateForEmployee } from '@/lib/time/schedule-template';
import { validateDwsDay, validateDwsPeriod, DWS_LEVEL_CLASS, dwsLabel } from '@/lib/time/dws-validation';
import { lateMinutesFor, formatLate, periodLateSummary, type AttendanceDay } from '@/lib/time/attendance-math';
import { computeResultsForPeriod, resultsSummary, WAGE_TYPE_LABEL } from '@/lib/time/results-math';
import { TIME_OFF_LEDGER, endingBalance, leaveBalanceCard } from '@/lib/time/time-off-ledger';
import { heroSummary, getExceptionsForPeriod } from '@/lib/time/exceptions';
import {
  useTimeCorrections,
  latestCorrectionForDate,
  type CorrectionType,
  type TimeCorrectionRequest,
} from '@/stores/time-corrections';
import {
  approvedCorrectionDates,
  adjustHeroForApproved,
  openExceptions,
} from '@/lib/time/correction-overlay';
import { TimeCorrectionForm } from '@/components/time/TimeCorrectionForm';
import { Modal } from '@/components/humi';
import {
  useTimesheetSubmissions,
  validateTimesheet,
  sumTimesheetHours,
  type TimesheetSubmissionRow,
} from '@/stores/timesheet-submissions';

/** Best-guess punch type for a row's correction prefill (user can still change it). */
function detectCorrectionType(d: AttendanceDay): CorrectionType {
  if (!d.actualIn) return 'in';
  if (!d.actualOut) return 'out';
  return 'in';
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type Day = typeof DAYS[number];
const DAY_LABEL_EN: Record<Day, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const DAY_LABEL_TH: Record<Day, string> = { mon: 'จ', tue: 'อ', wed: 'พ', thu: 'พฤ', fri: 'ศ', sat: 'ส', sun: 'อา' };

type TabKey = 'entry' | 'schedule' | 'late' | 'results' | 'punch' | 'timeoff' | 'messages' | 'weekly';

function fmtDate(iso: string, isTh: boolean): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(isTh ? 'th-TH' : 'en-US', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

export default function TimesheetPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const isTh = locale === 'th';

  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const email = useAuthStore((s) => s.email);
  const empId = resolveCurrentEmpId(email) ?? userId ?? 'EMP001';
  const attrs = getEmployeeTimeAttrs(empId);
  const isClocking = attrs.employeeType === 'clocking';

  const period = currentPeriod();
  const days = useMemo(() => getAttendanceForPeriod(empId), [empId]);
  const lateSummary = useMemo(() => periodLateSummary(days), [days]);
  const heroRaw = useMemo(() => heroSummary(empId), [empId]);
  const exceptionsRaw = useMemo(() => getExceptionsForPeriod(empId), [empId]);

  // Overlay the PURE seed-derived hero/exceptions with live corrections: once a
  // manager approves a correction for a day, that day resolves in the at-a-glance
  // hero + exception list (exceptions.ts itself stays pure). Period-scoped to the
  // current period's days so stale localStorage corrections can't leak in.
  const correctionRequests = useTimeCorrections((s) => s.requests);
  const periodDates = useMemo(() => new Set(days.map((d) => d.date)), [days]);
  const approvedDates = useMemo(
    () => approvedCorrectionDates(correctionRequests, empId, periodDates),
    [correctionRequests, empId, periodDates],
  );
  const hero = useMemo(
    () => adjustHeroForApproved(heroRaw, exceptionsRaw, approvedDates),
    [heroRaw, exceptionsRaw, approvedDates],
  );
  const exceptions = useMemo(
    () => openExceptions(exceptionsRaw, approvedDates),
    [exceptionsRaw, approvedDates],
  );

  // Inline correction modal — the row a manager/employee is correcting.
  const [correctionDay, setCorrectionDay] = useState<AttendanceDay | null>(null);
  const corrForDate = (date: string) => latestCorrectionForDate(correctionRequests, empId, date);
  const ecPlan = ecPlanHoursFor(empId);
  const tmpl = templateForEmployee(empId);
  const results = useMemo(() => computeResultsForPeriod(empId), [empId]);
  const resSummary = useMemo(() => resultsSummary(results), [results]);
  const messages = useMemo(() => {
    const dws = validateDwsPeriod(days);
    const msgs: { level: 'ok' | 'warn'; th: string; en: string }[] = [
      { level: 'ok', th: 'ข้อมูลรอบนี้พร้อมส่งให้ผู้จัดการตรวจสอบ', en: 'This period is ready for manager review.' },
    ];
    if (lateSummary.lateDays > 0) msgs.push({ level: 'warn', th: `พบวันมาสาย ${lateSummary.lateDays} วัน (รวม ${lateSummary.totalLateMin} นาที)`, en: `${lateSummary.lateDays} late day(s) — ${lateSummary.totalLateMin} min total.` });
    if (dws.red > 0) msgs.push({ level: 'warn', th: `มี ${dws.red} วันที่ตารางกะไม่ถูกต้อง`, en: `${dws.red} day(s) with an invalid schedule.` });
    if (dws.yellow > 0) msgs.push({ level: 'warn', th: `มี ${dws.yellow} วันที่ต้องรับรองกะต่อเนื่อง`, en: `${dws.yellow} day(s) need continuous-shift certification.` });
    return msgs;
  }, [days, lateSummary]);

  const [tab, setTab] = useState<TabKey>('entry');

  // ── Legacy weekly project-hours grid (preserved; feeds /time/review + import) ──
  const { rows, weekStart, updateHours, addRow, totalPerDay } = useTimesheet();
  const submit = useTimesheetSubmissions((s) => s.submit);
  const [newProject, setNewProject] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const grandTotal = totalPerDay.reduce((s, v) => s + v, 0);

  const handleSave = () => {
    const snapshot: TimesheetSubmissionRow[] = rows.map((r) => ({ ...r }));
    const result = validateTimesheet(snapshot);
    if (!result.valid) {
      const message =
        result.reason === 'day-over-24'
          ? isTh ? 'ชั่วโมงต่อวันต้องไม่เกิน 24 ชม.' : 'A single day cannot exceed 24 hours.'
          : isTh ? 'กรุณาบันทึกชั่วโมงงานก่อนส่ง' : 'Please log some hours before submitting.';
      setStatus({ kind: 'error', message });
      return;
    }
    const total = sumTimesheetHours(snapshot);
    submit({ employeeId: userId ?? 'EMP001', employeeName: username ?? 'พนักงาน', weekStart, rows: snapshot, totalHours: total });
    setStatus({ kind: 'success', message: isTh ? `ส่งใบบันทึกเวลาแล้ว · รวม ${total} ชม.` : `Timesheet submitted · ${total} hrs total` });
    setToast(isTh ? `บันทึกแล้ว · รวม ${total} ชม.` : `Saved · ${total} hrs total`);
    window.setTimeout(() => setToast(null), 3200);
  };

  const TABS: { key: TabKey; labelTh: string; labelEn: string }[] = [
    { key: 'entry', labelTh: 'บันทึกเวลา', labelEn: 'Time Entry' },
    { key: 'schedule', labelTh: 'ตารางกะ', labelEn: 'Schedule' },
    { key: 'late', labelTh: 'มาสาย', labelEn: 'Late' },
    { key: 'punch', labelTh: 'ปั๊มเวลา', labelEn: 'Punch Log' },
    { key: 'results', labelTh: 'ผลคำนวณ', labelEn: 'Results' },
    { key: 'timeoff', labelTh: 'วันลาคงเหลือ', labelEn: 'Time Off' },
    { key: 'messages', labelTh: 'ข้อความ', labelEn: 'Messages' },
    { key: 'weekly', labelTh: 'ชั่วโมงรายสัปดาห์', labelEn: 'Weekly hours' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-ink-muted" aria-label="breadcrumb">
        <Link href={`/${locale}/time`} className="hover:text-ink transition">{isTh ? 'เวลางาน' : 'Time'}</Link>
        <span aria-hidden>›</span>
        <span className="text-ink font-medium">{isTh ? 'บันทึกเวลางาน' : 'Time Entry'}</span>
      </nav>

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" className={cn('fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3', 'bg-ink text-canvas shadow-[var(--shadow-lg)] text-body font-medium')}>
          <Check size={16} aria-hidden /> {toast}
        </div>
      )}

      {/* Header */}
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-0.5">{isTh ? 'เวลาและการเข้างาน' : 'Time & Attendance'}</p>
          <h1 className="text-2xl font-bold text-ink">{isTh ? 'บันทึกเวลางาน' : 'Time Entry'}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {isTh ? 'รอบจ่าย' : 'Pay period'} {fmtDate(period.start, isTh)} – {fmtDate(period.end, isTh)}
            <span className="mx-2">·</span>
            <span className="text-ink-soft">EC Plan Hours: <span className="font-semibold text-ink">{ecPlan.toFixed(1)}</span></span>
          </p>
        </div>
      </header>

      {/* At-a-glance hero (exception-first; replaces scanning the old WFS grid) */}
      {isClocking && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'ชม.จริง / แผน' : 'Actual / plan'}</p><p className="mt-1 text-2xl font-bold text-ink tabular-nums">{hero.actualHrs}<span className="text-base font-normal text-ink-muted"> / {hero.planHrs}</span></p></Card>
          <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'ตรงเวลา' : 'On-time'}</p><p className="mt-1 text-2xl font-bold text-ink tabular-nums">{hero.onTimeRate}<span className="text-base font-normal text-ink-muted">%</span></p></Card>
          <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'วันมาสาย' : 'Late days'}</p><p className={`mt-1 text-2xl font-bold tabular-nums ${hero.lateDays > 0 ? 'text-danger' : 'text-ink'}`}>{hero.lateDays}</p></Card>
          <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'ต้องจัดการ' : 'Exceptions'}</p><p className={`mt-1 text-2xl font-bold tabular-nums ${hero.exceptionCount > 0 ? 'text-warning' : 'text-ink'}`}>{hero.exceptionCount}</p></Card>
        </section>
      )}

      {/* Exception banner — surface problems instead of hiding them in a grid */}
      {isClocking && exceptions.length > 0 && (
        <button
          type="button"
          onClick={() => setTab('late')}
          className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-warning bg-warning-soft px-4 py-3 text-left text-sm text-warning"
        >
          <AlertTriangle size={16} aria-hidden className="shrink-0" />
          <span className="font-medium">
            {isTh ? `พบ ${exceptions.length} รายการที่ต้องจัดการในรอบนี้ — แตะเพื่อดู` : `${exceptions.length} item(s) need attention this period — tap to review`}
          </span>
        </button>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-hairline" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {isTh ? t.labelTh : t.labelEn}
            {t.key === 'late' && lateSummary.lateDays > 0 && (
              <span className="ml-1.5 rounded-full bg-danger-soft px-1.5 py-0.5 text-xs font-semibold text-danger">{lateSummary.lateDays}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Clocking gate for the attendance tabs ── */}
      {tab !== 'weekly' && !isClocking ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Clock className="text-ink-faint" size={28} aria-hidden />
            <p className="text-body text-ink-muted">{isTh ? 'พนักงานนี้ไม่ใช่ประเภทลงเวลา — ไม่มีบันทึกเวลาเข้า-ออก' : 'This employee is not a clocking type — no time entries.'}</p>
          </div>
        </Card>
      ) : null}

      {/* ── Tab: Time Entry ── */}
      {tab === 'entry' && isClocking && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th className="py-3 px-3 font-semibold">{isTh ? 'วันที่' : 'Date'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'กะ (เข้า–ออก)' : 'Shift (in–out)'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'เข้าจริง' : 'Actual in'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'ออกจริง' : 'Actual out'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'สถานะ' : 'Late'}</th>
                  <th className="py-3 px-3 font-semibold sr-only">action</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <TimeEntryRow
                    key={d.date}
                    d={d}
                    isTh={isTh}
                    correction={corrForDate(d.date)}
                    onCorrect={() => setCorrectionDay(d)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Tab: Schedule ── */}
      {tab === 'schedule' && isClocking && (
        <Card>
          {/* Working Hour Template the schedule derives from (wiki §7.1) */}
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-md)] bg-canvas-soft px-3 py-2 text-small">
            <span className="text-ink-muted">{isTh ? 'รูปแบบเวลาทำงาน' : 'Working pattern'}:</span>
            <span className="font-semibold text-ink">{isTh ? tmpl.nameTh : tmpl.nameEn}</span>
            <span className="text-ink-faint">·</span>
            <span className="text-ink-muted">{isTh ? 'มีผล' : 'Effective'} {fmtDate(tmpl.effectiveDate, isTh)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th className="py-3 px-3 font-semibold">{isTh ? 'วันที่' : 'Date'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'รหัสกะ' : 'Shift code'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'เข้า' : 'In'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'ออก' : 'Out'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'พัก' : 'Break'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'ตรวจ DWS' : 'DWS check'}</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d, i) => {
                  const sc = getShiftCode(d.shiftCode);
                  const dws = validateDwsDay(d, i > 0 ? days[i - 1] : null);
                  return (
                    <tr key={d.date} className="border-b border-hairline last:border-0">
                      <td className="py-2 px-3 text-ink">{fmtDate(d.date, isTh)}</td>
                      <td className="py-2 px-3 text-ink-soft">
                        {d.dayOff ? (isTh ? 'วันหยุด (F)' : 'Day off (F)') : (sc ? `${sc.code} · ${isTh ? sc.nameTh : sc.nameEn}` : '—')}
                      </td>
                      <td className="py-2 px-3 tabular-nums text-ink">{d.scheduledIn ?? '—'}</td>
                      <td className="py-2 px-3 tabular-nums text-ink">{d.scheduledOut ?? '—'}</td>
                      <td className="py-2 px-3 tabular-nums text-ink-muted">{d.breakStart ? `${d.breakStart}–${d.breakEnd}` : '—'}</td>
                      <td className="py-2 px-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DWS_LEVEL_CLASS[dws.level]}`} title={isTh ? dws.reasonTh : dws.reasonEn}>
                          {dwsLabel(dws.level, isTh)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Tab: Late ── */}
      {tab === 'late' && isClocking && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'วันมาสาย' : 'Late days'}</p><p className="mt-1 text-2xl font-bold text-ink tabular-nums">{lateSummary.lateDays}</p></Card>
            <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'รวมนาทีสาย' : 'Total late'}</p><p className="mt-1 text-2xl font-bold text-ink tabular-nums">{lateSummary.totalLateMin} <span className="text-base font-normal text-ink-muted">{isTh ? 'นาที' : 'min'}</span></p></Card>
            <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'วันทำงาน' : 'Worked days'}</p><p className="mt-1 text-2xl font-bold text-ink tabular-nums">{lateSummary.workedDays}</p></Card>
          </div>
          <Card>
            <CardTitle className="text-base">{isTh ? 'รายวันที่มาสาย' : 'Late days detail'}</CardTitle>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-hairline text-left text-ink-muted"><th className="py-2 px-3 font-semibold">{isTh ? 'วันที่' : 'Date'}</th><th className="py-2 px-3 font-semibold">{isTh ? 'กะเข้า' : 'Scheduled in'}</th><th className="py-2 px-3 font-semibold">{isTh ? 'เข้าจริง' : 'Actual in'}</th><th className="py-2 px-3 font-semibold">{isTh ? 'สาย' : 'Late'}</th><th className="py-2 px-3 font-semibold sr-only">action</th></tr></thead>
                <tbody>
                  {days.filter((d) => (lateMinutesFor(d) ?? 0) > 0).map((d) => {
                    const corr = corrForDate(d.date);
                    const resolved = corr?.status === 'approved';
                    return (
                      <tr key={d.date} className="border-b border-hairline last:border-0">
                        <td className="py-2 px-3 text-ink">{fmtDate(d.date, isTh)}</td>
                        <td className="py-2 px-3 tabular-nums text-ink-muted">{d.scheduledIn}</td>
                        <td className="py-2 px-3 tabular-nums text-ink">{d.actualIn}</td>
                        <td className="py-2 px-3"><span className={`rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger ${resolved ? 'line-through opacity-60' : ''}`}>{formatLate(lateMinutesFor(d), isTh)}</span></td>
                        <td className="py-2 px-3 text-right">
                          <CorrectionCell d={d} isTh={isTh} correction={corr} onCorrect={() => setCorrectionDay(d)} />
                        </td>
                      </tr>
                    );
                  })}
                  {lateSummary.lateDays === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-ink-muted">{isTh ? 'ไม่มีวันมาสายในรอบนี้' : 'No late days this period'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Results (computed pay output, wiki §5) ── */}
      {tab === 'results' && isClocking && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'ชม.จริง' : 'Actual hrs'}</p><p className="mt-1 text-2xl font-bold text-ink tabular-nums">{resSummary.totalActual}</p></Card>
            <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'ชม.ตามแผน' : 'Plan hrs'}</p><p className="mt-1 text-2xl font-bold text-ink tabular-nums">{resSummary.totalPlan}</p></Card>
            <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'วันลา' : 'Leave days'}</p><p className="mt-1 text-2xl font-bold text-ink tabular-nums">{resSummary.leaveDays}</p></Card>
            <Card><p className="text-xs uppercase tracking-widest text-ink-muted">{isTh ? 'วันหยุดนักขัตฤกษ์' : 'Holidays'}</p><p className="mt-1 text-2xl font-bold text-ink tabular-nums">{resSummary.holidayDays}</p></Card>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-ink-muted">
                    <th className="py-3 px-3 font-semibold">{isTh ? 'วันที่' : 'Work date'}</th>
                    <th className="py-3 px-3 font-semibold">{isTh ? 'รหัสจ่าย' : 'Pay code'}</th>
                    <th className="py-3 px-3 font-semibold">{isTh ? 'ประเภทค่าจ้าง' : 'Wage type'}</th>
                    <th className="py-3 px-3 font-semibold text-right">{isTh ? 'ชม.แผน' : 'Plan hrs'}</th>
                    <th className="py-3 px-3 font-semibold text-right">{isTh ? 'ชม.จริง' : 'Actual hrs'}</th>
                    <th className="py-3 px-3 font-semibold text-right">{isTh ? 'วัน' : 'Days'}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={`${r.date}-${r.wageType}`} className="border-b border-hairline last:border-0">
                      <td className="py-2 px-3 text-ink whitespace-nowrap">{fmtDate(r.date, isTh)}</td>
                      <td className="py-2 px-3 text-ink">{isTh ? r.payCodeTh : r.payCodeEn}</td>
                      <td className="py-2 px-3"><span className="rounded-full bg-canvas-soft px-2 py-0.5 text-xs font-medium text-ink-muted">{isTh ? WAGE_TYPE_LABEL[r.wageType].th : WAGE_TYPE_LABEL[r.wageType].en}</span></td>
                      <td className="py-2 px-3 text-right tabular-nums text-ink-muted">{r.planHours.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-ink">{r.actualHours.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-ink">{r.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Punch Log (raw clock punches, wiki §1) ── */}
      {tab === 'punch' && isClocking && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th className="py-3 px-3 font-semibold">{isTh ? 'วันที่' : 'Date'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'ประเภท' : 'Type'}</th>
                  <th className="py-3 px-3 font-semibold">{isTh ? 'เวลา' : 'Time'}</th>
                </tr>
              </thead>
              <tbody>
                {days.flatMap((d) => {
                  if (d.dayOff || !d.actualIn) return [];
                  return [
                    <tr key={`${d.date}-in`} className="border-b border-hairline last:border-0">
                      <td className="py-2 px-3 text-ink whitespace-nowrap">{fmtDate(d.date, isTh)}</td>
                      <td className="py-2 px-3"><span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{isTh ? 'เข้า' : 'IN'}</span></td>
                      <td className="py-2 px-3 tabular-nums text-ink">{d.actualIn}</td>
                    </tr>,
                    <tr key={`${d.date}-out`} className="border-b border-hairline last:border-0">
                      <td className="py-2 px-3 text-ink whitespace-nowrap">{fmtDate(d.date, isTh)}</td>
                      <td className="py-2 px-3"><span className="rounded-full bg-canvas-soft px-2 py-0.5 text-xs font-medium text-ink-muted">{isTh ? 'ออก' : 'OUT'}</span></td>
                      <td className="py-2 px-3 tabular-nums text-ink">{d.actualOut ?? '—'}</td>
                    </tr>,
                  ];
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Tab: Time Off balance ledger (wiki §6) ── */}
      {tab === 'timeoff' && (
        <div className="space-y-4">
          {/* At-a-glance leave-balance progress cards (remaining vs entitlement) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TIME_OFF_LEDGER.map((r) => {
              const c = leaveBalanceCard(r);
              const name = isTh ? r.nameTh : r.nameEn;
              return (
                <Card key={r.kind}>
                  <p className="text-xs uppercase tracking-widest text-ink-muted">{name}</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-ink tabular-nums">{c.remaining}</span>
                    <span className="text-sm text-ink-muted">/ {c.entitled} {isTh ? 'วัน' : 'days'}</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={c.percentUsed}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={name}
                    className="mt-3 h-2 w-full overflow-hidden rounded-full bg-canvas-soft"
                  >
                    <div className="h-full rounded-full bg-accent" style={{ width: `${c.percentUsed}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">
                    {isTh ? `ใช้ไป ${c.used} วัน` : `${c.used} days used`}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Balance detail ledger (Initial · Credits · Debits · Ending) */}
          <Card>
            <CardTitle className="text-base">{isTh ? 'รายละเอียดยอดวันลา' : 'Balance detail'}</CardTitle>
            <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-ink-muted">
                  <th className="py-3 px-3 font-semibold">{isTh ? 'ประเภทการลา' : 'Leave type'}</th>
                  <th className="py-3 px-3 font-semibold text-right">{isTh ? 'ยอดยกมา' : 'Initial'}</th>
                  <th className="py-3 px-3 font-semibold text-right">{isTh ? 'เพิ่ม' : 'Credits'}</th>
                  <th className="py-3 px-3 font-semibold text-right">{isTh ? 'ใช้ไป' : 'Debits'}</th>
                  <th className="py-3 px-3 font-semibold text-right">{isTh ? 'คงเหลือ' : 'Ending'}</th>
                </tr>
              </thead>
              <tbody>
                {TIME_OFF_LEDGER.map((r) => (
                  <tr key={r.kind} className="border-b border-hairline last:border-0">
                    <td className="py-2 px-3 text-ink">{isTh ? r.nameTh : r.nameEn}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-ink-muted">{r.initial}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-ink-muted">{r.credits}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-ink-muted">{r.debits}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-ink">{endingBalance(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            <p className="mt-2 text-small text-ink-muted">{isTh ? 'หน่วย: วัน · คงเหลือ = ยอดยกมา + เพิ่ม − ใช้ไป' : 'In days · Ending = Initial + Credits − Debits'}</p>
          </Card>
        </div>
      )}

      {/* ── Tab: Messages (validation / approval notices, wiki §1) ── */}
      {tab === 'messages' && (
        <Card>
          <ul className="divide-y divide-hairline">
            {messages.map((m, i) => (
              <li key={i} className="flex items-start gap-2 py-3">
                {m.level === 'warn' ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden /> : <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />}
                <span className="text-body text-ink">{isTh ? m.th : m.en}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Tab: Weekly hours (legacy project-hours grid — preserved) ── */}
      {tab === 'weekly' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-ink-muted">{isTh ? `สัปดาห์: ${weekStart}` : `Week of ${weekStart}`}</p>
            <Button variant="primary" size="sm" onClick={handleSave}>{isTh ? 'บันทึก' : 'Save'}</Button>
          </div>
          {status && (
            <div role={status.kind === 'error' ? 'alert' : 'status'} aria-live="polite" className={cn('flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-body font-medium', status.kind === 'error' ? 'bg-danger-soft border-danger text-danger' : 'bg-accent-soft border-accent text-accent')}>
              {status.kind === 'error' ? <AlertTriangle size={16} aria-hidden /> : <Check size={16} aria-hidden />}
              {status.message}
            </div>
          )}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="text-left py-3 px-4 font-semibold text-ink min-w-[160px]">{isTh ? 'โครงการ' : 'Project'}</th>
                    {DAYS.map((d) => (<th key={d} className={`py-3 px-2 text-center font-semibold w-16 ${['sat', 'sun'].includes(d) ? 'text-ink-muted' : 'text-ink'}`}>{isTh ? DAY_LABEL_TH[d] : DAY_LABEL_EN[d]}</th>))}
                    <th className="py-3 px-3 text-center font-semibold text-ink w-16">{isTh ? 'รวม' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => {
                    const rowTotal = DAYS.reduce((s, d) => s + row[d], 0);
                    return (
                      <tr key={rowIdx} className="border-b border-hairline last:border-0 hover:bg-canvas-soft">
                        <td className="py-2 px-4 font-medium text-ink">{row.project}</td>
                        {DAYS.map((d) => (
                          <td key={d} className="py-2 px-2">
                            <input type="number" min={0} max={24} step={0.5} value={row[d] === 0 ? '' : row[d]} onChange={(e) => updateHours(rowIdx, d, Number(e.target.value) || 0)} className="w-14 text-center rounded border border-hairline bg-surface px-1 py-1 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent-soft" placeholder="0" />
                          </td>
                        ))}
                        <td className="py-2 px-3 text-center font-semibold text-ink">{rowTotal}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-canvas-soft font-semibold">
                    <td className="py-2 px-4 text-ink-muted">{isTh ? 'รวมต่อวัน' : 'Daily total'}</td>
                    {totalPerDay.map((t, i) => (<td key={i} className={`py-2 px-2 text-center ${t > 8 ? 'text-[var(--color-danger)]' : 'text-ink'}`}>{t}</td>))}
                    <td className="py-2 px-3 text-center text-accent">{grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
          <div className="flex items-center gap-3">
            <input type="text" value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder={isTh ? 'ชื่อโครงการใหม่' : 'New project name'} className="flex-1 max-w-xs rounded border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent-soft" onKeyDown={(e) => { if (e.key === 'Enter' && newProject.trim()) { addRow(newProject.trim()); setNewProject(''); } }} />
            <Button variant="secondary" size="sm" onClick={() => { if (newProject.trim()) { addRow(newProject.trim()); setNewProject(''); } }}><Plus size={14} className="mr-1" />{isTh ? 'เพิ่มโครงการ' : 'Add project'}</Button>
          </div>
        </div>
      )}

      {/* Inline time-correction modal (SF-parity: edit on the row, no nav away) */}
      <Modal
        open={correctionDay !== null}
        onClose={() => setCorrectionDay(null)}
        title={isTh ? 'ขอแก้ไขเวลาเข้า-ออกงาน' : 'Request a time correction'}
        widthClass="max-w-2xl"
      >
        {correctionDay && (
          <TimeCorrectionForm
            subjectEmpId={empId}
            subjectName={username ?? undefined}
            prefill={{ date: correctionDay.date, correctionType: detectCorrectionType(correctionDay) }}
            onSubmitted={() => {
              setCorrectionDay(null);
              setToast(isTh ? 'ส่งคำขอแก้ไขเวลาแล้ว — รอหัวหน้าอนุมัติ' : 'Correction submitted — awaiting manager');
              window.setTimeout(() => setToast(null), 3200);
            }}
            onCancel={() => setCorrectionDay(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function CorrectionCell({
  d,
  isTh,
  correction,
  onCorrect,
}: {
  d: AttendanceDay;
  isTh: boolean;
  correction?: TimeCorrectionRequest;
  onCorrect: () => void;
}) {
  if (d.dayOff) return null;
  if (correction) {
    const approved = correction.status === 'approved';
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
          approved ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-[var(--color-danger-ink)]'
        }`}
      >
        {approved
          ? isTh ? 'แก้ไขแล้ว' : 'Corrected'
          : isTh ? 'รออนุมัติ' : 'Pending'}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onCorrect}
      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline whitespace-nowrap"
    >
      <PencilLine size={12} aria-hidden />{isTh ? 'แก้ไข' : 'Correct'}
    </button>
  );
}

function TimeEntryRow({
  d,
  isTh,
  correction,
  onCorrect,
}: {
  d: AttendanceDay;
  isTh: boolean;
  correction?: TimeCorrectionRequest;
  onCorrect: () => void;
}) {
  const sc = getShiftCode(d.shiftCode);
  const late = lateMinutesFor(d);
  const resolved = correction?.status === 'approved';
  return (
    <tr className="border-b border-hairline last:border-0 hover:bg-canvas-soft">
      <td className="py-2 px-3 text-ink whitespace-nowrap">{fmtDate(d.date, isTh)}</td>
      <td className="py-2 px-3 text-ink-soft tabular-nums whitespace-nowrap">
        {d.dayOff ? <span className="text-success">{isTh ? 'วันหยุด' : 'Day off'}</span> : sc ? `${sc.in}–${sc.out}` : '—'}
      </td>
      <td className="py-2 px-3 tabular-nums text-ink">{d.actualIn ?? '—'}</td>
      <td className="py-2 px-3 tabular-nums text-ink">{d.actualOut ?? '—'}</td>
      <td className="py-2 px-3">
        {late === null ? (
          <span className="text-ink-faint">—</span>
        ) : late > 0 ? (
          <span className={`rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger whitespace-nowrap ${resolved ? 'line-through opacity-60' : ''}`}>{formatLate(late, isTh)}</span>
        ) : (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent whitespace-nowrap">{isTh ? 'ตรงเวลา' : 'On time'}</span>
        )}
      </td>
      <td className="py-2 px-3 text-right">
        <CorrectionCell d={d} isTh={isTh} correction={correction} onCorrect={onCorrect} />
      </td>
    </tr>
  );
}
