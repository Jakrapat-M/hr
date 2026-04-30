import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_ESS_ACTIONS } from '@/components/humi/QuickActionsTile';

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: navigationMocks.redirect,
  usePathname: vi.fn().mockReturnValue('/th/benefits-hub'),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      'benefits.activeEnrollments': 'สวัสดิการที่ใช้งานอยู่',
      'benefits.benefitPlan': 'แผนสวัสดิการ',
      'benefits.coverage': 'ความคุ้มครอง',
      'benefits.effectiveDate': 'วันที่มีผล',
      'benefits.status': 'สถานะ',
      'benefits.active': 'มีผล',
      'benefits.inactive': 'ไม่มีผล',
    };
    return map[key] ?? key;
  },
}));

describe('benefit claim journey canonical route', () => {
  beforeEach(() => {
    vi.resetModules();
    navigationMocks.redirect.mockClear();
    localStorage.clear();
  });

  it('/requests remains a cross-request hub and does not expose a benefit claim start form', async () => {
    const user = userEvent.setup();
    const { default: RequestsPage } = await import('@/app/[locale]/requests/page');

    render(<RequestsPage />);
    await user.click(screen.getByRole('button', { name: 'สร้างคำร้องใหม่' }));

    expect(screen.queryByText('เบิกค่าใช้จ่าย')).not.toBeInTheDocument();
    expect(screen.queryByText('ค่ารักษาพยาบาล · ทันตกรรม · น้ำมัน · โทรศัพท์')).not.toBeInTheDocument();
  });

  it('/benefits-hub claims tab routes to the profile benefits context instead of starting a duplicate form', async () => {
    const { useBenefitsStore } = await import('@/stores/humi-benefits-slice');
    useBenefitsStore.getState().setTab('claims');

    const { default: BenefitsHubPage } = await import('@/app/[locale]/benefits-hub/page');
    render(<BenefitsHubPage />);

    const claimStart = screen.getByRole('link', { name: 'เริ่มจากข้อมูลสวัสดิการของฉัน' });
    expect(claimStart).toHaveAttribute('href', '/th/profile/me?tab=benefits');
    expect(screen.queryByRole('button', { name: 'สร้างคำขอเบิก' })).not.toBeInTheDocument();
  });

  it('/benefits-hub benefits tab remains browse/learn and shortcuts plan actions to profile benefits', async () => {
    const { useBenefitsStore } = await import('@/stores/humi-benefits-slice');
    useBenefitsStore.getState().setTab('benefits');

    const { default: BenefitsHubPage } = await import('@/app/[locale]/benefits-hub/page');
    render(<BenefitsHubPage />);

    expect(screen.getByRole('heading', { name: 'เลือกแผนสวัสดิการของคุณสำหรับปีนี้' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'เริ่มลงทะเบียน' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /สมัคร/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'เพิ่มผู้อุปการะ' })).not.toBeInTheDocument();

    const profileShortcuts = screen.getAllByRole('link', { name: /โปรไฟล์/ });
    expect(profileShortcuts.length).toBeGreaterThanOrEqual(2);
    profileShortcuts.forEach((link) => {
      expect(link).toHaveAttribute('href', '/th/profile/me?tab=benefits');
    });
  });

  it('ESS quick action points benefit claim entry to profile benefits', () => {
    const benefitAction = DEFAULT_ESS_ACTIONS.find((action) => action.labelTh === 'เบิกสวัสดิการ');

    expect(benefitAction?.href).toBe('/th/profile/me?tab=benefits');
  });

  it('command palette benefit navigation points to profile benefits', async () => {
    const { HUMI_COMMANDS } = await import('@/lib/humi-command-registry');
    const benefitCommand = HUMI_COMMANDS.find((command) => command.id === 'benefits');

    expect(benefitCommand?.label).toBe('สวัสดิการ');
    expect(benefitCommand?.route).toBe('/profile/me?tab=benefits');
  });

  it('benefit route helpers keep one canonical destination per intent', async () => {
    const {
      benefitProfileRoute,
      benefitReferralRoute,
      benefitTaxPlanningRoute,
      benefitsHubRoute,
    } = await import('@/lib/benefit-routes');

    expect(benefitProfileRoute('th')).toBe('/th/profile/me?tab=benefits');
    expect(benefitReferralRoute('th')).toBe('/th/profile/me?tab=benefits&service=referral');
    expect(benefitTaxPlanningRoute('th')).toBe('/th/profile/me?tab=tax&mode=planning');
    expect(benefitsHubRoute('th')).toBe('/th/benefits-hub');
  });

  it('/benefits redirects to the canonical profile benefits route', async () => {
    const { default: BenefitsPage } = await import('@/app/[locale]/benefits/page');

    await expect(
      BenefitsPage({ params: Promise.resolve({ locale: 'th' }) } as never)
    ).rejects.toThrow('NEXT_REDIRECT:/th/profile/me?tab=benefits');
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/th/profile/me?tab=benefits');
  });

  it('/profile/benefits redirects to the profile benefits tab instead of rendering a second profile page', async () => {
    const { default: ProfileBenefitsPage } = await import('@/app/[locale]/profile/benefits/page');

    await expect(
      ProfileBenefitsPage({ params: Promise.resolve({ locale: 'th' }) } as never)
    ).rejects.toThrow('NEXT_REDIRECT:/th/profile/me?tab=benefits');
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/th/profile/me?tab=benefits');
  });

  it('/profile/[tab] legacy profile routes redirect to /profile/me instead of rendering a second profile implementation', async () => {
    const { default: ProfileTabPage } = await import('@/app/[locale]/profile/[tab]/page');

    await expect(
      ProfileTabPage({ params: Promise.resolve({ locale: 'th', tab: 'personal' }) } as never)
    ).rejects.toThrow('NEXT_REDIRECT:/th/profile/me');
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/th/profile/me');
  });

  it('/employees/me/benefits redirects to the profile benefits tab instead of rendering a separate benefits page', async () => {
    const { default: EmployeeBenefitsPage } = await import('@/app/[locale]/employees/me/benefits/page');

    await expect(
      EmployeeBenefitsPage({ params: Promise.resolve({ locale: 'th' }) } as never)
    ).rejects.toThrow('NEXT_REDIRECT:/th/profile/me?tab=benefits');
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/th/profile/me?tab=benefits');
  });

  it('/hospital-referral redirects to the profile referral service shortcut instead of rendering a second referral journey', async () => {
    const { default: HospitalReferralPage } = await import('@/app/[locale]/hospital-referral/page');

    await expect(
      HospitalReferralPage({ params: Promise.resolve({ locale: 'th' }) } as never)
    ).rejects.toThrow('NEXT_REDIRECT:/th/profile/me?tab=benefits&service=referral');
    expect(navigationMocks.redirect).toHaveBeenCalledWith('/th/profile/me?tab=benefits&service=referral');
  });
});
