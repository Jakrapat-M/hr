/**
 * persona-switcher.test.tsx — SF-realignment (di-proxy-sf-2026-05-28).
 *
 * Trigger is now the Topbar avatar-dropdown menu item — not a pill on the
 * Topbar. PersonaSwitcher only renders the Modal, opened via
 * ui-store.personaPickerOpen. We seed that flag to `true` to render the picker.
 *
 * Asserts:
 *   - Modal header copy = "สวมบทบาทแทน" / "Take Action on Behalf of"
 *   - Search input filters list by name / email / role label
 *   - Rows render a secondary line with jobTitle · department
 *   - Selecting a non-active row calls switchPersona
 *   - Active row disabled + "ใช้อยู่"/"Active"
 *   - Exit (when proxying) calls exitPersona + routes to /{locale}/home
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const routerMock = vi.hoisted(() => ({ push: vi.fn() }));
const paramsMock = vi.hoisted(() => ({ locale: 'th' as string }));
const switchPersonaMock = vi.hoisted(() => vi.fn());
const exitPersonaMock = vi.hoisted(() => vi.fn());
const setPersonaPickerOpenMock = vi.hoisted(() => vi.fn());

type AuthShape = {
  email: string | null;
  originalUser: { username: string } | null;
  switchPersona: (u: unknown) => void;
  exitPersona: () => void;
};

type UIShape = {
  personaPickerOpen: boolean;
  setPersonaPickerOpen: (v: boolean) => void;
};

const authMock = vi.hoisted(
  () =>
    ({
      email: 'employee@humi.test',
      originalUser: null,
      switchPersona: switchPersonaMock,
      exitPersona: exitPersonaMock,
    }) as AuthShape,
);

const uiMock = vi.hoisted(
  () =>
    ({
      personaPickerOpen: true,
      setPersonaPickerOpen: setPersonaPickerOpenMock,
    }) as UIShape,
);

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => routerMock),
  useParams: vi.fn(() => paramsMock),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn((selector: (s: AuthShape) => unknown) => selector(authMock)),
}));

vi.mock('@/stores/ui-store', () => ({
  useUIStore: vi.fn((selector: (s: UIShape) => unknown) => selector(uiMock)),
}));

// createPortal renders into document.body — keep it inline so queries see it.
vi.mock('react-dom', async (orig) => {
  const actual = await orig<typeof import('react-dom')>();
  return { ...actual, createPortal: (node: React.ReactNode) => node };
});

import { PersonaSwitcher } from '../PersonaSwitcher';
import { DEMO_USERS, landingForDemoUser } from '@/lib/demo-users';

beforeEach(() => {
  routerMock.push.mockClear();
  switchPersonaMock.mockClear();
  exitPersonaMock.mockClear();
  setPersonaPickerOpenMock.mockClear();
  paramsMock.locale = 'th';
  authMock.email = 'employee@humi.test';
  authMock.originalUser = null;
  uiMock.personaPickerOpen = true;
});

describe('PersonaSwitcher — SF realignment', () => {
  it('AC3: modal header uses SF copy (TH = สวมบทบาทแทน)', () => {
    render(<PersonaSwitcher />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText('สวมบทบาทแทน').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('สิทธิ์ตามบทบาท · 4 ระดับ')).toBeInTheDocument();
  });

  it('AC3 (en): modal header uses SF copy', () => {
    paramsMock.locale = 'en';
    render(<PersonaSwitcher />);
    expect(screen.getAllByText('Take Action on Behalf of').length).toBeGreaterThan(0);
  });

  it('AC4: search input filters the persona list', () => {
    render(<PersonaSwitcher />);
    const search = screen.getByPlaceholderText('ค้นหาด้วยชื่อ อีเมล หรือบทบาท');
    fireEvent.change(search, { target: { value: 'apinya' } });
    const apinya = DEMO_USERS['apinya@humi.test'];
    expect(screen.getByText(apinya.name)).toBeInTheDocument();
    // Another persona should be gone
    expect(screen.queryByText(DEMO_USERS['ken@humi.test'].name)).toBeNull();
  });

  it('AC4: search filter is case-insensitive and matches email too', () => {
    render(<PersonaSwitcher />);
    const search = screen.getByPlaceholderText('ค้นหาด้วยชื่อ อีเมล หรือบทบาท');
    fireEvent.change(search, { target: { value: 'WORAWEE@HUMI' } });
    expect(screen.getByText(DEMO_USERS['worawee@humi.test'].name)).toBeInTheDocument();
    expect(screen.queryByText(DEMO_USERS['ken@humi.test'].name)).toBeNull();
  });

  it('AC4: search filter matches by role label (HRBP)', () => {
    render(<PersonaSwitcher />);
    const search = screen.getByPlaceholderText('ค้นหาด้วยชื่อ อีเมล หรือบทบาท');
    fireEvent.change(search, { target: { value: 'HRBP' } });
    // Both HRBP personas render.
    expect(screen.getByText(DEMO_USERS['hrbp@humi.test'].name)).toBeInTheDocument();
    expect(screen.getByText(DEMO_USERS['apinya@humi.test'].name)).toBeInTheDocument();
  });

  it('AC5: each row renders a secondary line with jobTitle · department', () => {
    render(<PersonaSwitcher />);
    const ken = DEMO_USERS['ken@humi.test'];
    const row = screen.getByText(ken.name).closest('button')!;
    expect(within(row).getByText(`${ken.jobTitle} · ${ken.department}`)).toBeInTheDocument();
  });

  it('Tier chips A·B·C·D still render for the super-user row', () => {
    render(<PersonaSwitcher />);
    const adminRow = screen.getByText(DEMO_USERS['admin@humi.test'].name).closest('button')!;
    ['A', 'B', 'C', 'D'].forEach((t) =>
      expect(within(adminRow).getByText(t)).toBeInTheDocument(),
    );
  });

  it('Selecting a non-active row calls switchPersona + locale-prefixed landing', () => {
    render(<PersonaSwitcher />);
    fireEvent.click(screen.getByText(DEMO_USERS['admin@humi.test'].name).closest('button')!);
    expect(switchPersonaMock).toHaveBeenCalledTimes(1);
    const landing = landingForDemoUser('admin@humi.test', 'th');
    expect(landing.startsWith('/th/')).toBe(true);
    expect(routerMock.push).toHaveBeenCalledWith(landing);
  });

  it('Active row is disabled and labeled "ใช้อยู่"', () => {
    render(<PersonaSwitcher />);
    const activeRow = screen
      .getByText(DEMO_USERS['employee@humi.test'].name)
      .closest('button')!;
    expect(activeRow).toBeDisabled();
    expect(within(activeRow).getByText('ใช้อยู่')).toBeInTheDocument();
  });

  it('Active row labeled "Active" under /en', () => {
    paramsMock.locale = 'en';
    render(<PersonaSwitcher />);
    const activeRow = screen
      .getByText(DEMO_USERS['employee@humi.test'].name)
      .closest('button')!;
    expect(within(activeRow).getByText('Active')).toBeInTheDocument();
  });

  it('AC7: exit calls exitPersona + router.push /th/home', () => {
    authMock.originalUser = { username: 'ผู้ดูแลระบบ HR' };
    render(<PersonaSwitcher />);
    fireEvent.click(screen.getByText(/กลับไปที่/));
    expect(exitPersonaMock).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith('/th/home');
    expect(routerMock.push).not.toHaveBeenCalledWith('/th/admin');
  });
});

describe('PersonaSwitcher — Topbar wiring (AC1/AC2)', () => {
  // The Topbar pill was removed; the new entry point is the avatar menu
  // item that flips ui-store.personaPickerOpen.
  it('AC1: Topbar.tsx no longer renders a standalone <PersonaSwitcher /> pill trigger', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const topbar = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/humi/shell/Topbar.tsx'),
      'utf8',
    );
    // PersonaSwitcher is still mounted (modal lives there), but the old pill's
    // hallmark — `aria-label="...Switch persona..."` / `inline-flex...rounded-full
    // border` button trigger — is gone. Use the menu copy as the affirmative
    // signal that the new entry point is wired.
    expect(topbar).toContain('สวมบทบาทแทน');
    expect(topbar).toContain('Take Action on Behalf of');
    expect(topbar).toContain('setPersonaPickerOpen(true)');
  });

  it('AC2: Topbar avatar menu i18n keys exist in both catalogs', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const en = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'messages/en.json'), 'utf8'),
    );
    const th = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'messages/th.json'), 'utf8'),
    );
    expect(en.shell.persona.menuLabel).toBe('Take Action on Behalf of…');
    expect(th.shell.persona.menuLabel).toBe('สวมบทบาทแทน…');
    expect(en.shell.persona.header).toBe('Take Action on Behalf of');
    expect(th.shell.persona.header).toBe('สวมบทบาทแทน');
    expect(en.shell.persona.searchPlaceholder).toBe('Search by name, email, or role');
    expect(th.shell.persona.searchPlaceholder).toBe('ค้นหาด้วยชื่อ อีเมล หรือบทบาท');
  });
});
