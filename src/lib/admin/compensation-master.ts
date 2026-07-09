// compensation-master.ts — shared mock master data for lifecycle compensation forms.
//
// Single typed source for the pay-rate-change / promotion picklists that were
// previously defined inline (with backend-wiring TODOs) inside
// app/[locale]/admin/employees/[id]/pay-rate-change/page.tsx.
//
// Mirrors the style of src/lib/admin/hire/picklists/picklistRegistry.ts:
// typed `as const`, named exports, no runtime classes. This is a SEPARATE
// compensation concern — it is intentionally NOT folded into the hire registry.
//
// Values are moved verbatim from the page; do not invent new codes/values.

import type { Visibility } from '@/lib/capabilities'

// ── Salary Adjust reasons (shown only when Event Reason === PRCHG_SALADJ) ─────
export const SALARY_ADJUST_REASONS = [
  { code: 'ADJ_HIGHER_EDU',   label: 'Acquire Higher Education Degree' },
  { code: 'ADJ_ALLOWANCE',    label: 'Adjust Allowance' },
  { code: 'ADJ_OVER_CEILING', label: 'Adjust Over Ceiling' },
  { code: 'ADJ_STRUCTURE',    label: 'Adjust Salary Structure' },
  { code: 'ADJ_WORKING_DAYS', label: 'Adjust Working Days' },
  { code: 'ADJ_MINIMUM',      label: 'Minimum Adjustment' },
] as const

// ── Pay Group sample codes ────────────────────────────────────────────────────
export const PAY_GROUPS = [
  'B2S:01-31:EOM16D (EQ)',
  'CENTRAL:01-15:EOM',
  'CRC:16-31:EOM',
  'ROBINSON:01-31:EOM',
] as const

// ── Currency picklist ─────────────────────────────────────────────────────────
export const CURRENCIES = ['THB', 'USD', 'EUR', 'JPY', 'SGD'] as const

// ── Pay Component sets — full list for PRCHG_PROMO; subset for PRCHG_SALADJ ────
export const PAY_COMPONENTS_PROMO_SET = [
  'Basic',
  'Position Allowance',
  'Transport Allowance',
  'Meal Allowance',
] as const

export const PAY_COMPONENTS_SALADJ_SUBSET = [
  'Basic',
  'Position Allowance',
] as const

// MOCK seed: current monthly base salary used for the live salary preview.
// Matches the value shown in cnext-mock-data / CompensationSummary.
export const CURRENT_MONTHLY_SALARY = 82_500

// Thai-primary labels for the two compensation reasons surfaced by this form.
// Verbatim from the FOEventReason 5587 set (see ReasonPicker REASON_LABELS).
const EVENT_REASON_LABELS: Record<string, string> = {
  PRCHG_PROMO:  'เลื่อนตำแหน่ง (Promotion)',
  PRCHG_MERINC: 'ปรับขึ้นตามผลงาน (Merit Increase)',
  PRCHG_ADJPOS: 'ปรับตำแหน่ง (Adjust Position)',
  PRCHG_SALADJ: 'ปรับเงินเดือน (Salary Adjust)',
  PRCHG_SALCUT: 'ลดเงินเดือน (Salary Cuts)',
}

/** Resolve a Thai-primary label for an event reason code (falls back to the code). */
export function eventReasonLabel(code: string | null | undefined): string {
  if (!code) return ''
  return EVENT_REASON_LABELS[code] ?? code
}

/**
 * Pay Component LOV for a given event reason: the subset for PRCHG_SALADJ,
 * otherwise the full promo set (used by all other PRCHG reasons).
 */
export function payComponentsFor(eventReason: string | null | undefined): readonly string[] {
  return eventReason === 'PRCHG_SALADJ'
    ? PAY_COMPONENTS_SALADJ_SUBSET
    : PAY_COMPONENTS_PROMO_SET
}

// ── Payroll handoff preview payload ───────────────────────────────────────────

export interface PayrollHandoffComponent {
  component: string
  amount: number
  currency: string
  frequency: string
}

export interface PayrollHandoff {
  eventReason: string
  payGroup: string
  effectiveDate: string
  components: PayrollHandoffComponent[]
}

/** Minimal shape `buildPayrollHandoff` reads off the page form state. */
export interface PayrollHandoffFormInput {
  eventReason: string | null
  payGroup: string
  effectiveDate: string | null
  payComponent: string
  amount: number
  currency: string
  frequency?: string
  recurringPayments?: PayrollHandoffComponent[]
}

/**
 * Pure mapper: builds the payload the request would hand off to payroll from
 * the data already collected in the form. Read-only — no submit side effects.
 * The primary pay component is listed first, followed by any recurring rows.
 */
export function buildPayrollHandoff(form: PayrollHandoffFormInput): PayrollHandoff {
  const primary: PayrollHandoffComponent = {
    component: form.payComponent,
    amount: form.amount,
    currency: form.currency,
    frequency: form.frequency ?? 'Monthly',
  }
  return {
    eventReason: form.eventReason ?? '',
    payGroup: form.payGroup,
    effectiveDate: form.effectiveDate ?? '',
    components: [primary, ...(form.recurringPayments ?? [])],
  }
}

/**
 * Masking decision for a monetary value: real amount only when the
 * EmpCompensation capability is 'full'; masked dots otherwise.
 */
export function maskAmountForCapability(formatted: string, level: Visibility): string {
  return level === 'full' ? formatted : '••••••'
}
