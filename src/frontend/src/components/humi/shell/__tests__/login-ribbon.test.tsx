/**
 * login-ribbon.test.tsx — Req2 acting ribbon.
 * AC2.1 solid burnt-orange band tokens (--imp-bg / --imp-fg, NOT the old amber
 *       warning classes), text matches both locales.
 * AC2.2 EMP-{id} from the active persona's userId.
 * AC2.3 Switch back → exitPersona + router.push(/{locale}/home), NOT bare /home.
 * AC2.4 not impersonating → renders nothing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const routerMock = vi.hoisted(() => ({ push: vi.fn() }));
const paramsMock = vi.hoisted(() => ({ locale: 'th' as string }));
const exitPersonaMock = vi.hoisted(() => vi.fn());

type AuthShape = {
  username: string | null;
  email: string | null;
  userId: string | null;
  roles: string[];
  originalUser: { username: string } | null;
  exitPersona: () => void;
  _hasHydrated: boolean;
};

const authMock = vi.hoisted(
  () =>
    ({
      username: 'จงรักษ์ ทานากะ (HR Admin)',
      email: 'ken@humi.test',
      userId: 'KEN001',
      roles: ['hr_admin', 'employee'],
      originalUser: { username: 'ผู้ดูแลระบบ HR' },
      exitPersona: exitPersonaMock,
      _hasHydrated: true,
    }) as AuthShape,
);

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => routerMock),
  useParams: vi.fn(() => paramsMock),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn((selector: (s: AuthShape) => unknown) => selector(authMock)),
}));

import { LoginAsRibbon } from '../LoginAsRibbon';

beforeEach(() => {
  routerMock.push.mockClear();
  exitPersonaMock.mockClear();
  paramsMock.locale = 'th';
  authMock.username = 'จงรักษ์ ทานากะ (HR Admin)';
  authMock.email = 'ken@humi.test';
  authMock.userId = 'KEN001';
  authMock.roles = ['hr_admin', 'employee'];
  authMock.originalUser = { username: 'ผู้ดูแลระบบ HR' };
  authMock._hasHydrated = true;
});

describe('LoginAsRibbon — Req2 acting band', () => {
  it('AC2.1: amber band uses bg-warning-soft + border-warning, never bg-warning-tint', () => {
    const { container } = render(<LoginAsRibbon />);
    const band = container.querySelector('[role="status"]')!;
    expect(band).toHaveClass('bg-warning-soft');
    expect(band).toHaveClass('border-warning');
    expect(band.className).not.toContain('bg-warning-tint');
  });

  it('AC2.1: renders the TH acting copy', () => {
    render(<LoginAsRibbon />);
    expect(screen.getByText('กำลังดูในชื่อ')).toBeInTheDocument();
    expect(screen.getByText('กลับสู่ผู้ดูแลระบบ')).toBeInTheDocument();
  });

  it('AC2.1: renders the EN acting copy under /en', () => {
    paramsMock.locale = 'en';
    render(<LoginAsRibbon />);
    expect(screen.getByText('Acting as')).toBeInTheDocument();
    expect(screen.getByText('Switch back to admin')).toBeInTheDocument();
  });

  it('AC2.2: shows EMP-{id} from the active persona userId', () => {
    render(<LoginAsRibbon />);
    expect(screen.getByText('EMP-KEN001')).toBeInTheDocument();
  });

  it('AC2.3 (th): Switch back calls exitPersona + router.push /th/home', () => {
    render(<LoginAsRibbon />);
    fireEvent.click(screen.getByText('กลับสู่ผู้ดูแลระบบ'));
    expect(exitPersonaMock).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith('/th/home');
    expect(routerMock.push).not.toHaveBeenCalledWith('/home');
  });

  it('AC2.3 (en): Switch back routes to /en/home', () => {
    paramsMock.locale = 'en';
    render(<LoginAsRibbon />);
    fireEvent.click(screen.getByText('Switch back to admin'));
    expect(routerMock.push).toHaveBeenCalledWith('/en/home');
  });

  it('AC2.4: renders nothing when not impersonating', () => {
    authMock.originalUser = null;
    const { container } = render(<LoginAsRibbon />);
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(screen.queryByText('กลับสู่ผู้ดูแลระบบ')).not.toBeInTheDocument();
  });

  it('AC2.4: renders nothing before hydration', () => {
    authMock._hasHydrated = false;
    const { container } = render(<LoginAsRibbon />);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});

// AC2.5 + AC2.6 are wiring/source contracts asserted against the shell source —
// rendering the full AppShell (auth gate, demo-seed, ⌘K, CommandPalette) is too
// heavy for a focused unit and would duplicate the layout-integration suite.

describe('LoginAsRibbon — shell wiring', () => {
  const shellDir = path.resolve(process.cwd(), 'src/components/humi/shell');
  const appShell = fs.readFileSync(path.join(shellDir, 'AppShell.tsx'), 'utf8');
  const barrel = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/humi/index.ts'),
    'utf8',
  );

  it('AC2.5: AppShell renders <LoginAsRibbon/> before <Topbar/> in the main column', () => {
    const ribbonIdx = appShell.indexOf('<LoginAsRibbon');
    const topbarIdx = appShell.indexOf('<Topbar');
    expect(ribbonIdx).toBeGreaterThan(-1);
    expect(topbarIdx).toBeGreaterThan(-1);
    expect(ribbonIdx).toBeLessThan(topbarIdx);
  });

  it('AC2.6: the ActingBadge barrel export is gone from @/components/humi', () => {
    expect(barrel).not.toContain("export { ActingBadge }");
    expect(barrel).not.toContain('./ActingBadge');
  });

  it('AC2.6: the ActingBadge component file no longer exists', () => {
    expect(fs.existsSync(path.join(shellDir, '..', 'ActingBadge.tsx'))).toBe(false);
  });
});
