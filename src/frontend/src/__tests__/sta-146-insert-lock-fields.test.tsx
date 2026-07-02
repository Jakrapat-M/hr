// STA-146 — in the Insert plan modal, ONLY Status + Company stay editable; every
// other identity field is locked (disabled, view-only) via the deny-by-default
// `lockExceptKeys` allow-list. Correction/Create (prop omitted) are unchanged.
//
// This regression is the PRIMARY safety net: it DERIVES the locked set from the
// source-of-truth const (INSERT_EDITABLE_KEYS), so a future 18th identity field
// is auto-covered (it defaults LOCKED and the exhaustive iteration picks it up).
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
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
  company: 'CG',
}

// Identity keys that ACTUALLY render an input/select control. Excludes
// eligibleClaimDate (no control) and schemaVersion (gated off here via
// showSchemaVersion={false}, matching the Insert modal).
const RENDERED_KEYS = [
  'ttt', 'planKey', 'nameTh', 'nameEn', 'category', 'template',
  'effectiveFrom', 'effectiveTo', 'country', 'status', 'benefitTypeGroup',
  'enrolment', 'claimPeriod', 'entitlementCalcMethod', 'specialClaimCondition', 'company',
] as const

// Derived complement — a newly added rendered key auto-joins this locked set
// with zero test changes (deny-by-default invariant).
const LOCKED_IN_INSERT = RENDERED_KEYS.filter(
  (k) => !(INSERT_EDITABLE_KEYS as readonly string[]).includes(k),
)

function renderInsert() {
  return render(
    <Tab1IdentityFields
      values={baseValues}
      onChange={() => {}}
      mode="edit"
      isTh={false}
      showSchemaVersion={false}
      lockExceptKeys={INSERT_EDITABLE_KEYS}
    />,
  )
}

function renderCorrection() {
  return render(
    <Tab1IdentityFields
      values={baseValues}
      onChange={() => {}}
      mode="edit"
      isTh={false}
      showSchemaVersion={false}
    />,
  )
}

const control = (container: HTMLElement, key: string) =>
  container.querySelector<HTMLInputElement | HTMLSelectElement>(`#tab1-${key}`)

describe('STA-146 — Insert mode locks all identity fields except Status + Company', () => {
  it('keeps Status + Company editable in insert mode', () => {
    const { container } = renderInsert()
    for (const key of INSERT_EDITABLE_KEYS) {
      const el = control(container, key)
      expect(el, `#tab1-${key} should render`).not.toBeNull()
      expect(el!.disabled, `#tab1-${key} should be ENABLED in insert`).toBe(false)
    }
  })

  it.each(LOCKED_IN_INSERT)('disables #tab1-%s in insert mode (exhaustive)', (key) => {
    const { container } = renderInsert()
    const el = control(container, key)
    expect(el, `#tab1-${key} should render`).not.toBeNull()
    expect(el!.disabled, `#tab1-${key} must be DISABLED in insert`).toBe(true)
  })

  it.each(RENDERED_KEYS)('keeps #tab1-%s enabled in correction mode (prop omitted)', (key) => {
    const { container } = renderCorrection()
    const el = control(container, key)
    expect(el, `#tab1-${key} should render`).not.toBeNull()
    expect(el!.disabled, `#tab1-${key} must stay ENABLED in correction`).toBe(false)
  })

  it('NO-RED: locked controls use muted (canvas-soft/ink-muted) styling, never red/danger', () => {
    const { container } = renderInsert()
    for (const key of LOCKED_IN_INSERT) {
      const cls = control(container, key)?.className ?? ''
      expect(cls).not.toMatch(/danger|text-red|bg-red|border-red|crimson/i)
    }
  })

  it('allow-list is exactly Status + Company (spec fidelity)', () => {
    expect([...INSERT_EDITABLE_KEYS].sort()).toEqual(['company', 'status'])
  })

  // STA-146 FU (Tan): the editable Status select offers only Active/Inactive —
  // "user does not use draft status". The 'draft' value is retained elsewhere
  // (Save-as-Draft + status filter), just not selectable here.
  it('Status select offers only Active/Inactive (no Draft option)', () => {
    const { container } = renderCorrection()
    const statusSelect = container.querySelector<HTMLSelectElement>('#tab1-status')
    expect(statusSelect).not.toBeNull()
    const values = [...statusSelect!.querySelectorAll('option')].map((o) => o.value)
    expect(values).toEqual(['active', 'inactive'])
    expect(values).not.toContain('draft')
  })

  // A plan already saved as Draft still displays its true status (a DISABLED draft
  // option) instead of silently coercing to Active — but Draft stays non-selectable.
  it('shows a disabled Draft option only when the value is already draft', () => {
    const { container } = render(
      <Tab1IdentityFields
        values={{ ...baseValues, status: 'draft' }}
        onChange={() => {}}
        mode="edit"
        isTh={false}
        showSchemaVersion={false}
      />,
    )
    const statusSelect = container.querySelector<HTMLSelectElement>('#tab1-status')!
    const draftOpt = [...statusSelect.querySelectorAll('option')].find((o) => o.value === 'draft')
    expect(draftOpt, 'draft option should render for a draft-valued plan').not.toBeUndefined()
    expect(draftOpt!.disabled, 'draft option must be non-selectable').toBe(true)
    expect(statusSelect.value).toBe('draft') // reflects the true status, no coercion
  })

  // Closes the "future field silently uncovered" gap: RENDERED_KEYS must equal the
  // set of identity controls actually in the DOM, so a newly added #tab1-<key>
  // control (which the deny-by-default lock would correctly disable in product)
  // also fails CI here until it is added to RENDERED_KEYS + asserted above.
  it('RENDERED_KEYS matches every rendered #tab1-* identity control (no silent gap)', () => {
    const { container } = renderCorrection()
    // Exclude FormField's `-help`/`-error` sibling ids and the company field's
    // free-text add-new sub-control — none are identity-key controls.
    const SUBCONTROL_IDS = new Set(['company-new'])
    const domKeys = [...container.querySelectorAll('[id^="tab1-"]')]
      .map((el) => el.id.replace(/^tab1-/, ''))
      .filter((k) => !SUBCONTROL_IDS.has(k) && !/-(help|error)$/.test(k))
    expect(new Set(domKeys)).toEqual(new Set<string>(RENDERED_KEYS))
  })
})
