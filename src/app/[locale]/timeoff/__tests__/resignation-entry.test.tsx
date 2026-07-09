/**
 * resignation-entry.test.tsx — the Time Off / Leave self-service hub is now
 * create-only. The resignation ("คำขอลาออก / Resignation") entry no longer
 * lives here — it belongs on Profile → Employment. This suite asserts the hub
 * renders NO link to /resignation and none of the resignation entry copy.
 * Framework: Vitest + jsdom + React Testing Library
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

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

import CnextTimeoffPage from '@/app/[locale]/timeoff/page'

beforeEach(() => {
  mockRoles = ['employee']
})
afterEach(() => cleanup())

describe('Time Off hub — no resignation entry', () => {
  it('renders no /resignation link', () => {
    render(<CnextTimeoffPage />)

    const resignLinks = screen
      .queryAllByRole('link')
      .filter((a) => (a.getAttribute('href') ?? '').includes('/resignation'))
    expect(resignLinks).toHaveLength(0)
  })

  it('renders no resignation entry copy', () => {
    render(<CnextTimeoffPage />)

    expect(screen.queryByText(/ดูคำขอลาออก/i)).not.toBeInTheDocument()
  })
})
