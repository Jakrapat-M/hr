/**
 * timeoff-leave-types.test.tsx — leave request form offers the full Thai
 * statutory leave-type set (8 types), not just the original 3.
 * Framework: Vitest + jsdom + React Testing Library
 *
 * Verifies:
 *   - the type picker (radiogroup) renders exactly 8 options
 *   - the 5 added statutory types are present by Thai label
 *   - the original 3 are still present
 *   - HUMI_LEAVE_BALANCES carries one entry per kind (8 total)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'

let mockRoles: string[] = []

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'th' }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[] }) => unknown) => selector({ roles: mockRoles }),
}))

vi.mock('@/stores/humi-timeoff-slice', () => ({
  useTimeoffStore: (selector: (s: { history: unknown[]; submit: () => void }) => unknown) =>
    selector({ history: [], submit: () => {} }),
}))

vi.mock('@/components/quick-approve/ApprovalChain', () => ({
  ApprovalChain: () => null,
}))

import HumiTimeoffPage from '@/app/[locale]/timeoff/page'
import { HUMI_LEAVE_BALANCES } from '@/lib/humi-mock-data'

beforeEach(() => {
  mockRoles = ['employee']
})
afterEach(() => cleanup())

const EXPECTED_LABELS = [
  'ลาพักร้อน',
  'ลาป่วย',
  'ลากิจ',
  'ลาคลอด',
  'ลาอุปสมบท',
  'ลารับราชการทหาร',
  'ลาเลี้ยงดูบุตร',
  'ลาไม่รับค่าจ้าง',
]

describe('/timeoff — leave types (Thai statutory set)', () => {
  it('the type picker offers exactly 8 options', () => {
    render(<HumiTimeoffPage />)
    const group = screen.getByRole('radiogroup', { name: 'ประเภทการลา' })
    expect(within(group).getAllByRole('radio')).toHaveLength(8)
  })

  it('renders all 8 leave-type Thai labels', () => {
    render(<HumiTimeoffPage />)
    const group = screen.getByRole('radiogroup', { name: 'ประเภทการลา' })
    for (const label of EXPECTED_LABELS) {
      expect(within(group).getByText(label)).toBeInTheDocument()
    }
  })

  it('HUMI_LEAVE_BALANCES carries one balance per kind (8 total)', () => {
    expect(HUMI_LEAVE_BALANCES).toHaveLength(8)
    const kinds = HUMI_LEAVE_BALANCES.map((b) => b.kind)
    for (const kind of ['maternity', 'ordination', 'military', 'parental', 'unpaid'] as const) {
      expect(kinds).toContain(kind)
    }
  })
})
