// STA-179 — "Special claim condition" (Yes/No) at the end of the Claim condition
// section. Choosing "Yes" reveals a fixed 4-option Condition dropdown. Both keys
// are absent from INSERT_EDITABLE_KEYS, so they auto-lock (disabled) in Insert mode.
import { describe, expect, it, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import {
  Tab1IdentityFields,
  INSERT_EDITABLE_KEYS,
  type Tab1IdentityValues,
} from '@/components/benefits/Tab1IdentityFields'

const baseValues: Tab1IdentityValues = {
  ttt: 'BE_06',
  planKey: 'BE-MED-001',
  nameTh: 'แผนรักษาพยาบาล',
  nameEn: 'Medical plan',
  category: 'medical',
  schemaVersion: 'v2',
  template: 'simple-claim',
  effectiveFrom: '2026-01-01',
  effectiveTo: '',
  country: 'TH',
  status: 'active',
  benefitTypeGroup: 'reimbursement-employee-hr',
  enrolment: 'auto',
  claimPeriod: 'year',
  entitlementCalcMethod: 'full',
  eligibleClaimDate: '30',
  specialClaimCondition: '',
  specialClaimConditionType: '',
  company: '',
}

function renderFields(overrides: Partial<Tab1IdentityValues> = {}, props: Record<string, unknown> = {}) {
  const onChange = vi.fn()
  const utils = render(
    <Tab1IdentityFields
      values={{ ...baseValues, ...overrides }}
      onChange={onChange}
      mode="edit"
      isTh={false}
      showSchemaVersion={false}
      {...props}
    />,
  )
  return { ...utils, onChange }
}

describe('STA-179 — Special claim condition field', () => {
  it('renders the Yes/No Special claim condition select in the Claim condition section', () => {
    const { container } = renderFields()
    const select = container.querySelector<HTMLSelectElement>('#tab1-specialClaimCondition')
    expect(select).not.toBeNull()
    const optionValues = [...select!.querySelectorAll('option')].map((o) => o.value)
    expect(optionValues).toEqual(['no', 'yes'])
  })

  it('does NOT show the Condition dropdown while value is not "yes"', () => {
    const { container } = renderFields({ specialClaimCondition: 'no' })
    expect(container.querySelector('#tab1-specialClaimConditionType')).toBeNull()
  })

  it('reveals the Condition dropdown with exactly the 4 spec options when Yes', () => {
    const { container } = renderFields({ specialClaimCondition: 'yes' })
    const typeSelect = container.querySelector<HTMLSelectElement>('#tab1-specialClaimConditionType')
    expect(typeSelect).not.toBeNull()
    const optionValues = [...typeSelect!.querySelectorAll('option')].map((o) => o.value)
    // first is the empty placeholder, then the 4 fixed conditions
    expect(optionValues).toEqual([
      '',
      'ePatient',
      'Tops care',
      'Non-IPD employee list',
      'Fleet card',
    ])
  })

  it('fires onChange when the Special claim condition is toggled to Yes', () => {
    const { container, onChange } = renderFields()
    const select = container.querySelector<HTMLSelectElement>('#tab1-specialClaimCondition')!
    fireEvent.change(select, { target: { value: 'yes' } })
    expect(onChange).toHaveBeenCalledWith('specialClaimCondition', 'yes')
  })

  it('locks (disables) the Special claim condition field in Insert mode (deny-by-default)', () => {
    const { container } = renderFields({}, { lockExceptKeys: INSERT_EDITABLE_KEYS })
    const select = container.querySelector<HTMLSelectElement>('#tab1-specialClaimCondition')!
    expect(select.disabled).toBe(true)
  })

  it('locks (disables) the revealed Condition dropdown in Insert mode', () => {
    const { container } = renderFields(
      { specialClaimCondition: 'yes' },
      { lockExceptKeys: INSERT_EDITABLE_KEYS },
    )
    const typeSelect = container.querySelector<HTMLSelectElement>('#tab1-specialClaimConditionType')!
    expect(typeSelect.disabled).toBe(true)
  })
})
