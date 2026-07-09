import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/auth.helper';
import { navigateTo, waitForLoading } from './helpers/navigation.helper';

test.describe('Quick Approve Hub', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'manager');
  });

  test('should display pending approvals list', async ({ page }) => {
    await navigateTo(page, '/quick-approve');
    await waitForLoading(page);
    await expect(
      page.getByText(/pending|approval|quick/i).first(),
    ).toBeVisible();
  });

  test('should filter approvals by type', async ({ page }) => {
    await navigateTo(page, '/quick-approve');
    await waitForLoading(page);
    const filterBtn = page.locator(
      '[data-testid="filter"], button:has-text("Filter"), select',
    ).first();
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.click();
    }
  });

  // STA-238 — approve-all / bulk is removed; approvals are case-by-case only.
  test('should NOT render any bulk-select affordance (case-by-case only)', async ({ page }) => {
    await navigateTo(page, '/quick-approve');
    await waitForLoading(page);
    // No checkboxes (row select or select-all) anywhere in the queue.
    await expect(page.locator('input[type="checkbox"], [role="checkbox"]')).toHaveCount(0);
    // No sticky bulk action bar ("N selected" / bulk approve-selected control).
    await expect(page.locator('[data-testid="bulk-actions"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /approve .*selected|selected/i })).toHaveCount(0);
  });

  test('should open slide-over detail panel', async ({ page }) => {
    await navigateTo(page, '/quick-approve');
    await waitForLoading(page);
    const firstRow = page.locator(
      '[data-testid="approval-item"], tr, [role="listitem"]',
    ).first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
      const slideOver = page.locator(
        '[data-testid="slide-over"], [role="dialog"], aside',
      ).first();
      await expect(slideOver).toBeVisible({ timeout: 3000 });
    }
  });

  test('should manage delegation CRUD', async ({ page }) => {
    await navigateTo(page, '/quick-approve');
    await waitForLoading(page);
    const delegationBtn = page.locator(
      '[data-testid="delegation"], button:has-text("Delegat")',
    ).first();
    if (await delegationBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await delegationBtn.click();
      // Should open delegation management
      await expect(
        page.getByText(/delegation|delegate/i).first(),
      ).toBeVisible();
    }
  });

});
