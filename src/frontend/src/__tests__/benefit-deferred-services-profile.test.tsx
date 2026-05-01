import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';
import { useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';

const navigationMocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams('tab=benefits'),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
  usePathname: vi.fn().mockReturnValue('/th/profile/me'),
  useRouter: vi
    .fn()
    .mockReturnValue({
      push: vi.fn(),
      replace: navigationMocks.replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useSearchParams: vi.fn(() => navigationMocks.searchParams),
}));

vi.mock('@/stores/auth-store', () => {
  const state = {
    isAuthenticated: true,
    userId: 'EMP001',
    username: 'จงรักษ์ ทานากะ',
    roles: ['employee'] as string[],
    _hasHydrated: true,
    email: 'jongrak@central.co.th',
    displayName: 'จงรักษ์ ทานากะ',
    initials: 'จท',
    setUser: vi.fn(),
    setAuth: vi.fn(),
    clearAuth: vi.fn(),
    setHasHydrated: vi.fn(),
  };
  const useAuthStore = Object.assign(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState: () => state, setState: vi.fn(), subscribe: vi.fn() },
  );
  return { useAuthStore };
});

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      subtitle: 'พนักงาน',
      save: 'บันทึก',
      statusActive: 'กำลังทำงาน',
      tabPersonal: 'ข้อมูลส่วนตัว',
      tabJob: 'ตำแหน่งและค่าตอบแทน',
      tabEmergency: 'ติดต่อฉุกเฉิน',
      tabDocs: 'เอกสาร',
      tabTax: 'ภาษี',
      tabBenefits: 'สิทธิ์ของฉัน',
      benefitsTitle: 'สวัสดิการของฉัน',
      benefitsHelp: 'ดูสิทธิ์ที่ลงทะเบียนและประวัติคำขอล่าสุดจากหน้าโปรไฟล์เดียว',
      benefitsPlansTitle: 'แผนที่ลงทะเบียน',
      benefitsAllowancesTitle: 'วงเงินคงเหลือ',
      benefitsDependentsTitle: 'ผู้รับสิทธิ์ร่วม',
      benefitsCovered: 'ได้รับความคุ้มครอง',
      benefitsNotCovered: 'ไม่ได้รับความคุ้มครอง',
      benefitsClaimsTitle: 'ประวัติคำขอล่าสุด',
      benefitsHubLink: 'ดูรายละเอียดสวัสดิการ',
      personalEyebrow: 'ข้อมูลส่วนตัว',
      personalTitle: 'รายละเอียดพื้นฐาน',
      profileEdit: 'แก้ไข',
      profileCancelEdit: 'ยกเลิก',
      emergencyHelp: 'กรุณาให้ข้อมูลอย่างน้อย 1 คน',
      downloadCta: 'ดาวน์โหลด',
      title: 'ภาษีและกิจกรรม',
      noChanges: 'ไม่มีรายการรอดำเนินการ',
      taxTitle: 'เอกสารภาษี',
    };
    return map[key] ?? key;
  },
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('benefit deferred services profile launchpad', () => {
  beforeEach(() => {
    localStorage.clear();
    navigationMocks.searchParams = new URLSearchParams('tab=benefits');
    navigationMocks.replace.mockClear();
    useBenefitReferralsStore.getState().clear();
    useBenefitTaxPlanningStore.getState().clear();
  });

  it('keeps Profile Benefits as a summary surface with a งานสวัสดิการ CTA', async () => {
    const { default: Page } = await import('@/app/[locale]/profile/me/page');
    render(<Page />);

    expect(await screen.findByText('ภาพรวมสิทธิ์สวัสดิการ')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ไปที่งานสวัสดิการ' })).toHaveAttribute(
      'href',
      '/th/benefits-hub',
    );
    expect(screen.queryByText('บริการสวัสดิการของฉัน', { selector: 'h3' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'เบิกสวัสดิการ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ขอใบส่งตัว' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'วางแผนภาษี' })).not.toBeInTheDocument();
  });

  it('redirects legacy profile referral deep links to the dedicated referral route', async () => {
    navigationMocks.searchParams = new URLSearchParams('tab=benefits&service=referral');
    const { default: ReferralPage } = await import('@/app/[locale]/profile/me/page');
    render(<ReferralPage />);

    await waitFor(() =>
      expect(navigationMocks.replace).toHaveBeenCalledWith('/th/benefits-hub/referral'),
    );
    expect(screen.queryByLabelText(/โรงพยาบาล \/ สาขา/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('เลขที่ใบเสร็จ/เอกสาร')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('จำนวนเงินที่ขอเบิก')).not.toBeInTheDocument();
  });

  it('redirects legacy profile tax-planning deep links to Payroll/Tax planning', async () => {
    navigationMocks.searchParams = new URLSearchParams('tab=tax&mode=planning');
    const { default: Page } = await import('@/app/[locale]/profile/me/page');
    render(<Page />);

    await waitFor(() =>
      expect(navigationMocks.replace).toHaveBeenCalledWith('/th/payroll/tax-planning'),
    );
    expect(screen.queryByLabelText('รายได้เพิ่มเติมคาดการณ์ทั้งปี')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'คำนวณประมาณการ' })).not.toBeInTheDocument();
    expect(useBenefitTaxPlanningStore.getState().drafts).toHaveLength(0);
  });

  it('keeps referral and tax forms on Humi field primitives without implementation copy', () => {
    const files = [
      'src/components/benefits/referral/ReferralRequestPanel.tsx',
      'src/components/benefits/tax/TaxPlanningPanel.tsx',
      'src/components/benefits/referral/ReferralLetterPreview.tsx',
    ];
    const source = files
      .map((file) => readFileSync(path.join(process.cwd(), file), 'utf8'))
      .join('\n');

    expect(source).toMatch(/FormField/);
    expect(source).toMatch(/FormInput/);
    expect(source).not.toMatch(
      /local estimator only|mocked for planning|Submit for review planned|PDF planned/i,
    );
  });
});
