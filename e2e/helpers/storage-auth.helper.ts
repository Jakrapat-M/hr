/**
 * storage-auth.helper.ts
 *
 * Provides `authedContext()` — creates a BrowserContext with cnext-auth
 * pre-injected via addInitScript so Zustand rehydrates before any React code
 * runs, preventing AppShell from redirecting to /login.
 *
 * Also exports `extractWorkflowEntries()` for cross-test state hand-off
 * (used by chain-3 to pass workflow localStorage entries from employee → SPD).
 */

import type { Browser, BrowserContext } from '@playwright/test';

// ── Persona auth state map (mirrors DEMO_USERS in src/lib/demo-users.ts) ──────

type Role = 'hr_admin' | 'hr_manager' | 'spd' | 'hrbp' | 'manager' | 'employee';

interface CnextAuthState {
  userId: string;
  username: string;
  email: string;
  roles: Role[];
  isAuthenticated: boolean;
  originalUser: null;
}

const PERSONA_AUTH: Record<string, CnextAuthState> = {
  employee: {
    userId: 'EMP001',
    username: 'สมชาย ใจดี',
    email: 'employee@cnext.test',
    roles: ['employee'],
    isAuthenticated: true,
    originalUser: null,
  },
  manager: {
    userId: 'MGR001',
    username: 'พิชญ์ ม. (หัวหน้าทีม)',
    email: 'manager@cnext.test',
    roles: ['manager', 'employee'],
    isAuthenticated: true,
    originalUser: null,
  },
  hrbp: {
    userId: 'HRB001',
    username: 'วิทยา ส. (HRBP)',
    email: 'hrbp@cnext.test',
    roles: ['hrbp', 'employee'],
    isAuthenticated: true,
    originalUser: null,
  },
  spd: {
    userId: 'SPD001',
    username: 'ดารณี ล. (SPD)',
    email: 'spd@cnext.test',
    roles: ['spd', 'employee'],
    isAuthenticated: true,
    originalUser: null,
  },
  hr_admin: {
    userId: 'ADM001',
    username: 'ผู้ดูแลระบบ HR',
    email: 'admin@cnext.test',
    roles: ['hr_admin', 'hr_manager', 'spd', 'hrbp', 'manager', 'employee'],
    isAuthenticated: true,
    originalUser: null,
  },
};

/**
 * Create a new browser context with cnext-auth pre-seeded via addInitScript.
 *
 * @param browser - Playwright Browser instance
 * @param role - persona key (employee | manager | hrbp | spd | hr_admin)
 * @param extraStorage - optional additional localStorage entries to inject
 *   (e.g. workflow entries passed from a prior test context)
 */
export async function authedContext(
  browser: Browser,
  role: keyof typeof PERSONA_AUTH,
  extraStorage: Array<{ name: string; value: string }> = [],
): Promise<BrowserContext> {
  const authState = PERSONA_AUTH[role];
  const cnextAuthValue = JSON.stringify({ state: authState, version: 0 });

  const ctx = await browser.newContext();

  // Inject cnext-auth before any script on the page executes — prevents the
  // Zustand rehydration race that causes AppShell to redirect to /login.
  await ctx.addInitScript(
    ({ key, value, extra }: { key: string; value: string; extra: Array<{ name: string; value: string }> }) => {
      localStorage.setItem(key, value);
      for (const entry of extra) {
        localStorage.setItem(entry.name, entry.value);
      }
    },
    { key: 'cnext-auth', value: cnextAuthValue, extra: extraStorage },
  );

  return ctx;
}

/**
 * Extract cnext-* localStorage entries from a saved storageState snapshot.
 * Used to hand workflow state from one persona's context to another.
 *
 * @param storageState - result of `context.storageState()`
 * @param keyPattern - optional substring filter (default: 'cnext-')
 */
export function extractWorkflowEntries(
  storageState: { origins: Array<{ localStorage: Array<{ name: string; value: string }> }> },
  keyPattern = 'cnext-',
): Array<{ name: string; value: string }> {
  const entries: Array<{ name: string; value: string }> = [];
  for (const origin of storageState.origins ?? []) {
    for (const item of origin.localStorage ?? []) {
      if (item.name.includes(keyPattern) && item.name !== 'cnext-auth') {
        entries.push(item);
      }
    }
  }
  return entries;
}
