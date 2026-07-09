/**
 * admin-employees-edit-emergency-contact.test.tsx
 * STA-181b Phase 1: /admin/employees/[id]/edit renders Emergency Contact
 * section with name, relationship, phone fields pre-filled from mock data.
 * Also verifies contact.phone/email are wired to MockEmployee.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { useAuthStore } from '@/stores/auth-store';
import { useEmployees } from '@/lib/admin/store/useEmployees';
import type { Role } from '@/lib/rbac';

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

function setRoles(roles: Role[]) {
  const auth = useAuthStore.getState();
  auth.clearUser();
  auth.setUser({
    id: 'TEST',
    name: 'tester',
    email: 'tester@cnext.test',
    roles,
  });
  auth.setHasHydrated(true);
}

async function renderEditPage() {
  const { default: Page } = await import('@/app/[locale]/admin/employees/[id]/edit/page');
  return render(<Page />);
}

function selectFirstAvailableOption(label: RegExp) {
  const select = screen.getByLabelText(label);
  if (!(select instanceof HTMLSelectElement)) {
    throw new TypeError(`Expected ${label.source} to resolve to a select`);
  }
  const option = Array.from(select.options).find((item) => item.value);
  expect(option).toBeDefined();
  fireEvent.change(select, { target: { value: option?.value } });
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

describe('STA-181b: /admin/employees/[id]/edit remaining field parity', () => {
  it('renders representative fields from the unshipped STA-181 sections', async () => {
    await renderEditPage();

    expect(screen.getByRole('heading', { name: /Dependents/ })).toBeInTheDocument();
    expect(screen.getByLabelText('National ID / Tax ID')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Work Permit Info/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Document Number')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Payment Information/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Bank Code')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Formal Education/ })).toBeInTheDocument();
    expect(screen.getByLabelText('University')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Promotability/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Timeframe')).toBeInTheDocument();
  });

  it('prefills extended fields from the current mock employee data', async () => {
    const employee = useEmployees.getState().getById('EMP-0001');
    await renderEditPage();

    expect(screen.getByLabelText('Email Address')).toHaveValue(employee?.personal_email);
    expect(screen.getByLabelText('Phone Number')).toHaveValue(employee?.personal_phone);
    expect(screen.getByLabelText('Bank Code')).toHaveValue('BBL');
    expect(screen.getByLabelText('University')).toHaveValue('Chulalongkorn University');
  });

  it('persists edited STA-181 extended values through updateEmployee', async () => {
    await renderEditPage();

    fireEvent.change(screen.getByLabelText(/ชื่อเล่น/), { target: { value: 'Tester' } });
    selectFirstAvailableOption(/เพศ/);
    selectFirstAvailableOption(/กรุ๊ปเลือด/);
    selectFirstAvailableOption(/สถานภาพสมรส/);
    selectFirstAvailableOption(/สถานะทางทหาร/);
    fireEvent.change(screen.getByLabelText('Document Number'), { target: { value: 'WP-2026-0001' } });
    fireEvent.change(screen.getByLabelText('University'), { target: { value: 'Thammasat University' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกข้อมูล' }));

    const employee = useEmployees.getState().getById('EMP-0001');
    expect(employee?.sta181_profile_fields?.['job.work_permit.document_number']).toBe('WP-2026-0001');
    expect(employee?.sta181_profile_fields?.['profile.education.university']).toBe('Thammasat University');
  });
});
