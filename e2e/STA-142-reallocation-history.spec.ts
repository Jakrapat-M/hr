import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/auth.helper';

/**
 * STA-142 — Budget Reallocation section revisions:
 *   1. Heading renamed "Reallocation log" → "Adjust entitlement amount history".
 *   2. The two summary cards (This year / Next year — medical budget) removed.
 *   3. A "More detail" (document-icon) column on every history row → read-only modal.
 */

async function openReallocation(page: import('@playwright/test').Page, locale: 'en' | 'th') {
  await page.goto(`/${locale}/admin/employees/EMP-0002`);
  await page.waitForLoadState('networkidle');
  const card = page.locator('#emp-budget-reallocation');
  await expect(card).toBeVisible();
  const toggle = card.locator('button[aria-expanded="false"]').first();
  if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    await toggle.click();
  }
  return card;
}

test.describe('STA-142 — adjust entitlement amount history', () => {
  test('renamed heading, no summary cards, More-detail column + modal (EN)', async ({ page }) => {
    await mockAuthSession(page, 'hr_admin');
    const card = await openReallocation(page, 'en');

    // 1. Renamed heading present; old name gone.
    await expect(card.getByText('Adjust entitlement amount history')).toBeVisible();
    await expect(card.getByText('Reallocation log')).toHaveCount(0);

    // 2. The two summary cards are gone.
    await expect(card.getByText('This year — medical budget')).toHaveCount(0);
    await expect(card.getByText('Next year — medical budget')).toHaveCount(0);

    // 3. More-detail column: a document-icon button on the rows; click opens a
    //    read-only modal echoing the row.
    const moreDetail = card.getByRole('button', { name: /More detail/i });
    expect(await moreDetail.count()).toBeGreaterThan(0);
    await moreDetail.first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Modal mirrors the row fields (column labels present).
    await expect(dialog.getByText('Adjusted entitle amount')).toBeVisible();
    await expect(dialog.getByText('Reason')).toBeVisible();
  });

  test('TH heading parity', async ({ page }) => {
    await mockAuthSession(page, 'hr_admin');
    const card = await openReallocation(page, 'th');
    await expect(card.getByText('ประวัติการปรับสิทธิ์ที่ได้รับ')).toBeVisible();
    await expect(card.getByText('ประวัติการโอนงบ')).toHaveCount(0);
  });
});
