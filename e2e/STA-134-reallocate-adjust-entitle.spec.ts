// STA-134 — revise "Adjust entitle amount" (Benefits Exception / reallocate-budget form).
// Guards the BA-confirmed removals on /admin/employees/EMP-0002/reallocate-budget:
//   1. Legal Entity is read-only, fixed to "RIS" (no select, no "Add legal entity" button).
//   2. "Enable Email Notification" field removed.
//   3. "Relevant For Benefit Period" column removed from the details grid.
import { test, expect, type Page } from '@playwright/test'

const ROUTE = '/en/admin/employees/EMP-0002/reallocate-budget'

async function seedAdmin(page: Page) {
  // AuthSync overwrites a seeded role from /api/auth/session — stub it empty so the seed survives.
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'humi-auth',
      JSON.stringify({
        state: {
          userId: 'u-admin',
          username: 'HR Admin',
          email: 'admin@example.com',
          roles: ['hr_admin'],
          isAuthenticated: true,
        },
        version: 0,
      }),
    )
  })
}

test.describe('STA-134 reallocate-budget revisions', () => {
  test('legal entity read-only = RIS; email + relevant-period removed', async ({ page }) => {
    await seedAdmin(page)
    await page.goto(ROUTE)

    // Form is present.
    await expect(page.getByLabel('Worker ID', { exact: false })).toBeVisible()

    // 1. Legal Entity is a read-only input fixed to RIS (not a <select>).
    const legal = page.locator('#bex-legal')
    await expect(legal).toBeVisible()
    await expect(legal).toHaveValue('RIS')
    await expect(legal).toHaveAttribute('readonly', '')

    // 1c. No "Add legal entity" button anywhere.
    await expect(page.getByRole('button', { name: /add legal entity/i })).toHaveCount(0)

    // 2. "Enable Email Notification" field is gone.
    await expect(page.getByText('Enable Email Notification', { exact: false })).toHaveCount(0)
    await expect(page.locator('#bex-email')).toHaveCount(0)

    // 3. "Relevant For Benefit Period" column header is gone.
    await expect(page.getByText('Relevant For Benefit Period', { exact: false })).toHaveCount(0)

    // Sanity: the kept columns still render.
    await expect(page.getByText('Selected Period', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Adjustment Amount', { exact: false }).first()).toBeVisible()
  })
})
