/**
 * create-only.test.tsx — the Time Off / Leave page is now a create-only submit
 * surface. It shows the balance cards + the new-request form only: no status /
 * history tab, no leave-policy card, and no resignation entry. On a successful
 * submit it hands off to the status list at /time/my-requests (never the detail
 * route). Framework: Vitest + jsdom + React Testing Library
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (s: { roles: string[]; userId: string | null; username: string | null }) => unknown,
  ) => selector({ roles: ['employee'], userId: 'EMP001', username: 'สมชาย ใจดี' }),
}))

vi.mock('@/stores/humi-timeoff-slice', () => ({
  useTimeoffStore: (selector: (s: { history: unknown[]; submit: () => void }) => unknown) =>
    selector({ history: [], submit: () => {} }),
}))

vi.mock('@/components/quick-approve/ApprovalChain', () => ({
  ApprovalChain: () => null,
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...props
  }: {
    href: string
    children: React.ReactNode
    className?: string
    [k: string]: unknown
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

import HumiTimeoffPage from '@/app/[locale]/timeoff/page'

beforeEach(() => {
  pushMock.mockClear()
})
afterEach(() => cleanup())

/** Select a leave type by its Thai label in the type radiogroup. */
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
    .filter(
      (b) =>
        /^\d+(\s·.*)?$/.test(b.getAttribute('aria-label') ?? '') &&
        b.getAttribute('aria-disabled') === 'false',
    )
  expect(dayButtons.length).toBeGreaterThan(0)
  fireEvent.click(dayButtons[0])
}

describe('Time Off — create-only page', () => {
  it('renders no status/history tab', () => {
    render(<HumiTimeoffPage />)
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.queryByText(/สถานะคำขอของฉัน/i)).not.toBeInTheDocument()
  })

  it('renders no leave-policy card', () => {
    render(<HumiTimeoffPage />)
    expect(screen.queryByText(/นโยบายวันลา/i)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'อ่านนโยบายฉบับเต็ม' }),
    ).toBeNull()
  })

  it('renders no /resignation link', () => {
    render(<HumiTimeoffPage />)
    const resignLinks = screen
      .queryAllByRole('link')
      .filter((a) => (a.getAttribute('href') ?? '').includes('/resignation'))
    expect(resignLinks).toHaveLength(0)
  })

  it('on submit, routes to the my-requests list (not the detail route)', () => {
    render(<HumiTimeoffPage />)
    // Unpaid sick leave is quota-untracked + reason-optional, so a single full
    // day is submittable without seeding a balance or attaching documents.
    selectType('ลาป่วยไม่รับเงิน')
    pickFirstBookableDay()

    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอ' }))

    expect(pushMock).toHaveBeenCalledTimes(1)
    const target = pushMock.mock.calls[0][0] as string
    // Must be exactly the list route, optionally with a query string.
    expect(target).toMatch(/^\/th\/time\/my-requests(\?.*)?$/)
    // Must NOT carry an extra path segment (the detail route /my-requests/<id>).
    expect(target).not.toMatch(/^\/th\/time\/my-requests\/[^?]/)
  })
})
