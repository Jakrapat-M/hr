import { type Page } from '@playwright/test';

export type UserRole = 'employee' | 'manager' | 'hr_admin' | 'hr_manager' | 'spd';

interface TestUser {
  username: string;
  password: string;
  name: string;
  employeeId: string;
  roles: string[];
}

const TEST_USERS: Record<UserRole, TestUser> = {
  employee: {
    username: 'employee@humi.test',
    password: 'employee2026',
    name: 'สมชาย ใจดี',
    employeeId: 'EMP001',
    roles: ['employee'],
  },
  manager: {
    username: 'manager@humi.test',
    password: 'manager2026',
    name: 'พิชญ์ ม. (หัวหน้าทีม)',
    employeeId: 'MGR001',
    roles: ['manager', 'employee'],
  },
  hr_admin: {
    username: 'admin@humi.test',
    password: 'admin2026',
    name: 'ผู้ดูแลระบบ HR',
    employeeId: 'ADM001',
    roles: ['hr_admin', 'hr_manager', 'spd', 'hrbp', 'manager', 'employee'],
  },
  hr_manager: {
    username: 'hris@humi.test',
    password: 'hris2026',
    name: 'นภัสสร (HRIS Admin)',
    employeeId: 'HIS001',
    roles: ['hr_manager', 'employee'],
  },
  spd: {
    username: 'spd@humi.test',
    password: 'spd2026',
    name: 'ดารณี ล. (SPD)',
    employeeId: 'SPD001',
    roles: ['spd', 'employee'],
  },
};

/**
 * Login as a specific role via the sign-in page.
 */
export async function loginAs(page: Page, role: UserRole): Promise<TestUser> {
  const user = TEST_USERS[role];
  await page.goto('/en/login');
  await page.getByLabel(/email|username/i).fill(user.username);
  await page.getByLabel(/password/i).fill(user.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/(en|th)\/(home|admin|spd)/, { timeout: 10_000 });
  return user;
}

/**
 * Login and store auth state for reuse across tests.
 */
export async function loginAndSaveState(
  page: Page,
  role: UserRole,
  storagePath: string,
): Promise<void> {
  await loginAs(page, role);
  await page.context().storageState({ path: storagePath });
}

/**
 * Mock the auth session by setting cookies/storage directly (faster than UI login).
 */
export async function mockAuthSession(
  page: Page,
  role: UserRole,
): Promise<TestUser> {
  const user = TEST_USERS[role];
  const humiAuthState = {
    userId: user.employeeId,
    username: user.name,
    email: user.username,
    roles: user.roles,
    isAuthenticated: true,
    originalUser: null,
  };

  await page.addInitScript((authState) => {
    localStorage.setItem('humi-auth', JSON.stringify({ state: authState, version: 0 }));
  }, humiAuthState);

  // Set a mock session cookie that next-auth recognizes in dev mode
  await page.context().addCookies([
    {
      name: 'next-auth.session-token',
      value: `mock-session-${role}-${Date.now()}`,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  // Mock the session API endpoint
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: user.employeeId,
          name: user.name,
          email: user.username,
          roles: user.roles,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
        accessToken: `mock-token-${role}`,
      }),
    }),
  );
  return user;
}

export function getTestUser(role: UserRole): TestUser {
  return TEST_USERS[role];
}
