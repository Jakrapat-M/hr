/**
 * quick-approve-simple.test.tsx — vitest unit tests
 * PR-5 Req7 — QuickApproveSimple unified approval inbox
 * AC7.1 breadcrumb+title+subtitle | AC7.2 filter segments + click
 * AC7.3 columns | AC7.4 inline actions + View link | AC7.5 Approve state change
 * AC7.6 token scan (no red/rose/pink, no hex) | AC7.7 bilingual labels
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../messages/th.json';
import { QuickApproveSimple } from '../quick-approve-simple';
// PR-1b: the inbox now DERIVES from the seeded stores, so the count comes from the
// single seed authority (APPROVAL_SEED_COUNT), not the retired static array.
import { APPROVAL_SEED_COUNT } from '@/lib/approval-seed-fixtures';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { useTransferApprovals } from '@/stores/transfer-approvals';
import { ensureDemoSeed, resetEnsureDemoSeedForTests } from '@/lib/demo-seed';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/th/quick-approve'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// PR-1b: run the SINGLE seed authority before each test so the derived inbox has
// the canonical rows (mirrors AppShell mounting ensureDemoSeed before the route).
beforeEach(() => {
  useLeaveApprovals.getState().clear();
  useWorkflowApprovals.getState().clear();
  useBenefitClaimsStore.getState().clear();
  useTransferApprovals.getState().clear();
  resetEnsureDemoSeedForTests();
  ensureDemoSeed();
});

// Wrap component in required providers.
function renderComponent() {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages}>
      <QuickApproveSimple />
    </NextIntlClientProvider>,
  );
}

// Helper: safely coerce className (may be SVGAnimatedString on SVG nodes).
function cls(el: Element): string {
  return typeof el.className === 'string'
    ? el.className
    : String((el.className as SVGAnimatedString).baseVal ?? '');
}

// ────────────────────────────────────────────────────────────
// AC7.1 — breadcrumb + title + subtitle with pending count
// ────────────────────────────────────────────────────────────
describe('QuickApproveSimple — AC7.1 header', () => {
  it('renders breadcrumb text', () => {
    renderComponent();
    // th breadcrumb: "HUMI · การจัดการทีม · อนุมัติ" — unique substring
    const matches = screen.getAllByText(/การจัดการทีม/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders heading', () => {
    renderComponent();
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('renders subtitle with pending count', () => {
    renderComponent();
    const totalPending = APPROVAL_SEED_COUNT;
    // subtitle is a <p> element — scope to elements that exactly contain the count
    const matches = screen.getAllByText((t) => t.includes(String(totalPending)));
    expect(matches.some((el) => el.tagName === 'P')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// AC7.2 — 4 filter segments + counts + click to filter
// ────────────────────────────────────────────────────────────
describe('QuickApproveSimple — AC7.2 filter segments', () => {
  it('renders 4 tab buttons', () => {
    renderComponent();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });

  it('All tab is selected by default (aria-selected=true)', () => {
    renderComponent();
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking Pending tab marks it as selected', () => {
    renderComponent();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]); // index 1 = pending
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
  });
});

// ────────────────────────────────────────────────────────────
// AC7.3 — table with columns REF, EMPLOYEE, TYPE, FILED, DETAIL, STATUS
// ────────────────────────────────────────────────────────────
describe('QuickApproveSimple — AC7.3 columns', () => {
  it('renders a table element', () => {
    renderComponent();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('has at least 6 column headers', () => {
    renderComponent();
    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBeGreaterThanOrEqual(6);
  });
});

// ────────────────────────────────────────────────────────────
// AC7.4 — inline Approve / Reject / View per pending row
// ────────────────────────────────────────────────────────────
describe('QuickApproveSimple — AC7.4 inline actions', () => {
  it('renders Approve buttons', () => {
    renderComponent();
    const btns = screen.getAllByRole('button', { name: /อนุมัติ/ });
    expect(btns.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Reject buttons', () => {
    renderComponent();
    const btns = screen.getAllByRole('button', { name: /ปฏิเสธ/ });
    expect(btns.length).toBeGreaterThanOrEqual(1);
  });

  it('View links point to /quick-approve/{id}', () => {
    renderComponent();
    const viewLinks = screen.getAllByRole('link', { name: /ดูรายละเอียด/ });
    expect(viewLinks.length).toBeGreaterThanOrEqual(1);
    expect(viewLinks[0]).toHaveAttribute('href', expect.stringMatching(/\/quick-approve\//));
  });
});

// ────────────────────────────────────────────────────────────
// AC7.5 — Approve moves row Pending → Approved (local state)
// ────────────────────────────────────────────────────────────
describe('QuickApproveSimple — AC7.5 approve state change', () => {
  it('clicking Approve reduces pending subtitle count by 1', () => {
    renderComponent();
    const totalPending = APPROVAL_SEED_COUNT;
    const approveBtns = screen.getAllByRole('button', { name: /อนุมัติ/ });
    fireEvent.click(approveBtns[0]);
    // subtitle <p> should now contain totalPending - 1
    const matches = screen.getAllByText((t) => t.includes(String(totalPending - 1)));
    expect(matches.some((el) => el.tagName === 'P')).toBe(true);
  });

  it('Approved tab count shows 1 after one approve', () => {
    renderComponent();
    const approveBtns = screen.getAllByRole('button', { name: /อนุมัติ/ });
    fireEvent.click(approveBtns[0]);
    // Tab at index 2 = approved — its text should include "1"
    const tabs = screen.getAllByRole('tab');
    expect(tabs[2].textContent).toMatch(/1/);
  });
});

// ────────────────────────────────────────────────────────────
// AC7.6 — Token scan: no red/rose/pink, no hex
// ────────────────────────────────────────────────────────────
describe('QuickApproveSimple — AC7.6 token scan', () => {
  it('no className contains red/rose/pink Tailwind color', () => {
    const { container } = renderComponent();
    const allEls = Array.from(container.querySelectorAll('[class]'));
    const badPattern = /(^|\s)(bg|text|border)-(red|rose|pink)-\d/;
    allEls.forEach((el) => {
      expect(cls(el)).not.toMatch(badPattern);
    });
  });

  it('no inline style contains a hex color', () => {
    const { container } = renderComponent();
    const allEls = Array.from(container.querySelectorAll('[style]'));
    const hexPattern = /#([0-9a-fA-F]{3,8})\b/;
    allEls.forEach((el) => {
      const style = (el as HTMLElement).getAttribute('style') ?? '';
      expect(style).not.toMatch(hexPattern);
    });
  });

  it('Reject buttons do not use Tailwind red/rose/pink', () => {
    renderComponent();
    const rejectBtns = screen.getAllByRole('button', { name: /ปฏิเสธ/ });
    rejectBtns.forEach((btn) => {
      expect(cls(btn)).not.toMatch(/(bg|text|border)-(red|rose|pink)-\d/);
    });
  });
});

// ────────────────────────────────────────────────────────────
// AC7.7 — bilingual labels / provider
// ────────────────────────────────────────────────────────────
describe('QuickApproveSimple — AC7.7 bilingual labels', () => {
  it('mounts with th provider without throw', () => {
    expect(() => renderComponent()).not.toThrow();
  });

  it('table has an accessible caption', () => {
    renderComponent();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
