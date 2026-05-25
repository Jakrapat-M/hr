/**
 * persona-switcher.test.tsx — Req4 proxy modal.
 * AC4.1 Modal role=dialog with eyebrow + title.
 * AC4.2 rows show name + {role}·{empId} + tier chips.
 * AC4.3 footer both locales.
 * AC4.4 selecting a non-active row → switchPersona + locale-prefixed landing.
 * AC4.5 active row disabled + "Active"/"ใช้อยู่".
 * AC4.7 exit → exitPersona + router.push /{locale}/home (NOT /admin).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const routerMock = vi.hoisted(() => ({ push: vi.fn() }));
const paramsMock = vi.hoisted(() => ({ locale: 'th' as string }));
const switchPersonaMock = vi.hoisted(() => vi.fn());
const exitPersonaMock = vi.hoisted(() => vi.fn());

type AuthShape = {
  email: string | null;
  originalUser: { username: string } | null;
  switchPersona: (u: unknown) => void;
  exitPersona: () => void;
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

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => routerMock),
  useParams: vi.fn(() => paramsMock),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn((selector: (s: AuthShape) => unknown) => selector(authMock)),
}));

// createPortal renders into document.body — keep it inline so queries see it.
vi.mock('react-dom', async (orig) => {
  const actual = await orig<typeof import('react-dom')>();
  return { ...actual, createPortal: (node: React.ReactNode) => node };
});

import { PersonaSwitcher } from '../PersonaSwitcher';
import { DEMO_USERS, landingForDemoUser } from '@/lib/demo-users';

/** Open the modal by clicking the trigger pill. */
function openModal() {
  fireEvent.click(screen.getByRole('button', { name: /สลับบทบาท|Switch persona/ }));
}

beforeEach(() => {
  routerMock.push.mockClear();
  switchPersonaMock.mockClear();
  exitPersonaMock.mockClear();
  paramsMock.locale = 'th';
  authMock.email = 'employee@humi.test';
  authMock.originalUser = null;
});

describe('PersonaSwitcher — Req4 proxy modal', () => {
  it('AC4.1: opens a role=dialog Modal with the eyebrow + title', () => {
    render(<PersonaSwitcher />);
    openModal();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('RBAC · 4 ระดับ')).toBeInTheDocument();
    // The Modal renders the title in its header h2.
    expect(within(dialog).getAllByText('สลับบทบาท').length).toBeGreaterThan(0);
  });

  it('AC4.2: each row shows name + {role}·{empId}', () => {
    render(<PersonaSwitcher />);
    openModal();
    const ken = DEMO_USERS['ken@humi.test'];
    expect(screen.getByText(ken.name)).toBeInTheDocument();
    // role label · empId — Ken is HR Admin · KEN001
    expect(screen.getByText(`HR Admin · ${ken.id}`)).toBeInTheDocument();
  });

  it('AC4.2: a super-user row chips all four tiers A·B·C·D', () => {
    render(<PersonaSwitcher />);
    openModal();
    const adminRow = screen.getByText(DEMO_USERS['admin@humi.test'].name).closest('button')!;
    ['A', 'B', 'C', 'D'].forEach((t) =>
      expect(within(adminRow).getByText(t)).toBeInTheDocument(),
    );
  });

  it('AC4.3 (th): footer enforces RBAC copy', () => {
    render(<PersonaSwitcher />);
    openModal();
    expect(
      screen.getByText('บังคับใช้ RBAC — เห็นเฉพาะสิทธิ์ของแต่ละบทบาท'),
    ).toBeInTheDocument();
  });

  it('AC4.3 (en): footer enforces RBAC copy', () => {
    paramsMock.locale = 'en';
    render(<PersonaSwitcher />);
    openModal();
    expect(
      screen.getByText('RBAC enforced — you only see what each persona may access.'),
    ).toBeInTheDocument();
  });

  it('AC4.4: selecting a non-active row calls switchPersona + locale-prefixed landing', () => {
    render(<PersonaSwitcher />);
    openModal();
    // active = employee; pick admin and assert against its real landing route.
    fireEvent.click(screen.getByText(DEMO_USERS['admin@humi.test'].name).closest('button')!);
    expect(switchPersonaMock).toHaveBeenCalledTimes(1);
    const landing = landingForDemoUser('admin@humi.test', 'th');
    expect(landing.startsWith('/th/')).toBe(true);
    expect(routerMock.push).toHaveBeenCalledWith(landing);
  });

  it('AC4.5: the active row is disabled and labeled "ใช้อยู่"', () => {
    render(<PersonaSwitcher />);
    openModal();
    const activeRow = screen
      .getByText(DEMO_USERS['employee@humi.test'].name)
      .closest('button')!;
    expect(activeRow).toBeDisabled();
    expect(within(activeRow).getByText('ใช้อยู่')).toBeInTheDocument();
  });

  it('AC4.5 (en): active row labeled "Active"', () => {
    paramsMock.locale = 'en';
    render(<PersonaSwitcher />);
    openModal();
    const activeRow = screen
      .getByText(DEMO_USERS['employee@humi.test'].name)
      .closest('button')!;
    expect(within(activeRow).getByText('Active')).toBeInTheDocument();
  });

  it('AC4.7: exit calls exitPersona + router.push /th/home, never /admin', () => {
    authMock.originalUser = { username: 'ผู้ดูแลระบบ HR' };
    render(<PersonaSwitcher />);
    openModal();
    fireEvent.click(screen.getByText(/กลับไปที่/));
    expect(exitPersonaMock).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith('/th/home');
    expect(routerMock.push).not.toHaveBeenCalledWith('/th/admin');
  });
});
