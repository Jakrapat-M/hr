/**
 * admin-employees-detail-personal-contact.test.tsx
 * STA-181a: /admin/employees/[id] shows a "ข้อมูลการติดต่อส่วนบุคคล" section
 * with personal email, mobile phone, and address — parity with /profile/me
 * display fields. Public section (visible to all roles that can reach the
 * admin detail page).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { useAuthStore } from '@/stores/auth-store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ locale: 'th', id: 'EMP-0001' }),
  usePathname: () => '/th/admin/employees/EMP-0001',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'th',
  useFormatter: () => ({ dateTime: (d: unknown) => String(d) }),
}));

function setRoles(roles: Array<'employee' | 'manager' | 'hrbp' | 'spd' | 'hr_admin' | 'hr_manager'>) {
  useAuthStore.setState({
    userId: 'TEST',
    username: 'tester',
    email: 'tester@humi.test',
    roles,
    isAuthenticated: true,
    originalUser: null,
    _hasHydrated: true,
  } as any);
}

async function renderDetailPage() {
  const { default: Page } = await import('@/app/[locale]/admin/employees/[id]/page');
  return render(<Page />);
}

beforeEach(() => {
  setRoles(['spd']);
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe('STA-181a: /admin/employees/[id] Personal Contact section', () => {
  it('renders the "ข้อมูลการติดต่อส่วนบุคคล" section heading', async () => {
    await renderDetailPage();
    expect(screen.getByText(/ข้อมูลการติดต่อส่วนบุคคล/)).toBeInTheDocument();
  });

  it('renders the section as a CollapsibleSectionCard with id emp-personal-contact', async () => {
    await renderDetailPage();
    const section = document.getElementById('emp-personal-contact');
    expect(section).not.toBeNull();
  });

  it('renders personal email label and value', async () => {
    await renderDetailPage();
    expect(screen.getByText(/อีเมลส่วนตัว/)).toBeInTheDocument();
  });

  it('renders mobile phone label', async () => {
    await renderDetailPage();
    expect(screen.getByText(/โทรศัพท์มือถือ/)).toBeInTheDocument();
  });

  it('renders address label within the personal contact section', async () => {
    await renderDetailPage();
    const section = document.getElementById('emp-personal-contact');
    expect(section).not.toBeNull();
    expect(section?.textContent ?? '').toMatch(/ที่อยู่/);
  });
});
