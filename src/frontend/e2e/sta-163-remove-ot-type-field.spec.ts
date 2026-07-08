// STA-163 — the OT Request form no longer shows the "OT Type / ประเภท OT" field.
//   1. /overtime Request tab does NOT render the "ประเภท OT" label or its select.
//   2. The form still submits a valid request (otType pinned to 'OT') → Status tab.
//   3. No seeded OT row shows an "OT – Break / ช่วงพัก" label (OT-DEMO-0002 flipped to 'OT').
import { test, expect, type Page } from '@playwright/test'

async function seedEmployee(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({ state: { userId: 'EMP001', username: 'สมชาย ใจดี', email: 'e@e.com', roles: ['employee'], isAuthenticated: true }, version: 0 }),
    )
  })
}

// A date inside the current payroll period (21st → 20th), gated by validate().
function inPeriodDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() // 0-based
  const day = now.getDate()
  const d = day >= 21 ? new Date(y, m, 22) : new Date(y, m - 1, 22)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test.describe('STA-163 — remove OT type field', () => {
  test('the "ประเภท OT" field is gone from the OT request form', async ({ page }) => {
    await seedEmployee(page)
    await page.goto('/th/overtime')
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.getByRole('heading', { name: 'ยื่นคำขอทำงานล่วงเวลา' })).toBeVisible()
    // The OT-type label/select must NOT be present.
    await expect(page.getByText('ประเภท OT')).toHaveCount(0)
  })

  test('the form still submits (otType defaults to OT) and jumps to the Status tab', async ({ page }) => {
    await seedEmployee(page)
    await page.goto('/th/overtime')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.getByTestId('ot-start-date-0').fill(inPeriodDate())
    await page.getByTestId('ot-start-time-0').fill('18:00')
    await page.getByTestId('ot-end-time-0').fill('20:00')
    await page.locator('textarea').first().fill('งานเร่งด่วน')
    await page.getByRole('button', { name: 'ส่งคำขอ' }).click()
    // Status tab becomes active (form heading gone).
    await expect(page.getByRole('tab', { name: /สถานะ/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { name: 'ยื่นคำขอทำงานล่วงเวลา' })).toHaveCount(0)
  })
})
