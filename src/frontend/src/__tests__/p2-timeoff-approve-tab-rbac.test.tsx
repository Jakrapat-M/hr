/**
 * p2-timeoff-approve-tab-rbac.test.tsx — /timeoff no longer hosts an inline
 * approve surface (Group A reconcile, spec A6). Approval moved entirely to the
 * unified /quick-approve umbrella + /workflows/leave/[id] detail.
 * Framework: Vitest + jsdom + React Testing Library
 *
 * This file used to assert a manager-only "รออนุมัติ" tab. That surface was
 * removed: /timeoff is now submit + status-tracking ONLY for everyone. These
 * tests lock in the removal so the inline approve tab cannot silently return.
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
  useAuthStore: (
    selector: (s: { roles: string[]; userId: string | null; username: string | null }) => unknown,
  ) => selector({ roles: mockRoles, userId: 'EMP001', username: 'สมชาย ใจดี' }),
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

describe('/timeoff — no inline approve surface (approval lives in /quick-approve)', () => {
  it('employee does NOT see an approve tab', () => {
    mockRoles = ['employee']
    render(<HumiTimeoffPage />)
    expect(screen.queryByRole('tab', { name: /รออนุมัติ/ })).toBeNull()
    expect(screen.getByRole('tab', { name: /คำขอใหม่/ })).toBeInTheDocument()
  })

  it('manager also does NOT see an inline approve tab (moved to /quick-approve)', () => {
    mockRoles = ['manager']
    render(<HumiTimeoffPage />)
    expect(screen.queryByRole('tab', { name: /รออนุมัติ/ })).toBeNull()
  })

  it('a deep-link to ?tab=approve falls back to the request tab', () => {
    mockRoles = ['employee']
    mockTab = 'approve'
    render(<HumiTimeoffPage />)
    const requestTab = screen.getByRole('tab', { name: /คำขอใหม่/ })
    expect(requestTab.getAttribute('aria-selected')).toBe('true')
  })
})
