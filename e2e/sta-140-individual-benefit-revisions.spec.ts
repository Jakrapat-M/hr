// STA-140 — revise individual benefit plan (4 changes on /admin/employees/[id]).
//   1. "Adjust entitle amount" button moved into the Current Benefits header,
//      LEFT of "Create special benefit"; removed from the Budget Reallocation header.
//   2. "Effective end date" editable (date input) in the plan-detail edit modal.
//   3. Attachment FileUploadField (an <input type="file">) on all 5 action forms:
//      insert, enroll, create special benefit, adjust entitle amount, start a claim.
//   4. "Request Date" read-only in the Enroll modal.
import { test, expect, type Page } from '@playwright/test'

const EMP = '/en/admin/employees/EMP-0002'

async function seed(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({
        state: { userId: 'u1', username: 'HR Admin', email: 'a@e.com', roles: ['hr_admin'], isAuthenticated: true },
        version: 0,
      }),
    )
  })
}
async function expand(page: Page, id: string) {
  const card = page.locator(id)
  await card.locator('button[aria-expanded="false"]').first().click().catch(() => {})
  await page.waitForTimeout(250)
  return card
}

test.describe('STA-140 — individual benefit plan revisions', () => {
  test('Change 1: Adjust button moved to Current Benefits header, left of Create special', async ({ page }) => {
    await seed(page)
    await page.goto(EMP)
    const cb = page.locator('#emp-current-benefits')
    const headerBtns = await cb.locator('button').allInnerTexts()
    const flat = headerBtns.map((b) => b.replace(/\s+/g, ' ').trim())
    const adjustIdx = flat.findIndex((t) => /Adjust entitle amount/i.test(t))
    const createIdx = flat.findIndex((t) => /Create special benefit/i.test(t))
    expect(adjustIdx).toBeGreaterThanOrEqual(0)
    expect(createIdx).toBeGreaterThanOrEqual(0)
    expect(adjustIdx).toBeLessThan(createIdx) // Adjust is to the LEFT
    // No longer in the Budget Reallocation header.
    await expect(page.locator('#emp-budget-reallocation').getByRole('button', { name: /Adjust entitle amount/i })).toHaveCount(0)
  })

  // STA-141 moved the attachment off the Insert date-gate popup (now date-only)
  // onto the Insert detail page — see e2e/sta-141-current-benefit.spec.ts. The
  // popup must therefore have NO attachment.
  test('Insert date-gate popup is date-only (attachment moved to the detail page)', async ({ page }) => {
    await seed(page)
    await page.goto(EMP)
    const cb = await expand(page, '#emp-current-benefits')
    await cb.locator('tbody tr').first().getByRole('button', { name: /Insert/i }).click()
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
  })

  test('Change 2: detail edit mode (via Insert → Proceed) shows an editable end-date input', async ({ page }) => {
    await seed(page)
    await page.goto(EMP)
    const cb = await expand(page, '#emp-current-benefits')
    await cb.locator('tbody tr').first().getByRole('button', { name: /Insert/i }).click()
    await expect(page.getByText(/Enter Effective Date/i)).toBeVisible() // Insert popup open
    await page.getByRole('button', { name: /Proceed/i }).click()
    // Popup closes, the plan-detail edit modal opens ("Individual plan" is its marker).
    await expect(page.getByText('Individual plan')).toBeVisible()
    // The "Effective end date" field is now an editable date input (was display-only).
    const endDate = page.getByLabel(/Effective end date/i)
    await expect(endDate).toBeVisible()
    await expect(endDate).toBeEditable()
    await expect(endDate).toHaveAttribute('type', 'date')
  })

  test('Changes 3 + 4: Enroll modal has an attachment and a read-only Request Date', async ({ page }) => {
    await seed(page)
    await page.goto(EMP)
    const en = await expand(page, '#emp-benefit-enrollment')
    await en.getByRole('button', { name: /Enroll now/i }).first().click()
    await page.waitForTimeout(300)
    await expect(page.locator('input[type="file"]')).toHaveCount(1)
    await expect(page.getByLabel(/Request Date/i)).toBeDisabled()
  })

  test('Change 3: standalone pages render an always-visible attachment uploader', async ({ page }) => {
    await seed(page)
    // adjust entitle amount — uploader now always visible (no toggle).
    await page.goto(EMP + '/reallocate-budget')
    await expect(page.locator('input[type="file"]')).toHaveCount(1)
    await expect(page.getByRole('button', { name: /Add attachment/i })).toHaveCount(0)
    // create special benefit — uploader after the Reason field.
    await page.goto(EMP + '/special-privilege')
    await expect(page.locator('input[type="file"]')).toHaveCount(1)
  })
})
