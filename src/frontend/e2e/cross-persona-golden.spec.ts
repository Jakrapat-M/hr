import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';

// ════════════════════════════════════════════════════════════════════════════
// cross-persona-golden.spec.ts — the canonical end-to-end "happy path" journey
// that walks a single browser session through three personas via the IN-APP
// PersonaSwitcher (no logout), proving the cross-persona approval contract:
//
//   1. Super-user → assume สมชาย ใจดี (tier D employee) via PersonaSwitcher.
//   2. /th/timeoff  — submit a future-dated ลาพักผ่อนประจำปี (annual) request.
//                     Expect: no crash overlay, success toast, auto-switch to the
//                     status tab with the new row ring-highlighted.
//   3. /th/benefits-hub/reimbursement — submit an OPD medical claim WITH an
//                     attachment; submit succeeds (success card appears).
//   4. End impersonation → assume พิชญ์ ม. (tier C manager) → /th/quick-approve:
//                     BOTH the leave request AND the claim are visible; approve
//                     the leave row.
//   5. Hard reload (F5) once — the queue rows survive (persistence contract).
//   6. Switch back to สมชาย ใจดี → leave status reads "อนุมัติแล้ว"
//                     (annual_leave is a 1-level Manager-only chain).
//   7. Throughout: fail on a Next.js dev error overlay (nextjs-portal) and on
//                     React key / getSnapshot console errors.
//
// Auth: a super-user is seeded into humi-auth via addInitScript (same idiom as
// storage-auth.helper.ts) so Zustand rehydrates before React runs. The journey
// then drives the REAL PersonaSwitcher UI (avatar menu → "สวมบทบาทแทน…" modal)
// per the task spec, rather than re-seeding auth for each hop.
//
// Determinism: localStorage is cleared ONCE at the very start, then never again,
// so the live leave + claim rows this test creates persist across the F5 and the
// persona hops. (Clearing mid-run — as chain-5 does — would wipe the new rows.)
// ════════════════════════════════════════════════════════════════════════════

const BASE = 'http://localhost:3000';

// Super-user with every approver role — so the PersonaSwitcher is available and
// impersonation (switchPersona, demo-only) is permitted.
const SUPER_USER = {
  userId: 'ADM-E2E',
  username: 'Demo Super',
  email: 'admin@humi.test',
  roles: ['hr_admin', 'hr_manager', 'spd', 'hrbp', 'manager', 'employee'],
  isAuthenticated: true,
  originalUser: null,
};

const EMPLOYEE_NAME = 'สมชาย ใจดี';
const MANAGER_NAME = 'พิชญ์'; // matches 'พิชญ์ ม. (หัวหน้าทีม)' in DEMO_USERS
const LEAVE_REASON = 'AUDIT golden cross-persona journey';
const PDF_FIXTURE = path.join(__dirname, 'fixtures', 'test-doc.pdf');

// A bookable WEEKDAY ISO date ~14 days out (inside the 90-day horizon). Annual
// leave counts WorkingDays, so a weekend would yield a 0-day request — we pick a
// weekday so the day-count (and quota reserve) is non-zero.
function bookableWeekdayISO(daysAhead = 14): { iso: string; year: number; month0: number; day: number } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + daysAhead);
  // Nudge off Sat(6)/Sun(0) onto Monday.
  const wd = d.getUTCDay();
  if (wd === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (wd === 0) d.setUTCDate(d.getUTCDate() + 1);
  return {
    iso: d.toISOString().slice(0, 10),
    year: d.getUTCFullYear(),
    month0: d.getUTCMonth(),
    day: d.getUTCDate(),
  };
}

// ── Console / overlay guards ──────────────────────────────────────────────────

interface ErrorSink {
  consoleErrors: string[];
  pageErrors: string[];
}

function attachErrorSink(page: Page): ErrorSink {
  const sink: ErrorSink = { consoleErrors: [], pageErrors: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') sink.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => sink.pageErrors.push(err.message));
  return sink;
}

// React key warnings + the getSnapshot infinite-loop crash are the two failure
// modes this journey is most likely to regress, so we fail hard on them.
const FATAL_CONSOLE_PATTERNS = [
  /Warning: Each child in a list should have a unique "key"/i,
  /unique "key" prop/i,
  /getSnapshot should be cached/i,
  /Maximum update depth exceeded/i,
];

function fatalConsoleErrors(sink: ErrorSink): string[] {
  const all = [...sink.consoleErrors, ...sink.pageErrors];
  return all.filter((line) => FATAL_CONSOLE_PATTERNS.some((re) => re.test(line)));
}

// The Next.js dev error overlay mounts as a <nextjs-portal> custom element with
// an error dialog inside. Its mere presence = an unhandled render error.
async function assertNoErrorOverlay(page: Page, label: string) {
  const overlay = page.locator('nextjs-portal [role="dialog"], [data-nextjs-dialog-overlay]');
  const count = await overlay.count();
  expect(count, `Next.js dev error overlay appeared at: ${label}`).toBe(0);
}

// ── PersonaSwitcher driver (the real in-app UI) ───────────────────────────────

async function openPersonaPicker(page: Page) {
  // If a proxy is active, end it first so the picker re-opens cleanly.
  const endProxy = page.getByRole('button', { name: 'จบการสวมบทบาท' });
  if (await endProxy.count()) {
    await endProxy.first().click();
    await page.waitForTimeout(800);
  }
  await page.getByRole('button', { name: 'เมนูบัญชี' }).first().click();
  await page.getByRole('menuitem', { name: /สวมบทบาทแทน/ }).click();
  // Modal title confirms the picker is open.
  await expect(page.getByText('สวมบทบาทแทน', { exact: true })).toBeVisible({ timeout: 5_000 });
}

async function assumePersona(page: Page, nameFragment: string) {
  await openPersonaPicker(page);
  // Each persona is a button row inside the modal; pick the one matching the name.
  await page.getByRole('button', { name: new RegExp(nameFragment) }).first().click();
  // PersonaSwitcher routes to the persona's landing — wait for navigation to settle.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

// Navigate within the app, preserving the seeded auth (full goto re-runs the
// addInitScript so humi-auth stays seeded, but we navigate after impersonation so
// we must NOT clear storage again — gotoApp never touches storage).
async function gotoApp(page: Page, route: string) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

// ── Test ──────────────────────────────────────────────────────────────────────

test.describe.serial('Cross-persona golden journey (US-16)', () => {
  test.setTimeout(120_000);

  test('employee submits → manager approves → employee sees approved', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    // Seed the super-user BEFORE any script runs (Zustand rehydrates from this).
    // GUARD: only seed when humi-auth is ABSENT. This init script re-runs on every
    // navigation; without the guard it would clobber an active impersonation back
    // to the super-user on each page.goto (the PersonaSwitcher writes the assumed
    // persona into this same key, which we must preserve across navigations).
    await ctx.addInitScript((auth) => {
      if (!localStorage.getItem('humi-auth')) {
        localStorage.setItem('humi-auth', JSON.stringify({ state: auth, version: 0 }));
      }
    }, SUPER_USER);

    const page = await ctx.newPage();
    const sink = attachErrorSink(page);

    // Null the next-auth session route so the seeded super-user is not clobbered
    // by AuthSync (per reference_playwright_persona_session_block).
    await page.route('**/api/auth/session**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );

    try {
      // Skip cleanly if the dev server is unreachable.
      const reachable = await page
        .goto(`${BASE}/th/home`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      if (!reachable) {
        test.skip();
        return;
      }

      // ── Deterministic clean slate — ONCE, then never again ──────────────────
      // Clear every non-auth humi-* store so reruns start from a known state.
      await page.evaluate(() => {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('humi-') && k !== 'humi-auth')
          .forEach((k) => localStorage.removeItem(k));
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

      // ── Step 1 — assume the tier-D employee via the in-app PersonaSwitcher ───
      await assumePersona(page, EMPLOYEE_NAME);
      await assertNoErrorOverlay(page, 'after assume employee');
      // The proxy ribbon proves we are now impersonating the employee.
      await expect(
        page.getByText(new RegExp(`กำลังสวมบทบาทเป็น ${EMPLOYEE_NAME}`)),
      ).toBeVisible({ timeout: 10_000 });

      // ── Step 2 — submit an annual-leave request ──────────────────────────────
      await gotoApp(page, '/th/timeoff');
      await assertNoErrorOverlay(page, '/th/timeoff loaded');

      // Pick ลาพักผ่อนประจำปี in the leave-type radiogroup.
      const leaveTypeGroup = page.getByRole('radiogroup', { name: 'ประเภทการลา' });
      await leaveTypeGroup.getByRole('radio', { name: /ลาพักผ่อนประจำปี/ }).click();

      // Pick a bookable weekday on the calendar. The calendar starts on the
      // current month; advance to the target month if needed, then click the
      // day cell by its aria-label (label STARTS WITH the day number).
      const target = bookableWeekdayISO(14);
      const nowMonth = new Date().getUTCFullYear() * 12 + new Date().getUTCMonth();
      const targetMonth = target.year * 12 + target.month0;
      const monthHops = targetMonth - nowMonth;
      for (let i = 0; i < monthHops; i++) {
        await page.getByRole('button', { name: 'เดือนถัดไป' }).click();
      }
      // Day cells expose aria-label like "14" or "14 · วันหยุด"; anchor to the
      // exact day with a word boundary so "1" never matches "14".
      const dayCell = page
        .getByRole('button', { name: new RegExp(`^${target.day}(\\s|$)`) })
        .first();
      await dayCell.click();

      // Reason (≥5 chars).
      await page.locator('#leave-reason').fill(LEAVE_REASON);

      // Submit must be enabled (annual leave needs no docs / quota is ample).
      const submitLeave = page.getByRole('button', { name: 'ส่งคำขอ', exact: true });
      await expect(submitLeave).toBeEnabled({ timeout: 5_000 });
      await submitLeave.click();

      // Expect: success toast + auto-switch to the status tab + ring-highlighted row.
      await expect(page.getByRole('status').filter({ hasText: /ส่งคำขอลาแล้ว/ }))
        .toBeVisible({ timeout: 8_000 });
      await expect(page.getByRole('tab', { name: 'สถานะคำขอของฉัน' }))
        .toHaveAttribute('aria-selected', 'true', { timeout: 8_000 });
      await expect(page.getByTestId('timeoff-new-row-highlight'))
        .toBeVisible({ timeout: 8_000 });
      await assertNoErrorOverlay(page, 'after leave submit');

      // Capture the live leave id from the store for later status assertions.
      const leaveId = await page.evaluate((reasonNeedle) => {
        const raw = localStorage.getItem('humi-leave-approvals');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const r = (parsed?.state?.requests ?? []).find(
          (x: { reason?: string }) => (x.reason ?? '').includes(reasonNeedle),
        );
        return r?.id ?? null;
      }, 'AUDIT');
      expect(leaveId, 'live leave request id should exist in the store').toBeTruthy();

      // ── Step 3 — submit an OPD medical claim WITH an attachment ──────────────
      await gotoApp(page, '/th/benefits-hub/reimbursement');
      await assertNoErrorOverlay(page, '/reimbursement loaded');

      // Pick the OPD medical plan in the plan-type picker.
      await page.getByRole('button', { name: /ค่ารักษาพยาบาล \(ผู้ป่วยนอก\)/ }).click();

      // Required fields: receipt no + receipt amount (claim date defaults to today).
      await page.getByLabel(/เลขที่ใบเสร็จ\/เอกสาร/).fill('RC-2026-GOLDEN');
      // 1234 (not 1200): 1200 collides with seed WF-2026-017's ฿1,200 amount, so a
      // global /฿1,200/ match could not distinguish the live row from the seed. 1234
      // appears nowhere in mock-requests.ts → the queue assertion is unambiguous.
      await page.getByLabel(/จำนวนเงินตามใบเสร็จ/).fill('1234');

      // Attach a file — the medical claim requires ≥1 attachment. The hidden
      // <input type="file"> is the only file input on the page.
      await page.locator('input[type="file"]').setInputFiles(PDF_FIXTURE);
      // The uploaded-file preview list (aria-label) renders once the file is read.
      await expect(page.getByRole('list', { name: 'ไฟล์ที่อัปโหลดแล้ว' }))
        .toBeVisible({ timeout: 8_000 });

      // Submit — button is enabled; submission succeeds (success card appears).
      const submitClaim = page.getByRole('button', { name: 'ส่งคำขอเบิกสวัสดิการ' });
      await expect(submitClaim).toBeEnabled();
      await submitClaim.click();

      await expect(page.getByText('ส่งคำขอสำเร็จ').first()).toBeVisible({ timeout: 8_000 });
      await assertNoErrorOverlay(page, 'after claim submit');

      // Sanity: the claim is now in the benefit-claims store, pending manager.
      const claimPending = await page.evaluate(() => {
        const raw = localStorage.getItem('humi-benefit-claims');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return (parsed?.state?.claims ?? []).some(
          (c: { status?: string }) => c.status === 'pending_manager_approval',
        );
      });
      expect(claimPending, 'claim should be pending manager approval in the store').toBe(true);

      // ── Step 4 — end impersonation, assume the manager, open the queue ───────
      await assumePersona(page, MANAGER_NAME);
      await assertNoErrorOverlay(page, 'after assume manager');

      await gotoApp(page, '/th/quick-approve');
      await assertNoErrorOverlay(page, '/quick-approve loaded');
      await expect(page.getByRole('heading', { name: 'คิวอนุมัติ' })).toBeVisible({ timeout: 10_000 });

      // BOTH the leave request (carries the employee's name) AND the claim
      // (type "เบิกค่าใช้จ่าย") must be visible in the manager queue.
      await expect(page.getByText(EMPLOYEE_NAME).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('เบิกค่าใช้จ่าย').first()).toBeVisible({ timeout: 10_000 });

      // The live claim's row renders its queueSnapshot.description in the
      // "รายละเอียด" column as `เบิกค่ารักษาพยาบาล ฿1,234`. Scope the amount match
      // to the queue table (caption "คิวอนุมัติ") so it can never match a stray
      // ฿-amount elsewhere on the page, and prove the live row is actually present.
      const queueTable = page.getByRole('table', { name: 'คิวอนุมัติ' });
      await expect(queueTable.getByText(/฿\s?1,234/).first()).toBeVisible({ timeout: 10_000 });

      // Approve the LEAVE request: scope the approve button to the row carrying
      // the employee's name so we don't approve the wrong row.
      const leaveRow = page
        .getByRole('row')
        .filter({ hasText: EMPLOYEE_NAME })
        .filter({ hasText: /การลา|ลาพักผ่อน|ลางาน/ })
        .first();
      // Fallback: any row with the employee name if the type label differs.
      const rowForApproval = (await leaveRow.count())
        ? leaveRow
        : page.getByRole('row').filter({ hasText: EMPLOYEE_NAME }).first();
      await rowForApproval.getByRole('button', { name: 'อนุมัติ', exact: true }).click();
      await assertNoErrorOverlay(page, 'after approve leave');

      // The leave request status in the store should now be approved.
      await expect
        .poll(
          async () =>
            page.evaluate((id) => {
              const raw = localStorage.getItem('humi-leave-approvals');
              if (!raw) return null;
              const parsed = JSON.parse(raw);
              const r = (parsed?.state?.requests ?? []).find(
                (x: { id?: string }) => x.id === id,
              );
              return r?.status ?? null;
            }, leaveId),
          { timeout: 8_000 },
        )
        .toBe('approved');

      // ── Step 5 — hard reload; the queue rows must survive (persistence) ──────
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await assertNoErrorOverlay(page, 'after F5 reload');
      await expect(page.getByRole('heading', { name: 'คิวอนุมัติ' })).toBeVisible({ timeout: 10_000 });
      // The claim row (and the rest of the queue) survives the reload.
      await expect(page.getByText('เบิกค่าใช้จ่าย').first()).toBeVisible({ timeout: 10_000 });

      // ── THE persistence regression-catch ────────────────────────────────────
      // The live claim's ฿1,234 row must STILL be in the queue table after the F5.
      // This is the assertion that fails if R-1 (isSeededQueueClaim-based merge
      // drop in benefit-claims.ts) is reverted: the old `!c.queueSnapshot` filter
      // would discard live BEN-CLM-* claims on rehydrate, so the row disappears.
      const queueTableAfterReload = page.getByRole('table', { name: 'คิวอนุมัติ' });
      await expect(queueTableAfterReload.getByText(/฿\s?1,234/).first())
        .toBeVisible({ timeout: 10_000 });

      // Belt-and-suspenders: the live claim must still be pending_manager_approval
      // in the persisted store AFTER the reload (not just visually rendered).
      const claimPendingAfterReload = await page.evaluate(() => {
        const raw = localStorage.getItem('humi-benefit-claims');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return (parsed?.state?.claims ?? []).some(
          (c: { status?: string }) => c.status === 'pending_manager_approval',
        );
      });
      expect(
        claimPendingAfterReload,
        'live claim should survive F5 as pending_manager_approval in the store',
      ).toBe(true);

      // ── Step 6 — back to the employee; leave shows "อนุมัติแล้ว" ─────────────
      await assumePersona(page, EMPLOYEE_NAME);
      await gotoApp(page, '/th/timeoff?tab=history');
      await assertNoErrorOverlay(page, '/timeoff history loaded');

      // annual_leave is a 1-level (Manager-only) chain → terminal "อนุมัติแล้ว".
      await expect(page.getByText('อนุมัติแล้ว').first()).toBeVisible({ timeout: 10_000 });

      // ── Step 7 — no fatal console errors throughout ──────────────────────────
      const fatals = fatalConsoleErrors(sink);
      expect(
        fatals,
        `fatal console errors during journey:\n${fatals.join('\n')}`,
      ).toEqual([]);
    } finally {
      await ctx.close().catch(() => {});
    }
  });
});
