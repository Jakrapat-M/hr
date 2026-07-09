/**
 * manager-dashboard/page.test.tsx
 *
 * Covers:
 * - KPI cards render with mock numbers
 * - Manager version does NOT render Talent Search tile (capability denied)
 * - Approval queue items have correct deep links to /quick-approve/[id]
 * - Recent activity list renders
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Navigation mocks ──────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  usePathname:    vi.fn().mockReturnValue('/th/manager-dashboard'),
  useRouter:      vi.fn().mockReturnValue({ push: vi.fn() }),
  useParams:      vi.fn().mockReturnValue({ locale: 'th' }),
  useSearchParams: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue(null) }),
}));

// ── next-intl ─────────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      eyebrow:           'แดชบอร์ดผู้จัดการ',
      greeting:          'ยินดีต้อนรับ',
      subtitle:          'จัดการทีมของคุณ',
      ctaApprove:        'คิวอนุมัติ',
      ctaTeam:           'ทีมของฉัน',
      kpiPending:        'รออนุมัติ',
      kpiTeamSize:       'ขนาดทีม',
      kpiWeekReview:     'ต้องตรวจสอบสัปดาห์นี้',
      kpiTimeSaved:      'เวลาที่ประหยัดได้',
      queueEyebrow:      'รอการดำเนินการของคุณ',
      queueTitle:        'คิวอนุมัติ',
      queueBadge:        'รายการ',
      viewDetail:        'ดูรายละเอียดของ',
      queueViewAll:      'ดูคำขอรออนุมัติทั้งหมด',
      activityEyebrow:   'ล่าสุด',
      activityTitle:     'กิจกรรมล่าสุด',
      quickActionsEyebrow: 'เมนูลัด',
    };
    return map[key] ?? key;
  },
  useLocale: () => 'th',
}));

// ── next/link ─────────────────────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ── Zustand auth store — Manager persona (no talentSearch/bulkApprove) ────────
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { username: string | null; roles: string[] }) => unknown) =>
    selector({ username: 'สมชาย มานะ', roles: ['manager'] }),
}));

// ── Capability component — resolves against real capabilities module ───────────
// We use a simple pass-through that reads 'action' and denies talentSearch/bulkApprove
vi.mock('@/components/cnext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/cnext')>();
  return {
    ...actual,
    Capability: ({ action, children, fallback = null }: { action?: string; children: React.ReactNode; fallback?: React.ReactNode }) => {
      // Manager: no talentSearch, no bulkApprove
      const denied = ['talentSearch', 'bulkApprove'];
      if (action && denied.includes(action)) return <>{fallback}</>;
      return <>{children}</>;
    },
  };
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Manager Dashboard — KPI cards', () => {
  beforeEach(() => { vi.resetModules(); });

  it('renders all 4 KPI eyebrow labels', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/page');
    render(<Page />);

    expect(screen.getByText('รออนุมัติ')).toBeTruthy();
    expect(screen.getByText('ขนาดทีม')).toBeTruthy();
    expect(screen.getByText('ต้องตรวจสอบสัปดาห์นี้')).toBeTruthy();
    expect(screen.getByText('เวลาที่ประหยัดได้')).toBeTruthy();
  });

  it('renders KPI values: 7, 14, 3, 4.5h', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/page');
    render(<Page />);

    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('4.5h')).toBeTruthy();
  });
});

describe('Manager Dashboard — Approval queue', () => {
  beforeEach(() => { vi.resetModules(); });

  it('renders up to 5 queue items', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/page');
    const { container } = render(<Page />);

    // CNEXT_PENDING_REQUESTS has 4 items; all 4 should show
    const listItems = container.querySelectorAll('ul[role="list"] li');
    // at least 4 items (one list is queue, another is activity)
    expect(listItems.length).toBeGreaterThanOrEqual(4);
  });

  it('queue items deep-link to /quick-approve/[id]', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/page');
    const { container } = render(<Page />);

    // req-1 through req-4 should have hrefs like /th/quick-approve/req-N
    const link = container.querySelector('a[href*="/quick-approve/req-1"]');
    expect(link).toBeTruthy();
  });

  it('renders view-all link to /quick-approve', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/page');
    const { container } = render(<Page />);

    const viewAll = container.querySelector('a[href*="/quick-approve"]');
    expect(viewAll).toBeTruthy();
  });
});

describe('Manager Dashboard — Talent Search NOT visible', () => {
  beforeEach(() => { vi.resetModules(); });

  it('does NOT render a Talent Search tile for Manager persona', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/page');
    render(<Page />);

    // Manager page doesn't include Talent Search at all (not in MANAGER_QUICK_ACTIONS)
    const talentLinks = screen.queryAllByText(/Talent Search/i);
    expect(talentLinks.length).toBe(0);
  });
});

describe('Manager Dashboard — Recent activity', () => {
  beforeEach(() => { vi.resetModules(); });

  it('renders recent activity section', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/page');
    render(<Page />);

    expect(screen.getByText('กิจกรรมล่าสุด')).toBeTruthy();
  });

  it('renders at least one activity item from mock data', async () => {
    const { default: Page } = await import('@/app/[locale]/manager-dashboard/page');
    render(<Page />);

    // First item from CNEXT_RECENT_ACTIVITY
    expect(screen.getByText(/วาสนา จิรวัฒน์/)).toBeTruthy();
  });
});
