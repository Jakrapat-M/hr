import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/auth.helper';

// STA-126 — Team Timesheet weekly grid. STA-252 re-issue: the hourly Gantt view
// has been REMOVED — /roster is the weekly matrix only; the swap modal stays
// top-level (?panel=swap deep-link).

test.describe('Team Timesheet (/roster) — STA-126', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'hr_admin');
  });

  test('default /roster renders the weekly grid with 7 day columns + rows', async ({ page }) => {
    await page.goto('/en/roster');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Team Timesheet/i })).toBeVisible();
    await expect(page.getByTestId('weekly-timesheet-grid')).toBeVisible();
    await expect(page.getByTestId('day-header')).toHaveCount(7);
    expect(await page.getByTestId('timesheet-row').count()).toBeGreaterThan(0);

    // Legend present.
    await expect(page.getByTestId('timesheet-legend')).toBeVisible();
  });

  test('shows a Clock chip and an OT chip somewhere in the default week', async ({ page }) => {
    await page.goto('/en/roster');
    await page.waitForLoadState('networkidle');
    // The canonical OT-seeded employee (EMP-0301) is the first row and has OT in
    // the week of 2026-06-01..07.
    await expect(page.getByTestId('chip-ot').first()).toBeVisible();
    // At least one clock chip (on-time/late/mismatch/absent) renders for a past day.
    const clockChips = page.locator('[data-testid^="chip-clock-"]');
    expect(await clockChips.count()).toBeGreaterThan(0);
  });

  test('week nav: Next advances the range label; Today returns', async ({ page }) => {
    await page.goto('/en/roster');
    await page.waitForLoadState('networkidle');
    const range = page.getByTestId('week-range');
    const initial = (await range.textContent())?.trim();
    await page.getByRole('button', { name: /Next week/i }).click();
    await expect(range).not.toHaveText(initial ?? '');
    await page.getByRole('button', { name: /^Today$/ }).click();
    await expect(range).toHaveText(initial ?? '');
  });

  test('STA-252 N3: hourly view is removed — no toggle, ?view=hourly is a no-op', async ({ page }) => {
    await page.goto('/en/roster?view=hourly');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('weekly-timesheet-grid')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Hourly schedule/i })).toHaveCount(0);
    await expect(page.getByTestId('view-toggle')).toHaveCount(0);
  });

  test('STA-252 N2: position filter narrows the grid by ตำแหน่ง', async ({ page }) => {
    await page.goto('/en/roster');
    await page.waitForLoadState('networkidle');
    const before = await page.getByTestId('timesheet-row').count();
    const select = page.getByLabel('Filter position');
    await expect(select).toBeVisible();
    const options = await select.locator('option').allTextContents();
    // At least one real ตำแหน่ง option beyond "All".
    expect(options.length).toBeGreaterThan(1);
    await select.selectOption({ index: 1 });
    const after = await page.getByTestId('timesheet-row').count();
    expect(after).toBeLessThanOrEqual(before);
  });

  test('?panel=swap opens the swap modal', async ({ page }) => {
    await page.goto('/en/roster?panel=swap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('shift-swap-modal')).toBeVisible();
  });

  test('STA-137: diverse shifts — ≥3 distinct shift start-times in the week', async ({ page }) => {
    await page.goto('/en/roster');
    await page.waitForLoadState('networkidle');
    // Each Shift chip sub shows `HH:MM–HH:MM`; collect the distinct start-times.
    const subs = await page
      .locator('[data-testid="chip-shift"] .font-mono')
      .allTextContents();
    const starts = new Set(subs.map((s) => s.trim().split('–')[0]).filter(Boolean));
    expect(starts.size).toBeGreaterThanOrEqual(3);
  });

  test('STA-137: staggered day-off — Day-Off chips on ≥3 distinct day columns', async ({ page }) => {
    await page.goto('/en/roster');
    await page.waitForLoadState('networkidle');
    // For each timesheet row, find which day-column indexes carry a Day-Off chip.
    const offColumns = await page.evaluate(() => {
      const cols = new Set<number>();
      const rows = document.querySelectorAll('[data-testid="timesheet-row"]');
      for (const row of rows) {
        const cells = row.querySelectorAll('[data-testid="day-cell"]');
        cells.forEach((cell, idx) => {
          if (cell.querySelector('[data-testid="chip-dayoff"]')) cols.add(idx);
        });
      }
      return [...cols];
    });
    expect(offColumns.length).toBeGreaterThanOrEqual(3);
  });

  test('STA-137: header Holiday pill present on a holiday column, absent on a non-holiday column', async ({ page }) => {
    await page.goto('/en/roster');
    await page.waitForLoadState('networkidle');
    // Default week is Mon 2026-06-01 → Sun 2026-06-07; 06-01 + 06-03 are holidays.
    const pills = page.getByTestId('header-holiday-pill');
    expect(await pills.count()).toBeGreaterThan(0);
    // Not every day column is a holiday → fewer pills than the 7 day headers.
    const headers = await page.getByTestId('day-header').count();
    expect(await pills.count()).toBeLessThan(headers);
  });

  test('STA-137: worked holiday — EMP-0301 06-01 cell stacks Shift + Clock + OT + Holiday-pay', async ({ page }) => {
    await page.goto('/en/roster');
    await page.waitForLoadState('networkidle');
    // EMP-0301 is the first timesheet row; Monday 06-01 is the first day cell.
    const firstRow = page.getByTestId('timesheet-row').first();
    const mondayCell = firstRow.getByTestId('day-cell').first();
    await expect(mondayCell.getByTestId('chip-shift')).toBeVisible();
    await expect(mondayCell.locator('[data-testid^="chip-clock-"]').first()).toBeVisible();
    await expect(mondayCell.getByTestId('chip-ot')).toBeVisible();
    await expect(mondayCell.getByTestId('chip-holiday-pay')).toBeVisible();
    // The work chips are NOT suppressed behind a plain Holiday chip.
    await expect(mondayCell.getByTestId('chip-holiday')).toHaveCount(0);
  });

  test('NO-RED: grid + legend contain no red color', async ({ page }) => {
    await page.goto('/en/roster');
    await page.waitForLoadState('networkidle');
    const reds = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="weekly-timesheet-grid"]');
      const legend = document.querySelector('[data-testid="timesheet-legend"]');
      const nodes = [
        ...(grid?.querySelectorAll('*') ?? []),
        ...(legend?.querySelectorAll('*') ?? []),
      ];
      const isRed = (c: string) => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) return false;
        const [r, g, b] = m[1].split(',').map((n) => parseFloat(n));
        // Pure-red-ish: high red, low green/blue. Pumpkin (#FB923C) has high green.
        return r > 180 && g < 80 && b < 80;
      };
      let count = 0;
      for (const el of nodes) {
        const s = getComputedStyle(el as Element);
        if (isRed(s.backgroundColor) || isRed(s.color) || isRed(s.borderColor)) count += 1;
      }
      return count;
    });
    expect(reds).toBe(0);
  });
});
