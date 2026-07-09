// STA-156 — Apply the retroactive leave-date rule to ALL leave types: backdating
// is allowed down to the start of the PREVIOUS payroll cycle (1 cycle back), and
// future dates stay selectable. This extends STA-130 (which floored at the current
// cycle start) one cycle earlier. Cycle = 21st → 20th. This spec locks:
//   1. an in-cycle past day cell IS enabled + selectable (backdate within period)
//   2. a previous-cycle past cell (e.g. 20 May) IS now enabled — blocked under STA-130
//   3. the floor seam: the day before the previous-cycle start is disabled, the start is enabled
//
// The clock is PINNED (page.clock) to a known weekday midday so the assertions
// are deterministic and do not flake on the local-vs-UTC day boundary
// (Thailand = UTC+7; between 00:00–07:00 local the calendar's local "today" can
// lead todayUTC() by a day).
import { test, expect, type Page } from '@playwright/test'

// Mon 2026-06-15, 12:00 Bangkok (05:00Z) — far from any midnight boundary.
const PINNED = new Date('2026-06-15T05:00:00Z')

async function seed(page: Page) {
  await page.clock.install({ time: PINNED })
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'cnext-auth',
      JSON.stringify({
        state: { userId: 'u1', username: 'HR Admin', email: 'a@e.com', roles: ['hr_admin'], isAuthenticated: true },
        version: 0,
      }),
    )
  })
}

test.describe('STA-156 — backdated leave allowed up to one previous payroll cycle', () => {
  // Pinned today 2026-06-15 → current cycle 2026-05-21 … 06-20, previous cycle
  // 2026-04-21 … 05-20, so the backdate floor is 2026-04-21.
  test('current- and previous-cycle past dates are selectable; the floor is capped at the previous cycle', async ({ page }) => {
    await seed(page)
    await page.goto('/en/timeoff')

    // The leave request calendar (default tab) is visible on June 2026.
    await expect(page.getByText('June 2026')).toBeVisible()

    // 1. An in-cycle past cell (Wed 10 Jun, < today 15 Jun) is ENABLED and
    //    selectable (backdate within the open period).
    const inCyclePast = page.getByRole('button', { name: '10', exact: true })
    await expect(inCyclePast).toBeEnabled()
    await inCyclePast.click()
    await expect(inCyclePast).toHaveAttribute('aria-pressed', 'true')

    // 2. A previous-cycle past cell: 20 May (previous-cycle end) is now ENABLED —
    //    this was disabled under STA-130's current-cycle-only floor.
    await page.getByRole('button', { name: 'Previous month' }).click()
    await expect(page.getByText('May 2026')).toBeVisible()
    await expect(page.getByRole('button', { name: '20', exact: true })).toBeEnabled()

    // 3. The floor seam in April 2026: 20 Apr (before the previous-cycle start) is
    //    disabled, 21 Apr (the previous-cycle start = floor) is enabled.
    await page.getByRole('button', { name: 'Previous month' }).click()
    await expect(page.getByText('April 2026')).toBeVisible()
    const preFloor = page.getByRole('button', { name: /^20 · outside booking window$/ })
    await expect(preFloor).toBeVisible()
    await expect(preFloor).toBeDisabled()
    await expect(page.getByRole('button', { name: '21', exact: true })).toBeEnabled()
  })
})
