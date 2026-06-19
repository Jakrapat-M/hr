// STA-132 follow-up — 3 gaps found in live review (Tan):
//   1. The standalone "Special privileges" section must be REMOVED (ticket point 3).
//   2. Claim history must match the /benefits-hub reference: Export + search/date
//      filter row + 4-column table (Benefit Name / Claim Amount / Submission Date /
//      Status), not the old 6-column receipt table (ticket point 5).
//   3. The current-benefit row "Insert" action keeps its icon — verified present.
import { test, expect, type Page } from '@playwright/test'

const ROUTE = '/en/admin/employees/EMP-0002'

async function seedAdmin(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({
        state: { userId: 'u-admin', username: 'HR Admin', email: 'a@e.com', roles: ['hr_admin'], isAuthenticated: true },
        version: 0,
      }),
    )
  })
}

async function expandCard(page: Page, id: string) {
  const card = page.locator(id)
  await card.locator('button[aria-expanded="false"]').first().click().catch(() => {})
  await page.waitForTimeout(250)
  return card
}

test.describe('STA-132 follow-up — employee page', () => {
  test('special privileges removed; claim history matches reference; insert action present', async ({ page }) => {
    await seedAdmin(page)
    await page.goto(ROUTE)
    await expect(page.locator('#emp-current-benefits')).toBeVisible()

    // 1. Special privileges section is gone.
    await expect(page.locator('#emp-special-privilege')).toHaveCount(0)

    // 2. Claim history matches the reference layout.
    const ch = await expandCard(page, '#emp-claim-history')
    await expect(page.locator('#emp-claim-search')).toHaveCount(1)
    await expect(page.locator('#emp-claim-start')).toHaveCount(1)
    await expect(page.locator('#emp-claim-end')).toHaveCount(1)
    await expect(ch.getByText(/Export/i).first()).toBeVisible()
    await expect(ch.getByText('Benefit Name', { exact: false }).first()).toBeVisible()
    await expect(ch.getByText('Claim Amount', { exact: false }).first()).toBeVisible()
    await expect(ch.getByText('Submission Date', { exact: false }).first()).toBeVisible()
    // old 6-column receipt schema must be gone
    await expect(ch.getByText('Receipt no.', { exact: false })).toHaveCount(0)

    // 3. Current-benefit rows still expose the Insert action.
    const cb = await expandCard(page, '#emp-current-benefits')
    await expect(cb.getByRole('button', { name: /Insert/i }).first()).toBeVisible()
  })
})
