// VALIDATION_EXEMPT: B-action factory page — pre-submit gate via actionAvailability + ActionGuardBanner; mockup phase, client-state only.
'use client'

// revert-termination/page.tsx — ยกเลิกการสิ้นสุดสภาพ (STA-237)
//
// Archetype B contextual action — accessed from a TERMINATED employee detail.
// Undo a committed admin termination: bring the employee back to `active`,
// showing the original approved termination data read-only for review, and
// requiring a supporting document before the revert commits.
//
// Prefill is DERIVED from the latest `terminate` timeline event (useTimelines)
// re-deriving voluntary / sub-reason / transfer / okToRehire via
// TERMINATION_LOGIC[reasonCode]. Only reasonCode/lastDay/okToRehire are
// structured on the event — everything else is reconstructed from reasonCode.
//
// No EffectiveDateGate: a revert is an immediate correction of an erroneous
// termination, not a future-dated lifecycle change — there is no effective
// date to gate on.

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Undo2, Info } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useTimelines } from '@/lib/admin/store/useTimelines'
import { useEmployees } from '@/lib/admin/store/useEmployees'
import { actionAvailability } from '@/lib/admin/actionAvailability'
import { TERMINATION_LOGIC, computeTerminationDate } from '@/lib/admin/termination-logic'
import { REASON_LABELS } from '@/components/admin/lifecycle/ReasonPicker'
import { ActionGuardBanner } from '@/components/admin/ActionGuardBanner'
import { AttachmentDropzone, type AttachedFile } from '@/components/admin/AttachmentDropzone/AttachmentDropzone'
import type { MockEmployee } from '@/mocks/employees'
import type { TerminateEvent, RevertTerminationEvent } from '@hrms/shared/types/timeline'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDateTh(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ─── Read-only prefilled field ────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="humi-label" style={{ display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        readOnly
        aria-readonly="true"
        className="humi-input"
        style={{ width: '100%', opacity: 0.7, cursor: 'default' }}
      />
    </div>
  )
}

// ─── Neutral info card (no original termination data / unsupported reason) ────

function InfoCard({ locale, empId, message }: { locale: string; empId: string; message: string }) {
  return (
    <div className="pb-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Link
          href={`/${locale}/admin/employees/${empId}`}
          className="humi-row text-body text-ink-muted hover:text-accent transition-colors"
          style={{ display: 'inline-flex', gap: 6 }}
        >
          <ArrowLeft size={16} aria-hidden />
          <span>กลับไปหน้าข้อมูลพนักงาน</span>
        </Link>
      </div>
      <div
        role="status"
        className="humi-card humi-card--cream"
        style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
      >
        <Info size={20} aria-hidden style={{ color: 'var(--color-ink-muted)', flexShrink: 0, marginTop: 2 }} />
        <p className="text-body text-ink-muted">{message}</p>
      </div>
    </div>
  )
}

// ─── Confirm dialog (teal/success — NOT danger) ───────────────────────────────

interface ConfirmRevertDialogProps {
  open: boolean
  empId: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmRevertDialog({ open, empId, onConfirm, onCancel }: ConfirmRevertDialogProps) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revert-dialog-title"
      className="humi-drawer-scrim"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div className="humi-card" style={{ maxWidth: 420, width: '100%', margin: 16 }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--color-accent-soft)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Undo2 size={22} aria-hidden />
        </div>
        <h2
          id="revert-dialog-title"
          className="font-display text-lg font-semibold text-ink"
          style={{ marginBottom: 8 }}
        >
          ยืนยันการยกเลิกการสิ้นสุดสภาพ?
        </h2>
        <p className="text-body text-ink-muted" style={{ marginBottom: 8 }}>
          พนักงาน <strong className="text-ink">{empId}</strong> จะกลับมามีสถานะทำงานอยู่
        </p>
        <p className="text-small text-ink-muted" style={{ marginBottom: 20 }}>
          Employee will return to active status.
        </p>
        <div className="humi-row" style={{ gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="humi-btn humi-btn--ghost">
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="humi-btn humi-btn--primary"
            style={{ background: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
          >
            ยืนยัน — คืนสถานะทำงาน
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Employee snapshot (read-only header) ─────────────────────────────────────

function EmployeeSnapshot({ employee }: { employee: MockEmployee }) {
  const nameTh = `${employee.first_name_th} ${employee.last_name_th}`
  const nameEn = `${employee.first_name_en} ${employee.last_name_en}`
  return (
    <div className="humi-card humi-card--cream">
      <div className="humi-eyebrow" style={{ marginBottom: 4 }}>
        {employee.employee_id} · {employee.company}
      </div>
      <div className="font-display text-lg font-semibold text-ink">{nameTh}</div>
      <div className="text-small text-ink-muted mb-3">{nameEn}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" style={{ marginTop: 8 }}>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>สถานะปัจจุบัน</div>
          <div className="text-body font-medium text-ink">ออกจากงาน</div>
        </div>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>ประเภท</div>
          <div className="text-body font-medium text-ink">
            {employee.employee_class === 'PERMANENT' ? 'Permanent' : 'Part-time'}
          </div>
        </div>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>ตำแหน่ง</div>
          <div className="text-body font-medium text-ink">{employee.position_title}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RevertTerminationPage() {
  const params = useParams()
  const router = useRouter()
  const empId = params.id as string
  const locale = useLocale()

  const employee = useEmployees((s) => s.getById(empId)) ?? null
  const updateEmployee = useEmployees((s) => s.updateEmployee)
  const getTimeline = useTimelines((s) => s.get)
  const append = useTimelines((s) => s.append)

  const [files, setFiles] = useState<AttachedFile[]>([])
  const [reasonForRevert, setReasonForRevert] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const lastTerm = employee
    ? (getTimeline(empId).find((e) => e.kind === 'terminate') as TerminateEvent | undefined)
    : undefined
  const logic = lastTerm ? TERMINATION_LOGIC[lastTerm.reasonCode] : undefined

  const canSubmit = files.length > 0

  const doSubmit = useCallback(() => {
    if (!employee || !lastTerm || !canSubmit || submitted) return

    const event: RevertTerminationEvent = {
      id: `evt-revert-${Date.now()}`,
      employeeId: empId,
      kind: 'revert_termination',
      effectiveDate: todayISO(),
      recordedAt: new Date().toISOString(),
      actorUserId: 'admin-current',
      revertedReasonCode: lastTerm.reasonCode,
      notes: reasonForRevert || undefined,
    }
    append(empId, event)
    updateEmployee(empId, { status: 'active', empl_status_code: '5581' })

    setSubmitted(true)
    router.push(
      `/${locale}/admin/employees/${empId}?banner=${encodeURIComponent(
        'ยกเลิกการสิ้นสุดสภาพแล้ว — พนักงานกลับมามีสถานะทำงานอยู่',
      )}`,
    )
  }, [employee, lastTerm, canSubmit, submitted, empId, reasonForRevert, append, updateEmployee, router, locale])

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!employee) {
    return (
      <InfoCard
        locale={locale}
        empId={empId}
        message={`ไม่พบพนักงานรหัส "${empId}"`}
      />
    )
  }

  // ── Defense-in-depth status guard ──────────────────────────────────────────
  const guard = actionAvailability(employee).revert
  if (!guard.ok) {
    return (
      <ActionGuardBanner
        actionKey="revert"
        reason={guard.reason ?? ''}
        backHref={`/${locale}/admin/employees/${empId}`}
        actionLabel="ยกเลิกการสิ้นสุดสภาพ"
      />
    )
  }

  // ── No original termination to revert ──────────────────────────────────────
  if (!lastTerm) {
    return (
      <InfoCard
        locale={locale}
        empId={empId}
        message="ยังไม่มีประวัติการสิ้นสุดสภาพให้ยกเลิก (No prior termination to revert)"
      />
    )
  }

  // ── [Architect Rec1] unsupported/undefined reason logic guard ──────────────
  if (!logic) {
    return (
      <InfoCard
        locale={locale}
        empId={empId}
        message="ไม่พบรายละเอียดเหตุผลการสิ้นสุดสภาพเดิม จึงแสดงข้อมูลไม่ครบ (Termination reason details are unavailable)"
      />
    )
  }

  // ── Derived read-only prefill (from lastTerm + logic) ──────────────────────
  const terminationDate = computeTerminationDate(lastTerm.lastDay)
  const reasonLabel = REASON_LABELS[lastTerm.reasonCode] ?? lastTerm.reasonCode
  const voluntaryLabel = logic.voluntary ? 'สมัครใจ (Voluntary)' : 'ไม่สมัครใจ (Involuntary)'
  const subReason = logic.reasonForTermination.default
  const transferOut = logic.transferOutDefault // always 'NONE' unless Transfer Out
  const okToRehire = lastTerm.okToRehire ?? logic.okToRehireDefault

  return (
    <div className="pb-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back nav */}
      <div>
        <Link
          href={`/${locale}/admin/employees/${empId}`}
          className="humi-row text-body text-ink-muted hover:text-accent transition-colors"
          style={{ display: 'inline-flex', gap: 6 }}
        >
          <ArrowLeft size={16} aria-hidden />
          <span>กลับไปหน้าข้อมูลพนักงาน</span>
        </Link>
      </div>

      {/* Page title */}
      <div className="humi-row" style={{ gap: 10, alignItems: 'center' }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--color-accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: 'var(--color-accent)',
          }}
        >
          <Undo2 size={18} aria-hidden />
        </div>
        <div>
          <div className="humi-eyebrow">การดำเนินการ</div>
          <h1 className="font-display text-xl font-semibold text-ink">
            ยกเลิกการสิ้นสุดสภาพ (Revert Termination)
          </h1>
        </div>
      </div>

      {/* Employee snapshot */}
      <EmployeeSnapshot employee={employee} />

      {/* Original approved termination — read-only prefill */}
      <div className="humi-card">
        <div className="humi-eyebrow" style={{ marginBottom: 4 }}>
          ข้อมูลการสิ้นสุดสภาพเดิม (อ่านอย่างเดียว)
        </div>
        <p className="text-small text-ink-muted" style={{ marginBottom: 16 }}>
          ดึงจากการสิ้นสุดสภาพที่อนุมัติไว้ก่อนหน้า — Original approved termination
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField label="วันที่สิ้นสุดสภาพ (Termination date)" value={formatDateTh(terminationDate)} />
          <ReadOnlyField label="เหตุผล (Reason)" value={reasonLabel} />
          <ReadOnlyField label="ประเภท (Voluntary / Involuntary)" value={voluntaryLabel} />
          <ReadOnlyField label="เหตุผลย่อย (Sub-reason)" value={subReason} />
          <ReadOnlyField label="โอนย้ายออกไปยัง (Transfer out)" value={transferOut} />
          <ReadOnlyField label="จ้างซ้ำได้ (OK to rehire)" value={okToRehire ? 'ใช่ (Yes)' : 'ไม่ (No)'} />
          <ReadOnlyField label="อีเมลส่วนตัว (Personal email)" value="—" />
          <ReadOnlyField label="ข้อมูลเพิ่มเติม (Additional info)" value="—" />
        </div>
      </div>

      {/* Revert inputs */}
      <div className="humi-card">
        <div className="humi-eyebrow" style={{ marginBottom: 16 }}>
          ข้อมูลการยกเลิก (Revert details)
        </div>

        {/* Mandatory supporting document */}
        <div style={{ marginBottom: 20 }}>
          <AttachmentDropzone
            files={files}
            onFilesChange={setFiles}
            required
            label="เอกสารประกอบการยกเลิกการสิ้นสุดสภาพ (Supporting document)"
          />
        </div>

        <hr className="humi-divider" />

        {/* Optional free-text reason */}
        <div style={{ marginTop: 20, marginBottom: 24 }}>
          <label
            htmlFor="reasonForRevert"
            className="text-body font-semibold text-ink"
            style={{ display: 'block', marginBottom: 6 }}
          >
            เหตุผลในการยกเลิก (Reason for revert){' '}
            <span className="text-small text-ink-muted">(ไม่จำเป็น)</span>
          </label>
          <textarea
            id="reasonForRevert"
            value={reasonForRevert}
            onChange={(e) => setReasonForRevert(e.target.value)}
            rows={3}
            placeholder="เหตุผลที่ยกเลิกการสิ้นสุดสภาพ..."
            className="humi-input"
            style={{ width: '100%', resize: 'vertical' }}
            aria-label="เหตุผลในการยกเลิกการสิ้นสุดสภาพ"
          />
        </div>

        {/* Submit */}
        <div className="humi-row" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <Link
            href={`/${locale}/admin/employees/${empId}`}
            className="humi-btn humi-btn--ghost"
          >
            ยกเลิก
          </Link>
          <button
            onClick={() => setDialogOpen(true)}
            disabled={!canSubmit || submitted}
            aria-disabled={!canSubmit || submitted}
            className="humi-btn humi-btn--primary"
            style={{ background: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
          >
            ยืนยันการยกเลิกการสิ้นสุดสภาพ
          </button>
        </div>
        {!canSubmit && (
          <p className="text-small text-ink-muted mt-2" style={{ textAlign: 'right' }}>
            แนบเอกสารประกอบอย่างน้อย 1 ไฟล์ก่อนยืนยัน
          </p>
        )}
      </div>

      <ConfirmRevertDialog
        open={dialogOpen}
        empId={empId}
        onConfirm={() => { setDialogOpen(false); doSubmit() }}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  )
}
