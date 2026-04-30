import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';
import { useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';

const navigationMocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams('tab=benefits'),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((href: string) => { throw new Error(`NEXT_REDIRECT:${href}`); }),
  usePathname: vi.fn().mockReturnValue('/th/profile/me'),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
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
    (selector?: (s: typeof state) => unknown) => selector ? selector(state) : state,
    { getState: () => state, setState: vi.fn(), subscribe: vi.fn() }
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
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => <a href={href} {...props}>{children}</a>,
}));

describe('benefit deferred services profile launchpad', () => {
  beforeEach(() => {
    localStorage.clear();
    navigationMocks.searchParams = new URLSearchParams('tab=benefits');
    useBenefitReferralsStore.getState().clear();
    useBenefitTaxPlanningStore.getState().clear();
  });

  it('renders reimbursement, referral, and tax planning as separate services', async () => {
    const { default: Page } = await import('@/app/[locale]/profile/me/page');
    render(<Page />);

    expect(await screen.findByText('บริการสวัสดิการของฉัน', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'เบิกสวัสดิการ' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'ขอใบส่งตัว' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'วางแผนภาษี' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ขอใบส่งตัว' })).toHaveAttribute('href', '/th/profile/me?tab=benefits&service=referral');
    expect(screen.getByRole('link', { name: 'วางแผนภาษี' })).toHaveAttribute('href', '/th/profile/me?tab=tax&mode=planning');
    expect(screen.getByText(/ไม่ใช่การเบิกย้อนหลัง/)).toBeInTheDocument();
    expect(screen.getByText(/ไม่ใช่คำแนะนำภาษี/)).toBeInTheDocument();
  });

  it('opens referral flow without rendering reimbursement receipt fields', async () => {
    navigationMocks.searchParams = new URLSearchParams('tab=benefits&service=referral');
    const { default: ReferralPage } = await import('@/app/[locale]/profile/me/page');
    render(<ReferralPage />);

    expect(await screen.findByText('ขอใบส่งตัว / ePatient referral')).toBeInTheDocument();
    expect(screen.getByLabelText(/โรงพยาบาล \/ สาขา/)).toBeInTheDocument();
    expect(screen.getByText('ไม่ต้องแนบข้อมูลใบเสร็จหรือจำนวนเงินในช่องนี้')).toBeInTheDocument();
    expect(screen.queryByLabelText('เลขที่ใบเสร็จ/เอกสาร')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('จำนวนเงินที่ขอเบิก')).not.toBeInTheDocument();
  });

  it('opens tax planning panel and saves a masked draft', async () => {
    navigationMocks.searchParams = new URLSearchParams('tab=tax&mode=planning');
    const { default: Page } = await import('@/app/[locale]/profile/me/page');
    render(<Page />);

    expect(await screen.findByLabelText('รายได้เพิ่มเติมคาดการณ์ทั้งปี')).toBeInTheDocument();
    expect(screen.getAllByText((_, element) => element?.textContent?.includes('X-XXXX-XXXXX-01-X') ?? false).length).toBeGreaterThan(0);
    expect(screen.queryByText('3101700000000')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'คำนวณประมาณการ' }));
    await waitFor(() => expect(useBenefitTaxPlanningStore.getState().drafts).toHaveLength(1));
    expect(JSON.stringify(useBenefitTaxPlanningStore.getState().drafts)).not.toContain('3101700000000');
  });

  it('keeps referral and tax forms on Humi field primitives without implementation copy', () => {
    const files = [
      'src/components/benefits/referral/ReferralRequestPanel.tsx',
      'src/components/benefits/tax/TaxPlanningPanel.tsx',
      'src/components/benefits/referral/ReferralLetterPreview.tsx',
    ];
    const source = files.map((file) => readFileSync(path.join(process.cwd(), file), 'utf8')).join('\n');

    expect(source).toMatch(/FormField/);
    expect(source).toMatch(/FormInput/);
    expect(source).not.toMatch(/local estimator only|mocked for planning|Submit for review planned|PDF planned/i);
  });
});
