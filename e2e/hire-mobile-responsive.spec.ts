import { expect, test } from '@playwright/test';
import { authedContext } from './helpers/storage-auth.helper';

test.describe('Hire mobile responsive layout', () => {
  test('keeps the active form content inside the mobile viewport', async ({ browser }) => {
    const ctx = await authedContext(browser, 'hr_admin');
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/th/admin/hire');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText('ขั้นตอน 1/3')).toBeVisible();

    const firstField = page.getByLabel('วันเริ่มงาน');
    await expect(firstField).toBeVisible();

    const box = await firstField.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBe(viewport.clientWidth);

    await ctx.close();
  });
});
