// STA-176 — Sick leave: the Reason field is visible but OPTIONAL (no asterisk,
// not required); a non-sick leave type keeps Reason required (asterisk). The
// medical-certificate ≥3-working-day boundary itself is unit-tested in
// lib/time/__tests__/doc-rules.test.ts.
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

test('STA-176 — Reason is optional (no *) for sick leave, required (*) for non-sick', async ({ page }) => {
  await seedEmployee(page)
  await page.goto('/th/timeoff')
  await page.waitForLoadState('networkidle').catch(() => {})

  // The radio's accessible name concatenates the type name + paid/quota chips, and
  // "ลาป่วย" is a prefix of "ลาป่วยไม่รับเงิน" — so target the radio by an EXACT-text
  // descendant heading to pick sick_leave (not the unpaid variant).
  const sickRadio = page.getByRole('radio').filter({ has: page.getByText('ลาป่วย', { exact: true }) })
  const annualRadio = page.getByRole('radio').filter({ has: page.getByText('ลาพักผ่อนประจำปี', { exact: true }) })

  // Sick leave → Reason has NO asterisk (optional).
  await sickRadio.click()
  await expect(page.getByText('เหตุผล', { exact: true })).toBeVisible()
  await expect(page.getByText('เหตุผล *', { exact: true })).toHaveCount(0)

  // Non-sick (annual) → Reason shows the required asterisk.
  await annualRadio.click()
  await expect(page.getByText('เหตุผล *', { exact: true })).toBeVisible()
})
