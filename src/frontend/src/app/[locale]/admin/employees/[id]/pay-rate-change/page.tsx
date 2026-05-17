// VALIDATION_EXEMPT: STA-24 B-action factory page — pre-submit gate via actionAvailability + ActionGuardBanner.
'use client'

// pay-rate-change/page.tsx — ปรับเงินเดือน (Archetype B contextual action)
//
// STA-24: split of /promotion. Hosts the non-promotion PRCHG reasons
// (Merit Increase, Adjust Position, Salary Adjust, Salary Cuts).
//
// C1: surgical — duplicates /promotion structure; routes to pay-rate-approvals store.

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Wallet, Clock, Plus, Trash2 } from 'lucide-react'
import { useEmployees } from '@/lib/admin/store/useEmployees'
import { usePayRateApprovals, PAY_RATE_STEP_LABEL, type PayRateAmountType, type PayRateRecurringPayment } from '@/stores/pay-rate-approvals'
import { usePromotionApprovals } from '@/stores/promotion-approvals'
import { useAuthStore } from '@/stores/auth-store'
import { EffectiveDateGate } from '@/components/admin/EffectiveDateGate'
import { ActionGuardBanner } from '@/components/admin/ActionGuardBanner'
import { actionAvailability } from '@/lib/admin/actionAvailability'
import { ReasonPicker } from '@/components/admin/lifecycle/ReasonPicker'
import { routeToStore, type EventReason } from '@/lib/workflows/route-to-store'
import type { MockEmployee } from '@/mocks/employees'

// ─── Date helpers ────────────────────────────────────────────────────────────

function calcTenure(hireDateStr: string): string {
  const hire = new Date(hireDateStr)
  const now = new Date()
  let years = now.getFullYear() - hire.getFullYear()
  let months = now.getMonth() - hire.getMonth()
  if (months < 0) { years -= 1; months += 12 }
  if (years === 0) return `${months} เดือน`
  if (months === 0) return `${years} ปี`
  return `${years} ปี ${months} เดือน`
}

function formatDateTh(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ─── Picklists (TODO: backend wiring) ────────────────────────────────────────

// STA-24: Reason for Salary Adjust — only when Event Reason === PRCHG_SALADJ.
// TODO(STA-24): replace with backend picklist once available.
const SALARY_ADJUST_REASONS = [
  { code: 'ADJ_HIGHER_EDU',   label: 'Acquire Higher Education Degree' },
  { code: 'ADJ_ALLOWANCE',    label: 'Adjust Allowance' },
  { code: 'ADJ_OVER_CEILING', label: 'Adjust Over Ceiling' },
  { code: 'ADJ_STRUCTURE',    label: 'Adjust Salary Structure' },
  { code: 'ADJ_WORKING_DAYS', label: 'Adjust Working Days' },
  { code: 'ADJ_MINIMUM',      label: 'Minimum Adjustment' },
] as const

// STA-24: Pay Group sample codes. TODO(STA-24): replace with backend picklist.
const PAY_GROUPS = [
  'B2S:01-31:EOM16D (EQ)',
  'CENTRAL:01-15:EOM',
  'CRC:16-31:EOM',
  'ROBINSON:01-31:EOM',
] as const

// STA-24: Currency picklist. TODO(STA-24): confirm full ISO list with backend.
const CURRENCIES = ['THB', 'USD', 'EUR', 'JPY', 'SGD'] as const

// STA-24: Pay Component sets — full list for PRCHG_PROMO; subset for PRCHG_SALADJ.
const PAY_COMPONENTS_PROMO_SET = [
  'Basic',
  'Position Allowance',
  'Transport Allowance',
  'Meal Allowance',
] as const

const PAY_COMPONENTS_SALADJ_SUBSET = [
  'Basic',
  'Position Allowance',
] as const

// All components union for recurring payments table (always full list)
const PAY_COMPONENTS = PAY_COMPONENTS_PROMO_SET

// ─── Employee snapshot (readonly) ────────────────────────────────────────────

function EmployeeSnapshot({ employee }: { employee: MockEmployee }) {
  const nameTh = `${employee.first_name_th} ${employee.last_name_th}`
  const nameEn = `${employee.first_name_en} ${employee.last_name_en}`
  const tenure = calcTenure(employee.hire_date)
  const hireDateFmt = formatDateTh(employee.hire_date)
  const currentTitle = (employee as unknown as Record<string, unknown>).corporate_title as string | undefined
    ?? employee.position_title

  return (
    <div className="humi-card humi-card--cream">
      <div className="humi-eyebrow" style={{ marginBottom: 4 }}>{employee.employee_id}</div>
      <div className="font-display text-[18px] font-semibold text-ink">{nameTh}</div>
      <div className="text-small text-ink-muted mb-3">{nameEn}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" style={{ marginTop: 8 }}>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>บริษัท</div>
          <div className="text-body font-medium text-ink">{employee.company}</div>
        </div>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>ตำแหน่งปัจจุบัน</div>
          <div className="text-body font-medium text-ink">{currentTitle}</div>
        </div>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>Job Grade</div>
          <div className="text-body font-medium text-ink">{employee.job_grade}</div>
        </div>
        <div>
          <div className="humi-eyebrow" style={{ marginBottom: 2 }}>วันที่เริ่มงาน</div>
          <div className="text-body font-medium text-ink">{hireDateFmt}</div>
          <div className="text-small text-ink-muted">{tenure}</div>
        </div>
      </div>
    </div>
  )
}

// ─── SPD Approval Chain Banner ───────────────────────────────────────────────

function ApprovalChainBanner({ employeeId }: { employeeId: string }) {
  const requests = usePayRateApprovals((s) => s.requests)
  const pending = requests.filter((r) => r.employeeId === employeeId && r.status === 'pending_spd')
  if (pending.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="humi-card"
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        background: 'var(--color-accent-soft, #EFF6FF)',
        border: '1.5px solid var(--color-accent, #2563EB)',
        padding: 16,
      }}
    >
      <div className="humi-eyebrow" style={{ color: 'var(--color-accent)' }}>สถานะการอนุมัติ</div>
      {pending.map((req) => (
        <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={16} aria-hidden style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <div className="text-small text-ink">
            <span className="font-semibold">{PAY_RATE_STEP_LABEL[req.status]}</span>
            {' — '}{req.eventReasonCode}
            <span className="text-ink-muted ml-2">
              (ส่งเมื่อ {new Date(req.submittedAt).toLocaleDateString('th-TH')})
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Exported helpers (for tests) ────────────────────────────────────────────

/** STA-24: percent amount must be 0–50 inclusive. */
export function isPercentAmountValid(pct: number): boolean {
  return pct >= 0 && pct <= 50
}

/** STA-24: flat amount must be a finite positive number. */
export function isFlatAmountValid(amt: number): boolean {
  return Number.isFinite(amt) && amt > 0
}

// ─── Main page ────────────────────────────────────────────────────────────────

// STA-24: Show ALL PRCHG reasons including PRCHG_PROMO — form handles both via Event Reason switching.
// routeToStore() in doSubmit decides which store gets the approval entry.

export default function PayRateChangePage() {
  const params = useParams()
  const router = useRouter()
  const empId = params.id as string
  const locale = params.locale as string

  const employee = useEmployees((s) => s.getById(empId)) ?? null

  const t = useTranslations('admin.promotionPayChange')
  const addPayRateRequest = usePayRateApprovals((s) => s.addRequest)
  const addPromotionRequest = usePromotionApprovals((s) => s.addRequest)
  const actorId = useAuthStore((s) => s.userId) ?? 'ADM001'
  const actorName = useAuthStore((s) => s.username) ?? 'HR Admin'

  // Form state
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null)
  const [eventReason, setEventReason] = useState<string | null>(null)
  const [reasonForSalaryAdjust, setReasonForSalaryAdjust] = useState<string>('')
  const [payGroup, setPayGroup] = useState<string>('')
  const [payrollId, setPayrollId] = useState<string>('')
  const [payComponent, setPayComponent] = useState<string>(PAY_COMPONENTS[0])
  const [amountType, setAmountType] = useState<PayRateAmountType>('percent')
  const [amount, setAmount] = useState<string>('')
  const [currency, setCurrency] = useState<string>('THB')
  const [notes, setNotes] = useState<string>('')
  const [recurring, setRecurring] = useState<PayRateRecurringPayment[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [amountError, setAmountError] = useState('')

  // Default Payroll ID from employee (initial value only — admin may override)
  useEffect(() => {
    if (employee && !payrollId) setPayrollId(employee.employee_id)
  }, [employee, payrollId])

  const isSalaryAdjust = eventReason === 'PRCHG_SALADJ'
  // Pay Component LOV: SALADJ uses filtered subset; all other reasons use full set
  const payComponentOptions: readonly string[] = isSalaryAdjust
    ? PAY_COMPONENTS_SALADJ_SUBSET
    : PAY_COMPONENTS_PROMO_SET

  // Validate amount based on type
  const amountNum = amount !== '' ? parseFloat(amount) : NaN
  const amountValid = amount !== '' && !isNaN(amountNum) && (
    amountType === 'percent' ? isPercentAmountValid(amountNum) : isFlatAmountValid(amountNum)
  )

  const isFormValid =
    !!effectiveDate &&
    !!eventReason &&
    (!isSalaryAdjust || !!reasonForSalaryAdjust) &&
    !!payGroup &&
    !!payrollId.trim() &&
    !!payComponent &&
    amountValid &&
    !!currency

  const addRecurringRow = () => {
    setRecurring((rows) => [
      ...rows,
      { payComponent: PAY_COMPONENTS[0], amount: 0, currency: 'THB', frequency: 'Monthly' },
    ])
  }
  const removeRecurringRow = (idx: number) => {
    setRecurring((rows) => rows.filter((_, i) => i !== idx))
  }
  const updateRecurring = (idx: number, patch: Partial<PayRateRecurringPayment>) => {
    setRecurring((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const doSubmit = useCallback(() => {
    if (!employee || !isFormValid || !effectiveDate || !eventReason) return
    if (!amountValid) {
      setAmountError(amountType === 'percent' ? 'ระบุ 0–50 เท่านั้น' : 'ระบุจำนวนเงินที่มากกว่า 0')
      return
    }

    const empName = `${employee.first_name_th} ${employee.last_name_th}`
    const targetStore = routeToStore(eventReason as EventReason)

    if (targetStore === 'promotion-approvals') {
      addPromotionRequest({
        employeeId: empId,
        employeeName: empName,
        fromPosition: employee.position_title ?? '',
        toPosition: employee.position_title ?? '',
        effectiveDate,
        salaryDelta: amountType === 'percent' ? amountNum : undefined,
        notes: notes.trim() || undefined,
        submittedBy: { id: actorId, name: actorName, role: 'hr_admin' },
      })
    } else {
      addPayRateRequest({
        employeeId: empId,
        employeeName: empName,
        effectiveDate,
        eventReasonCode: eventReason as 'PRCHG_MERINC' | 'PRCHG_ADJPOS' | 'PRCHG_SALADJ' | 'PRCHG_SALCUT',
        reasonForSalaryAdjustCode: isSalaryAdjust ? reasonForSalaryAdjust : undefined,
        payGroup,
        payrollId: payrollId.trim(),
        payComponent,
        amountType,
        amount: amountNum,
        currency,
        frequency: 'Monthly', // TODO(STA-24): derive from payroll-component relation
        recurringPayments: recurring,
        notes: notes.trim() || undefined,
        submittedBy: { id: actorId, name: actorName, role: 'hr_admin' },
      })
    }

    setSubmitted(true)
    router.push(
      `/${locale}/admin/employees/${empId}?banner=${encodeURIComponent('บันทึกการปรับเงินเดือนเรียบร้อยแล้ว — รอ SPD อนุมัติ')}`,
    )
  }, [
    employee, isFormValid, effectiveDate, eventReason, amountValid, amountType, amountNum,
    isSalaryAdjust, reasonForSalaryAdjust, payGroup, payrollId, payComponent, currency, recurring, notes,
    addPayRateRequest, addPromotionRequest, empId, actorId, actorName, router, locale,
  ])

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

  const guard = actionAvailability(employee).payRateChange
  if (!guard.ok) {
    return (
      <ActionGuardBanner
        actionKey="payRateChange"
        reason={guard.reason ?? ''}
        backHref={`/${locale}/admin/employees/${empId}`}
        actionLabel="ปรับเงินเดือน"
      />
    )
  }

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
          <Wallet size={18} aria-hidden />
        </div>
        <div>
          <div className="humi-eyebrow">การดำเนินการ</div>
          <h1 className="font-display text-xl font-semibold text-ink">{t('pageTitle')}</h1>
        </div>
      </div>

      {/* Employee snapshot */}
      <EmployeeSnapshot employee={employee} />

      {/* SPD Approval Chain Banner */}
      <ApprovalChainBanner employeeId={empId} />

      <div className="humi-card humi-card--cream">
        <div className="humi-eyebrow" style={{ marginBottom: 6 }}>STA-41 demo boundary</div>
        <p className="text-small text-ink-soft">
          HR Admin submits promotion/pay-rate changes to Comp/SPD review with a required effective date.
          Amounts and pay components are sensitive demo data; this screen does not post payroll,
          write SuccessFactors, create audit evidence, or configure a workflow engine.
        </p>
      </div>

      {/* Form — gated by effectiveDate */}
      <EffectiveDateGate
        initialEffectiveDate={effectiveDate ?? undefined}
        onEffectiveDateChange={(date) => setEffectiveDate(date)}
      >
        {() => (
          <div className="humi-card ring-1 ring-accent-soft">
            <div className="humi-eyebrow" style={{ marginBottom: 16 }}>Compensation Information</div>

            {/* ── Event (read-only chip) ── */}
            <div style={{ marginBottom: 20 }}>
              <label
                className="text-body font-semibold text-ink"
                style={{ display: 'block', marginBottom: 6 }}
              >
                Event
              </label>
              <span
                data-testid="event-chip"
                className="text-body font-medium text-ink"
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: 'var(--color-surface-muted, #F5F5F5)',
                  borderRadius: 999,
                }}
              >
                Pay Rate Change (5587)
              </span>
            </div>

            {/* ── Event Reason (required) — all PRCHG reasons including PRCHG_PROMO ── */}
            <div style={{ marginBottom: 20 }}>
              <ReasonPicker
                id="pay-rate-event-reason"
                event="5587"
                value={eventReason}
                onChange={(code) => { setEventReason(code); setReasonForSalaryAdjust('') }}
                required
              />
            </div>

            {/* ── Reason for Salary Adjust (conditional — absent from DOM unless PRCHG_SALADJ) ── */}
            {isSalaryAdjust && (
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="reasonForSalaryAdjust"
                  className="text-body font-semibold text-ink"
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  Reason for Salary Adjust
                  <span className="ml-1 text-danger" aria-hidden>*</span>
                </label>
                <select
                  id="reasonForSalaryAdjust"
                  value={reasonForSalaryAdjust}
                  onChange={(e) => setReasonForSalaryAdjust(e.target.value)}
                  aria-required
                  className={[
                    'w-full rounded-md border px-3 py-2 text-body bg-surface text-ink',
                    'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas',
                    'border-hairline focus:border-accent',
                  ].join(' ')}
                >
                  <option value="" disabled>— เลือกเหตุผล —</option>
                  {SALARY_ADJUST_REASONS.map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Pay Group (required) ── */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="payGroup"
                className="text-body font-semibold text-ink"
                style={{ display: 'block', marginBottom: 6 }}
              >
                Pay Group <span className="text-danger" aria-hidden>*</span>
              </label>
              <select
                id="payGroup"
                value={payGroup}
                onChange={(e) => setPayGroup(e.target.value)}
                aria-required
                className={[
                  'w-full rounded-md border px-3 py-2 text-body bg-surface text-ink',
                  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas',
                  'border-hairline focus:border-accent',
                ].join(' ')}
              >
                <option value="" disabled>— เลือก Pay Group —</option>
                {PAY_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* ── Payroll ID (required) ── */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="payrollId"
                className="text-body font-semibold text-ink"
                style={{ display: 'block', marginBottom: 6 }}
              >
                Payroll ID <span className="text-danger" aria-hidden>*</span>
              </label>
              <input
                id="payrollId"
                type="text"
                value={payrollId}
                onChange={(e) => setPayrollId(e.target.value)}
                aria-required
                className="humi-input"
                style={{ maxWidth: 320 }}
              />
            </div>

            {/* ── Pay Component (required, LOV filtered by Event Reason) ── */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="payComponent"
                className="text-body font-semibold text-ink"
                style={{ display: 'block', marginBottom: 6 }}
              >
                Pay Component <span className="text-danger" aria-hidden>*</span>
              </label>
              <select
                id="payComponent"
                value={payComponent}
                onChange={(e) => setPayComponent(e.target.value)}
                aria-required
                className={[
                  'w-full rounded-md border px-3 py-2 text-body bg-surface text-ink',
                  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas',
                  'border-hairline focus:border-accent',
                ].join(' ')}
                style={{ maxWidth: 320 }}
              >
                {payComponentOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {isSalaryAdjust && (
                <p
                  data-testid="pay-component-filter-helper"
                  className="text-small text-content-muted"
                  style={{ marginTop: 4 }}
                >
                  {t('helper.salaryAdjustFilter')}
                </p>
              )}
            </div>

            {/* ── Amount type toggle + Amount (required) ── */}
            <div style={{ marginBottom: 20 }}>
              <label
                className="text-body font-semibold text-ink"
                style={{ display: 'block', marginBottom: 6 }}
              >
                Amount <span className="text-danger" aria-hidden>*</span>
              </label>
              <div role="radiogroup" aria-label="Amount type" style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="radio"
                    name="amountType"
                    value="percent"
                    checked={amountType === 'percent'}
                    onChange={() => { setAmountType('percent'); setAmountError('') }}
                    aria-label="percent"
                  />
                  <span className="text-body text-ink">%</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="radio"
                    name="amountType"
                    value="flat"
                    checked={amountType === 'flat'}
                    onChange={() => { setAmountType('flat'); setAmountError('') }}
                    aria-label="flat"
                  />
                  <span className="text-body text-ink">THB (flat)</span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                  id="amount"
                  type="number"
                  min={amountType === 'percent' ? 0 : 0}
                  max={amountType === 'percent' ? 50 : undefined}
                  step={amountType === 'percent' ? 0.1 : 1}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setAmountError('') }}
                  placeholder={amountType === 'percent' ? 'เช่น 10' : 'เช่น 5000'}
                  className="humi-input"
                  style={{ maxWidth: 160 }}
                  aria-label="amount value"
                  aria-required
                />
                {/* THB currency chip — inline suffix */}
                <span
                  data-testid="currency-thb-chip"
                  className="text-small font-medium bg-surface-subtle text-content-muted"
                  style={{ padding: '4px 10px', borderRadius: 999, display: 'inline-block' }}
                >
                  THB
                </span>
                {/* Frequency Monthly chip — inline suffix */}
                <span
                  data-testid="frequency-monthly-chip"
                  className="text-small font-medium bg-surface-subtle text-content-muted"
                  style={{ padding: '4px 10px', borderRadius: 999, display: 'inline-block' }}
                >
                  Monthly
                </span>
              </div>
              {amount !== '' && !amountValid && (
                <p role="alert" className="humi-error text-danger" style={{ marginTop: 4 }}>
                  {amountError || (amountType === 'percent' ? 'ระบุ 0–50 เท่านั้น' : 'ระบุจำนวนเงินที่มากกว่า 0')}
                </p>
              )}
            </div>

            {/* ── Currency (required, default THB) ── */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="currency"
                className="text-body font-semibold text-ink"
                style={{ display: 'block', marginBottom: 6 }}
              >
                Currency <span className="text-danger" aria-hidden>*</span>
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-required
                className={[
                  'w-full rounded-md border px-3 py-2 text-body bg-surface text-ink',
                  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas',
                  'border-hairline focus:border-accent',
                ].join(' ')}
                style={{ maxWidth: 200 }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* ── Frequency (read-only chip) ── */}
            <div style={{ marginBottom: 20 }}>
              <label
                className="text-body font-semibold text-ink"
                style={{ display: 'block', marginBottom: 6 }}
              >
                Frequency
              </label>
              <span
                data-testid="frequency-chip"
                className="text-body font-medium text-ink"
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: 'var(--color-surface-muted, #F5F5F5)',
                  borderRadius: 999,
                }}
              >
                Monthly
              </span>
              {/* TODO(STA-24): derive from payroll-component master once relation lands. */}
            </div>

            {/* ── Recurring Payments table ── */}
            <div style={{ marginBottom: 24 }}>
              <div className="humi-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="text-body font-semibold text-ink">Recurring Payments</label>
                <button
                  type="button"
                  onClick={addRecurringRow}
                  className="humi-btn humi-btn--ghost"
                  data-testid="add-recurring-row"
                  aria-label="Add recurring payment row"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={14} aria-hidden /> เพิ่มรายการ
                </button>
              </div>

              {recurring.length === 0 ? (
                <p className="text-small text-ink-muted">ยังไม่มีรายการ — กด &ldquo;เพิ่มรายการ&rdquo; เพื่อเพิ่ม</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recurring.map((row, idx) => (
                    <div
                      key={idx}
                      data-testid={`recurring-row-${idx}`}
                      className="humi-row"
                      style={{
                        gap: 8,
                        padding: 8,
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--color-hairline, #E5E5E5)',
                        background: 'var(--color-canvas-soft, #FAFAFA)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <select
                        value={row.payComponent}
                        onChange={(e) => updateRecurring(idx, { payComponent: e.target.value })}
                        aria-label={`pay component row ${idx}`}
                        className="w-full rounded-md border border-hairline px-2 py-1 text-body bg-surface text-ink"
                        style={{ flex: '1 1 180px', minWidth: 140 }}
                      >
                        {PAY_COMPONENTS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={row.amount}
                        onChange={(e) => updateRecurring(idx, { amount: parseFloat(e.target.value) || 0 })}
                        aria-label={`amount row ${idx}`}
                        className="humi-input"
                        style={{ flex: '0 1 120px' }}
                      />
                      <select
                        value={row.currency}
                        onChange={(e) => updateRecurring(idx, { currency: e.target.value })}
                        aria-label={`currency row ${idx}`}
                        className="rounded-md border border-hairline px-2 py-1 text-body bg-surface text-ink"
                        style={{ flex: '0 1 100px' }}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={row.frequency}
                        onChange={(e) => updateRecurring(idx, { frequency: e.target.value })}
                        aria-label={`frequency row ${idx}`}
                        className="humi-input"
                        style={{ flex: '0 1 120px' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeRecurringRow(idx)}
                        aria-label={`remove recurring row ${idx}`}
                        data-testid={`remove-recurring-row-${idx}`}
                        className="humi-btn humi-btn--ghost"
                        style={{ padding: '4px 8px' }}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── หมายเหตุ (optional) ── */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="notes"
                className="text-body font-semibold text-ink"
                style={{ display: 'block', marginBottom: 6 }}
              >
                หมายเหตุ <span className="text-small text-ink-muted">(ไม่จำเป็น)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="หมายเหตุเพิ่มเติม..."
                className="humi-input"
                style={{ width: '100%', resize: 'vertical', maxWidth: 560 }}
                aria-label="หมายเหตุ"
              />
            </div>

            {/* ── Action buttons ── */}
            <div className="humi-row" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <Link
                href={`/${locale}/admin/employees/${empId}`}
                className="humi-btn humi-btn--ghost"
              >
                ยกเลิก
              </Link>
              <button
                type="button"
                onClick={doSubmit}
                disabled={!isFormValid || submitted}
                className="humi-btn humi-btn--primary"
                aria-disabled={!isFormValid || submitted}
              >
                บันทึกการปรับเงินเดือน
              </button>
            </div>
          </div>
        )}
      </EffectiveDateGate>
    </div>
  )
}
