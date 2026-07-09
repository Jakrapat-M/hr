// STA-240 — Benefit plan identity form:
//   1. "TTT reference" input REMOVED from all plans (create + edit render).
//   2. "Eligible Claim date" ADDED to the Claim condition section, immediately
//      AFTER "Entitlement calc method" — mandatory + integer-only, with a VISIBLE
//      pumpkin (danger) error rendered as role="alert" (not merely a disabled button).
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import {
  Tab1IdentityFields,
  type Tab1IdentityValues,
} from '@/components/benefits/Tab1IdentityFields'
import { useAuthStore } from '@/stores/auth-store'
import enMessages from '../../../../messages/en.json'

// ── Part A — direct Tab1IdentityFields render (create + edit) ────────────────

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

function renderFields(mode: 'create' | 'edit', isTh = false) {
  return render(
    <Tab1IdentityFields
      values={baseValues}
      onChange={() => {}}
      mode={mode}
      isTh={isTh}
      showSchemaVersion={false}
    />,
  )
}

describe('STA-240 — TTT removed from the identity form', () => {
  it('does NOT render a TTT reference field in create mode', () => {
    const { container } = renderFields('create')
    expect(container.querySelector('#tab1-ttt')).toBeNull()
    expect(screen.queryByLabelText('TTT reference')).toBeNull()
  })

  it('does NOT render a TTT reference field in edit mode', () => {
    const { container } = renderFields('edit')
    expect(container.querySelector('#tab1-ttt')).toBeNull()
    expect(screen.queryByLabelText('TTT reference')).toBeNull()
  })

  it('does NOT render the Thai TTT label either', () => {
    renderFields('edit', true)
    expect(screen.queryByLabelText('รหัส TTT')).toBeNull()
  })
})

describe('STA-240 — Eligible Claim date field present + positioned', () => {
  it('renders an Eligible Claim date input, marked required (numeric)', () => {
    const { container } = renderFields('create')
    const input = container.querySelector<HTMLInputElement>('#tab1-eligibleClaimDate')
    expect(input).not.toBeNull()
    expect(input!.required).toBe(true)
    expect(input!.getAttribute('inputmode')).toBe('numeric')
  })

  it('places Eligible Claim date AFTER Entitlement calc method in DOM order', () => {
    const { container } = renderFields('create')
    const calc = container.querySelector('#tab1-entitlementCalcMethod')!
    const eligible = container.querySelector('#tab1-eligibleClaimDate')!
    expect(calc).not.toBeNull()
    expect(eligible).not.toBeNull()
    // DOCUMENT_POSITION_FOLLOWING (4) → eligible comes after calc.
    expect(calc.compareDocumentPosition(eligible) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

// ── Part B — full page: mandatory + integer-only with a VISIBLE error ────────

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/admin/benefits/plans',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ locale: 'en' }),
}))

function setAdmin() {
  useAuthStore.setState({
    userId: 'TEST',
    username: 'tester',
    email: 'tester@cnext.test',
    roles: ['hr_admin'],
    isAuthenticated: true,
    originalUser: null,
    _hasHydrated: true,
  } as never)
}

async function renderCreateModal() {
  setAdmin()
  const { default: Page } = await import('@/app/[locale]/admin/benefits/plans/page')
  const utils = render(
    <NextIntlClientProvider locale="en" messages={enMessages as never}>
      <Page />
    </NextIntlClientProvider>,
  )
  // Open the Create modal via the header button.
  fireEvent.click(screen.getAllByRole('button', { name: 'Create Plan' })[0])
  // Fill the three required identity fields so validation reaches eligibleClaimDate.
  const set = (id: string, value: string) => {
    const el = document.querySelector<HTMLInputElement>(id)!
    fireEvent.change(el, { target: { value } })
  }
  set('#tab1-planKey', 'BE-NEW-777')
  set('#tab1-nameTh', 'แผนใหม่')
  set('#tab1-nameEn', 'New Plan')
  return utils
}

// The submit button is the LAST "Create Plan" button (header + footer both render it).
function clickCreate() {
  const buttons = screen.getAllByRole('button', { name: /Create Plan|Creating/ })
  fireEvent.click(buttons[buttons.length - 1])
}

function setEligible(value: string) {
  const el = document.querySelector<HTMLInputElement>('#tab1-eligibleClaimDate')!
  fireEvent.change(el, { target: { value } })
}

describe('STA-240 — Eligible Claim date mandatory + integer-only (visible error)', () => {
  beforeEach(() => {
    setAdmin()
  })

  it.each([
    ['empty', ''],
    ['decimal', '12.5'],
    ['negative', '-5'],
    ['non-numeric', 'abc'],
  ])('blocks Create with a visible role="alert" when %s', async (_label, value) => {
    await renderCreateModal()
    setEligible(value)
    clickCreate()
    const alert = screen.getByRole('alert')
    expect(alert).toBeTruthy()
    expect(alert.textContent).toMatch(/Enter number of days/i)
    // NO-RED: the visible error uses the pumpkin danger tokens, never red/error.
    expect(alert.className).toMatch(/danger/)
    expect(alert.className).not.toMatch(/error|text-red|bg-red|crimson/i)
  })

  it('accepts a valid whole number (90) — no error alert, shows the created status', async () => {
    await renderCreateModal()
    setEligible('90')
    clickCreate()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/Plan created/i)
  })
})

// ── Part C — page-level: TTT column header absent ────────────────────────────

describe('STA-240 — plan list table has no TTT column', () => {
  it('does not render a "TTT" column header', async () => {
    setAdmin()
    const { default: Page } = await import('@/app/[locale]/admin/benefits/plans/page')
    render(
      <NextIntlClientProvider locale="en" messages={enMessages as never}>
        <Page />
      </NextIntlClientProvider>,
    )
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
    expect(headers).not.toContain('TTT')
  })
})
