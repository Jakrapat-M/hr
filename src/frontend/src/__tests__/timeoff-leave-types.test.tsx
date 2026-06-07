/**
 * timeoff-leave-types.test.tsx — Group A: the ESS leave request form is driven
 * by the 23-type leave registry (LEAVE_TYPES), not a fixed 8-type fixture.
 * Framework: Vitest + jsdom + React Testing Library
 *
 * Verifies:
 *   - the type picker (radiogroup) renders one radio per selectable registry type
 *   - several registry Thai labels are present
 *   - the registry carries all 23 canonical leave types
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'

let mockRoles: string[] = []

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[]; userId: string | null; username: string | null }) => unknown) =>
    selector({ roles: mockRoles, userId: 'EMP001', username: 'สมชาย ใจดี' }),
}))

vi.mock('@/stores/humi-timeoff-slice', () => ({
  useTimeoffStore: (selector: (s: { history: unknown[]; submit: () => void }) => unknown) =>
    selector({ history: [], submit: () => {} }),
}))

vi.mock('@/components/quick-approve/ApprovalChain', () => ({
  ApprovalChain: () => null,
}))

import HumiTimeoffPage from '@/app/[locale]/timeoff/page'
import { LEAVE_TYPES } from '@/lib/time/leave-types'

beforeEach(() => {
  mockRoles = ['employee']
})
afterEach(() => cleanup())

// EMP001 defaults to a Store calendar, so every registry type (incl. the one
// storeOnly type) is selectable → the picker shows all 23.
const EXPECTED_COUNT = LEAVE_TYPES.length

const SAMPLE_LABELS = [
  'ลาป่วย',
  'ลาพักผ่อนประจำปี',
  'ลากิจ',
  'ลาคลอดบุตร',
  'ลาอุปสมบท',
]

describe('/timeoff — leave types (23-registry driven)', () => {
  it('the registry carries all 23 canonical leave types', () => {
    expect(LEAVE_TYPES).toHaveLength(23)
  })

  it(`the type picker offers one radio per selectable type (${EXPECTED_COUNT})`, () => {
    render(<HumiTimeoffPage />)
    const group = screen.getByRole('radiogroup', { name: 'ประเภทการลา' })
    expect(within(group).getAllByRole('radio')).toHaveLength(EXPECTED_COUNT)
  })

  it('renders sample registry Thai labels', () => {
    render(<HumiTimeoffPage />)
    const group = screen.getByRole('radiogroup', { name: 'ประเภทการลา' })
    for (const label of SAMPLE_LABELS) {
      expect(within(group).getByText(label)).toBeInTheDocument()
    }
  })
})
