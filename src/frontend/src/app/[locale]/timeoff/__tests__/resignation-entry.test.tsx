/**
 * resignation-entry.test.tsx — the Time Off / Leave self-service hub must NOT
 * surface a resignation entry. Resigning is a distinct lifecycle action (not a
 * type of leave) and is intentionally kept low-prominence on the profile
 * Employment tab instead. This suite guards against re-adding it to the hub.
 * Framework: Vitest + jsdom + React Testing Library
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

let mockRoles: string[] = []

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (s: { roles: string[]; userId: string | null; username: string | null }) => unknown,
  ) => selector({ roles: mockRoles, userId: 'EMP001', username: 'สมชาย ใจดี' }),
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
  mockRoles = ['employee']
})
afterEach(() => cleanup())

describe('Time Off hub does NOT surface the resignation entry', () => {
  it('renders no link pointing at /resignation (kept off the Leave hub)', () => {
    render(<HumiTimeoffPage />)

    const resignLink = screen
      .queryAllByRole('link')
      .find((l) => (l.getAttribute('href') ?? '').includes('resignation'))
    expect(resignLink).toBeUndefined()
  })
})
