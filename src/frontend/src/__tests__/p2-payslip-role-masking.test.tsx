/**
 * p2-payslip-role-masking.test.tsx — role-based masking on the pay-statement card
 * Framework: Vitest + jsdom + React Testing Library
 *
 * P2 task 3: the OWNER (self view) can reveal full salary + recurring
 * components; a NON-OWNER / lower-tier viewer sees them permanently masked with
 * the reveal toggle removed (replaced by a lock badge — never red, never
 * unmaskable). A privileged HR comp-view role re-grants the reveal control.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock('lucide-react', () => ({
  Wallet: () => null,
  Eye: () => null,
  EyeOff: () => null,
  ExternalLink: () => null,
  FileText: () => null,
  Lock: () => null,
  Info: () => null,
}))

// Controllable auth roles
let mockRoles: string[] = []
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[] }) => unknown) => selector({ roles: mockRoles }),
}))

import CompensationSummary from '@/components/profile/CompensationSummary'

const MASKED_PATTERN = /••••,500/
const UNMASKED_PATTERN = /82,500/

beforeEach(() => {
  mockRoles = []
})
afterEach(() => {
  cleanup()
  vi.clearAllTimers()
})

describe('P2 — payslip role-based masking', () => {
  it('owner (self view, prop omitted) can reveal full salary', () => {
    render(<CompensationSummary />)
    // reveal toggle is present for the owner
    const toggle = screen.getByTestId('comp-reveal-toggle')
    expect(screen.queryByTestId('comp-viewonly-badge')).toBeNull()
    expect(screen.getByTestId('comp-base').textContent).toMatch(MASKED_PATTERN)
    fireEvent.click(toggle)
    expect(screen.getByTestId('comp-base').textContent).toMatch(UNMASKED_PATTERN)
  })

  it('non-owner lower-tier viewer sees masked salary and NO reveal toggle', () => {
    mockRoles = ['employee']
    render(<CompensationSummary viewerIsOwner={false} />)
    expect(screen.queryByTestId('comp-reveal-toggle')).toBeNull()
    expect(screen.getByTestId('comp-viewonly-badge')).toBeInTheDocument()
    expect(screen.getByTestId('comp-base').textContent).toMatch(MASKED_PATTERN)
    expect(screen.getByTestId('comp-base').textContent).not.toMatch(UNMASKED_PATTERN)
  })

  it('non-owner also masks recurring components (bonus / equity)', () => {
    mockRoles = ['manager']
    render(<CompensationSummary viewerIsOwner={false} />)
    const recurring = screen.getByTestId('comp-recurring')
    // raw mock bonus string fragment must not leak
    expect(recurring.textContent).not.toMatch(/Performance-linked/)
    expect(recurring.textContent).toMatch(/••••/)
  })

  it('non-owner with HR comp-view role keeps the reveal control', () => {
    mockRoles = ['hr_admin']
    render(<CompensationSummary viewerIsOwner={false} />)
    expect(screen.getByTestId('comp-reveal-toggle')).toBeInTheDocument()
    expect(screen.queryByTestId('comp-viewonly-badge')).toBeNull()
  })
})
