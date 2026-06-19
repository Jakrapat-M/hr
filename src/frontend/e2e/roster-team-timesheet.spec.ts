import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/auth.helper';

// STA-126 — Team Timesheet weekly grid. Default /roster = weekly matrix; the
// hourly Gantt is gated behind ?view=hourly; the swap modal stays top-level.

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

  test('?view=hourly renders the hourly Gantt', async ({ page }) => {
    await page.goto('/en/roster?view=hourly');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Hourly schedule/i })).toBeVisible();
    await expect(page.getByTestId('weekly-timesheet-grid')).toHaveCount(0);
  });

  test('?panel=swap opens the swap modal even without view=hourly', async ({ page }) => {
    await page.goto('/en/roster?panel=swap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('shift-swap-modal')).toBeVisible();
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
