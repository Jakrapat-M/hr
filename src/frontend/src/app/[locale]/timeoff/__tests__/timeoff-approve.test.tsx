/**
 * timeoff-approve.test.tsx — Group A reconcile (spec A6): /timeoff is submit +
 * status-tracking ONLY. The inline manager Approve/Reject surface (and the
 * no-op "บันทึกร่าง" draft affordance) were removed — approval now lives in
 * /quick-approve + /workflows/leave/[id]. The full-policy modal still works.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import HumiTimeoffPage from '../page';

let mockTab: string | null = null;
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockTab ? `tab=${mockTab}` : ''),
  useParams: () => ({ locale: 'th' }),
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
    render(<HumiTimeoffPage />);
    expect(screen.queryByRole('button', { name: 'อนุมัติ' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ปฏิเสธ' })).toBeNull();
  });

  it('has no inline approve tab', () => {
    render(<HumiTimeoffPage />);
    expect(screen.queryByRole('tab', { name: /รออนุมัติ/ })).toBeNull();
  });

  it('opens the full leave-policy modal from "อ่านนโยบายฉบับเต็ม"', () => {
    render(<HumiTimeoffPage />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'อ่านนโยบายฉบับเต็ม' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/ยกยอดไปใช้ในปีถัดไป/)).toBeInTheDocument();
  });

  it('shows the submit button on the request tab', () => {
    mockTab = 'request';
    render(<HumiTimeoffPage />);
    expect(screen.getByRole('button', { name: 'ส่งคำขอ' })).toBeInTheDocument();
  });
});
