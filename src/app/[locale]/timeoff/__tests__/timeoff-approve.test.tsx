/**
 * timeoff-approve.test.tsx — Group A reconcile (spec A6): /timeoff is a
 * create-only submit surface. The inline manager Approve/Reject surface (and the
 * no-op "บันทึกร่าง" draft affordance) were removed — approval now lives in
 * /quick-approve + /workflows/leave/[id]. Status/history lives on
 * /time/my-requests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CnextTimeoffPage from '../page';

let mockTab: string | null = null;
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockTab ? `tab=${mockTab}` : ''),
  useParams: () => ({ locale: 'th' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (s: { roles: string[]; userId: string | null; username: string | null }) => unknown,
  ) => selector({ roles: ['manager'], userId: 'EMP001', username: 'สมชาย ใจดี' }),
}));

beforeEach(() => {
  mockTab = null;
});

describe('Timeoff — approval moved out of /timeoff (spec A6)', () => {
  it('renders NO inline Approve/Reject buttons for a manager', () => {
    render(<CnextTimeoffPage />);
    expect(screen.queryByRole('button', { name: 'อนุมัติ' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ปฏิเสธ' })).toBeNull();
  });

  it('has no inline approve tab', () => {
    render(<CnextTimeoffPage />);
    expect(screen.queryByRole('tab', { name: /รออนุมัติ/ })).toBeNull();
  });

  it('shows the submit button on the create form', () => {
    render(<CnextTimeoffPage />);
    expect(screen.getByRole('button', { name: 'ส่งคำขอ' })).toBeInTheDocument();
  });
});
