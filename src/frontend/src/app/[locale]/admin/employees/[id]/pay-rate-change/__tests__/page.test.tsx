// pay-rate-change/page.test.tsx — STA-24 regression for /pay-rate-change route
// Covers: required fields render, conditional Reason for Salary Adjust gating,
// amount type toggle, currency default = THB, recurring payments add/remove.

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

// ─── Mock auth store ─────────────────────────────────────────────────────────
vi.mock('@/stores/auth-store', () => {
  const state = { userId: 'ADM001', username: 'HR Admin' }
  const useAuthStore = Object.assign(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState: () => state, setState: vi.fn(), subscribe: vi.fn() },
  )
  return { useAuthStore }
})

// ─── Mock employees store — return a passed-probation active employee ─────────
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

// ─── Mock EffectiveDateGate — bypass modal; pre-seed an effective date ────────
vi.mock('@/components/admin/EffectiveDateGate', async () => {
  const React = await import('react')
  return {
    EffectiveDateGate: ({
      children,
      onEffectiveDateChange,
    }: {
      children: (ctx: { effectiveDate: string }) => React.ReactNode
      onEffectiveDateChange?: (d: string) => void
    }) => {
      React.useEffect(() => {
        if (onEffectiveDateChange) onEffectiveDateChange('2026-06-01')
      }, [onEffectiveDateChange])
      return <div data-testid="effective-date-gate">{children({ effectiveDate: '2026-06-01' })}</div>
    },
  }
})

// ─── Mock ActionGuardBanner (not exercised — passedProb passes gate) ─────────
vi.mock('@/components/admin/ActionGuardBanner', () => ({
  ActionGuardBanner: () => <div data-testid="guard-banner" />,
}))

// Import page AFTER mocks
import PayRateChangePage from '../page'
import { usePayRateApprovals } from '@/stores/pay-rate-approvals'

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

describe('STA-24: /pay-rate-change form renders 7 required fields', () => {
  beforeEach(() => {
    usePayRateApprovals.getState().clear()
  })

  it('renders Effective Date gate, Event chip, Event Reason, Pay Group, Payroll ID, Amount, Currency, Frequency chip, Recurring Payments', () => {
    render(<PayRateChangePage />)
    // Effective date gate present (mocked)
    expect(screen.getByTestId('effective-date-gate')).toBeInTheDocument()
    // Event read-only chip
    expect(screen.getByTestId('event-chip')).toHaveTextContent(/Pay Rate Change/)
    // Event Reason picker
    expect(screen.getByLabelText(/เหตุผล/)).toBeInTheDocument()
    // Reason for Salary Adjust
    expect(screen.getByLabelText(/Reason for Salary Adjust/i)).toBeInTheDocument()
    // Pay Group
    expect(screen.getByLabelText(/Pay Group/i)).toBeInTheDocument()
    // Payroll ID
    expect(screen.getByLabelText(/Payroll ID/i)).toBeInTheDocument()
    // Pay Component (top-level, ref-2 spec row)
    expect(screen.getByLabelText(/^Pay Component/i)).toBeInTheDocument()
    // Amount type radios
    expect(screen.getByRole('radio', { name: 'percent' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'flat' })).toBeInTheDocument()
    // Amount input
    expect(screen.getByLabelText(/amount value/i)).toBeInTheDocument()
    // Currency
    expect(screen.getByLabelText(/Currency/i)).toBeInTheDocument()
    // Frequency chip
    expect(screen.getByTestId('frequency-chip')).toHaveTextContent(/Monthly/)
    // Recurring payments section + add button
    expect(screen.getByTestId('add-recurring-row')).toBeInTheDocument()
  })
})

describe('STA-24: Reason for Salary Adjust conditional gating', () => {
  beforeEach(() => {
    usePayRateApprovals.getState().clear()
  })

  it('is disabled until Event Reason === PRCHG_SALADJ', () => {
    render(<PayRateChangePage />)
    const reasonAdjustSelect = screen.getByLabelText(/Reason for Salary Adjust/i) as HTMLSelectElement
    expect(reasonAdjustSelect.disabled).toBe(true)

    // Pick PRCHG_MERINC — still disabled
    const eventReasonSelect = screen.getByLabelText(/เหตุผล/) as HTMLSelectElement
    fireEvent.change(eventReasonSelect, { target: { value: 'PRCHG_MERINC' } })
    expect(reasonAdjustSelect.disabled).toBe(true)

    // Pick PRCHG_SALADJ — becomes enabled
    fireEvent.change(eventReasonSelect, { target: { value: 'PRCHG_SALADJ' } })
    expect(reasonAdjustSelect.disabled).toBe(false)
  })
})

describe('STA-24: Amount accepts both flat and percent based on toggle', () => {
  beforeEach(() => {
    usePayRateApprovals.getState().clear()
  })

  it('percent default; switching to flat allows large amount', () => {
    render(<PayRateChangePage />)
    const percentRadio = screen.getByRole('radio', { name: 'percent' }) as HTMLInputElement
    const flatRadio = screen.getByRole('radio', { name: 'flat' }) as HTMLInputElement
    expect(percentRadio.checked).toBe(true)
    expect(flatRadio.checked).toBe(false)

    const amountInput = screen.getByLabelText(/amount value/i) as HTMLInputElement
    // percent: enter 10
    fireEvent.change(amountInput, { target: { value: '10' } })
    expect(amountInput.value).toBe('10')

    // switch to flat
    fireEvent.click(flatRadio)
    expect(flatRadio.checked).toBe(true)
    fireEvent.change(amountInput, { target: { value: '12500' } })
    expect(amountInput.value).toBe('12500')
  })
})

describe('STA-24: Currency defaults to THB', () => {
  beforeEach(() => {
    usePayRateApprovals.getState().clear()
  })

  it('renders with THB pre-selected', () => {
    render(<PayRateChangePage />)
    const currency = screen.getByLabelText(/Currency/i) as HTMLSelectElement
    expect(currency.value).toBe('THB')
  })
})

describe('STA-24: top-level Pay Component LOV has a default and is selectable', () => {
  beforeEach(() => {
    usePayRateApprovals.getState().clear()
  })

  it('renders with a non-empty default and accepts a new selection', () => {
    render(<PayRateChangePage />)
    const payComponent = screen.getByLabelText(/^Pay Component/i) as HTMLSelectElement
    // Default is first PAY_COMPONENTS entry — non-empty
    expect(payComponent.value).not.toBe('')
    // Switching to another option works
    const target = 'Transport Allowance'
    fireEvent.change(payComponent, { target: { value: target } })
    expect(payComponent.value).toBe(target)
  })
})

describe('STA-24: Recurring Payments add/remove cycle', () => {
  beforeEach(() => {
    usePayRateApprovals.getState().clear()
  })

  it('add one row then remove it', () => {
    render(<PayRateChangePage />)
    // Initially empty
    expect(screen.queryByTestId('recurring-row-0')).not.toBeInTheDocument()

    // Add one
    fireEvent.click(screen.getByTestId('add-recurring-row'))
    const row = screen.getByTestId('recurring-row-0')
    expect(row).toBeInTheDocument()
    expect(within(row).getByLabelText(/pay component row 0/i)).toBeInTheDocument()
    expect(within(row).getByLabelText(/amount row 0/i)).toBeInTheDocument()
    expect(within(row).getByLabelText(/currency row 0/i)).toBeInTheDocument()

    // Remove it
    fireEvent.click(screen.getByTestId('remove-recurring-row-0'))
    expect(screen.queryByTestId('recurring-row-0')).not.toBeInTheDocument()
  })
})
