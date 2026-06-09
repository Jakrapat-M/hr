// VALIDATION_EXEMPT: STA-95 — reallocate next-year medical budget into the current year.
'use client'

// reallocate-budget/page.tsx — โอนงบสวัสดิการปีหน้ามาใช้ปีนี้ (STA-95)
//
// Moves part of an employee's NEXT-year medical budget into the CURRENT year.
// Mirrors the Special-Privilege form/scaffold. Mockup phase — no backend; the
// current-year base is derived from the plan registry (single source of truth),
// the store owns only the next-year base + the reallocation deltas.

import { useCallback, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowLeftRight } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useEmployees } from '@/lib/admin/store/useEmployees'
import { formatCurrency } from '@/lib/date'
import { useAuthStore } from '@/stores/auth-store'
import { ActionGuardBanner } from '@/components/admin/ActionGuardBanner'
import { actionAvailability } from '@/lib/admin/actionAvailability'
import { Textarea } from '@/components/humi'
import {
  BENEFIT_PLAN_REGISTRY,
  getPlan,
  isV2Plan,
} from '@/data/benefits/plan-registry'
import {
  useBudgetReallocationStore,
  selectReallocationsForEmployee,
  selectNextYearBase,
} from '@/stores/budget-reallocation-store'

// Medical plans only — the budget being reallocated is the medical benefit.
const MEDICAL_PLANS = BENEFIT_PLAN_REGISTRY.filter((p) => p.id.startsWith('BE-MED-'))
const DEFAULT_PLAN_ID = MEDICAL_PLANS[0]?.id ?? ''

const SELECT_CLASS = [
  'w-full rounded-md border px-3 py-2 text-body bg-surface text-ink',
  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas',
  'border-hairline focus:border-accent',
].join(' ')

/** Current-year base for a medical plan = its registry entitlement (v2 only). */
function planRegistryBase(planId: string): number {
  const plan = getPlan(planId)
  return plan && isV2Plan(plan) ? plan.coverage.entitlementAmount ?? 0 : 0
}

export default function ReallocateBudgetPage() {
  const params = useParams()
  const router = useRouter()
  const empId = params.id as string
  const locale = params.locale as string

  const employee = useEmployees((s) => s.getById(empId)) ?? null
  const t = useTranslations('admin.reallocateBudget')

  const addReallocation = useBudgetReallocationStore((s) => s.addReallocation)
  const actorName = useAuthStore((s) => s.username) ?? 'HR Admin'
  const records = useBudgetReallocationStore(
    useShallow(selectReallocationsForEmployee(empId)),
  )

  // Form state
  const [planId, setPlanId] = useState<string>(DEFAULT_PLAN_ID)
  const [amount, setAmount] = useState<string>('')
  const [effectiveStart, setEffectiveStart] = useState<string>('')
  const [effectiveEnd, setEffectiveEnd] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [submitted, setSubmitted] = useState(false)
  const [reasonError, setReasonError] = useState(false)

  const nextYearBase = useBudgetReallocationStore(selectNextYearBase(empId, planId))

  // Already-reallocated for this employee + plan (excludes the in-progress amount).
  const priorMoved = useMemo(
    () => records.filter((r) => r.planId === planId).reduce((s, r) => s + r.amount, 0),
    [records, planId],
  )

  const registryBase = planRegistryBase(planId)
  const amountNum = amount !== '' ? Number(amount) : 0
  const currentBefore = registryBase + priorMoved
  const nextBefore = nextYearBase - priorMoved
  const currentAfter = currentBefore + amountNum
  const nextAfter = nextBefore - amountNum

  const amountInvalid = amountNum <= 0 // hard block — a zero/negative move is meaningless
  const exceedsNext = amountNum > nextBefore // soft warn — next-year pool would go negative
  const canSubmit = !submitted && !amountInvalid

  const doSubmit = useCallback(() => {
    if (!employee || submitted) return
    if (amountNum <= 0) return
    if (!reason.trim()) {
      setReasonError(true)
      return
    }
    addReallocation({
      employeeId: empId,
      planId,
      amount: amountNum,
      effectiveStartDate: effectiveStart ? new Date(effectiveStart).toISOString() : '',
      effectiveEndDate: effectiveEnd ? new Date(effectiveEnd).toISOString() : '',
      reason: reason.trim(),
      createdBy: actorName,
    })
    setSubmitted(true)
    router.push(`/${locale}/admin/employees/${empId}`)
  }, [
    employee, submitted, amountNum, reason, addReallocation, empId, planId,
    effectiveStart, effectiveEnd, actorName, router, locale,
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

  // Deep-link guard — same change_type isActive gate as the action card.
  const guard = actionAvailability(employee).change_type
  if (!guard.ok) {
    return (
      <ActionGuardBanner
        actionKey="change_type"
        reason={guard.reason ?? ''}
        backHref={`/${locale}/admin/employees/${empId}`}
        actionLabel={t('title')}
      />
    )
  }

  const nameTh = `${employee.first_name_th} ${employee.last_name_th}`
  const nameEn = `${employee.first_name_en} ${employee.last_name_en}`

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
          <ArrowLeftRight size={18} aria-hidden />
        </div>
        <div>
          <div className="humi-eyebrow">{t('pageTitle')}</div>
          <h1 className="font-display text-xl font-semibold text-ink">{t('title')}</h1>
        </div>
      </div>

      {/* Employee snapshot */}
      <div className="humi-card humi-card--cream">
        <div className="humi-eyebrow" style={{ marginBottom: 4 }}>{employee.employee_id}</div>
        <div className="font-display text-lg font-semibold text-ink">{nameTh}</div>
        <div className="text-small text-ink-muted">{nameEn}</div>
        <p className="text-small text-ink-soft" style={{ marginTop: 8 }}>{t('subtitle')}</p>
      </div>

      {/* Form */}
      <div className="humi-card ring-1 ring-accent-soft">
        {/* Medical plan */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="rb-plan" className="text-body font-semibold text-ink" style={{ display: 'block', marginBottom: 6 }}>
            {t('fields.plan')}
          </label>
          <select
            id="rb-plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className={SELECT_CLASS}
            style={{ maxWidth: 420 }}
          >
            {MEDICAL_PLANS.map((p) => (
              <option key={p.id} value={p.id}>{locale === 'th' ? p.nameTh : p.nameEn}</option>
            ))}
          </select>
        </div>

        {/* Amount to move next → current */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="rb-amount" className="text-body font-semibold text-ink" style={{ display: 'block', marginBottom: 6 }}>
            {t('fields.amount')} <span className="text-danger" aria-hidden>*</span>
          </label>
          <input
            id="rb-amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="humi-input"
            style={{ maxWidth: 240 }}
          />
          {exceedsNext && (
            <p role="status" className="text-small text-danger" style={{ marginTop: 4 }}>
              {t('validation.exceedsNextYearWarn')}
            </p>
          )}
        </div>

        {/* Live preview — current ↑ / next ↓ */}
        <div
          className="humi-row"
          style={{
            gap: 24, marginBottom: 20, flexWrap: 'wrap', padding: '12px 16px',
            borderRadius: 10, background: 'var(--color-canvas-soft)',
          }}
        >
          <div>
            <div className="humi-eyebrow">{t('preview.current')}</div>
            <div className="text-body font-semibold text-ink tabular-nums">
              {formatCurrency(currentBefore)} <span className="text-ink-muted">→</span>{' '}
              <span className="text-accent">{formatCurrency(currentAfter)}</span>
            </div>
          </div>
          <div>
            <div className="humi-eyebrow">{t('preview.next')}</div>
            <div className="text-body font-semibold text-ink tabular-nums">
              {formatCurrency(nextBefore)} <span className="text-ink-muted">→</span>{' '}
              <span className={nextAfter < 0 ? 'text-danger' : 'text-ink'}>{formatCurrency(nextAfter)}</span>
            </div>
          </div>
        </div>

        {/* Effective dates */}
        <div className="humi-row" style={{ gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label htmlFor="rb-start" className="text-body font-semibold text-ink" style={{ display: 'block', marginBottom: 6 }}>
              {t('fields.effectiveStart')}
            </label>
            <input id="rb-start" type="date" value={effectiveStart} onChange={(e) => setEffectiveStart(e.target.value)} className="humi-input" style={{ maxWidth: 240 }} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label htmlFor="rb-end" className="text-body font-semibold text-ink" style={{ display: 'block', marginBottom: 6 }}>
              {t('fields.effectiveEnd')}
            </label>
            <input id="rb-end" type="date" value={effectiveEnd} onChange={(e) => setEffectiveEnd(e.target.value)} className="humi-input" style={{ maxWidth: 240 }} />
          </div>
        </div>

        {/* Reason (required) */}
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="rb-reason" className="text-body font-semibold text-ink" style={{ display: 'block', marginBottom: 6 }}>
            {t('fields.reason')} <span className="text-danger" aria-hidden>*</span>
          </label>
          <Textarea
            id="rb-reason"
            required
            invalid={reasonError}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonError(false) }}
            rows={3}
            style={{ maxWidth: 560 }}
          />
          {reasonError && (
            <p role="alert" className="text-small text-danger" style={{ marginTop: 4 }}>
              {t('validation.reasonRequired')}
            </p>
          )}
          {amountInvalid && amount !== '' && (
            <p role="alert" className="text-small text-danger" style={{ marginTop: 4 }}>
              {t('validation.amountPositive')}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="humi-row" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <Link href={`/${locale}/admin/employees/${empId}`} className="humi-btn humi-btn--ghost">
            {t('buttons.cancel')}
          </Link>
          <button
            type="button"
            onClick={doSubmit}
            disabled={!canSubmit}
            className="humi-btn humi-btn--primary"
            aria-disabled={!canSubmit}
          >
            {t('buttons.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
