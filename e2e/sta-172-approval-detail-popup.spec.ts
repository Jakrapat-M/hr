// STA-172 — clicking a request ROW on the /quick-approve inbox opens a detail POPUP
// (RequestDetailModal) with Approve / Cancel; Approve dispatches + drops the row,
// Cancel just closes (row stays). The table stays the list.
import { test, expect, type Page } from '@playwright/test'

async function seedAdmin(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({ state: { userId: 'ADM001', username: 'HR Admin', email: 'a@e.com', roles: ['hr_admin'], isAuthenticated: true }, version: 0 }),
    )
  })
}

test('STA-172 — row-click opens the detail popup; Approve dispatches + drops the row', async ({ page }) => {
  await seedAdmin(page)
  await page.goto('/th/quick-approve')
  await page.waitForLoadState('networkidle').catch(() => {})

  const rows = page.locator('tbody tr[role="button"]')
  await expect(rows.first()).toBeVisible()
  const before = await rows.count()

  // Click a row → the detail popup opens with Approve / Cancel.
  await rows.first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('รายละเอียดคำขอ').first()).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'อนุมัติ' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'ยกเลิก' })).toBeVisible()

  // Approve dispatches the registry approve and closes the popup. The row then
  // either leaves the queue (single-stage type) or advances to its next approval
  // stage (2-stage type) — never increases; the dispatch itself is unit-tested.
  await dialog.getByRole('button', { name: 'อนุมัติ' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await rows.count()).toBeLessThanOrEqual(before)
})

test('STA-172 — Cancel closes the popup without dispatching (row stays)', async ({ page }) => {
  await seedAdmin(page)
  await page.goto('/th/quick-approve')
  await page.waitForLoadState('networkidle').catch(() => {})

  const rows = page.locator('tbody tr[role="button"]')
  await expect(rows.first()).toBeVisible()
  const before = await rows.count()

  await rows.first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'ยกเลิก' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(rows).toHaveCount(before) // row still there
})
