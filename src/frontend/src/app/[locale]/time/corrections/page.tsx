'use client';

// /time/corrections — employee self-service correction page. Now a THIN wrapper
// around the shared <TimeCorrectionForm> (single-authority validation); both this
// route and the inline modal on /time/timesheet render the same form. Submitting
// pushes a pending correction into the time-corrections store → surfaces as a
// 'time_correction' row in /quick-approve (detail at /workflows/time-correction/[id]).
// No backend.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Clock3 } from 'lucide-react';
import { Card, DemoValuesDisclaimer } from '@/components/humi';
import { TimeCorrectionForm } from '@/components/time/TimeCorrectionForm';
import {
  useTimeCorrections,
  CORRECTION_TYPE_LABEL,
  type CorrectionType,
} from '@/stores/time-corrections';
import { useAuthStore } from '@/stores/auth-store';
import { resolveCurrentEmpId } from '@/lib/scope-filter';

const VALID_TYPES: CorrectionType[] = ['in', 'out', 'both'];

export default function TimeCorrectionsPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const allRequests = useTimeCorrections((s) => s.requests);
  const username = useAuthStore((s) => s.username);
  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);
  const empId = resolveCurrentEmpId(email) ?? userId ?? 'EMP000';

  const searchParams = useSearchParams();
  const prefillDate = searchParams.get('date') ?? undefined;
  const prefillTypeParam = searchParams.get('type');
  const prefillType = VALID_TYPES.includes(prefillTypeParam as CorrectionType)
    ? (prefillTypeParam as CorrectionType)
    : undefined;

  const [toast, setToast] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  const myRequests = useMemo(
    () => allRequests.filter((r) => r.employeeId === empId),
    [allRequests, empId],
  );

  function handleSubmitted(id: string) {
    setLastId(id);
    setToast(isTh ? 'ส่งคำขอแก้ไขเวลาแล้ว — รอหัวหน้าอนุมัติ' : 'Correction submitted — awaiting manager');
    setTimeout(() => setToast(null), 3500);
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

      <div className="mt-4">
        <TimeCorrectionForm
          subjectEmpId={empId}
          subjectName={username ?? undefined}
          prefill={{ date: prefillDate, correctionType: prefillType }}
          onSubmitted={handleSubmitted}
          onCancel={undefined}
        />
      </div>

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
      {myRequests.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
            {isTh ? 'คำขอล่าสุดของฉัน' : 'My recent requests'}
          </h2>
          <Card>
            <ul className="divide-y divide-hairline">
              {myRequests.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/${locale}/workflows/time-correction/${r.id}`}
                      className="text-sm font-medium text-ink hover:text-accent transition"
                    >
                      {r.date} · {isTh ? CORRECTION_TYPE_LABEL[r.correctionType].th : CORRECTION_TYPE_LABEL[r.correctionType].en}
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
