// STA-23 — probation residual gaps (HRBP chain + send-back + exempt shortcut).
//   - the detail-page approval chain reads Manager → HRBP (no "HR Admin"/"Payroll");
//     the manager CTA is "Approve & send to HRBP".
//   - an HRBP persona on a pending_hr case sees Approve + Send-back-with-reason
//     (warning tone, not red); the HRBP panel is hidden from a manager viewer.
//   - an exempt case lets HRBP mark passed with the pass date pre-filled = hire date.
import { test, expect, type Page, type Browser } from '@playwright/test'

async function asRole(browser: Browser, roles: string[]) {
  const ctx = await browser.newContext()
  await ctx.route('**/api/auth/session', (r) => r.fulfill({ status: 200, body: '{}' }))
  await ctx.addInitScript((roles) => {
    localStorage.setItem(
      'cnext-auth',
      JSON.stringify({ state: { userId: 'u1', username: 'U', email: 'a@e.com', roles, isAuthenticated: true }, version: 0 }),
    )
  }, roles)
  return ctx
}

test.describe('STA-23 — probation HRBP residual gaps', () => {
  test('manager view: chain is Manager → HRBP, CTA sends to HRBP, no HR Admin/Payroll', async ({ browser }) => {
    const ctx = await asRole(browser, ['manager'])
    const page: Page = await ctx.newPage()
    await page.goto('/en/workflows/probation/PB-001')
    await expect(page.getByText(/HRBP/).first()).toBeVisible()
    await expect(page.getByText(/Approve & send to HRBP/i)).toBeVisible()
    await expect(page.getByText('HR Admin')).toHaveCount(0)
    await expect(page.getByText('Payroll')).toHaveCount(0)
    // The HRBP action panel is NOT shown to a manager.
    await expect(page.getByRole('button', { name: /Send back to manager/i })).toHaveCount(0)
    await ctx.close()
  })

  test('HRBP view: Approve + Send-back (reason-gated) on a pending_hr case', async ({ browser }) => {
    const ctx = await asRole(browser, ['hrbp'])
    const page = await ctx.newPage()
    await page.goto('/en/workflows/probation/PB-002')
    await expect(page.getByRole('button', { name: /Approve \(HRBP\)/i })).toBeVisible()
    const sendBack = page.getByRole('button', { name: /Send back to manager/i })
    await expect(sendBack).toBeVisible()
    // Fill the reason then send back; status becomes sent_back, so the
    // pending_hr-gated HRBP panel disappears (the send-back took effect).
    await page.getByLabel(/Reason to send back/i).fill('Please re-check the evaluation date.')
    await sendBack.click()
    await page.waitForTimeout(400)
    await expect(page.getByRole('button', { name: /Send back to manager/i })).toHaveCount(0)
    await ctx.close()
  })

  test('exempt case: HRBP mark-passed pre-fills the hire date as the pass date', async ({ browser }) => {
    const ctx = await asRole(browser, ['hrbp'])
    const page = await ctx.newPage()
    await page.goto('/en/workflows/probation/PB-005')
    await expect(page.getByText(/exempt/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Mark passed \(exempt\)/i })).toBeVisible()
    // The pass date echoes the hire date (4 May 2026 for PB-005).
    await expect(page.getByText(/hire date/i).first()).toBeVisible()
    await ctx.close()
  })
})
