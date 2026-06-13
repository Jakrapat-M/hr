// probe4.mjs — standalone Playwright probe for live-claim persistence.
//
// Proves: a LIVE benefit claim (BEN-CLM-*) submitted by an employee via the
// reimbursement form SURVIVES a hard navigation (page.reload). The fix changed the
// persist merge / migrate in src/stores/benefit-claims.ts to drop only seed
// claims (isSeededQueueClaim → WF-2026-* ids) instead of every claim missing a
// queueSnapshot — so live BEN-CLM-* claims now survive F5.
//
// Pattern mirrors probe2.mjs: launch headless chromium, seed humi-auth as the
// employee, null the next-auth session route so the seeded role survives.
//
// Prints exactly one of:
//   CLAIM SURVIVES HARD NAV: PASS
//   CLAIM SURVIVES HARD NAV: FAIL

import pkg from '/Users/tachongrak/Projects/hr/node_modules/playwright/index.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_FIXTURE = path.join(__dirname, '..', '..', 'e2e', 'fixtures', 'test-doc.pdf');
const BASE = 'http://localhost:3000';

function fail(reason) {
  console.log(`reason: ${reason}`);
  console.log('CLAIM SURVIVES HARD NAV: FAIL');
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// Seed employee auth before any script runs (Zustand rehydrates from this).
await ctx.addInitScript(() => {
  if (!localStorage.getItem('humi-auth')) {
    localStorage.setItem('humi-auth', JSON.stringify({
      state: { userId: 'EMP001', username: 'สมชาย ใจดี', email: 'employee@humi.test', roles: ['employee'], isAuthenticated: true },
      version: 0,
    }));
  }
});

const page = await ctx.newPage();
// Block the next-auth session route so AuthSync cannot clobber the seeded role.
await page.route('**/api/auth/session**', (r) =>
  r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
);

try {
  const reachable = await page
    .goto(`${BASE}/th/home`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!reachable) {
    fail('dev server unreachable at :3000');
    await browser.close();
    process.exit(1);
  }

  // Clean slate (non-auth humi-* stores) so the run is deterministic.
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('humi-') && k !== 'humi-auth')
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  // ── Submit an OPD medical claim via the reimbursement form ──────────────────
  await page.goto(`${BASE}/th/benefits-hub/reimbursement`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  await page.getByRole('button', { name: /ค่ารักษาพยาบาล \(ผู้ป่วยนอก\)/ }).click();
  await page.getByLabel(/เลขที่ใบเสร็จ\/เอกสาร/).fill('RC-2026-PROBE4');
  await page.getByLabel(/จำนวนเงินตามใบเสร็จ/).fill('1234');
  await page.locator('input[type="file"]').setInputFiles(PDF_FIXTURE);
  await page.getByRole('list', { name: 'ไฟล์ที่อัปโหลดแล้ว' }).waitFor({ state: 'visible', timeout: 8_000 });

  const submitClaim = page.getByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' });
  await submitClaim.click();
  await page.getByText('ส่งคำขอสำเร็จ').first().waitFor({ state: 'visible', timeout: 8_000 });

  // Capture the live BEN-CLM-* id from the store.
  const beforeId = await page.evaluate(() => {
    const raw = localStorage.getItem('humi-benefit-claims');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const live = (parsed?.state?.claims ?? []).find(
      (c) => typeof c.id === 'string' && c.id.startsWith('BEN-CLM-') && c.status === 'pending_manager_approval',
    );
    return live?.id ?? null;
  });
  if (!beforeId) {
    fail('no live BEN-CLM-* pending_manager_approval claim found after submit');
    await browser.close();
    process.exit(1);
  }
  console.log(`live claim id captured: ${beforeId}`);

  // ── Hard navigation — the persistence contract under test ───────────────────
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  const survives = await page.evaluate((id) => {
    const raw = localStorage.getItem('humi-benefit-claims');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return (parsed?.state?.claims ?? []).some(
      (c) => c.id === id && c.status === 'pending_manager_approval',
    );
  }, beforeId);

  if (survives) {
    console.log(`same id ${beforeId} present + pending after reload`);
    console.log('CLAIM SURVIVES HARD NAV: PASS');
  } else {
    fail(`claim ${beforeId} missing or not pending_manager_approval after reload`);
  }
} catch (err) {
  fail(`exception: ${err?.message ?? err}`);
} finally {
  await browser.close().catch(() => {});
}
