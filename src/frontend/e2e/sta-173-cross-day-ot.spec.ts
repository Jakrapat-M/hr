// STA-173 → STA-256 — OT request date/time entry:
// blank defaults, native time inputs, ABBREVIATED date display, AUTO-CALCULATED
// End Date (same day; +1 day when end ≤ start = cross-midnight), and the
// "+1 hour" helper. Cross-day hours still compute from the full range.
// EMP001 ESS persona on /overtime (Request tab default).
import { test, expect, type Page } from '@playwright/test'

async function seedEmployee(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({
        state: { userId: 'EMP001', username: 'สมชาย ใจดี', email: 'e@e.com', roles: ['employee'], isAuthenticated: true },
        version: 0,
      }),
    )
  })
}

test('STA-256 — date/time fields are blank by default; End Date is display-only', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/overtime')
  await page.waitForLoadState('networkidle').catch(() => {})

  await expect(page.getByTestId('ot-start-date-0-display')).toBeVisible()
  // Start date empty, both time inputs empty.
  expect(await page.getByTestId('ot-start-date-0').inputValue()).toBe('')
  expect(await page.getByTestId('ot-start-time-0').inputValue()).toBe('')
  expect(await page.getByTestId('ot-end-time-0').inputValue()).toBe('')
  // End Date renders as a read-only display (no editable input exists).
  await expect(page.getByTestId('ot-end-date-0-display')).toBeVisible()
  await expect(page.getByTestId('ot-end-date-0')).toHaveCount(0)
})

test('STA-256 — cross-midnight auto-bumps the End Date (+1 day) and computes 2h; same-day computes 1h', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/overtime')
  await page.waitForLoadState('networkidle').catch(() => {})

  // 25/06 23:00 → 01:00 = cross-midnight: end date auto-fills 26 มิ.ย. 2569, 2h.
  await page.getByTestId('ot-start-date-0').fill('2026-06-25')
  await page.getByTestId('ot-start-time-0').fill('23:00')
  await page.getByTestId('ot-end-time-0').fill('01:00')
  await expect(page.getByTestId('ot-start-date-0-display')).toContainText('25 มิ.ย. 2569')
  await expect(page.getByTestId('ot-end-date-0-display')).toContainText('26 มิ.ย. 2569')
  await expect(page.getByText(/ชั่วโมง OT วันนี้:\s*2\s*ชม\./)).toBeVisible()

  // Same day 22:00 → 23:00 = 1h; end date snaps back to the start date.
  await page.getByTestId('ot-start-time-0').fill('22:00')
  await page.getByTestId('ot-end-time-0').fill('23:00')
  await expect(page.getByTestId('ot-end-date-0-display')).toContainText('25 มิ.ย. 2569')
  await expect(page.getByText(/ชั่วโมง OT วันนี้:\s*1\s*ชม\./)).toBeVisible()
})

test('STA-256 — "+1 hour": first press = start + 1h, repeats add an hour and roll the End Date', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/overtime')
  await page.waitForLoadState('networkidle').catch(() => {})

  await page.getByTestId('ot-start-date-0').fill('2026-06-25')
  await page.getByTestId('ot-start-time-0').fill('22:00')
  const plus = page.getByTestId('ot-plus-hour-0')
  await plus.click()
  expect(await page.getByTestId('ot-end-time-0').inputValue()).toBe('23:00')
  await plus.click()
  expect(await page.getByTestId('ot-end-time-0').inputValue()).toBe('00:00')
  // Rolling past midnight bumps the auto End Date to the 26th.
  await expect(page.getByTestId('ot-end-date-0-display')).toContainText('26 มิ.ย. 2569')
})
