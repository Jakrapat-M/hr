'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, Plus, AlertTriangle } from 'lucide-react';
import { Card, CardTitle, Button } from '@/components/humi';
import { cn } from '@/lib/utils';
import { useTimesheet } from '@/hooks/use-time';
import { useAuthStore } from '@/stores/auth-store';
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

export default function TimesheetPage() {
  const params = useParams();
  const locale = params?.locale as string ?? 'th';
  const isTh = locale === 'th';

  const { rows, weekStart, updateHours, addRow, totalPerDay } = useTimesheet();
  const submit = useTimesheetSubmissions((s) => s.submit);
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const [newProject, setNewProject] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState<
    { kind: 'success' | 'error'; message: string } | null
  >(null);

  const grandTotal = totalPerDay.reduce((s, v) => s + v, 0);

  const handleSave = () => {
    // Mockup: validate the weekly totals, then persist a `submitted` record to
    // the timesheet-submissions store. This is status tracking, NOT a routed
    // approval — the manager/HR review surface only reads this store.
    const snapshot: TimesheetSubmissionRow[] = rows.map((r) => ({ ...r }));
    const result = validateTimesheet(snapshot);

    if (!result.valid) {
      const message =
        result.reason === 'day-over-24'
          ? isTh
            ? 'ชั่วโมงต่อวันต้องไม่เกิน 24 ชม.'
            : 'A single day cannot exceed 24 hours.'
          : isTh
            ? 'กรุณาบันทึกชั่วโมงงานก่อนส่ง'
            : 'Please log some hours before submitting.';
      setStatus({ kind: 'error', message });
      return;
    }

    const total = sumTimesheetHours(snapshot);
    submit({
      employeeId: userId ?? 'EMP001',
      employeeName: username ?? 'พนักงาน',
      weekStart,
      rows: snapshot,
      totalHours: total,
    });

    setStatus({
      kind: 'success',
      message: isTh
        ? `ส่งใบบันทึกเวลาแล้ว · รวม ${total} ชม.`
        : `Timesheet submitted · ${total} hrs total`,
    });
    setToast(isTh ? `บันทึกแล้ว · รวม ${total} ชม.` : `Saved · ${total} hrs total`);
    window.setTimeout(() => setToast(null), 3200);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3',
            'bg-ink text-canvas shadow-[var(--shadow-lg)] text-body font-medium',
          )}
        >
          <Check size={16} aria-hidden />
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-0.5">
            {isTh ? 'บันทึกชั่วโมงงาน' : 'Hours Logging'}
          </p>
          <h1 className="text-2xl font-bold text-ink">
            {isTh ? 'บันทึกเวลางาน' : 'Timesheet'}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {isTh ? `สัปดาห์: ${weekStart}` : `Week of ${weekStart}`}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleSave}>
          {isTh ? 'บันทึก' : 'Save'}
        </Button>
      </div>

      {/* Validation / confirmation status (pumpkin danger token for errors — never red) */}
      {status && (
        <div
          role={status.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={cn(
            'flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-body font-medium',
            status.kind === 'error'
              ? 'bg-danger-soft border-danger text-danger'
              : 'bg-accent-soft border-accent text-accent',
          )}
        >
          {status.kind === 'error' ? (
            <AlertTriangle size={16} aria-hidden />
          ) : (
            <Check size={16} aria-hidden />
          )}
          {status.message}
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left py-3 px-4 font-semibold text-ink min-w-[160px]">
                  {isTh ? 'โครงการ' : 'Project'}
                </th>
                {DAYS.map(d => (
                  <th key={d} className={`py-3 px-2 text-center font-semibold w-16 ${['sat', 'sun'].includes(d) ? 'text-ink-muted' : 'text-ink'}`}>
                    {isTh ? DAY_LABEL_TH[d] : DAY_LABEL_EN[d]}
                  </th>
                ))}
                <th className="py-3 px-3 text-center font-semibold text-ink w-16">
                  {isTh ? 'รวม' : 'Total'}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const rowTotal = DAYS.reduce((s, d) => s + row[d], 0);
                return (
                  <tr key={rowIdx} className="border-b border-hairline last:border-0 hover:bg-canvas-soft">
                    <td className="py-2 px-4 font-medium text-ink">{row.project}</td>
                    {DAYS.map(d => (
                      <td key={d} className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          value={row[d] === 0 ? '' : row[d]}
                          onChange={e => updateHours(rowIdx, d, Number(e.target.value) || 0)}
                          className="w-14 text-center rounded border border-hairline bg-surface px-1 py-1 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent-soft"
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="py-2 px-3 text-center font-semibold text-ink">{rowTotal}</td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="bg-canvas-soft font-semibold">
                <td className="py-2 px-4 text-ink-muted">{isTh ? 'รวมต่อวัน' : 'Daily total'}</td>
                {totalPerDay.map((t, i) => (
                  <td key={i} className={`py-2 px-2 text-center ${t > 8 ? 'text-[var(--color-danger)]' : 'text-ink'}`}>{t}</td>
                ))}
                <td className="py-2 px-3 text-center text-accent">{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add project row */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={newProject}
          onChange={e => setNewProject(e.target.value)}
          placeholder={isTh ? 'ชื่อโครงการใหม่' : 'New project name'}
          className="flex-1 max-w-xs rounded border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent-soft"
          onKeyDown={e => {
            if (e.key === 'Enter' && newProject.trim()) {
              addRow(newProject.trim());
              setNewProject('');
            }
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { if (newProject.trim()) { addRow(newProject.trim()); setNewProject(''); } }}
        >
          <Plus size={14} className="mr-1" />
          {isTh ? 'เพิ่มโครงการ' : 'Add project'}
        </Button>
      </div>
    </div>
  );
}
