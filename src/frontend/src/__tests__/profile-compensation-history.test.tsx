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
import { render, screen, cleanup } from '@testing-library/react'

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

  it('is READ-ONLY — renders no edit controls (no buttons, inputs, or textboxes)', () => {
    render(<CompensationHistory />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.querySelector('input')).toBeNull()
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('self view (owner) shows FULL unmasked amounts (no mask dots)', () => {
    render(<CompensationHistory />)
    const amounts = screen.getAllByTestId('comp-history-amount')
    const text = amounts.map((a) => a.textContent).join(' ')
    // SELF_COMP_HISTORY newest = 82,500 base; owner sees the grouped figure
    expect(text).toMatch(/82,500/)
    expect(text).not.toMatch(/••/)
    // owner is not warned about masking
    expect(screen.queryByTestId('comp-history-masked-note')).toBeNull()
  })

  it('non-owner manager view MASKS amounts (mask dots present, full figure hidden)', () => {
    rolesRef.current = ['manager']
    render(<CompensationHistory employeeId="EMP001" viewerIsOwner={false} />)
    const amounts = screen.getAllByTestId('comp-history-amount')
    const text = amounts.map((a) => a.textContent).join(' ')
    expect(text).toMatch(/••/)
    expect(text).not.toMatch(/82,500/)
    expect(screen.getByTestId('comp-history-masked-note')).toBeInTheDocument()
  })

  it('non-owner HR comp-view role (hr_admin) sees FULL amounts', () => {
    rolesRef.current = ['hr_admin']
    render(<CompensationHistory employeeId="EMP001" viewerIsOwner={false} />)
    const amounts = screen.getAllByTestId('comp-history-amount')
    const text = amounts.map((a) => a.textContent).join(' ')
    expect(text).toMatch(/82,500/)
    expect(text).not.toMatch(/••/)
  })

  it('effective dates render in Buddhist Era (2026 → 2569)', () => {
    render(<CompensationHistory />)
    // SELF_COMP_HISTORY has a 2026-01-01 entry → BE 2569
    expect(screen.getByTestId('comp-history-list').textContent).toMatch(/2569/)
  })
})
