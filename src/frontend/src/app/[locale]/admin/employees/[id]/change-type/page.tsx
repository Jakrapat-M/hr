// VALIDATION_EXEMPT: B-action page — pre-submit gate via actionAvailability; backend workflow deferred.
'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { ActionGuardBanner } from '@/components/admin/ActionGuardBanner'
import { actionAvailability } from '@/lib/admin/actionAvailability'
import { useEmployees } from '@/lib/admin/store/useEmployees'
import type { MockEmployee } from '@/mocks/employees'

const TODAY = new Date().toISOString().slice(0, 10)

const EMPLOYEE_CLASS_LABEL_TH: Record<MockEmployee['employee_class'], string> = {
  PERMANENT: 'พนักงานประจำ',
  PARTIME: 'พนักงานบางเวลา',
}

const EMPLOYEE_CLASS_DESC_TH: Record<MockEmployee['employee_class'], string> = {
  PERMANENT: 'สิทธิและสัญญาตามพนักงานประจำ',
  PARTIME: 'สิทธิและสัญญาตามพนักงานบางเวลา / สัญญาจ้าง',
}

function formatDateTh(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function EmployeeSnapshot({ employee }: { employee: MockEmployee }) {
  const nameTh = `${employee.first_name_th} ${employee.last_name_th}`
  const nameEn = `${employee.first_name_en} ${employee.last_name_en}`

  return (
    <div className="humi-card humi-card--cream">
      <div className="humi-eyebrow" style={{ marginBottom: 4 }}>{employee.employee_id}</div>
      <div className="font-display text-lg font-semibold text-ink">{nameTh}</div>
      <div className="text-small text-ink-muted mb-3">{nameEn}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" style={{ marginTop: 8 }}>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>สถานะ</div>
          <div className="text-body font-medium text-ink">
            {employee.status === 'active' ? 'ทำงานอยู่' : employee.status === 'terminated' ? 'พ้นสภาพ' : 'ไม่ได้ทำงานอยู่'}
          </div>
        </div>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>ประเภทปัจจุบัน</div>
          <div className="text-body font-medium text-ink">{EMPLOYEE_CLASS_LABEL_TH[employee.employee_class]}</div>
        </div>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>วันที่เริ่มงาน</div>
          <div className="text-body font-medium text-ink">{formatDateTh(employee.hire_date)}</div>
        </div>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>ตำแหน่ง</div>
          <div className="text-body font-medium text-ink">{employee.position_title}</div>
        </div>
      </div>
    </div>
  )
}

export default function ChangeTypePage() {
  const params = useParams()
  const router = useRouter()
  const locale = useLocale()
  const empId = params.id as string
  const employee = useEmployees((s) => s.getById(empId)) ?? null
  const updateEmployee = useEmployees((s) => s.updateEmployee)

  const targetClass = useMemo<MockEmployee['employee_class'] | null>(() => {
    if (!employee) return null
    return employee.employee_class === 'PERMANENT' ? 'PARTIME' : 'PERMANENT'
  }, [employee])

  const [effectiveDate, setEffectiveDate] = useState(TODAY)
  const [reason, setReason] = useState('')

  const isValid = !!targetClass && !!effectiveDate && reason.trim().length >= 3

  const doSubmit = useCallback(() => {
    if (!employee || !targetClass || !isValid) return
    updateEmployee(empId, { employee_class: targetClass })
    router.push(
      `/${locale}/admin/employees/${empId}?banner=${encodeURIComponent('บันทึกการเปลี่ยนประเภทการจ้างเรียบร้อย')}`,
    )
  }, [employee, targetClass, isValid, updateEmployee, empId, router, locale])

  if (!employee) {
    return (
      <div className="pb-8" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <Link
            href={`/${locale}/admin/employees`}
            className="humi-row text-body text-ink-muted hover:text-accent transition-colors"
            style={{ display: 'inline-flex', gap: 6 }}
          >
            <ArrowLeft size={16} aria-hidden />
            <span>รายการพนักงาน</span>
          </Link>
        </div>
        <div className="humi-card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-body text-ink-muted">ไม่พบพนักงานรหัส &ldquo;{empId}&rdquo;</p>
        </div>
      </div>
    )
  }

  const guard = actionAvailability(employee).change_type
  if (!guard.ok) {
    return (
      <ActionGuardBanner
        actionKey="change_type"
        reason={guard.reason ?? ''}
        backHref={`/${locale}/admin/employees/${empId}`}
        actionLabel="เปลี่ยนประเภทการจ้าง"
      />
    )
  }

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

      <div className="humi-row" style={{ gap: 10, alignItems: 'center' }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--color-accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: 'var(--color-accent)',
          }}
        >
          <RefreshCw size={18} aria-hidden />
        </div>
        <div>
          <div className="humi-eyebrow">การดำเนินการ</div>
          <h1 className="font-display text-xl font-semibold text-ink">เปลี่ยนประเภทการจ้าง</h1>
        </div>
      </div>

      <EmployeeSnapshot employee={employee} />

      <div className="humi-card ring-1 ring-accent-soft">
        <div className="humi-eyebrow" style={{ marginBottom: 16 }}>Employment Type Change</div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <fieldset>
            <label className="humi-label" htmlFor="current-class">ประเภทปัจจุบัน</label>
            <input
              id="current-class"
              className="humi-input w-full bg-surface-muted cursor-not-allowed"
              value={EMPLOYEE_CLASS_LABEL_TH[employee.employee_class]}
              readOnly
            />
            <p className="mt-1 text-xs text-ink-faint">{EMPLOYEE_CLASS_DESC_TH[employee.employee_class]}</p>
          </fieldset>

          <fieldset>
            <label className="humi-label" htmlFor="target-class">ประเภทใหม่</label>
            <input
              id="target-class"
              className="humi-input w-full bg-surface-muted cursor-not-allowed"
              value={targetClass ? EMPLOYEE_CLASS_LABEL_TH[targetClass] : ''}
              readOnly
            />
            {targetClass && <p className="mt-1 text-xs text-ink-faint">{EMPLOYEE_CLASS_DESC_TH[targetClass]}</p>}
          </fieldset>

          <fieldset>
            <label className="humi-label" htmlFor="effective-date">
              วันที่มีผล<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <input
              id="effective-date"
              type="date"
              min={TODAY}
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="humi-input w-full"
            />
          </fieldset>

          <fieldset>
            <label className="humi-label" htmlFor="change-reason">
              เหตุผล<span aria-hidden="true" className="humi-asterisk ml-1">*</span>
            </label>
            <input
              id="change-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น ปรับรูปแบบสัญญาจ้างตามข้อตกลงใหม่"
              className="humi-input w-full"
            />
          </fieldset>
        </div>
      </div>

      <div className="humi-row" style={{ justifyContent: 'flex-end', gap: 12 }}>
        <Link href={`/${locale}/admin/employees/${empId}`} className="humi-button humi-button--ghost">
          ยกเลิก
        </Link>
        <button type="button" onClick={doSubmit} disabled={!isValid} className="humi-button humi-button--primary disabled:opacity-50">
          บันทึกการเปลี่ยนประเภท
        </button>
      </div>
    </div>
  )
}
