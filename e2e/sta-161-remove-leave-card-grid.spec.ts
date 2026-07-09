// STA-161 — the /time/timesheet "วันลาคงเหลือ / Time Off" tab no longer renders the
// at-a-glance leave-balance card grid (de-dupe). The detail table survives as the
// single source of truth.
import { test, expect, type Page } from '@playwright/test'

async function seedEmployee(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({ state: { userId: 'EMP001', username: 'สมชาย ใจดี', email: 'e@e.com', roles: ['employee'], isAuthenticated: true }, version: 0 }),
    )
  })
}

async function openTimeOffTab(page: Page, locale: 'th' | 'en') {
  await page.goto(`/${locale}/time/timesheet`)
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.getByRole('tab', { name: locale === 'th' ? 'วันลาคงเหลือ' : 'Time Off' }).click()
}

for (const locale of ['th', 'en'] as const) {
  test(`STA-161 — ${locale}: Time-Off tab has the detail table but NO at-a-glance card grid`, async ({ page }) => {
    await seedEmployee(page)
    await openTimeOffTab(page, locale)
    // The card grid is gone — no progressbar element remains in the tab.
    await expect(page.locator('[role="progressbar"]')).toHaveCount(0)
    // The detail table survives as the single source of truth.
    await expect(page.getByText(locale === 'th' ? 'รายละเอียดยอดวันลา' : 'Balance detail').first()).toBeVisible()
  })
}
