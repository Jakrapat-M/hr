/**
 * profile-compensation-history.test.tsx — CompensationHistory component tests (P3)
 * Framework: Vitest + jsdom + React Testing Library
 *
 * Covers:
 *   - renders a read-only compensation history list (rows present)
 *   - read-only: NO edit controls (no buttons / inputs / textboxes)
 *   - self view (owner) shows FULL amounts (unmasked)
 *   - non-owner manager view shows MASKED amounts
 *   - HR comp-view role (hr_admin) non-owner view shows FULL amounts
 *   - effective dates render in Buddhist Era (year + 543)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

// Mock next/navigation — useParams returns locale 'th'
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
}))

// Mock next-intl — return the key suffix so testids/labels stay deterministic
vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  History: () => null,
  Lock: () => null,
  ArrowRight: () => null,
  Info: () => null,
  Eye: () => null,
  EyeOff: () => null,
}))

// Controllable auth-store roles mock
const rolesRef: { current: string[] } = { current: ['employee'] }
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[] }) => unknown) =>
    selector({ roles: rolesRef.current }),
}))

import CompensationHistory from '@/components/profile/CompensationHistory'

beforeEach(() => {
  rolesRef.current = ['employee']
})

afterEach(() => {
  cleanup()
})

describe('P3 — CompensationHistory (read-only comp history)', () => {
  it('renders the read-only history container + at least one row (self view)', () => {
    render(<CompensationHistory />)
    expect(screen.getByTestId('compensation-history')).toBeInTheDocument()
    expect(screen.getByTestId('comp-history-list')).toBeInTheDocument()
    expect(screen.getAllByTestId('comp-history-row').length).toBeGreaterThan(0)
  })

  it('is READ-ONLY — no edit inputs (the reveal eye toggle is allowed, edit controls are not)', () => {
    render(<CompensationHistory />)
    // No data-entry controls — read-only surface.
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.querySelector('input')).toBeNull()
    expect(document.querySelector('textarea')).toBeNull()
    // Read-only badge present; the only interactive control is the mask reveal.
    expect(screen.getByTestId('comp-history-readonly-badge')).toBeInTheDocument()
  })

  const amountText = () =>
    screen.getAllByTestId('comp-history-amount').map((a) => a.textContent).join(' ')

  it('self view (owner) MASKS amounts BY DEFAULT; eye toggle reveals the full figure', () => {
    render(<CompensationHistory />)
    // Masked by default — even the owner must opt in to see the numbers.
    expect(amountText()).toMatch(/••/)
    expect(amountText()).not.toMatch(/82,500/)
    expect(screen.getByTestId('comp-history-reveal-toggle')).toBeInTheDocument()
    // Reveal.
    fireEvent.click(screen.getByTestId('comp-history-reveal-toggle'))
    expect(amountText()).toMatch(/82,500/)
    expect(amountText()).not.toMatch(/••/)
  })

  it('non-owner manager view is MASKED and LOCKED (no reveal toggle)', () => {
    rolesRef.current = ['manager']
    render(<CompensationHistory employeeId="EMP001" viewerIsOwner={false} />)
    expect(amountText()).toMatch(/••/)
    expect(amountText()).not.toMatch(/82,500/)
    expect(screen.getByTestId('comp-history-masked-note')).toBeInTheDocument()
    // A non-owner without comp-view privilege cannot reveal.
    expect(screen.queryByTestId('comp-history-reveal-toggle')).toBeNull()
  })

  it('non-owner HR comp-view role (hr_admin) is MASKED by default but CAN reveal', () => {
    rolesRef.current = ['hr_admin']
    render(<CompensationHistory employeeId="EMP001" viewerIsOwner={false} />)
    expect(amountText()).toMatch(/••/)
    expect(amountText()).not.toMatch(/82,500/)
    fireEvent.click(screen.getByTestId('comp-history-reveal-toggle'))
    expect(amountText()).toMatch(/82,500/)
  })

  it('effective dates render in Buddhist Era (2026 → 2569)', () => {
    render(<CompensationHistory />)
    // SELF_COMP_HISTORY has a 2026-01-01 entry → BE 2569
    expect(screen.getByTestId('comp-history-list').textContent).toMatch(/2569/)
  })
})
