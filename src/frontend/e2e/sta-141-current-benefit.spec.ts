// STA-141 — revise 'current benefit' (delete icon + move insert attachment + insert footer).
//   1. each Current Benefits row has a Delete (trash) icon → "Confirm delete plan"
//      modal with that row's name/id + pumpkin Delete; confirm removes the row.
//   2. the Insert date-gate popup is date-only (no attachment); the attachment
//      moved to the Insert detail page (edit mode), below "Effective end date".
//   3. the Insert detail page (edit mode) has Cancel + Save at the bottom.
import { test, expect, type Page } from '@playwright/test'

const EMP = '/en/admin/employees/EMP-0002'

async function seed(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({ state: { userId: 'u1', username: 'HR Admin', email: 'a@e.com', roles: ['hr_admin'], isAuthenticated: true }, version: 0 }),
    )
  })
}
async function expandCurrentBenefits(page: Page) {
  const cb = page.locator('#emp-current-benefits')
  await cb.locator('button[aria-expanded="false"]').first().click().catch(() => {})
  await page.waitForTimeout(250)
  return cb
}

test.describe('STA-141 — current benefit revisions', () => {
  test('Change 1: delete icon → confirm modal (pumpkin) → row removed in-session', async ({ page }) => {
    await seed(page)
    await page.goto(EMP)
    const cb = await expandCurrentBenefits(page)
    const before = await cb.locator('tbody tr').count()
    expect(before).toBeGreaterThan(0)
    // Every row has a delete button.
    expect(await cb.getByRole('button', { name: /Delete|ลบ/i }).count()).toBe(before)

    await cb.locator('tbody tr').first().getByRole('button', { name: /Delete|ลบ/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/Confirm delete plan/i)).toBeVisible()
    await expect(dialog.getByText(/removes the plan from your benefit list/i)).toBeVisible()
    const del = dialog.getByRole('button', { name: 'Delete', exact: true })
    await expect(del).toBeVisible()
    await del.click()
    await expect(cb.locator('tbody tr')).toHaveCount(before - 1)
  })

  test('Change 2: Insert popup is date-only; attachment is on the detail (edit) page', async ({ page }) => {
    await seed(page)
    await page.goto(EMP)
    const cb = await expandCurrentBenefits(page)
    await cb.locator('tbody tr').first().getByRole('button', { name: /Insert/i }).click()
    // Date-gate popup: no attachment.
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
    await page.getByRole('button', { name: /Proceed/i }).click()
    await expect(page.getByText('Individual plan')).toBeVisible()
    // Detail edit page: the attachment uploader is now here.
    await expect(page.locator('input[type="file"]')).toHaveCount(1)
  })

  test('Change 3: Insert detail (edit) page has Cancel + Save', async ({ page }) => {
    await seed(page)
    await page.goto(EMP)
    const cb = await expandCurrentBenefits(page)
    await cb.locator('tbody tr').first().getByRole('button', { name: /Insert/i }).click()
    await page.getByRole('button', { name: /Proceed/i }).click()
    await expect(page.getByText('Individual plan')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
  })
})
