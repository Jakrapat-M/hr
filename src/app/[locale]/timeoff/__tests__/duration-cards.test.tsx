/**
 * duration-cards.test.tsx — STA-151: the RequestTab duration control offers
 * Full / Half / Hourly cards. Hourly is Sick-only; other types only enable
 * Full + Half (Half itself gated by the type's minUnit, with a Sick override).
 * Framework: Vitest + jsdom + React Testing Library
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'

let mockRoles: string[] = []

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (s: { roles: string[]; userId: string | null; username: string | null }) => unknown,
  ) => selector({ roles: mockRoles, userId: 'EMP001', username: 'สมชาย ใจดี' }),
}))

vi.mock('@/stores/cnext-timeoff-slice', () => ({
  useTimeoffStore: (selector: (s: { history: unknown[]; submit: () => void }) => unknown) =>
    selector({ history: [], submit: () => {} }),
}))

vi.mock('@/components/quick-approve/ApprovalChain', () => ({
  ApprovalChain: () => null,
}))

import CnextTimeoffPage from '@/app/[locale]/timeoff/page'

beforeEach(() => {
  mockRoles = ['employee']
})
afterEach(() => cleanup())

/** Pick a leave type by its Thai label in the type radiogroup. */
function selectType(labelTh: string) {
  // The picker defaults to the top-3 most-used types; expand to reach the rest.
  let label = within(screen.getByRole('radiogroup', { name: 'ประเภทการลา' })).queryByText(labelTh)
  if (!label) {
    fireEvent.click(screen.getByRole('button', { name: 'ดูทั้งหมด' }))
    label = within(screen.getByRole('radiogroup', { name: 'ประเภทการลา' })).getByText(labelTh)
  }
  const radio = label.closest('button[role="radio"]') as HTMLButtonElement
  fireEvent.click(radio)
}

/** Click the first enabled (bookable) day cell to set a single-day range. */
function pickFirstBookableDay() {
  const dayButtons = screen
    .getAllByRole('button')
    .filter((b) => /^\d+(\s·.*)?$/.test(b.getAttribute('aria-label') ?? '') &&
      b.getAttribute('aria-disabled') === 'false')
  expect(dayButtons.length).toBeGreaterThan(0)
  fireEvent.click(dayButtons[0])
}

function durationRadios() {
  const group = screen.getByRole('radiogroup', { name: 'ระยะเวลาการลา' })
  return within(group).getAllByRole('radio') as HTMLButtonElement[]
}

describe('STA-151 — duration cards (Full / Half / Hourly)', () => {
  it('Sick Leave renders 3 duration cards with all enabled', () => {
    render(<CnextTimeoffPage />)
    selectType('ลาป่วย') // sick_leave
    pickFirstBookableDay()

    const radios = durationRadios()
    expect(radios).toHaveLength(3)
    expect(within(radios[0]).queryByText) // smoke
    const labels = radios.map((r) => r.textContent)
    expect(labels).toEqual(['เต็มวัน', 'ครึ่งวัน', 'รายชั่วโมง'])
    // All three are enabled for Sick (Sick-specific override for Half + Hourly).
    radios.forEach((r) => expect(r).not.toBeDisabled())
  })

  it('a 1-day-min non-Sick type still shows 3 cards but Hourly is disabled', () => {
    render(<CnextTimeoffPage />)
    selectType('ลาคลอดบุตร') // maternity_leave — minUnit '1-day', not Sick
    pickFirstBookableDay()

    const radios = durationRadios()
    expect(radios).toHaveLength(3)
    const [full, half, hourly] = radios
    expect(full).not.toBeDisabled()
    // Half disabled (1-day min, no Sick override); Hourly disabled (Sick-only).
    expect(half).toBeDisabled()
    expect(hourly).toBeDisabled()
  })

  it('STA-152 — Unpaid Sick Leave renders 3 cards with all enabled (same as paid Sick)', () => {
    render(<CnextTimeoffPage />)
    selectType('ลาป่วยไม่รับเงิน') // sick_leave_unpaid — quotaTracked:false
    pickFirstBookableDay()

    const radios = durationRadios()
    expect(radios).toHaveLength(3)
    const labels = radios.map((r) => r.textContent)
    expect(labels).toEqual(['เต็มวัน', 'ครึ่งวัน', 'รายชั่วโมง'])
    // Unpaid Sick gets the same Full/Half/Hourly override as paid Sick.
    radios.forEach((r) => expect(r).not.toBeDisabled())
  })

  it('STA-152 — Unpaid Sick Hourly gates end-options identically (no 4.5h)', () => {
    render(<CnextTimeoffPage />)
    selectType('ลาป่วยไม่รับเงิน')
    pickFirstBookableDay()

    const radios = durationRadios()
    fireEvent.click(radios[2]) // Hourly

    const startSelect = screen.getByRole('combobox', { name: 'เวลาเริ่ม' }) as HTMLSelectElement
    fireEvent.change(startSelect, { target: { value: '09:30' } })

    const endSelect = screen.getByRole('combobox', { name: 'เวลาสิ้นสุด' }) as HTMLSelectElement
    const endValues = within(endSelect)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .filter(Boolean)
    expect(endValues).toContain('10:00') // min 30min
    expect(endValues).toContain('13:30') // 4h max
    expect(endValues).not.toContain('14:00') // 4.5h blocked
    // Unpaid type is quotaTracked:false → no leave-balance card rendered.
    expect(screen.queryByText('คงเหลือหลังลา')).toBeNull()
  })

  it('Sick Hourly reveals Start/End selects and a 4.5h end is not offered', () => {
    render(<CnextTimeoffPage />)
    selectType('ลาป่วย')
    pickFirstBookableDay()

    const radios = durationRadios()
    fireEvent.click(radios[2]) // Hourly

    const startSelect = screen.getByRole('combobox', { name: 'เวลาเริ่ม' }) as HTMLSelectElement
    fireEvent.change(startSelect, { target: { value: '09:30' } })

    const endSelect = screen.getByRole('combobox', { name: 'เวลาสิ้นสุด' }) as HTMLSelectElement
    const endValues = within(endSelect)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .filter(Boolean)
    expect(endValues).toContain('10:00') // min 30min
    expect(endValues).toContain('11:30') // 2h
    expect(endValues).toContain('13:30') // 4h max
    expect(endValues).not.toContain('14:00') // 4.5h blocked
    expect(endValues).not.toContain('09:30') // end > start
  })
})
