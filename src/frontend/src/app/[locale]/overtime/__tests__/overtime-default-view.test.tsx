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
vi.mock('@/stores/humi-profile-slice', () => ({
  useHumiProfileStore: (selector: (s: unknown) => unknown) =>
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

  // STA-158 — Start/End time are 15-minute dropdown <select>s (00:00…23:45),
  // defaulting to 18:00 / 20:00, not native <input type="time">.
  it('renders Start/End time as 15-minute dropdowns (96 options), defaults 18:00/20:00', () => {
    const { container } = render(<OvertimePage />)
    // The two time selects are the comboboxes with 96 options (the OT-type select
    // has far fewer); identify them structurally.
    const timeSelects = [...container.querySelectorAll('select')].filter(
      (s) => s.querySelectorAll('option').length === 96,
    )
    expect(timeSelects).toHaveLength(2)
    expect((timeSelects[0] as HTMLSelectElement).value).toBe('18:00')
    expect((timeSelects[1] as HTMLSelectElement).value).toBe('20:00')
    // No native time picker remains.
    expect(container.querySelector('input[type="time"]')).toBeNull()
  })
})
