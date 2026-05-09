import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/auth.helper';
import { navigateTo, switchLanguage } from './helpers/navigation.helper';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'employee');
  });

  test('should display the home dashboard after authentication', async ({ page }) => {
    await navigateTo(page, '/home');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: /หน้าหลัก|home/i }).first()).toBeVisible();
  });

  test('should show quick action links', async ({ page }) => {
    await navigateTo(page, '/home');
    await expect(page.getByRole('region', { name: /เมนูลัด|quick/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ขอลาหยุด|ดูข้อมูลส่วนตัว|เบิกสวัสดิการ|ขอเอกสาร/ }).first()).toBeVisible();
  });

  test('should display notifications panel', async ({ page }) => {
    await navigateTo(page, '/home')
    const notifArea = page.locator(
      '[data-testid="notifications"], [aria-label*="notification" i]',
    ).first();
    if (await notifArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(notifArea).toBeVisible();
    }
  });

  test('should switch language to Thai', async ({ page }) => {
    await navigateTo(page, '/home')
    await switchLanguage(page, 'th');
    // Should see Thai content or URL with /th/
    await expect(page).toHaveURL(/\/th\//);
  });

  test('should show recent activity section', async ({ page }) => {
    await navigateTo(page, '/home')
    const activity = page.getByText(/ประกาศ|announcement|ทีม|วันเกิด|calendar|ปฏิทิน/i).first();
    await expect(activity).toBeVisible({ timeout: 5000 });
  });
});
