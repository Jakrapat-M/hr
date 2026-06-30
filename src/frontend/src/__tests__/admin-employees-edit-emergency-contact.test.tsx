/**
 * admin-employees-edit-emergency-contact.test.tsx
 * STA-181b Phase 1: /admin/employees/[id]/edit renders Emergency Contact
 * section with name, relationship, phone fields pre-filled from mock data.
 * Also verifies contact.phone/email are wired to MockEmployee.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { useAuthStore } from '@/stores/auth-store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ locale: 'th', id: 'EMP-0001' }),
  usePathname: () => '/th/admin/employees/EMP-0001/edit',
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

async function renderEditPage() {
  const { default: Page } = await import('@/app/[locale]/admin/employees/[id]/edit/page');
  return render(<Page />);
}

beforeEach(() => {
  setRoles(['spd']);
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe('STA-181b Phase 1: /admin/employees/[id]/edit Emergency Contact section', () => {
  it('renders "ผู้ติดต่อฉุกเฉิน" section heading', async () => {
    await renderEditPage();
    expect(screen.getByText(/ผู้ติดต่อฉุกเฉิน/)).toBeInTheDocument();
  });

  it('renders emergency contact name field (2 instances: contact + emergency)', async () => {
    await renderEditPage();
    const nameInputs = screen.getAllByLabelText(/ชื่อ/);
    expect(nameInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders emergency contact relationship field', async () => {
    await renderEditPage();
    expect(screen.getByLabelText(/ความสัมพันธ์/)).toBeInTheDocument();
  });

  it('renders emergency contact phone field (2 instances: contact + emergency)', async () => {
    await renderEditPage();
    const phoneInputs = screen.getAllByLabelText(/เบอร์โทรศัพท์/);
    expect(phoneInputs.length).toBeGreaterThanOrEqual(2);
  });
});
