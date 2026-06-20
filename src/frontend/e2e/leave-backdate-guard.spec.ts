// STA-130 — Restrict Backdated Leave Request (verify-and-lock regression gate).
//
// The past-date guard already works (predicate `isBookableLeaveDate` +
// `isCalendarDateDisabled` on the picker + `outsideBookable` on submit). This
// spec LOCKS that behavior so it can't silently regress:
//   1. past day cells render disabled (non-clickable, struck-through)
//   2. clicking a past cell does NOT start a range
//   3. a today/future cell IS selectable
//   4. navigating to a fully-past month shows that month's days disabled
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

test.describe('STA-130 — leave backdate guard', () => {
  test('past dates are disabled and non-selectable; today/future selectable', async ({ page }) => {
    await seed(page)
    await page.goto('/en/timeoff')

    // The leave request calendar (default tab) is visible on June 2026.
    await expect(page.getByText('June 2026')).toBeVisible()

    // 1. A past weekday cell (Wed 10 Jun, < pinned today 15 Jun) is disabled.
    const past = page.getByRole('button', { name: /^10 · outside booking window$/ })
    await expect(past).toBeVisible()
    await expect(past).toBeDisabled()

    // 2. Force-clicking the past cell does not select it (disabled → inert).
    await past.click({ force: true })
    await expect(past).toHaveAttribute('aria-pressed', 'false')

    // 3. A future cell (Tue 16 Jun, today+1, within the 90-day window) is selectable.
    const future = page.getByRole('button', { name: '16', exact: true })
    await expect(future).toBeEnabled()
    await future.click()
    await expect(future).toHaveAttribute('aria-pressed', 'true')

    // 4. Navigate to the previous (fully-past) month — May 2026 — and confirm a
    //    representative day there is disabled.
    await page.getByRole('button', { name: 'Previous month' }).click()
    await expect(page.getByText('May 2026')).toBeVisible()
    const mayDay = page.getByRole('button', { name: /^20 · outside booking window$/ })
    await expect(mayDay).toBeVisible()
    await expect(mayDay).toBeDisabled()
  })
})
