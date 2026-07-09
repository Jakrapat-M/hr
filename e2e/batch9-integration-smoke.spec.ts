/**
 * Batch 9 integration smoke — STA-82 EC maintain LEAF 9
 * Confirms: documents / advancedPersonal / compensationExtra render in profile (TH+EN),
 * and a quick sanity pass over the hire wizard steps renders without error.
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Batch 9 — documents / advancedPersonal / compensationExtra (STA-82)', () => {

  test('TH: profile documents, advancedPersonal, compensationExtra render', async ({ page }) => {
    await page.goto(`${BASE}/th/profile/me`);
    await page.waitForLoadState('networkidle');

    // Click the "ตำแหน่งและค่าตอบแทน" tab (employment → panelKey === 'job')
    await page.getByRole('tab', { name: 'ตำแหน่งและค่าตอบแทน' }).click();
    await page.waitForLoadState('networkidle');

    // Scroll to bottom to trigger any lazy rendering
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await page.screenshot({ path: '/tmp/batch9-profile-th-job-tab.png', fullPage: true });

    // documents section
    await expect(page.getByText('เอกสาร OHS, E-Letter และ EBO')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Health & Safety Acknowledgement 2567')).toBeVisible();
    await expect(page.getByText('Offer Letter — HR Manager — ต.ค. 2566')).toBeVisible();
    await expect(page.getByText('ผ่านการตรวจสุขภาพประจำปี 2567 แล้ว ไม่มีเงื่อนไขพิเศษ')).toBeVisible();

    // advancedPersonal section
    await expect(page.getByText('ข้อมูลและลิงก์เพิ่มเติม')).toBeVisible();
    await expect(page.getByText('LinkedIn Profile')).toBeVisible();
    await expect(page.getByText('https://www.linkedin.com/in/chongrak-tanaka')).toBeVisible();

    // compensationExtra section
    await expect(page.getByText('Compa-Ratio และตำแหน่งในกลุ่มเงินเดือน')).toBeVisible();
    await expect(page.getByText('1.02 (102% of midpoint)')).toBeVisible();

    await page.screenshot({ path: '/tmp/batch9-profile-th-final.png', fullPage: true });
  });

  test('EN: profile documents, advancedPersonal, compensationExtra render', async ({ page }) => {
    await page.goto(`${BASE}/en/profile/me`);
    await page.waitForLoadState('networkidle');

    // Click "Role and compensation" tab
    await page.getByRole('tab', { name: 'Role and compensation' }).click();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // EN section headings
    await expect(page.getByText('OHS documents, e-letter & EBO')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Additional information & links')).toBeVisible();
    await expect(page.getByText('Compa-ratio & pay positioning')).toBeVisible();

    // field values
    await expect(page.getByText('Health & Safety Acknowledgement 2567')).toBeVisible();
    await expect(page.getByText('1.02 (102% of midpoint)')).toBeVisible();

    await page.screenshot({ path: '/tmp/batch9-profile-en-final.png', fullPage: true });
  });

  test('Hire wizard renders without error (TH)', async ({ page }) => {
    await page.goto(`${BASE}/th/admin/hire`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/batch9-hire-wizard-th.png', fullPage: false });

    // No error boundary should be triggered
    await expect(page.locator('text=Something went wrong')).toHaveCount(0);
    await expect(page.locator('text=Error')).toHaveCount(0);
  });

});
