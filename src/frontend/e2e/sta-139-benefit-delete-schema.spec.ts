// STA-139 — revise benefit & benefit rule.
//   1. Delete-confirm bodies reworded to read as "delete-out" (not "deactivate")
//      and stripped of dev jargon (effective_to / soft-delete). Behavior stays
//      soft (mockup). Applies to the plan AND the rule delete modal.
//   2. The "Schema version" radio is removed from the Create AND Edit plan
//      modals (prop-gated; the value still persists as v2).
import { test, expect, type Page } from '@playwright/test'

async function seed(page: Page) {
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

test.describe('STA-139 — benefit delete wording + schema-version removal', () => {
  test('plan delete modal: delete-out copy, no "deactivate"', async ({ page }) => {
    await seed(page)
    await page.goto('/en/admin/benefits/plans')
    await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/removes the plan from your benefit list/i)).toBeVisible()
    await expect(dialog.getByText(/deactivate/i)).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Cancel/i })).toBeVisible()
  })

  test('rule delete modal: delete-out copy, no dev jargon', async ({ page }) => {
    await seed(page)
    await page.goto('/en/admin/benefits/rules')
    await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/removes the rule from your entitlement list/i)).toBeVisible()
    await expect(dialog.getByText(/effective_to|soft-delete/i)).toHaveCount(0)
  })

  test('Create + Edit plan modals no longer render the Schema version radio', async ({ page }) => {
    await seed(page)
    await page.goto('/en/admin/benefits/plans')

    // Edit (Make correction) modal.
    await page.getByRole('button', { name: /Make correction/i }).first().click()
    await expect(page.getByRole('radiogroup', { name: /Schema version/i })).toHaveCount(0)
    await page.getByRole('button', { name: /Cancel/i }).first().click().catch(() => {})
    await page.waitForTimeout(300)

    // Create modal.
    await page.getByRole('button', { name: /Create.*plan|Create Benefit Plan/i }).first().click()
    await expect(page.getByRole('radiogroup', { name: /Schema version/i })).toHaveCount(0)
  })
})
