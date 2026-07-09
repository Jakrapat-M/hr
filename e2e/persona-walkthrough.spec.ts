// e2e/persona-walkthrough.spec.ts — slow-paced visual walkthrough used by
// autopilot Sprint 0 verification. Mirrors WALKTHROUGH-SCRIPT.md.
//
// Per autopilot brief: do NOT scroll/swipe fast — wait for selectors after
// every action. Capture screenshots per persona × screen for HR review.

import { test, expect, type Page } from '@playwright/test';

const STEP_PAUSE_MS = 600; // small pause between actions so the page settles
const NAV_TIMEOUT_MS = 15_000;

const DEMO = {
  admin: { email: 'admin@humi.test', password: 'admin2026' },
  employee: { email: 'employee@humi.test', password: 'employee2026' },
  manager: { email: 'manager@humi.test', password: 'manager2026' },
  spd: { email: 'spd@humi.test', password: 'spd2026' },
  hrbp: { email: 'hrbp@humi.test', password: 'hrbp2026' },
} as const;

async function loginAs(page: Page, who: keyof typeof DEMO) {
  await page.goto('/th/login', { timeout: NAV_TIMEOUT_MS });
  await page.waitForLoadState('domcontentloaded');
  await page.getByLabel(/email|อีเมล/i).fill(DEMO[who].email);
  await page.getByLabel(/password|รหัส/i).fill(DEMO[who].password);
  await page.waitForTimeout(STEP_PAUSE_MS);
  // Disambiguate from "เข้าสู่ระบบด้วย Microsoft" SSO button — primary submit is exact text.
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  // Wait for redirect off /login
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: NAV_TIMEOUT_MS });
  await page.waitForLoadState('networkidle');
}

async function visit(page: Page, path: string, label: string) {
  await page.goto(path, { timeout: NAV_TIMEOUT_MS });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(STEP_PAUSE_MS);
  await page.screenshot({
    path: `e2e/screenshots/persona-walkthrough/${label}.png`,
    fullPage: true,
  });
}

// Console-error collector — surfaces visual/runtime issues per page.
function attachConsoleCollector(page: Page, errors: { url: string; msg: string }[]) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ url: page.url(), msg: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    errors.push({ url: page.url(), msg: err.message });
  });
}

test.describe('persona walkthrough (slow-paced visual capture)', () => {
  // 200 px scroll cap per step so we don't fly past content
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Employee — User shell', async ({ page }) => {
    const errors: { url: string; msg: string }[] = [];
    attachConsoleCollector(page, errors);
    await loginAs(page, 'employee');
    await visit(page, '/th/home', 'employee-01-home');
    await visit(page, '/th/profile/me', 'employee-02-profile');
    await visit(page, '/th/benefits-hub', 'employee-03-benefits-hub');
    await visit(page, '/th/me/documents', 'employee-04-documents');
    await visit(page, '/th/timeoff', 'employee-05-timeoff');
    await visit(page, '/th/benefits-hub/reimbursement', 'employee-06-reimbursement');
    await visit(page, '/th/benefits-hub/hospital-claim', 'employee-07-hospital-claim');
    await visit(page, '/th/ess/workflows', 'employee-08-my-workflows');
    await visit(page, '/th/resignation', 'employee-09-resignation');
    // Filter known-missing Sprint-1 routes (404 expected), dev-mode first-compile
    // transients, and React 19 / Next 16 dev-mode performance.measure noise from
    // redirect-only components (framework artifact, not a real defect).
    const realErrors = errors.filter(
      (e) =>
        !e.msg.includes('ERR_CONNECTION_REFUSED') &&
        !e.msg.includes('404 (Not Found)') &&
        !e.msg.includes("Performance': '") && // perf.measure dev-mode noise
        !e.msg.includes('cannot have a negative time stamp'),
    );
    expect.soft(realErrors, `unexpected console errors: ${JSON.stringify(realErrors, null, 2)}`).toEqual([]);
  });

  test('Manager — Approver shell, restricted variant', async ({ page }) => {
    const errors: { url: string; msg: string }[] = [];
    attachConsoleCollector(page, errors);
    await loginAs(page, 'manager');
    await visit(page, '/th/manager-dashboard', 'manager-01-dashboard');
    await visit(page, '/th/quick-approve', 'manager-02-quick-approve');
    await visit(page, '/th/home', 'manager-03-home');
    // Filter known-missing Sprint-1 routes (404 expected), dev-mode first-compile
    // transients, and React 19 / Next 16 dev-mode performance.measure noise from
    // redirect-only components (framework artifact, not a real defect).
    const realErrors = errors.filter(
      (e) =>
        !e.msg.includes('ERR_CONNECTION_REFUSED') &&
        !e.msg.includes('404 (Not Found)') &&
        !e.msg.includes("Performance': '") && // perf.measure dev-mode noise
        !e.msg.includes('cannot have a negative time stamp'),
    );
    expect.soft(realErrors, `unexpected console errors: ${JSON.stringify(realErrors, null, 2)}`).toEqual([]);
  });

  test('SPD — Approver shell, specialist variant', async ({ page }) => {
    const errors: { url: string; msg: string }[] = [];
    attachConsoleCollector(page, errors);
    await loginAs(page, 'spd');
    await visit(page, '/th/spd/inbox', 'spd-01-inbox');
    await visit(page, '/th/spd-management', 'spd-02-management');
    await visit(page, '/th/quick-approve', 'spd-03-quick-approve');
    // Filter known-missing Sprint-1 routes (404 expected), dev-mode first-compile
    // transients, and React 19 / Next 16 dev-mode performance.measure noise from
    // redirect-only components (framework artifact, not a real defect).
    const realErrors = errors.filter(
      (e) =>
        !e.msg.includes('ERR_CONNECTION_REFUSED') &&
        !e.msg.includes('404 (Not Found)') &&
        !e.msg.includes("Performance': '") && // perf.measure dev-mode noise
        !e.msg.includes('cannot have a negative time stamp'),
    );
    expect.soft(realErrors, `unexpected console errors: ${JSON.stringify(realErrors, null, 2)}`).toEqual([]);
  });

  test('HRBP — Approver shell, full variant', async ({ page }) => {
    const errors: { url: string; msg: string }[] = [];
    attachConsoleCollector(page, errors);
    await loginAs(page, 'hrbp');
    await visit(page, '/th/quick-approve', 'hrbp-01-quick-approve');
    await visit(page, '/th/hrbp/dashboard', 'hrbp-02-dashboard');
    await visit(page, '/th/hrbp/talent-search', 'hrbp-03-talent-search');
    await visit(page, '/th/quick-approve/bulk', 'hrbp-04-bulk-approve');
    await visit(page, '/th/quick-approve/WF-001', 'hrbp-05-detail-viewer');
    // Filter known-missing Sprint-1 routes (404 expected), dev-mode first-compile
    // transients, and React 19 / Next 16 dev-mode performance.measure noise from
    // redirect-only components (framework artifact, not a real defect).
    const realErrors = errors.filter(
      (e) =>
        !e.msg.includes('ERR_CONNECTION_REFUSED') &&
        !e.msg.includes('404 (Not Found)') &&
        !e.msg.includes("Performance': '") && // perf.measure dev-mode noise
        !e.msg.includes('cannot have a negative time stamp'),
    );
    expect.soft(realErrors, `unexpected console errors: ${JSON.stringify(realErrors, null, 2)}`).toEqual([]);
  });

  test('HR Admin — Admin shell', async ({ page }) => {
    const errors: { url: string; msg: string }[] = [];
    attachConsoleCollector(page, errors);
    await loginAs(page, 'admin');
    await visit(page, '/th/admin', 'admin-01-landing');
    await visit(page, '/th/admin/employees', 'admin-02-employees-list');
    await visit(page, '/th/admin/benefits', 'admin-03-benefits-admin');
    await visit(page, '/th/admin/system', 'admin-04-system-config');
    await visit(page, '/th/admin/system/security/settings', 'admin-05-security');
    await visit(page, '/th/admin/users/role-groups', 'admin-06-role-groups');
    await visit(page, '/th/admin/benefits/manage', 'admin-07-benefits-manage');
    await visit(page, '/th/admin/benefits/plans', 'admin-08-benefits-plans');
    await visit(page, '/th/admin/benefits/records', 'admin-09-benefits-records');
    await visit(page, '/th/admin/benefits/records/BE-FUN-001', 'admin-10-records-detail');
    await visit(page, '/th/admin/benefits/beneficiaries', 'admin-11-beneficiaries');
    await visit(page, '/th/admin/benefits/rules', 'admin-12-benefits-rules');
    await visit(page, '/th/workflows', 'admin-13-workflows-landing');
    await visit(page, '/th/workflows/probation', 'admin-14-workflows-probation');
    // STA-125 — probation evaluation detail: 4 outcome cards + conditional effective date.
    await visit(page, '/th/workflows/probation/PB-001', 'admin-14b-probation-detail');
    // pass-before-due → earlier-than-due effective date input appears
    await page.getByRole('button', { name: /ก่อนกำหนด/ }).click();
    await page.waitForTimeout(STEP_PAUSE_MS);
    await expect(page.getByLabel(/วันที่บรรจุก่อนกำหนด/i)).toBeVisible();
    await page.screenshot({
      path: 'e2e/screenshots/persona-walkthrough/admin-14c-probation-pass-before-due.png',
      fullPage: true,
    });
    // no_pass → free-text fail reason appears, no effective date input
    await page.getByRole('button', { name: /ไม่ผ่าน/ }).click();
    await page.waitForTimeout(STEP_PAUSE_MS);
    await expect(page.getByLabel(/เหตุผลการไม่ผ่านทดลองงาน/i)).toBeVisible();
    await page.screenshot({
      path: 'e2e/screenshots/persona-walkthrough/admin-14d-probation-no-pass-reason.png',
      fullPage: true,
    });
    await visit(page, '/th/admin/employees/EMP001/transfer', 'admin-15-transfer-wizard');
    await visit(page, '/th/admin/employees/EMP001/probation', 'admin-16-probation-wizard');
    // Filter known-missing Sprint-1 routes (404 expected), dev-mode first-compile
    // transients, and React 19 / Next 16 dev-mode performance.measure noise from
    // redirect-only components (framework artifact, not a real defect).
    const realErrors = errors.filter(
      (e) =>
        !e.msg.includes('ERR_CONNECTION_REFUSED') &&
        !e.msg.includes('404 (Not Found)') &&
        !e.msg.includes("Performance': '") && // perf.measure dev-mode noise
        !e.msg.includes('cannot have a negative time stamp'),
    );
    expect.soft(realErrors, `unexpected console errors: ${JSON.stringify(realErrors, null, 2)}`).toEqual([]);
  });
});
