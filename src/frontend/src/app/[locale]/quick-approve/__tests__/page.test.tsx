/**
 * /quick-approve page.test.tsx
 *
 * Smoke tests: the route page renders QuickApproveSimple without crashing.
 * The page now delegates to QuickApproveSimple (PR-5 Req7) — a unified status-
 * filtered inbox with title "คิวอนุมัติ" (t('title') in the simple namespace),
 * status filter tabs (all/pending/approved/rejected), and a DataTable.
 * No type-filter chips. No probation-specific drill-in hrefs.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── next-intl mock ─────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    // Return the last segment so nested keys like "filter.all" → "ทั้งหมด"
    const map: Record<string, string> = {
      'title': 'คิวอนุมัติ',
      'breadcrumb': 'อนุมัติ',
      'subtitlePending': '{n} รายการรอการตัดสินใจ',
      'filter.all': 'ทั้งหมด',
      'filter.pending': 'รออนุมัติ',
      'filter.approved': 'อนุมัติแล้ว',
      'filter.rejected': 'ปฏิเสธแล้ว',
      'columns.ref': 'เลขที่',
      'columns.employee': 'พนักงาน',
      'columns.type': 'ประเภท',
      'columns.filed': 'วันที่ส่ง',
      'columns.detail': 'รายละเอียด',
      'columns.status': 'สถานะ',
      'actions.approve': 'อนุมัติ',
      'actions.reject': 'ปฏิเสธ',
      'actions.view': 'ดูรายละเอียด',
      'status.pending': 'รออนุมัติ',
      'status.approved': 'อนุมัติแล้ว',
      'status.rejected': 'ปฏิเสธแล้ว',
      'status.awaitingNext': 'รอผู้อนุมัติถัดไป',
    };
    return map[key] ?? key;
  },
  useLocale: () => 'th',
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Humi component stubs ───────────────────────────────────────────────────
vi.mock('@/components/humi', async () => {
  const { Capability } = await vi.importActual<typeof import('@/components/humi/Capability')>(
    '@/components/humi/Capability',
  );
  return {
    Card: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h2>{children}</h2>,
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    Modal: ({ open, children, title }: any) =>
      open ? <div role="dialog" aria-label={title}>{children}</div> : null,
    DataTable: ({ rows, columns }: any) => (
      <div data-testid="data-table">
        {rows.length === 0
          ? <div data-testid="empty-state" />
          : (
            <div data-testid="has-rows">
              {rows.map((row: any) => (
                <div key={row.id} data-testid={`row-${row.id}`} data-type={row.type}>
                  {columns?.map((col: any) => (
                    <span key={col.id}>{col.cell ? col.cell(row) : null}</span>
                  ))}
                </div>
              ))}
            </div>
          )}
      </div>
    ),
    Capability,
  };
});

// ── localStorage mock ──────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import { useAuthStore } from '@/stores/auth-store';

beforeEach(() => {
  localStorageMock.clear();
  useAuthStore.setState({
    userId: 'TEST-SPD',
    username: 'SPD Test',
    email: 'spd@humi.test',
    roles: ['spd'],
    isAuthenticated: true,
    originalUser: null,
    _hasHydrated: true,
  } as Parameters<typeof useAuthStore.setState>[0]);
});

describe('/quick-approve page route', () => {
  it('renders without crashing and shows the workspace title', async () => {
    const { default: QuickApprovePageRoute } = await import('@/app/[locale]/quick-approve/page');
    render(<QuickApprovePageRoute />);
    // QuickApproveSimple renders t('title') = 'คิวอนุมัติ' as an <h1>
    expect(screen.getByRole('heading', { level: 1, name: /คิวอนุมัติ/ })).toBeInTheDocument();
  });

  it('renders the data table and status filter tabs', async () => {
    const { default: QuickApprovePageRoute } = await import('@/app/[locale]/quick-approve/page');
    render(<QuickApprovePageRoute />);
    // DataTable is always rendered (stub shows empty-state when rows=[])
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    // Status tabs: all / pending / approved / rejected
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(4);
  });

  it('shows status filter tab buttons for all four states', async () => {
    const { default: QuickApprovePageRoute } = await import('@/app/[locale]/quick-approve/page');
    render(<QuickApprovePageRoute />);
    // Four segmented filter tabs rendered as role=tab buttons
    expect(screen.getByRole('tab', { name: /ทั้งหมด/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /รออนุมัติ/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /อนุมัติแล้ว/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ปฏิเสธแล้ว/ })).toBeInTheDocument();
  });
});
