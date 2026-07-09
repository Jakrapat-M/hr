// STA-164 — the OT Request form is a repeatable "OT Day N" row editor: "Add OT Day"
// appends a row, each extra row has a Remove, Remove never drops the last, and a
// Total OT hours line is shown.
import { test, expect, type Page } from '@playwright/test'

async function seedEmployee(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'cnext-auth',
      JSON.stringify({ state: { userId: 'EMP001', username: 'สมชาย ใจดี', email: 'e@e.com', roles: ['employee'], isAuthenticated: true }, version: 0 }),
    )
  })
}

test('STA-164 — Add/Remove repeatable OT Day rows + a Total OT hours line', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/overtime')
  await page.waitForLoadState('networkidle').catch(() => {})

  // Day 1 by default; a Total line is shown; no second day yet.
  await expect(page.getByText('วัน OT 1')).toBeVisible()
  await expect(page.getByText('รวมชั่วโมง OT:')).toBeVisible()
  await expect(page.getByText('วัน OT 2')).toHaveCount(0)

  // Add an OT day → a second section appears; with >1 row every row is removable.
  await page.getByRole('button', { name: '+ เพิ่มวัน OT' }).click()
  await expect(page.getByText('วัน OT 2')).toBeVisible()
  const removeBtns = page.getByRole('button', { name: 'ลบ', exact: true })
  await expect(removeBtns).toHaveCount(2)

  // Remove one → back to a single day; Remove hides (never drops the last row).
  await removeBtns.first().click()
  await expect(page.getByText('วัน OT 2')).toHaveCount(0)
  await expect(page.getByText('วัน OT 1')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ลบ', exact: true })).toHaveCount(0)
})
