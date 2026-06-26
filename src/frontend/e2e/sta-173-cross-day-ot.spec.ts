// STA-173 — OT request: explicit Start/End Date per row, blank time defaults,
// cross-day hours computed from the full range, and a specific bad-range error.
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

test('STA-173 — time fields are blank by default (not pre-filled)', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/overtime')
  await page.waitForLoadState('networkidle').catch(() => {})

  const dates = page.locator('input[type="date"]')
  const times = page.locator('select')
  await expect(dates.first()).toBeVisible()
  // AC1 — both date inputs empty, both time selects on the blank option.
  expect(await dates.nth(0).inputValue()).toBe('')
  expect(await dates.nth(1).inputValue()).toBe('')
  expect(await times.nth(0).inputValue()).toBe('')
  expect(await times.nth(1).inputValue()).toBe('')
})

test('STA-173 — cross-day range computes 2h; same-day computes 1h', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/overtime')
  await page.waitForLoadState('networkidle').catch(() => {})

  const dates = page.locator('input[type="date"]')
  const times = page.locator('select')

  // AC3 — 25/06 23:00 → 26/06 01:00 = 2h (crosses midnight).
  await dates.nth(0).fill('2026-06-25')
  await times.nth(0).selectOption('23:00')
  await dates.nth(1).fill('2026-06-26')
  await times.nth(1).selectOption('01:00')
  await expect(page.getByText(/ชั่วโมง OT วันนี้:\s*2\s*ชม\./)).toBeVisible()

  // AC4 — same day 22:00 → 23:00 = 1h.
  await dates.nth(1).fill('2026-06-25')
  await times.nth(0).selectOption('22:00')
  await times.nth(1).selectOption('23:00')
  await expect(page.getByText(/ชั่วโมง OT วันนี้:\s*1\s*ชม\./)).toBeVisible()
})

test('STA-173 — backwards same-day range is rejected with the cross-day hint', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/overtime')
  await page.waitForLoadState('networkidle').catch(() => {})

  const dates = page.locator('input[type="date"]')
  const times = page.locator('select')

  // AC6 — same date, end earlier than start, end date NOT bumped → bad_range.
  // Reason is required and checked first, so fill it before submitting.
  await page.getByPlaceholder(/ระบุเหตุผล/).fill('ทดสอบ OT ข้ามวัน')
  await dates.nth(0).fill('2026-06-25')
  await dates.nth(1).fill('2026-06-25')
  await times.nth(0).selectOption('23:00')
  await times.nth(1).selectOption('02:00')
  await page.getByRole('button', { name: 'ส่งคำขอ' }).click()

  await expect(page.getByText(/เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม/)).toBeVisible()
})
