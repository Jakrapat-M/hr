import { type Page, expect } from '@playwright/test';

const LOCALE = 'en';

/**
 * Navigate to a page and wait for it to load.
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  const fullPath = path.startsWith(`/${LOCALE}`) ? path : `/${LOCALE}${path}`;
  await page.goto(fullPath);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate using the sidebar link.
 */
export async function clickSidebarLink(
  page: Page,
  linkText: string,
): Promise<void> {
  await page.getByRole('navigation').getByRole('link', { name: new RegExp(linkText, 'i') }).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Assert page heading is visible.
 */
export async function expectPageHeading(
  page: Page,
  heading: string | RegExp,
): Promise<void> {
  await expect(
    page.getByRole('heading', { name: heading }).first(),
  ).toBeVisible({ timeout: 10_000 });
}

/**
 * Wait for API-like loading to finish (spinner gone).
 */
export async function waitForLoading(page: Page): Promise<void> {
  const spinner = page.locator('[data-testid="loading"], .animate-spin').first();
  if (await spinner.isVisible({ timeout: 1000 }).catch(() => false)) {
    await spinner.waitFor({ state: 'hidden', timeout: 15_000 });
  }
}

/**
 * Switch language via the header language switcher.
 */
export async function switchLanguage(
  page: Page,
  lang: 'en' | 'th',
): Promise<void> {
  const label = lang === 'th' ? /^ไทย$/ : /^EN$/;
  const button = page.getByRole('button', { name: label }).first();
  await expect(button).toBeVisible({ timeout: 5_000 });
  await button.click();
  await page.waitForURL(new RegExp(`/${lang}(/|$)`), { timeout: 5_000 });
}

/**
 * Open mobile hamburger menu.
 */
export async function openMobileMenu(page: Page): Promise<void> {
  const hamburger = page.locator(
    '[data-testid="mobile-menu-toggle"], button[aria-label*="menu" i]',
  ).first();
  await hamburger.click();
}
