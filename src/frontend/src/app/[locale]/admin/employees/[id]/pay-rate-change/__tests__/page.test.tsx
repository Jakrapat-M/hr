// pay-rate-change/page.test.tsx — STA-24 regression for /pay-rate-change route
// Parametrized per reason (PROMO vs SALADJ) + existing field/validator coverage.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { isPercentAmountValid, isFlatAmountValid } from '../page'

// ─── Mock next/navigation ────────────────────────────────────────────────────
const navMocks = vi.hoisted(() => ({
  push: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'EMP00001', locale: 'th' })),
  useRouter: vi.fn(() => ({
    push: navMocks.push,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
}))

// ─── Mock next-intl ──────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => (
    key === 'pageTitle' ? 'ข้อมูลการเลื่อนตำแหน่ง/ปรับเงินเดือน' : key
  ),
}))

// ─── Mock auth store ─────────────────────────────────────────────────────────
vi.mock('@/stores/auth-store', () => {
  const state = { userId: 'ADM001', username: 'HR Admin' }
  const useAuthStore = Object.assign(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState: () => state, setState: vi.fn(), subscribe: vi.fn() },
  )
  return { useAuthStore }
})

// ─── Mock employees store ─────────────────────────────────────────────────────
const MOCK_EMP = {
  employee_id: 'EMP00001',
  first_name_th: 'สมชาย',
  last_name_th: 'ใจดี',
  first_name_en: 'Somchai',
  last_name_en: 'Jaidee',
  company: 'CEN',
  position_title: 'Senior Analyst',
  job_grade: 'G7',
  hire_date: '2020-01-15',
  status: 'active' as const,
  probation_status: 'passed' as const,
  employee_class: 'PERMANENT' as const,
}

vi.mock('@/lib/admin/store/useEmployees', () => {
  const state = { getById: (_id: string) => MOCK_EMP }
  const useEmployees = Object.assign(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState: () => state, setState: vi.fn(), subscribe: vi.fn() },
  )
  return { useEmployees }
})

// ─── Mock EffectiveDateGate — bypass modal; pre-seed effective date ───────────
const effectiveGateProps = vi.hoisted(() => [] as Array<{
  min?: string
  max?: string
  initialEffectiveDate?: string
}>)

vi.mock('@/components/admin/EffectiveDateGate', async () => {
  const React = await import('react')
  return {
    EffectiveDateGate: ({
      children,
      onEffectiveDateChange,
      min,
      max,
      initialEffectiveDate,
    }: {
      children: (ctx: { effectiveDate: string }) => React.ReactNode
      onEffectiveDateChange?: (d: string) => void
      min?: string
      max?: string
      initialEffectiveDate?: string
    }) => {
      effectiveGateProps.push({ min, max, initialEffectiveDate })
      React.useEffect(() => {
        if (onEffectiveDateChange) onEffectiveDateChange('2026-06-01')
      }, [onEffectiveDateChange])
      return <div data-testid="effective-date-gate">{children({ effectiveDate: '2026-06-01' })}</div>
    },
  }
})

// ─── Mock ActionGuardBanner ───────────────────────────────────────────────────
vi.mock('@/components/admin/ActionGuardBanner', () => ({
  ActionGuardBanner: () => <div data-testid="guard-banner" />,
}))

// Import page AFTER mocks
import PayRateChangePage from '../page'
import { usePayRateApprovals } from '@/stores/pay-rate-approvals'

// ─── Helper to select an Event Reason ────────────────────────────────────────
function selectEventReason(code: string) {
  const eventReasonSelect = screen.getByLabelText(/เหตุผล/) as HTMLSelectElement
  fireEvent.change(eventReasonSelect, { target: { value: code } })
}

// ─── Pure validators ─────────────────────────────────────────────────────────
describe('STA-24: pure validators', () => {
  it('isPercentAmountValid: 0/25.5/50 valid; -1/51 invalid', () => {
    expect(isPercentAmountValid(0)).toBe(true)
    expect(isPercentAmountValid(25.5)).toBe(true)
    expect(isPercentAmountValid(50)).toBe(true)
    expect(isPercentAmountValid(-1)).toBe(false)
    expect(isPercentAmountValid(51)).toBe(false)
  })
  it('isFlatAmountValid: positive numbers valid; 0/negative/NaN invalid', () => {
    expect(isFlatAmountValid(5000)).toBe(true)
    expect(isFlatAmountValid(0.01)).toBe(true)
    expect(isFlatAmountValid(0)).toBe(false)
    expect(isFlatAmountValid(-1)).toBe(false)
    expect(isFlatAmountValid(NaN)).toBe(false)
  })
})

// ─── Parametrized per reason: PROMO vs SALADJ ────────────────────────────────
describe.each([
  { reason: 'PRCHG_PROMO', label: 'PROMO' },
  { reason: 'PRCHG_SALADJ', label: 'SALADJ' },
])('STA-24: Event Reason $label ($reason)', ({ reason }) => {
  beforeEach(() => {
    usePayRateApprovals.getState().clear()
    effectiveGateProps.length = 0
  })

  it('renders required fields and effective date gate', () => {
    render(<PayRateChangePage />)
    expect(screen.getByTestId('effective-date-gate')).toBeInTheDocument()
    expect(screen.getByTestId('event-chip')).toHaveTextContent(/Pay Rate Change/)
    expect(screen.getByLabelText(/เหตุผล/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Pay Group/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Payroll ID/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount value/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Currency/i)).toBeInTheDocument()
    expect(screen.getByTestId('add-recurring-row')).toBeInTheDocument()
  })

  it('does not constrain EffectiveDateGate by employee hire date', () => {
    render(<PayRateChangePage />)
    expect(effectiveGateProps.length).toBeGreaterThan(0)
    expect(effectiveGateProps.every((props) => props.min === undefined)).toBe(true)
  })

  it('renders the Thai promotion/pay change page title', () => {
    render(<PayRateChangePage />)
    expect(screen.getByRole('heading', {
      name: 'ข้อมูลการเลื่อนตำแหน่ง/ปรับเงินเดือน',
    })).toBeInTheDocument()
  })

  it('Reason for Salary Adjust is absent from DOM when reason is not PRCHG_SALADJ initially', () => {
    render(<PayRateChangePage />)
    // Before any reason selected — field not in DOM
    expect(screen.queryByLabelText(/Reason for Salary Adjust/i)).not.toBeInTheDocument()
  })

  it(`Reason for Salary Adjust ${reason === 'PRCHG_SALADJ' ? 'IS present' : 'is NOT present'} when reason is ${reason}`, () => {
    render(<PayRateChangePage />)
    selectEventReason(reason)
    if (reason === 'PRCHG_SALADJ') {
      expect(screen.getByLabelText(/Reason for Salary Adjust/i)).toBeInTheDocument()
    } else {
      expect(screen.queryByLabelText(/Reason for Salary Adjust/i)).not.toBeInTheDocument()
    }
  })

  it(`Pay Component LOV is ${reason === 'PRCHG_SALADJ' ? 'filtered (SALADJ subset)' : 'full set'} for ${reason}`, () => {
    render(<PayRateChangePage />)
    selectEventReason(reason)
    const payComp = screen.getByLabelText(/^Pay Component/i) as HTMLSelectElement
    const optionValues = Array.from(payComp.options).map((o) => o.value)
    if (reason === 'PRCHG_SALADJ') {
      // SALADJ subset: Basic + Position Allowance only
      expect(optionValues).toContain('Basic')
      expect(optionValues).toContain('Position Allowance')
      expect(optionValues).not.toContain('Transport Allowance')
      expect(optionValues).not.toContain('Meal Allowance')
    } else {
      // Full set includes all 4
      expect(optionValues).toContain('Basic')
      expect(optionValues).toContain('Position Allowance')
      expect(optionValues).toContain('Transport Allowance')
      expect(optionValues).toContain('Meal Allowance')
    }
  })

  it(`salaryAdjustFilter helper text ${reason === 'PRCHG_SALADJ' ? 'shown' : 'hidden'} for ${reason}`, () => {
    render(<PayRateChangePage />)
    selectEventReason(reason)
    if (reason === 'PRCHG_SALADJ') {
      expect(screen.getByTestId('pay-component-filter-helper')).toBeInTheDocument()
    } else {
      expect(screen.queryByTestId('pay-component-filter-helper')).not.toBeInTheDocument()
    }
  })

  it('renders inline THB currency chip and Monthly frequency chip', () => {
    render(<PayRateChangePage />)
    expect(screen.getByTestId('currency-thb-chip')).toHaveTextContent('THB')
    expect(screen.getByTestId('frequency-monthly-chip')).toHaveTextContent('Monthly')
  })
})

// ─── PROMO branch: Reason for Salary Adjust NOT in DOM ───────────────────────
describe('STA-24: PROMO branch — Reason for Salary Adjust absent', () => {
  beforeEach(() => {
    usePayRateApprovals.getState().clear()
  })

  it('queryByLabelText returns null (not just disabled) after selecting PRCHG_PROMO', () => {
    render(<PayRateChangePage />)
    selectEventReason('PRCHG_PROMO')
    const el = screen.queryByLabelText(/Reason for Salary Adjust/i)
    expect(el).toBeNull()
  })
})

// ─── Existing coverage ────────────────────────────────────────────────────────
describe('STA-24: /pay-rate-change form — existing field coverage', () => {
  beforeEach(() => {
    usePayRateApprovals.getState().clear()
  })

  it('Amount type toggle: percent default; flat switch works', () => {
    render(<PayRateChangePage />)
    const percentRadio = screen.getByRole('radio', { name: 'percent' }) as HTMLInputElement
    const flatRadio = screen.getByRole('radio', { name: 'flat' }) as HTMLInputElement
    expect(percentRadio.checked).toBe(true)
    const amountInput = screen.getByLabelText(/amount value/i) as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '10' } })
    expect(amountInput.value).toBe('10')
    fireEvent.click(flatRadio)
    expect(flatRadio.checked).toBe(true)
    fireEvent.change(amountInput, { target: { value: '12500' } })
    expect(amountInput.value).toBe('12500')
  })

  it('Currency defaults to THB', () => {
    render(<PayRateChangePage />)
    const currency = screen.getByLabelText(/Currency/i) as HTMLSelectElement
    expect(currency.value).toBe('THB')
  })

  it('Pay Component has non-empty default', () => {
    render(<PayRateChangePage />)
    const payComponent = screen.getByLabelText(/^Pay Component/i) as HTMLSelectElement
    expect(payComponent.value).not.toBe('')
  })

  it('Recurring Payments add/remove cycle', () => {
    render(<PayRateChangePage />)
    expect(screen.queryByTestId('recurring-row-0')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('add-recurring-row'))
    const row = screen.getByTestId('recurring-row-0')
    expect(row).toBeInTheDocument()
    expect(within(row).getByLabelText(/pay component row 0/i)).toBeInTheDocument()
    expect(within(row).getByLabelText(/amount row 0/i)).toBeInTheDocument()
    expect(within(row).getByLabelText(/currency row 0/i)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('remove-recurring-row-0'))
    expect(screen.queryByTestId('recurring-row-0')).not.toBeInTheDocument()
  })
})
