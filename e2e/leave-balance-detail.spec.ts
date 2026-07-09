import { test, expect } from '@playwright/test'

test.describe('Leave Balance Detail — /th/leave/balance (view-only)', () => {
  test('shows heading "ยอดวันลา"', async ({ page }) => {
    await page.goto('/th/leave/balance')
    await page.waitForLoadState('networkidle')
    const heading = page.getByRole('heading', { name: /ยอดวันลา/i })
    await expect(heading).toBeVisible()
    await expect(heading).toContainText('ยอดวันลา')
  })

  test('shows a leave-balance table with ยอดคงเหลือ column', async ({ page }) => {
    await page.goto('/th/leave/balance')
    await page.waitForLoadState('networkidle')

    const table = page.locator('table').first()
    await expect(table).toBeVisible()

    const headers = await table.locator('thead th').allInnerTexts()
    const headerText = headers.map((h) => h.trim()).join(' ')
    expect(headerText).toContain('ยอดคงเหลือ')

    // Assert at least one data row exists
    const rows = table.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    // Spot-check ลากิจ row exists with a remaining value
    const lakijCell = table.locator('tbody tr', { hasText: /ลากิจ/ })
    await expect(lakijCell).toBeVisible()
  })

  test('captures a stable screenshot of the balance page', async ({ page }) => {
    await page.goto('/th/leave/balance')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/leave-balance-detail.png', fullPage: true })
  })
})
