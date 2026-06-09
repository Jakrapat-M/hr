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
import { validateDwsDay, DWS_LEVEL_CLASS, dwsLabel } from '@/lib/time/dws-validation';
import { lateMinutesFor, formatLate, periodLateSummary, type AttendanceDay } from '@/lib/time/attendance-math';
import {
  useTimesheetSubmissions,
  validateTimesheet,
  sumTimesheetHours,
  type TimesheetSubmissionRow,
} from '@/stores/timesheet-submissions';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type Day = typeof DAYS[number];
const DAY_LABEL_EN: Record<Day, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const DAY_LABEL_TH: Record<Day, string> = { mon: 'จ', tue: 'อ', wed: 'พ', thu: 'พฤ', fri: 'ศ', sat: 'ส', sun: 'อา' };

type TabKey = 'entry' | 'schedule' | 'late' | 'weekly';

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
  const ecPlan = ecPlanHoursFor(empId);
  const tmpl = templateForEmployee(empId);

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
                {days.map((d) => <TimeEntryRow key={d.date} d={d} isTh={isTh} locale={locale} />)}
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
                <thead><tr className="border-b border-hairline text-left text-ink-muted"><th className="py-2 px-3 font-semibold">{isTh ? 'วันที่' : 'Date'}</th><th className="py-2 px-3 font-semibold">{isTh ? 'กะเข้า' : 'Scheduled in'}</th><th className="py-2 px-3 font-semibold">{isTh ? 'เข้าจริง' : 'Actual in'}</th><th className="py-2 px-3 font-semibold">{isTh ? 'สาย' : 'Late'}</th></tr></thead>
                <tbody>
                  {days.filter((d) => (lateMinutesFor(d) ?? 0) > 0).map((d) => (
                    <tr key={d.date} className="border-b border-hairline last:border-0">
                      <td className="py-2 px-3 text-ink">{fmtDate(d.date, isTh)}</td>
                      <td className="py-2 px-3 tabular-nums text-ink-muted">{d.scheduledIn}</td>
                      <td className="py-2 px-3 tabular-nums text-ink">{d.actualIn}</td>
                      <td className="py-2 px-3"><span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">{formatLate(lateMinutesFor(d), isTh)}</span></td>
                    </tr>
                  ))}
                  {lateSummary.lateDays === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-ink-muted">{isTh ? 'ไม่มีวันมาสายในรอบนี้' : 'No late days this period'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
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
    </div>
  );
}

function TimeEntryRow({ d, isTh, locale }: { d: AttendanceDay; isTh: boolean; locale: string }) {
  const sc = getShiftCode(d.shiftCode);
  const late = lateMinutesFor(d);
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
          <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger whitespace-nowrap">{formatLate(late, isTh)}</span>
        ) : (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent whitespace-nowrap">{isTh ? 'ตรงเวลา' : 'On time'}</span>
        )}
      </td>
      <td className="py-2 px-3 text-right">
        {!d.dayOff && (
          <Link href={`/${locale}/time/corrections?date=${d.date}`} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline whitespace-nowrap">
            <PencilLine size={12} aria-hidden />{isTh ? 'แก้ไข' : 'Correct'}
          </Link>
        )}
      </td>
    </tr>
  );
}
