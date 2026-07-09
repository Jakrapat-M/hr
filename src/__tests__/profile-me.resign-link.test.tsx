/**
 * profile-me.resign-link.test.tsx
 * The "คำขอลาออก / Resignation" entry lives on the /profile/me Employment tab
 * as a low-prominence link (NOT a sidebar leaf, NOT on the Time Off / Leave hub):
 * resigning is a sensitive lifecycle action, kept discoverable-but-not-prominent.
 * This suite asserts the Employment tab links to /resignation with the locale
 * preserved. (Reverts STA-188's relocation to the Time Off hub.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { act } from 'react';

// ── UUID stub ──────────────────────────────────────────────────────────────────
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `profile-uuid-${++uuidCounter}`,
});

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── next-intl mock ────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      // tab labels
      tabPersonal: 'ข้อมูลส่วนตัว',
      tabJob: 'การจ้างงาน',
      tabEmergency: 'ผู้ติดต่อฉุกเฉิน',
      tabDocs: 'เอกสาร',
      tabTax: 'ภาษี / ข้อมูลทางการเงิน',
      // personal section
      personalTitle: 'รายละเอียดพื้นฐาน',
      personalEyebrow: 'ข้อมูลส่วนตัว',
      // job section headings
      positionTitle: 'ตำแหน่งงาน',
      orgTitle: 'โครงสร้างองค์กร',
      salaryTitle: 'ค่าตอบแทน',
      // resignation section — the keys we are asserting on
      resignationSectionEyebrow: 'การลาออก',
      resignationSectionDesc: 'ยื่นคำขอลาออกและติดตามสถานะ',
      resignationSectionLink: 'ดูคำขอลาออก',
      // misc keys used elsewhere in page
      editProfile: 'แก้ไข',
      saveProfile: 'บันทึก',
      cancelEdit: 'ยกเลิก',
      pendingChangesTitle: 'คำขอรอการอนุมัติ',
      noPendingChanges: 'ไม่มีคำขอรอดำเนินการ',
      adminModeLabel: 'โหมดผู้ดูแล',
      adminModeOff: 'ปิด',
      adminModeOn: 'เปิด',
      approveBtn: 'อนุมัติ',
      rejectBtn: 'ปฏิเสธ',
      bankTitle: 'บัญชีธนาคาร',
      bankEyebrow: 'ธนาคาร',
      addressTitle: 'ที่อยู่',
      addressEyebrow: 'ที่อยู่',
      contactTitle: 'วิธีติดต่อคุณ',
      contactEyebrow: 'ข้อมูลการติดต่อ',
      emergencyTitle: 'ผู้ติดต่อฉุกเฉิน',
      'sections.address': 'ที่อยู่',
      'sections.contact': 'ข้อมูลติดต่อ',
      'sections.bank': 'บัญชีธนาคาร',
      'sections.emergencyContact': 'ผู้ติดต่อฉุกเฉิน',
      'sections.personal': 'ข้อมูลส่วนตัว',
      'sections.termination': 'การลาออก',
    };
    return map[key] ?? key;
  },
}));

// ── next/navigation mock ──────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/th/profile/me'),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams('tab=employment')),
}));

// ── next/link mock — render as <a href> ───────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ href, children, className, ...props }: { href: string; children: React.ReactNode; className?: string; [k: string]: unknown }) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}));

import { useCnextProfileStore } from '@/stores/cnext-profile-slice';

async function renderProfileMePage() {
  const { default: ProfileMePage } = await import(
    '@/app/[locale]/profile/me/page'
  );
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(<ProfileMePage />);
  });
  return result!;
}

function resetStore() {
  localStorageMock.clear();
  useCnextProfileStore.setState({
    activeTab: 'employment',    // Employment tab เปิดอยู่ → job panel แสดง
    isEditing: false,
    draft: {
      nickname: 'จงรักษ์', phone: '', personalEmail: '', address: '',
      emergencyContacts: [],
      addressStructured: { houseNo: '', village: '', soi: '', road: '', subdistrict: '', district: '', province: '', postalCode: '' },
      phonesArr: [], emailsArr: [],
      bank: { bankCode: '', accountNo: '', holderName: '', bookAttachmentId: null },
    },
    saved: {
      nickname: 'จงรักษ์', phone: '', personalEmail: '', address: '',
      emergencyContacts: [],
      addressStructured: { houseNo: '', village: '', soi: '', road: '', subdistrict: '', district: '', province: '', postalCode: '' },
      phonesArr: [], emailsArr: [],
      bank: { bankCode: '', accountNo: '', holderName: '', bookAttachmentId: null },
    },
    attachments: [],
    pendingChanges: [],
    adminMode: false,
  });
}

beforeEach(() => {
  uuidCounter = 0;
  resetStore();
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
  resetStore();
});

// ════════════════════════════════════════════════════════════════════════════
// The resignation entry is a low-prominence link on the profile/me Employment
// tab (not a sidebar leaf, not on the Time Off hub) — it must be present here.
// ════════════════════════════════════════════════════════════════════════════

describe('profile/me Employment tab links to /resignation (low-prominence entry)', () => {
  it('has an <a> whose href points at /resignation with the locale preserved', async () => {
    await renderProfileMePage();

    const resignLink = screen
      .queryAllByRole('link')
      .find((l) => (l.getAttribute('href') ?? '').includes('resignation'));
    expect(resignLink).toBeDefined();
    expect(resignLink!.getAttribute('href')).toBe('/th/resignation');
  });

  it('renders the "ดูคำขอลาออก" resignation link', async () => {
    await renderProfileMePage();

    expect(screen.queryByRole('link', { name: /ดูคำขอลาออก/i })).not.toBeNull();
  });
});
