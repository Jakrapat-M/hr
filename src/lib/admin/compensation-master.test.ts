import { describe, it, expect } from 'vitest'
import {
  SALARY_ADJUST_REASONS,
  PAY_GROUPS,
  CURRENCIES,
  PAY_COMPONENTS_PROMO_SET,
  PAY_COMPONENTS_SALADJ_SUBSET,
  CURRENT_MONTHLY_SALARY,
  payComponentsFor,
  buildPayrollHandoff,
  maskAmountForCapability,
} from './compensation-master'

describe('compensation-master picklists', () => {
  it('exposes the expected reason / group / currency / component counts', () => {
    expect(SALARY_ADJUST_REASONS).toHaveLength(6)
    expect(PAY_GROUPS).toHaveLength(4)
    expect(CURRENCIES).toHaveLength(5)
    expect(PAY_COMPONENTS_PROMO_SET).toHaveLength(4)
    expect(PAY_COMPONENTS_SALADJ_SUBSET).toHaveLength(2)
  })

  it('preserves the exact salary-adjust reason codes', () => {
    expect(SALARY_ADJUST_REASONS.map((r) => r.code)).toEqual([
      'ADJ_HIGHER_EDU',
      'ADJ_ALLOWANCE',
      'ADJ_OVER_CEILING',
      'ADJ_STRUCTURE',
      'ADJ_WORKING_DAYS',
      'ADJ_MINIMUM',
    ])
  })

  it('preserves the exact currency ISO codes', () => {
    expect(CURRENCIES).toEqual(['THB', 'USD', 'EUR', 'JPY', 'SGD'])
  })

  it('keeps the seed monthly salary', () => {
    expect(CURRENT_MONTHLY_SALARY).toBe(82_500)
  })
})

describe('payComponentsFor', () => {
  it('returns the subset for PRCHG_SALADJ', () => {
    expect(payComponentsFor('PRCHG_SALADJ')).toEqual(PAY_COMPONENTS_SALADJ_SUBSET)
  })

  it('returns the full promo set for PRCHG_PROMO', () => {
    expect(payComponentsFor('PRCHG_PROMO')).toEqual(PAY_COMPONENTS_PROMO_SET)
  })

  it('falls back to the full promo set for other reasons and nullish input', () => {
    expect(payComponentsFor('PRCHG_MERINC')).toEqual(PAY_COMPONENTS_PROMO_SET)
    expect(payComponentsFor(null)).toEqual(PAY_COMPONENTS_PROMO_SET)
  })
})

describe('buildPayrollHandoff', () => {
  it('returns the expected payload shape with the primary component first', () => {
    const payload = buildPayrollHandoff({
      eventReason: 'PRCHG_PROMO',
      payGroup: 'CENTRAL:01-15:EOM',
      effectiveDate: '2026-07-01',
      payComponent: 'Basic',
      amount: 5000,
      currency: 'THB',
      frequency: 'Monthly',
      recurringPayments: [
        { component: 'Position Allowance', amount: 1500, currency: 'THB', frequency: 'Monthly' },
      ],
    })

    expect(payload).toEqual({
      eventReason: 'PRCHG_PROMO',
      payGroup: 'CENTRAL:01-15:EOM',
      effectiveDate: '2026-07-01',
      components: [
        { component: 'Basic', amount: 5000, currency: 'THB', frequency: 'Monthly' },
        { component: 'Position Allowance', amount: 1500, currency: 'THB', frequency: 'Monthly' },
      ],
    })
  })

  it('defaults nullish fields and frequency', () => {
    const payload = buildPayrollHandoff({
      eventReason: null,
      payGroup: '',
      effectiveDate: null,
      payComponent: 'Basic',
      amount: 0,
      currency: 'THB',
    })

    expect(payload.eventReason).toBe('')
    expect(payload.effectiveDate).toBe('')
    expect(payload.components).toEqual([
      { component: 'Basic', amount: 0, currency: 'THB', frequency: 'Monthly' },
    ])
  })
})

describe('maskAmountForCapability', () => {
  it('shows the real value only when capability is full', () => {
    expect(maskAmountForCapability('฿82,500.00', 'full')).toBe('฿82,500.00')
  })

  it('masks the value for partial and hidden capability', () => {
    expect(maskAmountForCapability('฿82,500.00', 'partial')).toBe('••••••')
    expect(maskAmountForCapability('฿82,500.00', 'hidden')).toBe('••••••')
  })
})
