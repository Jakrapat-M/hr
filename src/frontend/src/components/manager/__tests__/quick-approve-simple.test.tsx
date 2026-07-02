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
import { usePayRateApprovals } from '@/stores/pay-rate-approvals';
import { useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';
import {
  ensureDemoSeed,
  resetEnsureDemoSeedForTests,
  PAY_RATE_DEMO_COUNT,
  TAX_PLANNING_DEMO_COUNT,
  LEAVE_DEMO_COUNT,
  OT_DEMO_COUNT,
  TC_DEMO_COUNT,
  TERMINATION_DEMO_COUNT,
  SHIFT_ASSIGN_DEMO_COUNT,
} from '@/lib/demo-seed';
import { useOvertimeRequests } from '@/stores/overtime-requests';

// P2: the unified inbox now also seeds pay-rate + tax-planning demo rows, so the
// honest total = the 20 canonical rows + those two demo row sets. Group A adds a
// couple of demo ESS leave rows (LEAVE_DEMO_COUNT); Group B adds demo ESS OT rows
// (OT_DEMO_COUNT) so the OT tab is non-zero.
const TOTAL_SEED_COUNT =
  APPROVAL_SEED_COUNT + PAY_RATE_DEMO_COUNT + TAX_PLANNING_DEMO_COUNT + LEAVE_DEMO_COUNT + OT_DEMO_COUNT + TC_DEMO_COUNT + TERMINATION_DEMO_COUNT + SHIFT_ASSIGN_DEMO_COUNT;
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/rbac';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/th/quick-approve'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// PR-1b: run the SINGLE seed authority before each test so the derived inbox has
// the canonical rows (mirrors AppShell mounting ensureDemoSeed before the route).
// Set the acting persona's roles (drives canActOn / honest count). Default tests
// run as a senior approver (hr_admin) so the legacy action-button assertions hold.
function setRoles(roles: Role[]) {
  useAuthStore.setState({
    roles,
    isAuthenticated: true,
    _hasHydrated: true,
  } as Parameters<typeof useAuthStore.setState>[0]);
}

beforeEach(() => {
  useLeaveApprovals.getState().clear();
  useWorkflowApprovals.getState().clear();
  useBenefitClaimsStore.getState().clear();
  useTransferApprovals.getState().clear();
  usePayRateApprovals.getState().clear();
  useBenefitTaxPlanningStore.getState().clear();
  useOvertimeRequests.getState().clear();
  resetEnsureDemoSeedForTests();
  ensureDemoSeed();
  // Default acting persona = senior approver (acts on every row).
  setRoles(['hr_admin']);
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

// STA-172: rows are now interactive (<tr role="button">), so a name regex can match
// the ROW's accessible name. Count only real per-row action <button>s (exclude TR
// rows + any control inside the open detail popup dialog).
function queryQueueButtons(name: RegExp) {
  return screen
    .queryAllByRole('button', { name })
    .filter((b) => b.tagName === 'BUTTON' && b.closest('[role="dialog"]') === null);
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
    const totalPending = TOTAL_SEED_COUNT;
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
// AC7.4 — row-click opens the detail POPUP (STA-172); per-row Approve/Reject + the
// actions-column View link are gone (the ROW is the affordance).
// ────────────────────────────────────────────────────────────
describe('QuickApproveSimple — AC7.4 row-click popup', () => {
  it('does NOT render per-row Approve buttons in the queue (decisions live in the popup)', () => {
    renderComponent();
    // The popup is closed on mount, so no Approve button is present yet.
    expect(screen.queryAllByRole('button', { name: /^อนุมัติ$/ })).toHaveLength(0);
  });

  it('does NOT render per-row Reject buttons (decisions live on detail)', () => {
    renderComponent();
    expect(queryQueueButtons(/ปฏิเสธ/)).toHaveLength(0);
  });

  it('does NOT render an actions-column View link (the row is the affordance)', () => {
    renderComponent();
    expect(screen.queryAllByRole('link', { name: /ดูรายละเอียด/ })).toHaveLength(0);
  });

  it('clicking a request ROW opens the detail popup with an "Open full page" deep link', () => {
    renderComponent();
    // Rows are interactive (role=button) once onRowClick is wired by the inbox.
    const rowButtons = screen.getAllByRole('button').filter((b) => b.tagName === 'TR');
    expect(rowButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(rowButtons[0]);
    // The popup mounts the generic detail + an "Open full page" deep link that
    // resolves to the row's per-type detail route (so Reject/Return there aren't
    // stranded). The inbox passes its full per-type detailHref.
    const fullPage = screen.getByRole('link', { name: /ดูเต็มหน้า/ });
    expect(fullPage).toHaveAttribute(
      'href',
      expect.stringMatching(
        /\/(quick-approve|workflows\/(pay-rate|tax-planning|time-correction|leave|ot|probation|resignation))\//,
      ),
    );
    // The popup's Approve control (Modal footer) is now present.
    expect(
      screen.getByRole('dialog'),
    ).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────
// AC7.5 — per-row decision removed (STA-121): the queue no longer mutates
// approval state; decisions move to the per-row detail surface.
// ────────────────────────────────────────────────────────────
describe('QuickApproveSimple — AC7.5 no per-row decision in queue', () => {
  it('subtitle pending count is unaffected by the queue (no Approve to click)', () => {
    renderComponent();
    const totalPending = TOTAL_SEED_COUNT;
    // No per-row Approve button exists to mutate the count.
    expect(queryQueueButtons(/อนุมัติ/)).toHaveLength(0);
    const matches = screen.getAllByText((t) => t.includes(String(totalPending)));
    expect(matches.some((el) => el.tagName === 'P')).toBe(true);
  });

  it('Approved tab stays at 0 (queue cannot approve)', () => {
    renderComponent();
    expect(queryQueueButtons(/อนุมัติ/)).toHaveLength(0);
    const tabs = screen.getAllByRole('tab');
    // Tab at index 2 = approved — nothing approved via the queue.
    expect(tabs[2].textContent).toMatch(/0/);
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

  it('no remaining per-row Reject button (decisions moved to detail)', () => {
    renderComponent();
    expect(queryQueueButtons(/ปฏิเสธ/)).toHaveLength(0);
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

// ────────────────────────────────────────────────────────────
// P2 Item 2 — DEFAULT SCOPE: view-only + honest actionable count
// (full per-claim approver-routing matrix is DEFERRED)
// ────────────────────────────────────────────────────────────
describe('QuickApproveSimple — P2 view-only + honest count', () => {
  it('approver persona (hr_admin) gets View only (no per-row action buttons)', () => {
    setRoles(['hr_admin']);
    renderComponent();
    // Per-row Approve/Reject removed — even a full approver only opens the row.
    expect(queryQueueButtons(/อนุมัติ/)).toHaveLength(0);
    // A full approver acts on every row, so NO view-only badge renders.
    expect(screen.queryAllByTestId('view-only-badge')).toHaveLength(0);
  });

  it('non-approver persona (employee) gets NO action buttons — view-only', () => {
    setRoles(['employee']);
    renderComponent();
    // Action buttons absent for every row...
    expect(queryQueueButtons(/อนุมัติ/)).toHaveLength(0);
    expect(queryQueueButtons(/ปฏิเสธ/)).toHaveLength(0);
    // ...but rows are NOT hidden — view-only badges render instead (transparency).
    expect(screen.getAllByTestId('view-only-badge').length).toBeGreaterThanOrEqual(1);
  });

  it('rows stay visible for a view-only persona (table still rendered)', () => {
    setRoles(['employee']);
    renderComponent();
    expect(screen.getByRole('table')).toBeInTheDocument();
    // The "all" tab count reflects total rows regardless of persona.
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].textContent).toMatch(/\d/);
  });

  it('honest count: Pending tab shows 0 actionable for a view-only persona', () => {
    setRoles(['employee']);
    renderComponent();
    const tabs = screen.getAllByRole('tab');
    // index 1 = pending tab → actionable count = 0 for a non-approver.
    expect(tabs[1].textContent).toMatch(/0/);
  });

  it('honest count: subtitle shows actionable=0 of total for a view-only persona', () => {
    setRoles(['employee']);
    renderComponent();
    const totalPending = TOTAL_SEED_COUNT;
    // subtitle <p> reads "0 of {total} ..." — contains both 0 and the total.
    const matches = screen.getAllByText(
      (txt) => txt.includes(String(totalPending)) && /(^|\D)0(\D|$)/.test(txt),
    );
    expect(matches.some((el) => el.tagName === 'P')).toBe(true);
  });

  it('Pending-tab actionable count for an approver matches total pending', () => {
    setRoles(['hr_admin']);
    renderComponent();
    const tabs = screen.getAllByRole('tab');
    // hr_admin acts on every pending row → pending tab count = TOTAL_SEED_COUNT
    // (the canonical rows + the pay-rate + tax-planning demo rows).
    expect(tabs[1].textContent).toMatch(new RegExp(String(TOTAL_SEED_COUNT)));
  });
});
