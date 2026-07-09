import { expect, test } from '@playwright/test'
import { authedContext } from './helpers/storage-auth.helper'

const ACTING_LABEL = /มอบหมายปฏิบัติการ/
const INACTIVE_REASON = 'พนักงานไม่ได้ทำงานอยู่ — ต้องเปิดใช้งานก่อน'

test.describe('STA-55 — Acting assignment card on Employee Detail', () => {
  test('active employee (EMP-0005): Acting card is an active link to the acting route', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()

    await page.goto('/th/admin/employees/EMP-0005')
    await expect(page.getByText('การดำเนินการ', { exact: true })).toBeVisible({ timeout: 15000 })

    const actingLink = page.getByRole('link', { name: ACTING_LABEL })
    await expect(actingLink).toBeVisible({ timeout: 15000 })
    await expect(actingLink).toHaveAttribute('href', /\/admin\/employees\/EMP-0005\/acting/)

    await actingLink.click()
    await expect(page).toHaveURL(/\/admin\/employees\/EMP-0005\/acting/)

    await context.close()
  })

  test('inactive employee (EMP-0001): Acting card is locked with the inactive reason', async ({ browser }) => {
    const context = await authedContext(browser, 'hr_admin')
    const page = await context.newPage()

    await page.goto('/th/admin/employees/EMP-0001')
    await expect(page.getByText('การดำเนินการ', { exact: true })).toBeVisible({ timeout: 15000 })

    // No active link for the Acting action when locked.
    await expect(page.getByRole('link', { name: ACTING_LABEL })).toHaveCount(0)

    // Label still rendered, inside a disabled card carrying the inactive reason.
    const lockedCard = page.locator('[aria-disabled="true"]', { hasText: 'มอบหมายปฏิบัติการ' })
    await expect(lockedCard).toBeVisible({ timeout: 15000 })
    await expect(lockedCard.getByText(INACTIVE_REASON)).toBeVisible()

    await context.close()
  })
})
