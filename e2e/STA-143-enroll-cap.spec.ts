import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/auth.helper';

/**
 * STA-143 — "Enroll in benefit" modal: swap field editability + no-exceed cap.
 *   1. Benefit Entitlement Amount is READ-ONLY.
 *   2. Enrolment Amount is EDITABLE and must NOT exceed the entitlement —
 *      over-cap shows a pumpkin FormField error (role=alert) + disables "Enroll now".
 *
 * Seed (first enrollable row = Mobile allowance): enrolment "1,500 THB/Month",
 * entitlement "18,000" → integer parse caps at 18000.
 */

async function openEnrollModal(page: import('@playwright/test').Page, locale: 'en' | 'th') {
  await page.goto(`/${locale}/admin/employees/EMP-0002`);
  await page.waitForLoadState('networkidle');
  // Benefit enrollment section is default-collapsed — expand ITS own toggle.
  const card = page.locator('#emp-benefit-enrollment');
  const toggle = card.locator('button[aria-expanded="false"]').first();
  if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    await toggle.click();
  }
  // First row "Enroll now" (Mobile allowance) → opens the modal.
  await card.getByRole('button', { name: /Enroll now|ลงทะเบียน/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('STA-143 — enroll-in-benefit editability + cap', () => {
  test('entitlement read-only, enrolment editable, over-cap blocks submit (EN)', async ({
    page,
  }) => {
    await mockAuthSession(page, 'hr_admin');
    await openEnrollModal(page, 'en');

    const dialog = page.getByRole('dialog');
    const entitlement = dialog.getByLabel('Benefit Entitlement Amount');
    const enrolment = dialog.getByLabel('Enrolment Amount');
    const enrollBtn = dialog.getByRole('button', { name: /Enroll now/i });

    // 1. Entitlement is read-only (cannot type into it).
    await expect(entitlement).toHaveAttribute('readonly', '');
    await expect(entitlement).toBeDisabled();

    // 2. Enrolment is editable + starts valid → submit enabled, no error.
    await expect(enrolment).toBeEditable();
    await expect(enrollBtn).toBeEnabled();
    await expect(dialog.getByRole('alert')).toHaveCount(0);

    // 3. Over-cap (> 18,000) → pumpkin error + Enroll disabled.
    await enrolment.fill('25000');
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(enrollBtn).toBeDisabled();

    // 4. Back to ≤ cap → error clears, submit re-enabled.
    await enrolment.fill('5000');
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await expect(enrollBtn).toBeEnabled();
  });

  test('TH parity: cap error renders + blocks submit', async ({ page }) => {
    await mockAuthSession(page, 'hr_admin');
    await openEnrollModal(page, 'th');

    const dialog = page.getByRole('dialog');
    const enrolment = dialog.getByLabel('จำนวนเงินที่ลงทะเบียน');
    const enrollBtn = dialog.getByRole('button', { name: /ลงทะเบียน/i });

    await enrolment.fill('99999');
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(enrollBtn).toBeDisabled();
  });
});
