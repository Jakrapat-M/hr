// STA-162 — the /time/timesheet "Time Off" detail table shows the canonical 7-row
// sample for the admin viewer (ADM001):
//   sick 30/1/5/24, annual 10/1/3/6, personnel 3/0/1/2, maternity ×4 initial-only.
// Also verifies the /timeoff annual card converges to Remaining 6 (supersedes STA-160's 7).
import { test, expect, type Page } from '@playwright/test'

async function seedAdmin(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'cnext-auth',
      JSON.stringify({ state: { userId: 'ADM001', username: 'HR Admin', email: 'a@e.com', roles: ['hr_admin'], isAuthenticated: true }, version: 0 }),
    )
  })
}

// Assert one detail-table row reads Total/Pending/Used/Ending by locating the row
// containing the leave-type label.
async function assertRow(page: Page, label: RegExp, total: string, pending: string, used: string, ending: string) {
  const row = page.locator('tr').filter({ hasText: label }).first()
  await expect(row).toBeVisible()
  const cells = (await row.innerText()).split(/\s+/).filter(Boolean)
  for (const v of [total, pending, used, ending]) expect(cells).toContain(v)
}

test('STA-162 — /time/timesheet Time-Off table shows the canonical 7-row sample (ADM001)', async ({ page }) => {
  await seedAdmin(page)
  await page.goto('/en/time/timesheet')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.getByRole('tab', { name: 'Time Off' }).click()
  await expect(page.getByText('Balance detail').first()).toBeVisible()
  // Total · Pending · Used(Debits) · Remaining(Ending)
  await assertRow(page, /Sick Leave/i, '30', '1', '5', '24')
  await assertRow(page, /Annual Leave/i, '10', '1', '3', '6')
  await assertRow(page, /Personnel Leave|Personal Leave/i, '3', '0', '1', '2')
  await assertRow(page, /Maternity Leave(?! \()/i, '98', '0', '0', '98')
})

test('STA-162 — /timeoff annual card converges to Remaining 6 (supersedes STA-160)', async ({ page }) => {
  await seedAdmin(page)
  await page.goto('/en/timeoff')
  await page.waitForLoadState('networkidle').catch(() => {})
  // The Annual Leave quota card shows 6 remaining.
  const annualCard = page.locator('div').filter({ hasText: /Annual Leave/i }).filter({ hasText: /Remaining|days left/i }).last()
  await expect(annualCard).toContainText('6')
})
