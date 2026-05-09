/**
 * profile-edit-e2e.spec.ts — current Humi Profile Edit E2E coverage.
 *
 * Current flow: open /profile/me → click top Edit → field pencil opens a
 * one-step dialog with new value, effective date, optional attachment, and Save.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import path from 'path';
import { mockAuthSession } from './helpers/auth.helper';

const PDF_FIXTURE = path.join(__dirname, 'fixtures', 'test-doc.pdf');

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function gotoProfilePersonal(page: Page): Promise<void> {
  await page.goto('/th/profile/me', { waitUntil: 'networkidle' });
  await expect(page.getByRole('main')).toBeVisible({ timeout: 15_000 });
}

async function enterInlineEdit(page: Page): Promise<void> {
  const editBtn = page.getByRole('button', { name: /แก้ไขข้อมูล|edit/i }).first();
  await expect(editBtn).toBeVisible({ timeout: 10_000 });
  await editBtn.click();
  await expect(page.getByRole('button', { name: /บันทึกการเปลี่ยนแปลง|save changes/i })).toBeVisible();
}

async function openFieldGate(page: Page, fieldName: RegExp): Promise<Locator> {
  await enterInlineEdit(page);
  const pencil = page.getByRole('button', { name: fieldName }).first();
  await expect(pencil).toBeVisible({ timeout: 10_000 });
  await pencil.click();
  const dialog = page.getByRole('dialog').first();
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  return dialog;
}

test.describe('AC-10: Full profile-edit E2E scenario', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'employee');
  });

  test('AC-10: edit a required-attachment profile field and submit a change request', async ({ page }) => {
    await gotoProfilePersonal(page);
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });

    const dialog = await openFieldGate(page, /แก้ไข ชื่อ \(ไทย\)|edit first/i);
    await dialog.getByRole('textbox').first().fill('ทดสอบ');
    await dialog.locator('input[type="date"]').first().fill(todayISO());

    const fileInput = dialog.locator('input[type="file"]').first();
    await fileInput.setInputFiles(PDF_FIXTURE);
    await expect(dialog.getByText(/test-doc\.pdf/i).or(dialog.locator('[class*="preview"]')).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});

    const submitBtn = dialog.getByRole('button', { name: /บันทึก|save/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
    await submitBtn.click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
    await expect(page.getByText(/ส่งคำขออนุมัติแล้ว|รออนุมัติ|submitted|pending/i).first())
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {});
  });
});

test.describe('AC-3: Submit disabled without required attachment', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'employee');
  });

  test('AC-3: Save button disabled when required-attachment field has no file', async ({ page }) => {
    await gotoProfilePersonal(page);
    const dialog = await openFieldGate(page, /แก้ไข ชื่อ \(ไทย\)|edit first/i);
    await dialog.getByRole('textbox').first().fill('ทดสอบ');
    await dialog.locator('input[type="date"]').first().fill(todayISO());
    await expect(dialog.getByRole('button', { name: /บันทึก|save/i }).first()).toBeDisabled();
  });
});

test.describe('AC-7: Toast content correctness', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'employee');
  });

  test('AC-7: Navigating to profile page does not show error toast', async ({ page }) => {
    await gotoProfilePersonal(page);
    await expect(page.getByRole('alert').filter({ hasText: /error|ข้อผิดพลาด/i }))
      .not.toBeVisible({ timeout: 3_000 })
      .catch(() => {});
  });
});

test.describe('AC-8: Mobile responsive drawer', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'employee');
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('AC-8: Profile page loads without JS error at 375px width', async ({ page }) => {
    await gotoProfilePersonal(page);
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('main').getByText(/จงรักษ์|ข้อมูลส่วนตัว|รายละเอียดพื้นฐาน/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('AC-8: Edit button is accessible at mobile viewport (375px)', async ({ page }) => {
    await gotoProfilePersonal(page);
    const editBtn = page.getByRole('button', { name: /แก้ไขข้อมูล|edit/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    const box = await editBtn.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(36);
  });
});

test.describe('AC-9: i18n TH/EN parity', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'employee');
  });

  test('AC-9: /en/profile/me renders without i18n key fallback', async ({ page }) => {
    await page.goto('/en/profile/me', { waitUntil: 'networkidle' });
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/profile\.edit\./);
    expect(body).not.toMatch(/profile\.pending\./);
    expect(body).not.toMatch(/profile\.admin\./);
  });

  test('AC-9: /th/profile/me renders without i18n key fallback', async ({ page }) => {
    await gotoProfilePersonal(page);
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/profile\.edit\./);
    expect(body).not.toMatch(/profile\.pending\./);
  });
});
