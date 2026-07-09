// STA-153 / STA-195 — the Timesheet "Schedule" tab is CALENDAR-FIRST (the old
// Table/Calendar toggle was removed by the STA-195 redesign). This spec locks:
// the weekday grid renders, cells show the shift TIME range (never the raw
// shift ID/code), and the month navigation is present.
import { test, expect, type Page } from '@playwright/test'

async function seed(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'cnext-auth',
      JSON.stringify({
        state: { userId: 'EMP501', username: 'ทดสอบ พนักงาน', email: 'a@e.com', roles: ['manager'], isAuthenticated: true },
        version: 0,
      }),
    )
  })
}

test.describe('STA-153/195 — timesheet Schedule calendar', () => {
  test('renders the weekday grid with shift times (no raw shift codes)', async ({ page }) => {
    await seed(page)
    await page.goto('/en/time/timesheet')

    await page.getByRole('tab', { name: 'Schedule' }).click()

    // Weekday header grid (calendar-first, no view toggle).
    await expect(page.getByText('Mon', { exact: true })).toBeVisible()
    await expect(page.getByText('Sun', { exact: true })).toBeVisible()

    // STA-153 rework — cells show the shift TIME, never the shift ID/code
    // (generic shift-code shape <hrs><break-letter><HHMM>, e.g. 8A1000, 4C0800).
    await expect(page.getByText(/\b\d(?:\.\d)?[A-C]\d?\d{4}\b/)).toHaveCount(0)
    await expect(page.getByText(/^\d{2}:\d{2}–\d{2}:\d{2}$/).first()).toBeVisible()

    // Month navigation chips render (previous / next month names).
    await expect(page.getByRole('button', { name: /May|July/ }).first()).toBeVisible()
  })
})
