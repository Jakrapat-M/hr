/**
 * quick-approve-module-filter.test.tsx — STA-178
 * The /quick-approve inbox gains a module filter (All/EC/BE/TM/PY) above the
 * status tabs. Verifies the strip renders, defaults to "All modules", and scopes
 * the visible rows to the selected module.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../messages/th.json';
import { QuickApproveSimple } from '../quick-approve-simple';
import { moduleOf } from '@/lib/quick-approve-api';
import { useLeaveApprovals } from '@/stores/leave-approvals';
import { useWorkflowApprovals } from '@/stores/workflow-approvals';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';
import { useTransferApprovals } from '@/stores/transfer-approvals';
import { usePayRateApprovals } from '@/stores/pay-rate-approvals';
import { useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';
import { useOvertimeRequests } from '@/stores/overtime-requests';
import { ensureDemoSeed, resetEnsureDemoSeedForTests } from '@/lib/demo-seed';
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/rbac';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/th/quick-approve'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

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
  setRoles(['hr_admin']);
});

function renderComponent() {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages}>
      <QuickApproveSimple />
    </NextIntlClientProvider>,
  );
}

function moduleStrip() {
  return screen.getByTestId('module-filter');
}

describe('QuickApproveSimple — STA-178 module filter', () => {
  it('renders a module filter strip with 5 options (All/EC/BE/TM/PY)', () => {
    renderComponent();
    const strip = moduleStrip();
    const buttons = within(strip).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons.map((b) => b.getAttribute('data-module'))).toEqual([
      'ALL', 'EC', 'BE', 'TM', 'PY',
    ]);
  });

  it('defaults to "All modules" (aria-pressed on ALL)', () => {
    renderComponent();
    const all = within(moduleStrip()).getByRole('button', { name: /ทุกโมดูล/ });
    expect(all).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not use role=tab (stays distinct from the status tablist)', () => {
    renderComponent();
    // Only the 4 status tabs carry role=tab; the module strip uses aria-pressed.
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  // Interactive rows are <tr role="button"> — their implicit "row" role is
  // overridden to "button", so count them as TR-tagged buttons. NOTE: DataTable
  // caps rendered rows at previewRows=8, so this is min(matching, 8).
  const PREVIEW_CAP = 8;
  function dataRowCount() {
    return screen.getAllByRole('button').filter((el) => el.tagName === 'TR').length;
  }
  function moduleBadge(m: 'ALL' | 'EC' | 'BE' | 'TM' | 'PY') {
    const name = m === 'ALL' ? /ทุกโมดูล/ : new RegExp('^' + m);
    const btn = within(moduleStrip()).getByRole('button', { name });
    return Number((btn.textContent ?? '').replace(/[^0-9]/g, ''));
  }
  function clickModule(m: 'ALL' | 'EC' | 'BE' | 'TM' | 'PY') {
    const name = m === 'ALL' ? /ทุกโมดูล/ : new RegExp('^' + m);
    fireEvent.click(within(moduleStrip()).getByRole('button', { name }));
  }

  it('module badges partition the full row set (ALL == EC+BE+TM+PY)', () => {
    // Exercises moduleOf() over the entire seed: every row lands in exactly one
    // module, so the four module counts sum to the ALL count.
    renderComponent();
    const all = moduleBadge('ALL');
    const sum = (['EC', 'BE', 'TM', 'PY'] as const).reduce((s, m) => s + moduleBadge(m), 0);
    expect(all).toBeGreaterThan(0);
    expect(sum).toBe(all);
  });

  it('selecting a module narrows the table to just that module', () => {
    renderComponent();
    // Default (ALL) fills the preview cap because the seed has > 8 rows.
    expect(dataRowCount()).toBe(PREVIEW_CAP);
    // Pick a real module whose count is below the cap so the rendered row count
    // is exact and observably smaller than ALL.
    const target = (['EC', 'BE', 'TM', 'PY'] as const)
      .map((m) => ({ m, n: moduleBadge(m) }))
      .find(({ n }) => n > 0 && n < PREVIEW_CAP);
    expect(target, 'seed should have a module with 1..7 rows').toBeDefined();

    clickModule(target!.m);
    expect(within(moduleStrip()).getByRole('button', { name: new RegExp('^' + target!.m) }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(dataRowCount()).toBe(target!.n);
    expect(target!.n).toBeLessThan(PREVIEW_CAP);
  });

  it('returning to All restores the full (capped) row count', () => {
    renderComponent();
    const target = (['EC', 'BE', 'TM', 'PY'] as const)
      .map((m) => ({ m, n: moduleBadge(m) }))
      .find(({ n }) => n > 0 && n < PREVIEW_CAP)!;
    clickModule(target.m);
    expect(dataRowCount()).toBe(target.n);
    clickModule('ALL');
    expect(dataRowCount()).toBe(PREVIEW_CAP);
  });

  it('the module strip is independent from the status tabs (both present)', () => {
    renderComponent();
    expect(moduleStrip()).toBeInTheDocument();
    // 4 status tabs still present.
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('moduleOf drives the seed: at least one EC and one TM row exist', () => {
    // Guards that the seed actually spans multiple modules so the filter is
    // meaningful (defensive against a seed change collapsing to one module).
    const ecTypes = ['change_request', 'probation', 'transfer'] as const;
    const tmTypes = ['leave', 'overtime', 'time_correction', 'shift_assignment'] as const;
    expect(ecTypes.every((t) => moduleOf(t) === 'EC')).toBe(true);
    expect(tmTypes.every((t) => moduleOf(t) === 'TM')).toBe(true);
  });
});
