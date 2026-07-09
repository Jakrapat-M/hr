// STA-147 FU-1/FU-2 — on the Approval Request detail page (WF-2026-004):
//   FU-2: the "Merchant" row is removed from Request Details.
//   FU-1: Send back → pick a reason → Confirm closes the popup IN PLACE (URL
//         unchanged, no blank/not-found page) and the read-only Send Back Comment
//         box reflects the entered reason.
import { test, expect, type Page } from '@playwright/test'

async function seed(page: Page) {
  await page.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await page.addInitScript(() => {
    localStorage.setItem(
      'cnext-auth',
      JSON.stringify({
        state: { userId: 'u1', username: 'HR Admin', email: 'a@e.com', roles: ['hr_admin'], isAuthenticated: true },
        version: 0,
      }),
    )
  })
}

test.describe('STA-147 FU — Approval Request detail (WF-2026-004)', () => {
  test('FU-2: no Merchant row; FU-1: send-back reason fills the read-only box in place', async ({ page }) => {
    await seed(page)
    await page.goto('/en/quick-approve/WF-2026-004')
    await expect(page.getByText('Approval Request — WF-2026-004')).toBeVisible()

    // FU-2 — the Merchant row is gone from Request Details.
    await expect(page.getByText('Merchant', { exact: true })).toHaveCount(0)

    // FU-1 — Send back (ActionPanel) → its confirm modal.
    await page.getByRole('button', { name: 'Send back' }).click()
    const actionDialog = page.getByRole('dialog')
    await actionDialog.locator('textarea, input').first().fill('ขอเอกสารใบเสร็จเพิ่ม')
    await actionDialog.getByRole('button', { name: 'Confirm', exact: true }).click()

    // RejectReturnDrawer → pick a reason → Confirm Send Back.
    const reasonSelect = page.locator('select').last()
    await reasonSelect.selectOption('Incomplete information')
    await page.getByRole('button', { name: /Confirm Send Back|Confirm Reject/ }).last().click()

    // The popup closes IN PLACE: no reason <select> remains, URL unchanged, no 404.
    await expect(page.locator('select')).toHaveCount(0)
    expect(page.url()).toContain('/quick-approve/WF-2026-004')
    await expect(page.getByText(/not found/i)).toHaveCount(0)

    // The read-only Send Back Comment box itself now shows the entered reason
    // (target the textarea, not the timeline which also echoes the reason).
    await expect(page.locator('#send-back-comment')).toHaveValue('Incomplete information')
  })
})
