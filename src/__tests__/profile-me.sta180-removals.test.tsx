/**
 * profile-me.sta180-removals.test.tsx
 * STA-180 (Linear): two surgical UI removals on /profile/me
 *   (1) Pending-tasks callout must NOT render when there are zero pending items
 *       (currently always renders, showing "ไม่มีรายการรอคุณ" empty state).
 *   (2) "My coverage" / "สิทธิ์ของฉัน" tab (panelKey === 'benefits') removed entirely
 *       from /profile/me — benefits have their own dedicated page (EC feedback:
 *       "ถ้าเค้าอยากเช็ค benefit คงมีหน้าให้เข้าไปเช็คอยู่แล้ว").
 *
 * Failing-first: written BEFORE implementation. All three assertions FAIL on
 * current code because (a) callout always renders, (b) benefits tab is in the
 * tab list, (c) benefits tab is reachable by role.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { act } from 'react';

// ── UUID stub ──────────────────────────────────────────────────────────────────
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `sta180-uuid-${++uuidCounter}`,
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
// Minimal key map — only the keys the assertions need + keys the page touches
// during initial render with pendingChanges = [] and activeTab = 'personal'.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      // tab labels (the STA-180 target)
      tabPersonal: 'ข้อมูลส่วนตัว',
      tabJob: 'การจ้างงาน',
      tabEmergency: 'ผู้ติดต่อฉุกเฉิน',
      tabBenefits: 'สิทธิ์ของฉัน',
      tabDocs: 'เอกสาร',
      tabTax: 'ภาษี / ข้อมูลทางการเงิน',
      // callout copy (the STA-180 target)
      tasksNone: 'ไม่มีรายการรอคุณ',
      tasksPending: 'ต้องอัปเดต · {count} รายการรอคุณ',
      // misc keys used during render
      personalEyebrow: 'ข้อมูลส่วนตัว',
      tenurePrefix: 'อายุงาน',
    };
    return map[key] ?? key;
  },
}));

// ── next/navigation mock ──────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/th/profile/me'),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useParams: vi.fn().mockReturnValue({ locale: 'th' }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams('tab=personal')),
}));

// ── next/link mock ────────────────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ href, children, className, ...props }: { href: string; children: React.ReactNode; className?: string; [k: string]: unknown }) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}));

import { useHumiProfileStore } from '@/stores/humi-profile-slice';

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
  useHumiProfileStore.setState({
    activeTab: 'personal',
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
    pendingChanges: [], // STA-180 (1): zero pending → callout must NOT render
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
// STA-180 (1): Empty-state pending-tasks callout removed when 0 pending
// ════════════════════════════════════════════════════════════════════════════

describe('STA-180 (1): pending-tasks callout hidden when zero pending', () => {
  it('does NOT render the "ไม่มีรายการรอคุณ" empty-state text', async () => {
    await renderProfileMePage();
    expect(screen.queryByText(/ไม่มีรายการรอคุณ/i)).toBeNull();
  });

  it('does NOT render the profile-tasks-callout element at all', async () => {
    await renderProfileMePage();
    expect(screen.queryByTestId('profile-tasks-callout')).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// STA-180 (2): "My coverage" / "สิทธิ์ของฉัน" tab removed entirely
// ════════════════════════════════════════════════════════════════════════════

describe('STA-180 (2): "สิทธิ์ของฉัน" / benefits tab removed', () => {
  it('does NOT render a tab named "สิทธิ์ของฉัน"', async () => {
    await renderProfileMePage();
    expect(screen.queryByRole('tab', { name: /สิทธิ์ของฉัน/i })).toBeNull();
  });

  it('does NOT render a tab whose accessible name contains "My coverage" or "สิทธิ์ของฉัน"', async () => {
    await renderProfileMePage();
    const allTabs = screen.getAllByRole('tab');
    const offending = allTabs.filter((t) =>
      /สิทธิ์ของฉัน|My coverage/i.test(t.textContent ?? ''),
    );
    expect(offending).toHaveLength(0);
  });
});
