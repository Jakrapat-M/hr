// STA-167 — a worked day-off (EMP-0301 @ 2026-06-14) shows its scheduled
// Start/End/Break time and a "Day off (worked)" label in BOTH the Table and the
// Calendar views of the /time/timesheet Schedule tab.
import { test, expect, type Page } from '@playwright/test'

async function seedEmp0301(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({ state: { userId: 'EMP-0301', username: 'พิมพ์ชนก ศรีวัฒน์', email: 'e@e.com', roles: ['employee'], isAuthenticated: true }, version: 0 }),
    )
  })
}

test('STA-167 — worked day-off shows shift time + "วันหยุด (ทำงาน)" in Table and Calendar', async ({ page }) => {
  await seedEmp0301(page)
  await page.goto('/th/time/timesheet')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.getByRole('tab', { name: 'ตารางกะ' }).click()

  // ── Table view (default) ──
  const workedRow = page.locator('tr').filter({ hasText: 'วันหยุด (ทำงาน)' }).first()
  await expect(workedRow).toBeVisible()
  await expect(workedRow).toContainText('10:00')
  await expect(workedRow).toContainText('19:00')
  await expect(workedRow).toContainText('14:00–15:00') // break
  // the DWS pill on this row is relabelled (no contradictory plain "Day off")
  await expect(workedRow).toContainText('ทำงานวันหยุด')

  // ── Calendar view ──
  await page.getByRole('button', { name: 'ปฏิทิน' }).click()
  await expect(page.getByText('วันหยุด (ทำงาน)').first()).toBeVisible()
  await expect(page.getByText('10:00–19:00').first()).toBeVisible()
})

test('STA-167 — EN parity: worked day-off shows "Day off (worked)" + time', async ({ page }) => {
  await seedEmp0301(page)
  await page.goto('/en/time/timesheet')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.getByRole('tab', { name: 'Schedule' }).click()
  const workedRow = page.locator('tr').filter({ hasText: 'Day off (worked)' }).first()
  await expect(workedRow).toBeVisible()
  await expect(workedRow).toContainText('10:00')
  await expect(workedRow).toContainText('19:00')
  await expect(workedRow).toContainText('Worked day off') // relabelled DWS pill
  await page.getByRole('button', { name: 'Calendar' }).click()
  await expect(page.getByText('Day off (worked)').first()).toBeVisible()
})
