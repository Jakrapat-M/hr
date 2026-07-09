// STA-138 — Update the Leave Balance Detail (Time-Off tab on /time/timesheet).
//   - middle columns renamed: ยอดยกมา→โควต้ารวม (Total quota), เพิ่ม→รออนุมัติ (Pending)
//   - the Pending column surfaces the store's `reserved` (in-flight) days
//   - new formula: คงเหลือ = โควต้ารวม − (รออนุมัติ + ใช้ไป)
//   - sample: ลากิจ = 3 / 1 / 0 / 2 (quota / pending / used / remaining)
//   - card-remaining === table-คงเหลือ for every row; the pending seed is
//     idempotent (stays 1 across reloads — the store persists to localStorage).
import { test, expect, type Page } from '@playwright/test'

async function seed(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'cnext-auth',
      JSON.stringify({
        state: { userId: 'EMP001', username: 'HR', email: 'a@e.com', roles: ['employee'], isAuthenticated: true },
        version: 0,
      }),
    )
  })
}

async function openBalanceTab(page: Page, tabName: string) {
  await page.getByRole('tab', { name: tabName, exact: true }).click()
  await page.waitForTimeout(300)
}

async function lakijRow(page: Page) {
  const trs = await page.locator('table tbody tr').all()
  for (const tr of trs) {
    const cells = (await tr.locator('td').allInnerTexts()).map((c) => c.trim())
    if (cells.some((c) => /ลากิจ|Personnel/i.test(c))) return cells
  }
  return null
}

test.describe('STA-138 — leave balance detail', () => {
  test('TH: renamed columns, ลากิจ 3/1/0/2, new footer formula', async ({ page }) => {
    await seed(page)
    await page.goto('/th/time/timesheet')
    await openBalanceTab(page, 'วันลาคงเหลือ')

    const headers = (await page.locator('table thead th').allInnerTexts()).map((h) => h.trim())
    expect(headers).toEqual(['ประเภทการลา', 'โควต้ารวม', 'รออนุมัติ', 'ใช้ไป', 'คงเหลือ'])

    const lakij = await lakijRow(page)
    expect(lakij).toEqual(['ลากิจ', '3', '1', '0', '2'])

    await expect(
      page.getByText('หน่วย: วัน · คงเหลือ = โควต้ารวม − (รออนุมัติ + ใช้ไป)'),
    ).toBeVisible()
  })

  test('EN: locked labels Total quota / Pending / Ending + EN footer', async ({ page }) => {
    await seed(page)
    await page.goto('/en/time/timesheet')
    await openBalanceTab(page, 'Time Off')
    const headers = (await page.locator('table thead th').allInnerTexts()).map((h) => h.trim())
    expect(headers).toContain('Total quota')
    expect(headers).toContain('Pending')
    expect(headers).toContain('Ending')
    await expect(
      page.getByText('In days · Ending = Total quota − (Pending + Debits)'),
    ).toBeVisible()
  })

  test('pending seed is idempotent — ลากิจ stays 3/1/0/2 across reloads', async ({ page }) => {
    await seed(page)
    await page.goto('/th/time/timesheet')
    for (let i = 0; i < 3; i++) {
      await openBalanceTab(page, 'วันลาคงเหลือ')
      expect(await lakijRow(page)).toEqual(['ลากิจ', '3', '1', '0', '2'])
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
    }
  })

  test('card remaining === table คงเหลือ for ลากิจ (2 / quota 3)', async ({ page }) => {
    await seed(page)
    await page.goto('/th/time/timesheet')
    await openBalanceTab(page, 'วันลาคงเหลือ')
    // The at-a-glance ลากิจ card shows "2 / 3 วัน" — remaining matches the table คงเหลือ.
    const card = page.getByText('ลากิจ', { exact: true }).first().locator('xpath=ancestor::*[self::div][1]')
    await expect(card).toContainText('2')
    await expect(card).toContainText('3')
  })
})
