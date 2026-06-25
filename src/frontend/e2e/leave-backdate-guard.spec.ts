// STA-130 (REVERSAL) — Allow backdated leave within the current payroll period,
// capped at the period floor (BA Pattranuch 2026-06-25). Backdated leave is now
// ALLOWED for the open period (sick leave is inherently retroactive) but NOT into
// a prior, processed period. This spec locks the inverted behavior:
//   1. an in-cycle past day cell IS enabled + selectable (backdate within period)
//   2. the floor seam: the day before the period start is disabled, the start is enabled
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
      'humi-auth',
      JSON.stringify({
        state: { userId: 'u1', username: 'HR Admin', email: 'a@e.com', roles: ['hr_admin'], isAuthenticated: true },
        version: 0,
      }),
    )
  })
}

test.describe('STA-130 — backdated leave allowed within the current period', () => {
  // Pinned today 2026-06-15 → current payroll period 2026-05-21 … 06-20,
  // so the backdate floor is 2026-05-21.
  test('in-cycle past dates are selectable; pre-period dates stay capped', async ({ page }) => {
    await seed(page)
    await page.goto('/en/timeoff')

    // The leave request calendar (default tab) is visible on June 2026.
    await expect(page.getByText('June 2026')).toBeVisible()

    // 1. An in-cycle past cell (Wed 10 Jun, ≥ 21 May floor, < today 15 Jun) is now
    //    ENABLED and selectable (backdate within the open period).
    const inCyclePast = page.getByRole('button', { name: '10', exact: true })
    await expect(inCyclePast).toBeEnabled()
    await inCyclePast.click()
    await expect(inCyclePast).toHaveAttribute('aria-pressed', 'true')

    // 2. The floor seam in May 2026: 20 May (before the period start) is disabled,
    //    21 May (the period start) is enabled.
    await page.getByRole('button', { name: 'Previous month' }).click()
    await expect(page.getByText('May 2026')).toBeVisible()
    const preFloor = page.getByRole('button', { name: /^20 · outside booking window$/ })
    await expect(preFloor).toBeVisible()
    await expect(preFloor).toBeDisabled()
    await expect(page.getByRole('button', { name: '21', exact: true })).toBeEnabled()
  })
})
