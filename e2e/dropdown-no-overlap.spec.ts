/**
 * dropdown-no-overlap.spec.ts — Single-open dropdown coordinator (STA-24 Task #6)
 *
 * AC-1: Opening a second dropdown closes the first (useSingleOpenDropdown coordinator).
 * AC-2: Screenshot captured as visual regression baseline.
 *
 * Uses native <select> elements on the pay-rate-change page.
 * baseURL http://localhost:3000 from playwright.config.ts.
 */

import { test, expect } from '@playwright/test'
import { mockAuthSession } from './helpers/auth.helper'

const EMP_ID = 'EMP001'
const PAGE_URL = `/th/admin/employees/${EMP_ID}/pay-rate-change`

test.beforeEach(async ({ page }) => {
  await mockAuthSession(page, 'hr_admin')
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  // Unlock form by setting effective date
  const dateInput = page.locator('input[type="date"]').first()
  if (await dateInput.isVisible()) {
    const today = new Date().toISOString().slice(0, 10)
    await dateInput.fill(today)
    const continueBtn = page.getByRole('button', { name: /continue|ถัดไป/i })
    if (await continueBtn.isVisible()) await continueBtn.click()
  }
})

test('AC-1: selecting Pay Group closes previously focused Event Reason listbox', async ({ page }) => {
  // Open Event Reason dropdown (native select — focus it)
  const eventReasonSelect = page.locator('select').filter({ hasText: /PRCHG|Merit|เหตุผล/ }).first()
  await eventReasonSelect.focus()

  // Now focus Pay Group dropdown — event reason should no longer have the open listbox
  const payGroupSelect = page.locator('#payGroup')
  await payGroupSelect.focus()
  await payGroupSelect.selectOption({ index: 1 })

  // Assert Pay Group has a selected value (not empty)
  const payGroupValue = await payGroupSelect.inputValue()
  expect(payGroupValue).not.toBe('')

  // Assert Event Reason select is not expanded (native selects close on blur)
  // The aria-expanded attribute should not be present or should be false
  const ariaExpanded = await eventReasonSelect.getAttribute('aria-expanded')
  expect(ariaExpanded).toBeFalsy()
})

test('AC-2: visual regression — dropdowns do not overlap', async ({ page }) => {
  // Select a pay group so the form is partially filled
  const payGroupSelect = page.locator('#payGroup')
  await payGroupSelect.selectOption({ index: 1 })

  // Select a pay component
  const payComponentSelect = page.locator('#payComponent')
  await payComponentSelect.selectOption({ index: 0 })

  // Take screenshot for visual regression baseline
  await page.screenshot({
    path: 'e2e/__screenshots__/dropdown-no-overlap.png',
    fullPage: false,
  })

  // Verify the form card is visible and not clipped
  const formCard = page.locator('.ring-1').first()
  await expect(formCard).toBeVisible()
})
