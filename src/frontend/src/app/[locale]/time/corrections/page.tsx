'use client';

// /time/corrections — P3 employee self-service timesheet/attendance correction
// form. Submitting pushes a pending correction into the time-corrections Zustand
// store; the record then surfaces as a 'time_correction' row in the unified
// /quick-approve queue (detail at /workflows/time-correction/[id]). No backend.
//
// Open to all personas (self-service). Humi primitives + tokens only.
// Danger = pumpkin (--color-danger). No hardcoded hex.

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ChevronRight, Clock3 } from 'lucide-react';
import { Card, Button, FormField, FormInput, Textarea, DemoValuesDisclaimer } from '@/components/humi';
import {
  useTimeCorrections,
  TIME_CORRECTION_KIND_LABEL,
  type TimeCorrectionKind,
} from '@/stores/time-corrections';
import { useAuthStore } from '@/stores/auth-store';
import { resolveCurrentEmpId } from '@/lib/scope-filter';

const KINDS: TimeCorrectionKind[] = ['missing-checkin', 'missing-checkout', 'wrong-time', 'forgot-clock'];

export default function TimeCorrectionsPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const addRequest = useTimeCorrections((s) => s.addRequest);
  const myRecent = useTimeCorrections((s) => s.requests);

  const username = useAuthStore((s) => s.username);
  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);

  const [date, setDate] = useState('');
  const [kind, setKind] = useState<TimeCorrectionKind>('wrong-time');
  const [originalTime, setOriginalTime] = useState('');
  const [correctedTime, setCorrectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  const canSubmit = date.trim() !== '' && correctedTime.trim() !== '' && reason.trim() !== '';

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const empId = resolveCurrentEmpId(email) ?? userId ?? 'EMP000';
    const id = addRequest({
      employeeId: empId,
      employeeName: username ?? (isTh ? 'พนักงาน' : 'Employee'),
      department: isTh ? 'ทีมของฉัน' : 'My Team',
      date,
      kind,
      originalTime: originalTime.trim() || undefined,
      correctedTime,
      reason,
    });
    setLastId(id);
    showToast(isTh ? 'ส่งคำขอแก้ไขเวลาแล้ว — รอหัวหน้าอนุมัติ' : 'Correction submitted — awaiting manager');
    // Reset the form (keep the date for convenience).
    setKind('wrong-time');
    setOriginalTime('');
    setCorrectedTime('');
    setReason('');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-ink-muted mb-4" aria-label="breadcrumb">
        <Link href={`/${locale}/time`} className="hover:text-ink transition">
          {isTh ? 'เวลางาน' : 'Time'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-ink font-medium">{isTh ? 'แก้ไขเวลา' : 'Time Correction'}</span>
      </nav>

      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] bg-accent-soft text-accent">
          <Clock3 className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {isTh ? 'ขอแก้ไขเวลาเข้า-ออกงาน' : 'Request a time correction'}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isTh
              ? 'ส่งคำขอแก้ไขเวลาที่บันทึกผิดพลาด คำขอจะถูกส่งให้หัวหน้างานอนุมัติ'
              : 'Submit a correction for a mis-recorded punch. Your manager will review it.'}
          </p>
        </div>
      </div>

      <DemoValuesDisclaimer />

      {/* Form */}
      <Card className="mt-4">
        <div className="flex flex-col gap-4 p-5">
          <FormField label={isTh ? 'วันที่' : 'Date'} required>
            {(controlProps) => (
              <FormInput
                {...controlProps}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </FormField>

          <FormField label={isTh ? 'ประเภทการแก้ไข' : 'Correction type'} required>
            {(controlProps) => (
              <select
                {...controlProps}
                value={kind}
                onChange={(e) => setKind(e.target.value as TimeCorrectionKind)}
                className="h-10 w-full rounded-md border border-hairline bg-surface px-3 text-body text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {isTh ? TIME_CORRECTION_KIND_LABEL[k].th : TIME_CORRECTION_KIND_LABEL[k].en}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={isTh ? 'เวลาเดิม (ถ้ามี)' : 'Original time (if any)'}
              help={isTh ? 'เวลาที่ระบบบันทึกไว้' : 'Time the system recorded'}
            >
              {(controlProps) => (
                <FormInput
                  {...controlProps}
                  type="time"
                  value={originalTime}
                  onChange={(e) => setOriginalTime(e.target.value)}
                />
              )}
            </FormField>

            <FormField label={isTh ? 'เวลาที่ถูกต้อง' : 'Corrected time'} required>
              {(controlProps) => (
                <FormInput
                  {...controlProps}
                  type="time"
                  value={correctedTime}
                  onChange={(e) => setCorrectedTime(e.target.value)}
                />
              )}
            </FormField>
          </div>

          <FormField label={isTh ? 'เหตุผล' : 'Reason'} required>
            {(controlProps) => (
              <Textarea
                {...controlProps}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isTh ? 'อธิบายสาเหตุของการแก้ไข' : 'Explain why this correction is needed'}
              />
            )}
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Link href={`/${locale}/time`} className="humi-button humi-button--ghost" style={{ fontSize: 14 }}>
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </Link>
            <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
              {isTh ? 'ส่งคำขอ' : 'Submit request'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirmation link to the just-submitted row */}
      {lastId && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-4 py-3 text-sm text-ink-muted">
          {isTh ? 'ส่งคำขอแล้ว — ' : 'Submitted — '}
          <Link
            href={`/${locale}/workflows/time-correction/${lastId}`}
            className="text-accent font-medium hover:underline"
          >
            {isTh ? 'ดูคำขอ' : 'View request'}
          </Link>
        </div>
      )}

      {/* My recent corrections */}
      {myRecent.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
            {isTh ? 'คำขอล่าสุดของฉัน' : 'My recent requests'}
          </h2>
          <Card>
            <ul className="divide-y divide-hairline">
              {myRecent.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/${locale}/workflows/time-correction/${r.id}`}
                      className="text-sm font-medium text-ink hover:text-accent transition"
                    >
                      {r.date} · {isTh ? TIME_CORRECTION_KIND_LABEL[r.kind].th : TIME_CORRECTION_KIND_LABEL[r.kind].en}
                    </Link>
                    <div className="text-xs text-ink-muted truncate">{r.reason}</div>
                  </div>
                  <span
                    className={
                      r.status === 'approved'
                        ? 'humi-tag humi-tag--accent'
                        : r.status === 'rejected'
                          ? 'humi-tag'
                          : 'humi-tag humi-tag--butter'
                    }
                    style={{ fontSize: 12 }}
                  >
                    {r.status === 'approved'
                      ? isTh ? 'อนุมัติแล้ว' : 'Approved'
                      : r.status === 'rejected'
                        ? isTh ? 'ปฏิเสธ' : 'Rejected'
                        : isTh ? 'รออนุมัติ' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--radius-md)] border border-hairline bg-surface px-4 py-2 text-sm text-ink shadow-[var(--shadow-md)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
