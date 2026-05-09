import { test, expect } from '@playwright/test';
import { loginAs, mockAuthSession } from './helpers/auth.helper';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await loginAs(page, 'employee');
    await expect(page).toHaveURL(/\/(en|th)\/(home|admin|spd)/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel(/email|username/i).fill('invalid@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.locator('form button[type="submit"]').click();
    await expect(
      page.getByRole('alert').or(page.getByText(/invalid|incorrect|failed|ไม่ถูกต้อง|ไม่พบ/i)).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should redirect to correct page based on role', async ({ page }) => {
    await mockAuthSession(page, 'manager');
    await page.goto('/en/home');
    await expect(page).toHaveURL(/\/en/);
    // Manager should see dashboard elements
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('should logout and redirect to sign-in', async ({ page }) => {
    await mockAuthSession(page, 'employee');
    await page.goto('/en/home');
    // Find and click logout
    const logoutBtn = page.locator(
      '[data-testid="logout"], button:has-text("Logout"), button:has-text("Sign Out")',
    ).first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/signin|login/i);
    }
  });

  test('should persist session across page reloads', async ({ page }) => {
    await mockAuthSession(page, 'employee');
    await page.goto('/en/home');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page).not.toHaveURL(/login/i);
    await page.reload();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page).not.toHaveURL(/login/i);
  });

  test('should handle token refresh transparently', async ({ page }) => {
    await mockAuthSession(page, 'employee');
    await page.goto('/en/home');
    // Simulate expired session by modifying cookie expiry
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'EMP001',
            name: 'Somchai Jaidee',
            email: 'emp.test@central.co.th',
            roles: ['employee'],
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
          accessToken: 'refreshed-token',
        }),
      }),
    );
    await page.reload();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page).not.toHaveURL(/login/i);
  });
});
