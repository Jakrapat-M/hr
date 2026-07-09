// STA-160 — leave-balance cards seed sample quota for the admin (ADM001) viewer.
// The /timeoff quota cards must show Sick 30/6/24, Annual 10/3/7, Personal 3/1/2
// (not the all-zero "no quota allocated" empty state), in both locales.
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

// A quota card is asserted by locating the card whose header contains the leave
// label, then checking its Total/Used/Remaining figures render.
async function assertCard(page: Page, label: RegExp, total: string, used: string, remaining: string) {
  const card = page.locator('section,div').filter({ hasText: label }).filter({ hasText: /Remaining|คงเหลือ/ }).first()
  await expect(card).toBeVisible()
  const text = (await card.innerText()).replace(/\s+/g, ' ')
  // empty-state must NOT be present on this card
  expect(text).not.toMatch(/No quota allocated|ยังไม่กำหนดโควต้า/)
  expect(text).toContain(total)
  expect(text).toContain(used)
  expect(text).toContain(remaining)
}

for (const locale of ['en', 'th'] as const) {
  test(`STA-160 — ${locale}: ADM001 leave cards show 30/6/24, 10/3/7, 3/1/2`, async ({ page }) => {
    await seedAdmin(page)
    await page.goto(`/${locale}/timeoff`)
    await page.waitForLoadState('networkidle').catch(() => {})
    // No empty-state anywhere in the quota strip.
    await expect(page.getByText(/No quota allocated yet|ยังไม่กำหนดโควต้า/).first()).toHaveCount(0)
    await assertCard(page, /Sick Leave|ลาป่วย/i, '30', '6', '24')
    await assertCard(page, /Annual Leave|ลาพักร้อน|ลาพักผ่อน/i, '10', '3', '7')
    await assertCard(page, /Personnel Leave|Personal Leave|ลากิจ/i, '3', '1', '2')
  })
}
