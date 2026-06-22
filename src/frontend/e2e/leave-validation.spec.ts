// STA-131 — Leave Request UI Validation Enhancement.
// Locks the visible P0/P1/P2b behaviors on the ESS leave form (/timeoff):
//   - the "Remaining after" chip never shows a negative number (clamped to 0)
//   - over-quota surfaces the exact "Insufficient Leave Balance" block + Submit disabled
//   - the Maternity gender sample blocks the demo profile and is labelled
//     "sample rule (pending BA confirmation)"
// Clock pinned to a known weekday so future-date picks are deterministic.
import { test, expect, type Page } from '@playwright/test'

const PINNED = new Date('2026-06-15T05:00:00Z') // Mon 12:00 Bangkok

async function seed(page: Page) {
  await page.clock.install({ time: PINNED })
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({
        state: { userId: 'u1', username: 'HR Admin', email: 'a@e.com', roles: ['hr_admin'], isAuthenticated: true },
        version: 0,
      }),
    )
  })
}

async function pickRange(page: Page, a: string, b: string) {
  await page.getByRole('button', { name: a, exact: true }).click()
  await page.getByRole('button', { name: b, exact: true }).click()
}

test.describe('STA-131 — leave request validation', () => {
  test('over-quota: remaining-after clamps to 0 + Insufficient Leave Balance block', async ({ page }) => {
    await seed(page)
    await page.goto('/en/timeoff')

    // Sick Leave is a quota-tracked type; the demo balance is 0 → any range is over quota.
    await page.getByRole('radio', { name: /Sick Leave/ }).first().click()
    await pickRange(page, '16', '17') // 2 working days, both >= pinned today

    // P0: the "Remaining after" chip shows 0, never a negative number.
    const chip = page.getByText('Remaining after').locator('xpath=ancestor::*[self::div][1]')
    await expect(chip).toContainText('0')
    await expect(chip).not.toContainText('-')

    // P0: exact quota copy + Submit blocked.
    await expect(page.getByText('Insufficient Leave Balance', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })

  test('maternity gender sample blocks the demo (male) profile and is labelled sample', async ({ page }) => {
    await seed(page)
    await page.goto('/en/timeoff')

    // Reveal all 23 types, then pick Maternity Leave (gender-restricted to F; demo profile = M).
    await page.getByRole('button', { name: /Show all/i }).click()
    await page.getByRole('radio', { name: 'Maternity Leave Paid Quota', exact: true }).click()
    await pickRange(page, '16', '17')

    // The gender block renders with the sample-rule label and Submit is disabled.
    await expect(page.getByText('sample rule (pending BA confirmation)', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })
})
