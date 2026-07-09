// STA-159 — claim-history detail modal (both surfaces) + enroll → current benefit.
//   1. Admin employee page: Claim history row "More detail" → read-only "Claim
//      detail" modal (RequestSummary + ClaimPayload rows + Attachment View);
//      NO Approve/Reject/Send-back control.
//   2. Employee ESS benefits-hub history: same "More detail" → the claim rows
//      RENDER (not HiddenFieldPlaceholder) despite BenefitEmployeeClaim:'hidden'.
//   3. Enrolling a benefit appends a row to the Current Benefits table in-session.
import { test, expect, type Page } from '@playwright/test'

const EMP = '/en/admin/employees/EMP-0002'
const HISTORY = '/en/benefits-hub/history'

async function seed(page: Page, roles: string[]) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(
    ([roles]) => {
      localStorage.setItem(
        'cnext-auth',
        JSON.stringify({ state: { userId: 'u1', username: 'Tester', email: 'a@e.com', roles, isAuthenticated: true }, version: 0 }),
      )
    },
    [roles],
  )
}
async function expandAll(page: Page) {
  for (let i = 0; i < 12; i++) {
    const b = page.getByRole('button', { name: /^(Expand|ขยาย)$/ }).first()
    if ((await b.count()) === 0) break
    await b.click().catch(() => {})
    await page.waitForTimeout(200)
  }
}
const APPROVE_CONTROL = /Approve|Reject|Send.?back|อนุมัติ|ปฏิเสธ|ส่งกลับ/i

test.describe('STA-159 — claim detail modal + enroll', () => {
  test('admin: Claim history row opens a read-only Claim detail modal', async ({ page }) => {
    await seed(page, ['hr_admin'])
    await page.goto(EMP)
    await expandAll(page)
    const card = page.locator('#emp-claim-history')
    await card.scrollIntoViewIfNeeded()
    const more = card.getByRole('button', { name: /More detail/i }).first()
    await expect(more).toBeVisible()
    await more.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /Claim detail/i })).toBeVisible()
    // claim rows render
    await expect(dialog.getByText(/Total Claim Amount/i)).toBeVisible()
    // read-only: no approve/reject/send-back control
    expect(await dialog.getByRole('button', { name: APPROVE_CONTROL }).count()).toBe(0)
  })

  test('employee: own-claim history modal renders the claim rows (not blanked by the capability gate)', async ({ page }) => {
    await seed(page, ['employee'])
    await page.goto(HISTORY)
    const more = page.getByRole('button', { name: /More detail/i }).first()
    await expect(more).toBeVisible()
    await more.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /Claim detail/i })).toBeVisible()
    // Option C: the claim rows must render for an employee on their own claim.
    await expect(dialog.getByText(/Total Claim Amount/i)).toBeVisible()
    expect(await dialog.getByRole('button', { name: APPROVE_CONTROL }).count()).toBe(0)
  })

  test('admin: enrolling a benefit appends a row to Current Benefits', async ({ page }) => {
    await seed(page, ['hr_admin'])
    await page.goto(EMP)
    await expandAll(page)
    const cb = page.locator('#emp-current-benefits')
    await cb.scrollIntoViewIfNeeded()
    const before = await cb.locator('tbody tr').count()
    expect(before).toBeGreaterThan(0)

    await page.getByRole('button', { name: /Enroll/i }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog
      .getByRole('button', { name: /Enroll|Confirm|Save|Submit|ลงทะเบียน|บันทึก|ยืนยัน/i })
      .last()
      .click()
    // EnrollmentFormBody fires onSubmit ~1.1s after the inline success state.
    await expect(cb.locator('tbody tr')).toHaveCount(before + 1, { timeout: 5000 })
  })
})
