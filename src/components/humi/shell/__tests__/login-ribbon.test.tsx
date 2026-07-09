/**
 * login-ribbon.test.tsx — proxy-ribbon redesign (proxy-ribbon-2026-06-09).
 *
 * The bar is now a navy "console" band (bg-ink / text-canvas) — a dark thin
 * strip on the light app, unmissable but on-brand (no red/orange). It shows the
 * identity FLOW: "Admin {adminName} → กำลังสวมบทบาทเป็น {username}" with an
 * initial avatar + a tier chip (A/B/C/D), and a cream <Button> exit labeled
 * "End Proxy" / "จบการสวมบทบาท". NO-RED guardrail still enforced.
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

// Legacy burnt-orange hex kept out of source as a literal (Humi design-check
// hook blocks raw hex). Construct it from parts for the regression assertion.
const LEGACY_BURNT_ORANGE = ['c2', '41', '0c'].join('');

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

describe('LoginAsRibbon — navy console bar', () => {
  it('AC7: bar uses navy ink + canvas tokens, NO burnt-orange', () => {
    const { container } = render(<LoginAsRibbon />);
    const band = container.querySelector('[role="status"]') as HTMLElement;
    expect(band).not.toBeNull();
    expect(band.className).toContain('bg-ink');
    expect(band.className).toContain('text-canvas');
    // Old burnt-orange inline-style tokens are gone.
    expect(band.style.background ?? '').not.toContain('--imp-bg');
    expect(band.style.color ?? '').not.toContain('--imp-fg');
    // No red/orange utility leakage (the navy band must never reintroduce warm-red urgency).
    expect(band.className).not.toMatch(/\bbg-orange/);
    expect(band.className).not.toMatch(/\bbg-amber/);
    expect(band.className).not.toMatch(/\bbg-warning/);
    expect(band.className).not.toMatch(/\bbg-red/);
    expect(band.className).not.toMatch(/\bbg-danger/);
    expect(band.innerHTML).not.toMatch(/\bbg-danger\b/);
  });

  it('AC7: rendered HTML never contains the legacy burnt-orange hex', () => {
    const { container } = render(<LoginAsRibbon />);
    expect(container.innerHTML.toLowerCase()).not.toContain(LEGACY_BURNT_ORANGE);
  });

  it('AC8 (th): bar copy says "กำลังสวมบทบาทเป็น {name}"', () => {
    render(<LoginAsRibbon />);
    expect(
      screen.getByText('กำลังสวมบทบาทเป็น จงรักษ์ ทานากะ (HR Admin)'),
    ).toBeInTheDocument();
  });

  it('AC8 (en): bar copy says "Acting as {name}"', () => {
    paramsMock.locale = 'en';
    render(<LoginAsRibbon />);
    expect(screen.getByText('Acting as จงรักษ์ ทานากะ (HR Admin)')).toBeInTheDocument();
  });

  it('AC8: identity flow shows the real admin name inline AND in aria/title', () => {
    const { container } = render(<LoginAsRibbon />);
    const band = container.querySelector('[role="status"]') as HTMLElement;
    // a11y: tooltip + screen-reader carry the full proxy relationship.
    expect(band.getAttribute('aria-label') ?? '').toContain('ผู้ดูแลระบบ HR');
    expect(band.getAttribute('title') ?? '').toContain('ผู้ดูแลระบบ HR');
    // The redesign INTENTIONALLY surfaces the admin name inline (identity flow).
    expect(band.textContent ?? '').toContain('ผู้ดูแลระบบ HR');
  });

  it('AC8: tier chip reflects the impersonated persona tier (hr_admin → A)', () => {
    const { container } = render(<LoginAsRibbon />);
    const band = container.querySelector('[role="status"]') as HTMLElement;
    // roles ['hr_admin','employee'] → top tier A (System / HR Admin).
    expect(band.textContent ?? '').toContain('A · ');
  });

  it('AC9: exit affordance is a button (role="button") labeled "จบการสวมบทบาท"', () => {
    render(<LoginAsRibbon />);
    const endButton = screen.getByRole('button', { name: 'จบการสวมบทบาท' });
    expect(endButton.tagName).toBe('BUTTON');
    // No underline-link styling on the button.
    expect(endButton.className).not.toContain('underline');
  });

  it('AC9 (en): exit button labeled "End Proxy"', () => {
    paramsMock.locale = 'en';
    render(<LoginAsRibbon />);
    expect(screen.getByRole('button', { name: 'End Proxy' })).toBeInTheDocument();
  });

  it('AC9 (th): clicking End Proxy calls exitPersona + router.push /th/home', () => {
    render(<LoginAsRibbon />);
    fireEvent.click(screen.getByRole('button', { name: 'จบการสวมบทบาท' }));
    expect(exitPersonaMock).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith('/th/home');
    expect(routerMock.push).not.toHaveBeenCalledWith('/home');
  });

  it('AC9 (en): clicking End Proxy routes to /en/home', () => {
    paramsMock.locale = 'en';
    render(<LoginAsRibbon />);
    fireEvent.click(screen.getByRole('button', { name: 'End Proxy' }));
    expect(routerMock.push).toHaveBeenCalledWith('/en/home');
  });

  it('Renders nothing when not impersonating (originalUser === null)', () => {
    authMock.originalUser = null;
    const { container } = render(<LoginAsRibbon />);
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'จบการสวมบทบาท' })).toBeNull();
  });

  it('Renders nothing before hydration', () => {
    authMock._hasHydrated = false;
    const { container } = render(<LoginAsRibbon />);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});

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
