import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/auth.helper';
import { navigateTo, waitForLoading } from './helpers/navigation.helper';

/**
 * STA-128 — dedicated Approval Module (unified /quick-approve queue).
 *
 * Guards the three deliverables that close ref-parity on the already-built
 * surface:
 *   1. LIVE badge — the Team-cluster "Team Inbox · Approvals" leaf badge is the
 *      persona-aware actionable count (the SAME number the queue's Pending tab
 *      shows), not the old hardcoded "12".
 *   2. STRUCTURED columns — รหัสพนักงาน (emp code) + ยอดเบิกรวม (claim total)
 *      render from real, adapter-populated row data, not an all-"—" column.
 *   3. RBAC remove-not-hide — the employee persona never sees the approvals leaf.
 */

const TEAM_RAIL = 'button[title="Team Management"]';
const APPROVALS_LEAF = '.bp-panel-item:has(.bp-child-label:has-text("Approvals"))';

test.describe('STA-128 — dedicated Approval Module', () => {
  test('manager: approvals leaf badge is the live actionable count (== Pending tab)', async ({
    page,
  }) => {
    await mockAuthSession(page, 'manager');
    await navigateTo(page, '/quick-approve');
    await waitForLoading(page);

    // Route /quick-approve lives in the Team cluster, so its rail group is the
    // active one; click it explicitly to be deterministic about which leaves the
    // master-detail panel renders.
    const rail = page.locator(TEAM_RAIL).first();
    if (await rail.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rail.click();
    }

    const leaf = page.locator(APPROVALS_LEAF).first();
    await expect(leaf).toBeVisible({ timeout: 5000 });

    const badge = leaf.locator('.bp-badge');
    await expect(badge).toBeVisible();
    const badgeText = (await badge.textContent())?.trim() ?? '';
    expect(badgeText).toMatch(/^\d+$/); // a real number, never empty
    const badgeCount = Number(badgeText);
    expect(badgeCount).toBeGreaterThan(0); // manager has actionable rows seeded

    // The SAME number must surface on the queue's Pending tab (one source of
    // truth — countActionable). This is the anti-drift guard.
    const pendingTab = page.getByRole('tab', { name: /Pending/i }).first();
    await expect(pendingTab).toContainText(String(badgeCount));

    await page.screenshot({ path: '/tmp/sta128-manager-badge.png', fullPage: true });
  });

  test('manager: queue renders structured emp-code + claim-total columns', async ({
    page,
  }) => {
    await mockAuthSession(page, 'manager');
    await navigateTo(page, '/quick-approve');
    await waitForLoading(page);

    // Headers present.
    await expect(page.getByRole('columnheader', { name: /Employee ID/i }).first()).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: /Total claim amount/i }).first(),
    ).toBeVisible();

    // Emp-code column carries at least one REAL code (EMP-style), not all "—".
    const empCodeCell = page.getByText(/EMP[-0-9]/i).first();
    await expect(empCodeCell).toBeVisible({ timeout: 5000 });

    // Total-claim column carries at least one real ฿ amount for a claim row.
    const amountCell = page.getByText(/฿[\d,]+/).first();
    await expect(amountCell).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: '/tmp/sta128-manager-columns.png', fullPage: true });
  });

  test('employee: approvals leaf is removed (not disabled)', async ({ page }) => {
    await mockAuthSession(page, 'employee');
    await navigateTo(page, '/home');
    await waitForLoading(page);

    // The dedicated approval leaf must be absent anywhere in the nav for an
    // employee — removed, never rendered locked/disabled.
    await expect(page.getByText('Team Inbox · Approvals')).toHaveCount(0);

    await page.screenshot({ path: '/tmp/sta128-employee-rbac.png', fullPage: true });
  });
});
