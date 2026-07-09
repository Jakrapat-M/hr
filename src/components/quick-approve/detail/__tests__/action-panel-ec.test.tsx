/**
 * action-panel-ec.test.tsx — STA-178
 * EC-module requests (change_request / probation / transfer): HR can only
 * Approve or Send back (Return). Reject / Reroute / Override must be withheld.
 * Non-EC requests keep the full action set.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import thMessages from '../../../../../messages/th.json';
import { ActionPanel } from '../ActionPanel';
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/rbac';
import type { RequestType } from '@/lib/quick-approve-api';

function setRoles(roles: Role[]) {
  useAuthStore.setState({
    roles,
    isAuthenticated: true,
    _hasHydrated: true,
  } as Parameters<typeof useAuthStore.setState>[0]);
}

beforeEach(() => {
  // hr_admin has approve + reroute + override capabilities (full action set).
  setRoles(['hr_admin']);
});

function renderPanel(requestType: RequestType) {
  return render(
    <NextIntlClientProvider locale="th" messages={thMessages}>
      <ActionPanel requestId="req-1" requestType={requestType} actable />
    </NextIntlClientProvider>,
  );
}

// th labels (quick_approve_detail): approve=อนุมัติ reject=ปฏิเสธ return=ส่งกลับ
// reroute=ส่งต่อ override=Override
const APPROVE = /อนุมัติ/;
const REJECT = /ปฏิเสธ/;
const RETURN = /ส่งกลับ/;
const REROUTE = /ส่งต่อ/;
const OVERRIDE = /Override/;

describe('ActionPanel — STA-178 EC action constraint', () => {
  it.each(['change_request', 'probation', 'transfer'] as RequestType[])(
    'EC type %s shows only Approve + Send back',
    (type) => {
      renderPanel(type);
      expect(screen.getByRole('button', { name: APPROVE })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: RETURN })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: REJECT })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: REROUTE })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: OVERRIDE })).not.toBeInTheDocument();
    },
  );

  it('non-EC type (leave) keeps the full action set', () => {
    renderPanel('leave');
    expect(screen.getByRole('button', { name: APPROVE })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: RETURN })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: REJECT })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: REROUTE })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: OVERRIDE })).toBeInTheDocument();
  });

  it('claim still hides Reject (pre-existing rule, unaffected by EC change)', () => {
    renderPanel('claim');
    expect(screen.getByRole('button', { name: APPROVE })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: REJECT })).not.toBeInTheDocument();
  });
});
