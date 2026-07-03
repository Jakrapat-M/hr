/**
 * admin-employees-personal-parity.test.tsx
 * STA-181: /admin/employees/[id] shows the ~12 read-only PERSONAL parity
 * sections the employee sees on /profile/me (Marital, Bank, Emergency,
 * Dependents, Contact/Address, Advanced, + P2 career/history), fed by the
 * seeded by-id resolver.
 *
 * Covers:
 *  (a) P1 personal sections mount for a seeded id (EMP-0002) with expected labels.
 *  (b) sensitive fields (bank account, national ID) are MASKED.
 *  (c) RBAC — Manager does NOT see Bank / Performance-Assessment; SPD/HR does.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { useAuthStore } from '@/stores/auth-store';
import { getEmployeePersonalById } from '@/lib/admin/employee-personal-resolver';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ locale: 'th', id: 'EMP-0002' }),
  usePathname: () => '/th/admin/employees/EMP-0002',
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

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe('STA-181 (a) — P1 personal parity sections mount for a seeded id', () => {
  beforeEach(() => setRoles(['spd']));

  it('mounts the Marital section', async () => {
    await renderDetailPage();
    expect(document.getElementById('emp-marital')).not.toBeNull();
    expect(screen.getByText(/สถานภาพสมรส/)).toBeInTheDocument();
  });

  it('mounts the Emergency contacts section with the seeded contact', async () => {
    await renderDetailPage();
    const emergency = document.getElementById('emp-emergency');
    expect(emergency).not.toBeNull();
    expect(screen.getByText(/ผู้ติดต่อฉุกเฉิน/)).toBeInTheDocument();
    expect(emergency?.textContent ?? '').toMatch(/ประเสริฐ ศรีสุข/);
  });

  it('mounts the Dependents section', async () => {
    await renderDetailPage();
    expect(document.getElementById('emp-dependents')).not.toBeNull();
    expect(screen.getByText(/ผู้อุปการะ/)).toBeInTheDocument();
  });

  it('mounts the Contact & address section', async () => {
    await renderDetailPage();
    expect(document.getElementById('emp-contact-address')).not.toBeNull();
    expect(screen.getByText(/การติดต่อและที่อยู่/)).toBeInTheDocument();
  });

  it('mounts the Advanced personal section', async () => {
    await renderDetailPage();
    expect(document.getElementById('emp-advanced')).not.toBeNull();
    expect(screen.getByText(/ข้อมูลส่วนบุคคลเพิ่มเติม/)).toBeInTheDocument();
  });

  it('mounts P2 career sections (work experience, certifications, documents)', async () => {
    await renderDetailPage();
    expect(document.getElementById('emp-work-experience')).not.toBeNull();
    expect(document.getElementById('emp-certifications')).not.toBeNull();
    expect(document.getElementById('emp-documents')).not.toBeNull();
  });
});

describe('STA-181 (b) — sensitive fields are masked', () => {
  beforeEach(() => setRoles(['spd']));

  it('masks the bank account number (never renders the raw value)', async () => {
    const p = getEmployeePersonalById('EMP-0002');
    await renderDetailPage();
    const bank = document.getElementById('emp-bank');
    expect(bank).not.toBeNull();
    // Raw account number must not appear anywhere on the page.
    expect(screen.queryByText(p.bank.accountNo)).toBeNull();
    // Masked form (last 4 visible, rest bulleted) is present.
    expect(bank?.textContent ?? '').toMatch(/•+\d{4}/);
  });

  it('masks the national ID (raw 13-digit string never rendered)', async () => {
    const p = getEmployeePersonalById('EMP-0002');
    await renderDetailPage();
    const advanced = document.getElementById('emp-advanced');
    expect(advanced).not.toBeNull();
    expect(screen.queryByText(p.nationalId ?? 'UNSET')).toBeNull();
    // Masked national ID uses X placeholders.
    expect(advanced?.textContent ?? '').toMatch(/X{4}/);
  });
});

describe('STA-181 (c) — RBAC: Manager cannot see Bank / Performance; SPD can', () => {
  it('SPD sees the Bank and Performance/Assessment sections', async () => {
    setRoles(['spd']);
    await renderDetailPage();
    expect(document.getElementById('emp-bank')).not.toBeNull();
    expect(document.getElementById('emp-assessments')).not.toBeNull();
  });

  it('Manager does NOT see the Bank or Performance/Assessment sections (removed, not hidden)', async () => {
    setRoles(['manager']);
    await renderDetailPage();
    expect(document.getElementById('emp-bank')).toBeNull();
    expect(document.getElementById('emp-assessments')).toBeNull();
    // Non-sensitive sections still render for Manager.
    expect(document.getElementById('emp-marital')).not.toBeNull();
    expect(document.getElementById('emp-emergency')).not.toBeNull();
  });
});
