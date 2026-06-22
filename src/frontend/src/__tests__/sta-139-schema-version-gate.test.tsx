// STA-139 — the "Schema version" radio is hidden on the legacy plan modals via
// a default-true `showSchemaVersion` prop-gate, while the value still persists
// as 'v2' (the gate hides the input only, it does not mutate the model).
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tab1IdentityFields, type Tab1IdentityValues } from '@/components/benefits/Tab1IdentityFields'

const baseValues: Tab1IdentityValues = {
  ttt: '',
  planKey: 'BE-NEW-001',
  nameTh: 'แผนใหม่',
  nameEn: 'New plan',
  category: 'medical',
  schemaVersion: 'v2',
  template: 'simple-claim',
  effectiveFrom: '',
  effectiveTo: '',
  country: 'TH',
  status: 'active',
  benefitTypeGroup: 'reimbursement-employee-hr',
  enrolment: 'auto',
  claimPeriod: 'year',
  entitlementCalcMethod: 'full',
  eligibleClaimDate: '30',
  company: '',
}

function renderTab1(showSchemaVersion?: boolean) {
  const captured = { schemaVersion: baseValues.schemaVersion }
  render(
    <Tab1IdentityFields
      values={baseValues}
      onChange={(field, value) => {
        if (field === 'schemaVersion') captured.schemaVersion = value as 'v1' | 'v2'
      }}
      mode="create"
      isTh={false}
      {...(showSchemaVersion === undefined ? {} : { showSchemaVersion })}
    />,
  )
  return captured
}

describe('STA-139 — Schema version radio prop-gate', () => {
  it('renders the Schema version radio by default (contract unchanged)', () => {
    renderTab1(undefined)
    expect(screen.queryByRole('radiogroup', { name: /Schema version/i })).not.toBeNull()
  })

  it('hides the Schema version radio when showSchemaVersion={false} (legacy plan modals)', () => {
    renderTab1(false)
    expect(screen.queryByRole('radiogroup', { name: /Schema version/i })).toBeNull()
  })

  it('keeps schemaVersion = v2 in the model when the radio is gated off (no silent reset)', () => {
    const captured = renderTab1(false)
    // The gate hides the input only; it must not fire onChange to mutate the value.
    expect(captured.schemaVersion).toBe('v2')
  })
})
