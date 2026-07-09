// STA-175 — employee self-cancel before first approval, on the unified /requests
// tracker. EMP-0301 owns the pre-seeded pending leave/OT/time-correction rows, so
// the "ยกเลิก / Cancel" button renders on its OWN cancellable rows. Clicking it
// opens a confirm popup (5 fields + pumpkin warning + ยืนยันการยกเลิก/ไม่ยกเลิก);
// confirming flips the row to cancelled, drops it from the tracker, and toasts.
import { test, expect, type Page } from '@playwright/test'

async function seedEmployee(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'cnext-auth',
      JSON.stringify({
        state: {
          userId: 'EMP-0301',
          username: 'พิมพ์ชนก ศรีวัฒน์',
          email: 'p@e.com',
          roles: ['employee'],
          isAuthenticated: true,
        },
        version: 0,
      }),
    )
  })
}

test('STA-175 — Cancel renders on own pending rows; confirm popup shows the warning', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/requests')
  await page.waitForLoadState('networkidle').catch(() => {})

  const cancelBtns = page.getByRole('button', { name: 'ยกเลิก' })
  await expect(cancelBtns.first()).toBeVisible()

  // Open the confirm popup on the first cancellable row.
  await cancelBtns.first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Pumpkin (NO-RED) destructive warning + both action buttons.
  await expect(dialog.getByText(/ไม่สามารถแก้ไขได้/)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'ยืนยันการยกเลิก' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'ไม่ยกเลิก' })).toBeVisible()
})

test('STA-175 — confirming cancellation drops the row and toasts success', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/requests')
  await page.waitForLoadState('networkidle').catch(() => {})

  const cancelBtns = page.getByRole('button', { name: 'ยกเลิก' })
  await expect(cancelBtns.first()).toBeVisible()
  const before = await cancelBtns.count()

  await cancelBtns.first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'ยืนยันการยกเลิก' }).click()

  // Popup closes, success toast shows, the cancelled row leaves the tracker so the
  // remaining cancellable-row count strictly decreases.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText(/ยกเลิกคำขอแล้ว/)).toBeVisible()
  await expect(cancelBtns).toHaveCount(before - 1)
})

test('STA-175 — Keep Request closes the popup without cancelling (row stays)', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/requests')
  await page.waitForLoadState('networkidle').catch(() => {})

  const cancelBtns = page.getByRole('button', { name: 'ยกเลิก' })
  await expect(cancelBtns.first()).toBeVisible()
  const before = await cancelBtns.count()

  await cancelBtns.first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'ไม่ยกเลิก' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(cancelBtns).toHaveCount(before) // nothing cancelled
})
