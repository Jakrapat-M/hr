import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockEmployee = {
  employee_id: 'EMP-0007',
  first_name_th: 'อนุชา',
  last_name_th: 'พงษ์ไพร',
  first_name_en: 'Anucha',
  last_name_en: 'Phongphai',
  position_title: 'Store Associate',
  hire_date: '2026-02-01',
  probation_status: 'in_probation',
  status: 'active',
};

vi.mock('next-intl', () => ({
  useLocale: () => 'th',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/lib/admin/store/useEmployees', () => ({
  useEmployees: (selector: (s: { all: unknown[] }) => unknown) => selector({ all: [mockEmployee] }),
}));

vi.mock('@/stores/probation-approvals', () => ({
  useProbationApprovals: (selector: (s: { evaluations: unknown[]; addEvaluation: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ evaluations: [], addEvaluation: vi.fn() }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { username: string; userId: string }) => unknown) =>
    selector({ username: 'สมชาย มานะ', userId: 'MGR-001' }),
}));

describe('Manager probation list routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links row details to the employee profile, not the employee probation action form', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/probations/page');
    const { container } = render(<Page />);

    expect(screen.getByText('ทดลองงานของทีม')).toBeInTheDocument();
    expect(container.querySelector('a[href="/th/admin/employees/EMP-0007"]')).toBeTruthy();
    expect(container.querySelector('a[href="/th/admin/employees/EMP-0007/probation"]')).toBeNull();
  });
});
