// quick-actions-cap.test.tsx — STA-246
// A reorder that would push the enabled tiles past the 4-row cap must be reverted
// (no setQuickActions) and surface the pumpkin cap hint — never red.

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useAdminSelfService } from '@/lib/admin/store/useAdminSelfService'
import type { QuickActionTile } from '@/lib/admin/types/adminSelfService'
import QuickActionsPage from '../page'

// A(4x2), B(2x2), C(2x2) in order → 4 rows (fits). Moving A down → [B,A,C] → 5 rows (overflow).
const TILES: QuickActionTile[] = [
  { id: 'A', label: 'ใหญ่', icon: 'Star', href: '/th/a', enabled: true, order: 1, size: '4x2' },
  { id: 'B', label: 'กลาง', icon: 'Bell', href: '/th/b', enabled: true, order: 2, size: '2x2' },
  { id: 'C', label: 'กลางสอง', icon: 'User', href: '/th/c', enabled: true, order: 3, size: '2x2' },
]

describe('QuickActionsPage — STA-246 reorder cap guard', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
    useAdminSelfService.setState((s) => ({
      draft: { ...s.draft, quickActions: TILES.map((t) => ({ ...t })) },
    }))
  })

  it('moving a tile past the 4-row cap reverts and shows the pumpkin hint (no red)', () => {
    render(<QuickActionsPage />)

    // Mobile list renders one "เลื่อนลง" (move down) button per tile; the first is tile A.
    const moveDownButtons = screen.getAllByLabelText('เลื่อนลง')
    fireEvent.click(moveDownButtons[0])

    // Guard reverted: draft order is unchanged (setQuickActions was not called).
    const order = useAdminSelfService.getState().draft.quickActions.map((q) => q.id)
    expect(order).toEqual(['A', 'B', 'C'])

    // Pumpkin cap hint surfaced via the existing toast.
    const toast = screen.getByRole('alert')
    expect(toast.textContent).toContain('เกิน 4 แถวสูงสุด')
    expect(toast.className).toContain('bg-danger')
    // NO-RED guardrail — the hint must not use any red/rose/pink token.
    expect(toast.className).not.toMatch(/(red|rose|pink|crimson|coral)/)
  })

  it('a safe reorder within the cap still applies', () => {
    render(<QuickActionsPage />)
    // Moving B (index 1) down swaps to [A, C, B] → still 4 rows → allowed.
    const moveDownButtons = screen.getAllByLabelText('เลื่อนลง')
    fireEvent.click(moveDownButtons[1])
    const order = useAdminSelfService.getState().draft.quickActions.map((q) => q.id)
    expect(order).toEqual(['A', 'C', 'B'])
  })
})
