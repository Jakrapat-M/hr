/**
 * payslip-page-standalone.test.tsx — the shared PayStatements list backing the
 * standalone /payslip page.
 * Framework: Vitest + jsdom + React Testing Library
 *
 * The /payslip page itself (real page, no redirect) is covered in
 * benefit-journey-canonical.test.tsx. Here we exercise the extracted
 * PayStatements unit directly: it renders the monthly statement list, masks net
 * pay by default with a reveal toggle (owner), and permanently masks for a
 * non-owner without an HR comp-view role.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
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
  Eye: () => null,
  EyeOff: () => null,
  ExternalLink: () => null,
  FileText: () => null,
  Download: () => null,
}))

let mockRoles: string[] = []
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[] }) => unknown) => selector({ roles: mockRoles }),
}))

import PayStatements from '@/components/profile/PayStatements'

afterEach(() => {
  cleanup()
  mockRoles = []
})

const MASKED_NET = /สุทธิ ••,•••/
const UNMASKED_NET = /48,200/

describe('PayStatements (standalone /payslip surface)', () => {
  it('renders the monthly pay-statement list (rows, not a redirect)', () => {
    render(<PayStatements variant="standalone" />)
    expect(screen.getByTestId('pay-statements')).toBeInTheDocument()
    expect(screen.getAllByTestId('payslip-row').length).toBeGreaterThan(0)
  })

  it('lists the seeded statement months', () => {
    render(<PayStatements variant="standalone" />)
    const list = screen.getByTestId('pay-statements')
    expect(list.textContent).toMatch(/มีนาคม 2569/)
    expect(list.textContent).toMatch(/มกราคม 2569/)
  })

  it('masks net pay by default and reveals on toggle (owner self view)', () => {
    render(<PayStatements variant="standalone" />)
    const list = screen.getByTestId('pay-statements')
    expect(list.textContent).toMatch(MASKED_NET)
    expect(list.textContent).not.toMatch(UNMASKED_NET)
    fireEvent.click(screen.getByTestId('payslip-reveal-toggle'))
    expect(screen.getByTestId('pay-statements').textContent).toMatch(UNMASKED_NET)
  })

  it('non-owner without HR comp-view role sees net pay permanently masked (no toggle)', () => {
    mockRoles = ['employee']
    render(<PayStatements variant="standalone" viewerIsOwner={false} />)
    expect(screen.queryByTestId('payslip-reveal-toggle')).toBeNull()
    expect(screen.getByTestId('pay-statements').textContent).toMatch(MASKED_NET)
  })

  it('non-owner WITH HR comp-view role keeps the reveal toggle', () => {
    mockRoles = ['hr_admin']
    render(<PayStatements variant="standalone" viewerIsOwner={false} />)
    expect(screen.getByTestId('payslip-reveal-toggle')).toBeInTheDocument()
  })
})
