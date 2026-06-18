/**
 * STA-105 ground-truth guard for the shipped STA-104 "Benefit enrollment" form.
 *
 * STA-105 (archived) is a ground-truth field spec, not a change request: the
 * shipped enrollment modal already conforms 8/8 to Tan's sample image. This spec
 * LOCKS that conformant state so a later edit to admin/employees/[id]/page.tsx
 * cannot silently regress the field set, samples, or required-marker layout.
 * It asserts current behaviour and is expected to PASS on master.
 *
 * Surface: /[locale]/admin/employees/EMP-0001 → "Benefit enrollment" section →
 * "Enroll now" on the first (Mobile allowance) row → 8-field modal.
 *
 * Auth: seed humi-auth (hr_admin) via addInitScript AND stub /api/auth/session so
 * AuthSync does not clobber the seeded persona (project per-persona recipe).
 */
import { test, expect, type Page, type BrowserContext, type Browser } from '@playwright/test';

const EMP_ID = 'EMP-0001';
const HR_ADMIN = {
  state: { userId: 'EMP-0001', username: 'admin', email: 'admin@ris.co.th', roles: ['hr_admin'], isAuthenticated: true },
  version: 0,
};

async function hrAdminContext(browser: Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  await ctx.route('**/api/auth/session', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
  await ctx.addInitScript((a) => localStorage.setItem('humi-auth', JSON.stringify(a)), HR_ADMIN);
  return ctx;
}

async function serverUp(page: Page): Promise<boolean> {
  try {
    const res = await page.goto('/en/home', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    return !!res && res.status() < 500;
  } catch {
    return false;
  }
}

async function openMobileEnrollModal(page: Page, locale: 'en' | 'th') {
  await page.goto(`/${locale}/admin/employees/${EMP_ID}`, { waitUntil: 'networkidle', timeout: 30_000 });
  // Expand every collapsed section so the "Benefit enrollment" table renders.
  const expandBtns = page.getByRole('button', { name: locale === 'th' ? /^ขยาย$/ : /^Expand$/ });
  for (let i = await expandBtns.count(); i > 0; i--) {
    await expandBtns.first().click().catch(() => {});
    await page.waitForTimeout(150);
  }
  // First "Enroll now" button = the Mobile allowance row (first ENROLLABLE_BENEFITS entry).
  const enroll = page.getByRole('button', { name: locale === 'th' ? /^ลงทะเบียน$/ : /^Enroll now$/ }).first();
  await enroll.scrollIntoViewIfNeeded();
  await enroll.click();
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });
}

test.describe('STA-104/105 — enrollment modal ground-truth', () => {
  test.setTimeout(90_000);

  test('EN: 8 fields, row-1 samples, date defaults, optional attachment', async ({ browser }) => {
    const ctx = await hrAdminContext(browser);
    const page = await ctx.newPage();
    test.skip(!(await serverUp(page)), 'dev server not running on :3000');

    await openMobileEnrollModal(page, 'en');
    const dlg = page.locator('[role="dialog"]');

    for (const l of [
      'Selected Benefit', 'Effective date', 'Enrolment Amount', 'Benefit Entitlement Amount',
      'Currency', 'Enrolled in Period', 'Request Date', 'Attachment',
    ]) {
      await expect(dlg.getByText(l, { exact: false }).first()).toBeVisible();
    }

    const enVals = await dlg.locator('input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    for (const v of [
      'Mobile allowance (TH_MOB_006)', '18,000', 'Thai Baht (THB)',
      'Claim - Calendar Year 2026 (TH_CLAIM_CALENDAR_2026)',
    ]) {
      expect(enVals).toContain(v);
    }

    const dates = dlg.locator('input[type="date"]');
    await expect(dates).toHaveCount(2);
    for (const d of await dates.all()) await expect(d).toHaveValue('2026-06-12');

    await expect(dlg.getByText(/optional/i)).toBeVisible();
    await ctx.close();
  });

  test('TH: 8 Thai labels + Thai currency sample + optional hint', async ({ browser }) => {
    const ctx = await hrAdminContext(browser);
    const page = await ctx.newPage();
    test.skip(!(await serverUp(page)), 'dev server not running on :3000');

    await openMobileEnrollModal(page, 'th');
    const dlg = page.locator('[role="dialog"]');

    for (const l of [
      'สวัสดิการที่เลือก', 'วันที่มีผล', 'จำนวนเงินที่ลงทะเบียน', 'สิทธิ์สวัสดิการ (วงเงิน)',
      'สกุลเงิน', 'รอบที่ลงทะเบียน', 'วันที่ยื่นคำขอ', 'เอกสารแนบ',
    ]) {
      await expect(dlg.getByText(l, { exact: false }).first()).toBeVisible();
    }

    const thVals = await dlg.locator('input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(thVals).toContain('Mobile allowance (TH_MOB_006)');
    expect(thVals).toContain('บาทไทย (THB)');
    await expect(dlg.getByText(/ไม่บังคับ/)).toBeVisible();
    await ctx.close();
  });
});
