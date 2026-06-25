// STA-153 — the Timesheet "Schedule" tab offers a Table / Calendar view toggle,
// defaulting to Table. This spec locks: the toggle exists, Table is the default
// selected view (the schedule table renders), and switching to Calendar shows the
// Mon→Sun weekday grid while hiding the table.
import { test, expect, type Page } from '@playwright/test'

async function seed(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({
        state: { userId: 'EMP501', username: 'ทดสอบ พนักงาน', email: 'a@e.com', roles: ['manager'], isAuthenticated: true },
        version: 0,
      }),
    )
  })
}

test.describe('STA-153 — timesheet Schedule view toggle', () => {
  test('defaults to Table; Calendar switches to the weekday grid', async ({ page }) => {
    await seed(page)
    await page.goto('/en/time/timesheet')

    await page.getByRole('tab', { name: 'Schedule' }).click()

    // Default view = Table (toggle pressed + the schedule table header renders).
    const tableToggle = page.getByRole('button', { name: 'Table' })
    const calendarToggle = page.getByRole('button', { name: 'Calendar' })
    await expect(tableToggle).toHaveAttribute('aria-pressed', 'true')
    await expect(calendarToggle).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('columnheader', { name: 'Shift code' })).toBeVisible()

    // Switch to Calendar → weekday header grid appears, the table is gone.
    await calendarToggle.click()
    await expect(calendarToggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Mon', { exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Shift code' })).toHaveCount(0)

    // Back to Table restores the table.
    await tableToggle.click()
    await expect(page.getByRole('columnheader', { name: 'Shift code' })).toBeVisible()
  })
})
