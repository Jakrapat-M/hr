/**
 * STA-181 — SPD edit page layout restructure.
 * The /admin/employees/[id]/edit page adopts the my-profile visual rhythm:
 *  - Save / Cancel actions relocated to a bar at the TOP (before the sections).
 *  - Each field group is rendered as its own card (humi-card).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useAuthStore } from '@/stores/auth-store';
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
  auth.setUser({ id: 'TEST', name: 'tester', email: 'tester@humi.test', roles });
  auth.setHasHydrated(true);
}

async function renderEditPage() {
  const { default: Page } = await import('@/app/[locale]/admin/employees/[id]/edit/page');
  return render(<Page />);
}

beforeEach(() => setRoles(['spd']));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('STA-181 — SPD edit layout', () => {
  it('renders Save + Cancel and places them ABOVE the first section', async () => {
    await renderEditPage();
    const save = screen.getByRole('button', { name: 'บันทึกข้อมูล' });
    const cancel = screen.getByRole('link', { name: 'ยกเลิก' });
    const firstSection = screen.getByRole('heading', { name: 'ชื่อ (ภาษาท้องถิ่น)' });
    // Save button precedes the first section heading in DOM order (top actions).
    expect(save.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cancel.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('the action bar is NOT nested inside a section card', async () => {
    await renderEditPage();
    const save = screen.getByRole('button', { name: 'บันทึกข้อมูล' });
    expect(save.closest('section.humi-card')).toBeNull();
  });

  it('renders each field group as its own card (my-profile rhythm)', async () => {
    await renderEditPage();
    for (const title of ['ชื่อ (ภาษาท้องถิ่น)', 'ข้อมูลส่วนตัว', 'ข้อมูลติดต่อ', 'ผู้ติดต่อฉุกเฉิน']) {
      const heading = screen.getByRole('heading', { name: title });
      expect(heading.closest('.humi-card')).not.toBeNull();
    }
  });

  it('keeps section titles as headings (h2, clean hierarchy under the page h1)', async () => {
    await renderEditPage();
    const heading = screen.getByRole('heading', { name: 'ข้อมูลติดต่อ' });
    expect(heading.tagName).toBe('H2');
  });
});
