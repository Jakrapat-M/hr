// STA-165 — the ESS Time-Correction form is a repeatable "Correction Day N" row
// editor: "Add Correction Day" appends a section, each extra section has a Remove,
// and Remove never drops the last row.
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

test('STA-165 — Add/Remove repeatable Correction Day rows on the time-correction form', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/time/corrections')
  await page.waitForLoadState('networkidle').catch(() => {})

  // Day 1 renders by default; no second day yet.
  await expect(page.getByText('วันแก้ไขเวลา 1')).toBeVisible()
  await expect(page.getByText('วันแก้ไขเวลา 2')).toHaveCount(0)

  // Add a correction day → a second section appears; with >1 row every row is
  // removable, so two Remove buttons show.
  await page.getByRole('button', { name: '+ เพิ่มวันแก้ไขเวลา' }).click()
  await expect(page.getByText('วันแก้ไขเวลา 2')).toBeVisible()
  const removeBtns = page.getByRole('button', { name: 'ลบ', exact: true })
  await expect(removeBtns).toHaveCount(2)

  // Remove one → back to a single day; Remove hides (never drops the last row).
  await removeBtns.first().click()
  await expect(page.getByText('วันแก้ไขเวลา 2')).toHaveCount(0)
  await expect(page.getByText('วันแก้ไขเวลา 1')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ลบ', exact: true })).toHaveCount(0)
})
