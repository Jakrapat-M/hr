/**
 * STA-149 — the OT page opens on the request FORM by default; the status list
 * lives in a secondary "Status" tab (single control model, no toggle button).
 * Vitest + jsdom + React Testing Library.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('next-intl', () => ({ useLocale: () => 'th' }))
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[]; userId: string | null; username: string | null }) => unknown) =>
    selector({ roles: ['employee'], userId: 'EMP001', username: 'สมชาย ใจดี' }),
}))
const mockAddAttachment = vi.fn().mockReturnValue('att-1')
vi.mock('@/stores/cnext-profile-slice', () => ({
  useCnextProfileStore: (selector: (s: unknown) => unknown) =>
    selector({ addAttachment: mockAddAttachment, removeAttachment: vi.fn() }),
}))
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  const stub = () => React.createElement('span', { 'data-testid': 'icon' })
  const mocked: Record<string, unknown> = {}
  for (const k of Object.keys(actual)) mocked[k] = stub
  return mocked
})

import OvertimePage from '@/app/[locale]/overtime/page'
import { currentPeriod } from '@/lib/time/period'

afterEach(() => cleanup())

const formHeading = () => screen.queryByRole('heading', { name: 'ยื่นคำขอทำงานล่วงเวลา' })

describe('/overtime — form-by-default (STA-149)', () => {
  it('renders the OT request form immediately (no toggle click needed)', () => {
    render(<OvertimePage />)
    expect(formHeading()).toBeInTheDocument()
    // Request tab is selected by default.
    expect(screen.getByRole('tab', { name: 'ยื่นคำขอ' })).toHaveAttribute('aria-selected', 'true')
  })

  it('has no "New OT Request" toggle button (single tab control model)', () => {
    render(<OvertimePage />)
    expect(screen.queryByRole('button', { name: 'ยื่นคำขอ OT' })).not.toBeInTheDocument()
  })

  it('the Status tab hides the form and exposes the request list region', () => {
    render(<OvertimePage />)
    const statusTab = screen.getByRole('tab', { name: /สถานะ/ })
    fireEvent.click(statusTab)
    expect(statusTab).toHaveAttribute('aria-selected', 'true')
    expect(formHeading()).not.toBeInTheDocument()
  })

  // STA-256 — Start/End time are native <input type="time"> (system clock widget
  // + manual typing with hour:minutes format control); the 15-min dropdowns are gone.
  it('renders Start/End time as native time inputs (blank), no dropdown selects', () => {
    const { container } = render(<OvertimePage />)
    const timeInputs = container.querySelectorAll('input[type="time"]')
    expect(timeInputs).toHaveLength(2)
    expect((timeInputs[0] as HTMLInputElement).value).toBe('')
    expect((timeInputs[1] as HTMLInputElement).value).toBe('')
    expect(container.querySelector('select')).toBeNull()
  })

  // STA-163 — the OT-type selector is removed from the form; every request is 'OT'.
  it('no longer renders the "ประเภท OT" field/label', () => {
    render(<OvertimePage />)
    expect(screen.queryByText('ประเภท OT')).not.toBeInTheDocument()
    expect(screen.queryByText('OT type')).not.toBeInTheDocument()
  })

  it('still submits a valid request (otType defaults to OT) → jumps to the Status tab', () => {
    render(<OvertimePage />)
    // Pick a date inside the current payroll period (validate() gates on the
    // wall-clock current period, so a hardcoded date would drift out of range).
    const inPeriodDate = currentPeriod().start // the 21st — always in-period
    fireEvent.change(screen.getByTestId('ot-start-date-0'), { target: { value: inPeriodDate } })
    fireEvent.change(screen.getByTestId('ot-start-time-0'), { target: { value: '18:00' } })
    fireEvent.change(screen.getByTestId('ot-end-time-0'), { target: { value: '20:00' } })
    fireEvent.change(screen.getByPlaceholderText(/ระบุเหตุผล/), { target: { value: 'งานเร่งด่วน' } })
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอ' }))
    // After a successful submit the page switches to the Status tab (form heading gone).
    expect(formHeading()).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /สถานะ/ })).toHaveAttribute('aria-selected', 'true')
  })
})

// STA-256 — date/time entry UX: abbreviated date display, auto end date, +1 hour.
describe('/overtime — STA-256 date/time entry', () => {
  it('displays the chosen start date as [day mon-abbrev year] with the BE year (TH)', () => {
    render(<OvertimePage />)
    fireEvent.change(screen.getByTestId('ot-start-date-0'), { target: { value: '2026-07-08' } })
    expect(screen.getByTestId('ot-start-date-0-display').textContent).toContain('8 ก.ค. 2569')
  })

  it('auto-fills the end date (same day; +1 day for cross-midnight) with no editable input', () => {
    render(<OvertimePage />)
    fireEvent.change(screen.getByTestId('ot-start-date-0'), { target: { value: '2026-07-08' } })
    fireEvent.change(screen.getByTestId('ot-start-time-0'), { target: { value: '18:00' } })
    fireEvent.change(screen.getByTestId('ot-end-time-0'), { target: { value: '20:00' } })
    // Same-day OT → end date = start date.
    expect(screen.getByTestId('ot-end-date-0-display').textContent).toContain('8 ก.ค. 2569')
    // Cross-midnight (end ≤ start) → end date rolls to the next day.
    fireEvent.change(screen.getByTestId('ot-end-time-0'), { target: { value: '01:00' } })
    expect(screen.getByTestId('ot-end-date-0-display').textContent).toContain('9 ก.ค. 2569')
    // The auto end date renders as display-only text — no second date input exists.
    expect(screen.queryByTestId('ot-end-date-0')).toBeNull()
  })

  it('+1 hour: first press = start + 1h, repeat presses add another hour (rolls the end date past midnight)', () => {
    render(<OvertimePage />)
    fireEvent.change(screen.getByTestId('ot-start-date-0'), { target: { value: '2026-07-08' } })
    fireEvent.change(screen.getByTestId('ot-start-time-0'), { target: { value: '22:00' } })
    const endTime = () => (screen.getByTestId('ot-end-time-0') as HTMLInputElement).value
    const plus = screen.getByTestId('ot-plus-hour-0')
    fireEvent.click(plus)
    expect(endTime()).toBe('23:00') // first press: start + 1h
    fireEvent.click(plus)
    expect(endTime()).toBe('00:00') // second press: +1h more, wraps midnight…
    expect(screen.getByTestId('ot-end-date-0-display').textContent).toContain('9 ก.ค. 2569')
    fireEvent.click(plus)
    expect(endTime()).toBe('01:00')
  })
})
