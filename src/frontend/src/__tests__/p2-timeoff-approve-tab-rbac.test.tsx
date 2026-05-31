/**
 * p2-timeoff-approve-tab-rbac.test.tsx — manager approval tab gating on /timeoff
 * Framework: Vitest + jsdom + React Testing Library
 *
 * P2 task 2: the "รออนุมัติ" (approve) tab is a manager-only surface
 * (remove-not-hide). Employees never see it; the canonical approval inbox stays
 * /quick-approve. A deep-link to ?tab=approve as a non-reviewer falls back to
 * the request tab.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

let mockRoles: string[] = []
let mockTab: string | null = null

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
  useSearchParams: () => ({ get: (k: string) => (k === 'tab' ? mockTab : null) }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[] }) => unknown) => selector({ roles: mockRoles }),
}))

vi.mock('@/stores/humi-timeoff-slice', () => ({
  useTimeoffStore: (selector: (s: { history: unknown[]; submit: () => void }) => unknown) =>
    selector({ history: [], submit: () => {} }),
}))

// Keep heavy children out of the render path so the test stays fast + stable.
vi.mock('@/components/quick-approve/ApprovalChain', () => ({
  ApprovalChain: () => null,
}))

import HumiTimeoffPage from '@/app/[locale]/timeoff/page'

beforeEach(() => {
  mockRoles = []
  mockTab = null
})
afterEach(() => cleanup())

describe('P2 — /timeoff approve tab RBAC', () => {
  it('employee does NOT see the approve tab', () => {
    mockRoles = ['employee']
    render(<HumiTimeoffPage />)
    expect(screen.queryByRole('tab', { name: /รออนุมัติ/ })).toBeNull()
    expect(screen.getByRole('tab', { name: /คำขอใหม่/ })).toBeInTheDocument()
  })

  it('manager DOES see the approve tab', () => {
    mockRoles = ['manager']
    render(<HumiTimeoffPage />)
    expect(screen.getByRole('tab', { name: /รออนุมัติ/ })).toBeInTheDocument()
  })

  it('employee deep-linking to ?tab=approve falls back to the request tab', () => {
    mockRoles = ['employee']
    mockTab = 'approve'
    render(<HumiTimeoffPage />)
    const requestTab = screen.getByRole('tab', { name: /คำขอใหม่/ })
    expect(requestTab.getAttribute('aria-selected')).toBe('true')
  })
})
