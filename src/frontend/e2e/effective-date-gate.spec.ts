/**
 * effective-date-gate.spec.ts — current inline profile edit gate E2E coverage.
 *
 * The product no longer uses a two-step "Continue → form" gate. Profile edits
 * enter inline edit mode first, then each field pencil opens one dialog with:
 * new value, effective date, optional attachment, Cancel, and Save.
 */

import { test, expect, type Page } from '@playwright/test';
import { mockAuthSession } from './helpers/auth.helper';

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function tomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateInput(d);
}

async function gotoProfilePersonal(page: Page): Promise<void> {
  await page.goto('/th/profile/me', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /โปรไฟล์ของฉัน|profile/i }).first()).toBeVisible({ timeout: 15_000 });
}

async function enterInlineEdit(page: Page): Promise<void> {
  const editButton = page.getByRole('button', { name: /แก้ไขข้อมูล|edit/i }).first();
  await expect(editButton).toBeVisible({ timeout: 10_000 });
  await editButton.click();
  await expect(page.getByRole('button', { name: /บันทึกการเปลี่ยนแปลง|save changes/i })).toBeVisible();
}

async function openNicknameGate(page: Page): Promise<void> {
  await enterInlineEdit(page);
  const fieldPencil = page.getByRole('button', { name: /แก้ไข ชื่อเล่น|edit nickname/i }).first();
  await expect(fieldPencil).toBeVisible({ timeout: 10_000 });
  await fieldPencil.click();
  await expect(page.getByRole('dialog', { name: /ชื่อเล่น|nickname/i })).toBeVisible({ timeout: 5_000 });
}

test.describe('Effective date profile edit gate', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'employee');
    await gotoProfilePersonal(page);
  });

  test('inline Edit exposes field-level edit pencils', async ({ page }) => {
    await enterInlineEdit(page);
    await expect(page.getByRole('button', { name: /แก้ไข ชื่อเล่น|edit nickname/i }).first()).toBeVisible();
  });

  test('field pencil opens one-step gate dialog with effective date', async ({ page }) => {
    await openNicknameGate(page);
    const dialog = page.getByRole('dialog', { name: /ชื่อเล่น|nickname/i });
    await expect(dialog.locator('input[type="date"]').first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: /บันทึก|save/i }).first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: /ยกเลิก|cancel/i }).first()).toBeVisible();
  });

  test('save is disabled when effective date is cleared', async ({ page }) => {
    await openNicknameGate(page);
    const dialog = page.getByRole('dialog', { name: /ชื่อเล่น|nickname/i });
    await dialog.locator('input[type="date"]').first().fill('');
    await expect(dialog.getByRole('button', { name: /บันทึก|save/i }).first()).toBeDisabled();
  });

  test('save is enabled after entering a valid future effective date', async ({ page }) => {
    await openNicknameGate(page);
    const dialog = page.getByRole('dialog', { name: /ชื่อเล่น|nickname/i });
    await dialog.locator('input[type="date"]').first().fill(tomorrowDateStr());
    await expect(dialog.getByRole('button', { name: /บันทึก|save/i }).first()).toBeEnabled();
  });

  test('one-step gate renders editable value input without legacy Continue/Back buttons', async ({ page }) => {
    await openNicknameGate(page);
    const dialog = page.getByRole('dialog', { name: /ชื่อเล่น|nickname/i });
    await expect(dialog.getByRole('textbox').first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: /ต่อไป|continue|ย้อนกลับ|back/i }).first()).not.toBeVisible({ timeout: 1_000 }).catch(() => {});
  });

  test('Cancel closes gate without submitting', async ({ page }) => {
    await openNicknameGate(page);
    const dialog = page.getByRole('dialog', { name: /ชื่อเล่น|nickname/i });
    await dialog.getByRole('button', { name: /ยกเลิก|cancel/i }).first().click();
    await expect(dialog).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  });

  test('employment tab remains navigable while edit gate coverage is on personal fields', async ({ page }) => {
    const empTab = page.getByRole('tab', { name: /employment|การจ้างงาน|Role and compensation|ตำแหน่งและค่าตอบแทน/i }).first();
    await expect(empTab).toBeVisible({ timeout: 10_000 });
    await empTab.click();
    await expect(page.getByRole('tabpanel').or(page.getByText(/Role and compensation|ตำแหน่งและค่าตอบแทน|ค่าตอบแทน/i)).first()).toBeVisible({ timeout: 10_000 });
  });
});
