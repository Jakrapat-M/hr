import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/auth.helper';

// Track-B Playwright stub. Skipped by default — re-enable once the local
// hr-workflow Fastify gateway (port 3001) and Camunda Run are both up. The
// `.skip()` keeps the structure visible so a human reviewer can see the
// happy path the team is targeting.
const SKIP_E2E = process.env.SKIP_E2E === '1' || !process.env.HR_WORKFLOW_E2E;

test.describe('Benefit-claim form → hr-workflow gateway', () => {
  test.skip(SKIP_E2E, 'Set HR_WORKFLOW_E2E=1 with Camunda Run + Fastify gateway running to enable.');

  test('submits a hospital claim and surfaces a workflow badge on /requests', async ({ page }) => {
    await mockAuthSession(page, 'employee');

    // 1. Navigate to the claim entry surface.
    await page.goto('/th/benefits-hub/claim');

    // 2. Pick a plan that maps to medical-reimbursement.
    await page.getByLabel(/ประเภทสวัสดิการ|Benefit type/).selectOption({ index: 1 });

    // 3. Fill receipt fields.
    await page.getByLabel(/เลขที่ใบเสร็จ|Receipt no/).first().fill('RCPT-E2E-001');
    await page.getByLabel(/วันที่ใบเสร็จ|Receipt date/).first().fill('2026-05-04');
    await page.getByLabel(/จำนวนเงิน|Amount/).first().fill('1500');

    // 4. Submit.
    await page.getByRole('button', { name: /ส่งคำขอ|Submit claim/i }).click();

    // 5. Toast / success state.
    await expect(page.getByRole('status').first()).toBeVisible({ timeout: 10_000 });

    // 6. Navigate to /requests and assert the workflow badge appears.
    await page.goto('/th/requests');
    await expect(page.getByText(/รอการอนุมัติ|Pending/).first()).toBeVisible();
  });
});
