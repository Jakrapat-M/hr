/**
 * timeoff-approve.test.tsx — PR-3 (clickable-HRMS) focused tests.
 * AC-3.1: the previously-dead manager Approve/Reject buttons, "Save Draft", and
 * "Read full policy" controls now produce a visible state change / toast / modal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import HumiTimeoffPage from '../page';

// /timeoff reads ?tab=… via next/navigation useSearchParams. Default to the
// manager approval tab so the Approve/Reject controls render immediately.
let mockTab = 'approve';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockTab ? `tab=${mockTab}` : ''),
}));

// The approve tab is reviewer-gated (canReview, /timeoff page.tsx ~152). These
// dead-button tests target the manager approval surface, so render as a manager.
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { roles: string[] }) => unknown) =>
    selector({ roles: ['manager'] }),
}));

beforeEach(() => {
  mockTab = 'approve';
});

describe('Timeoff manager approval — AC-3.1 dead-button wiring', () => {
  it('flips a pending row to an approved chip and shows a toast on Approve', () => {
    render(<HumiTimeoffPage />);

    // The seeded HUMI_LEAVE_PENDING row for ปิยะนุช must render with an Approve button.
    const approveButtons = screen.getAllByRole('button', { name: 'อนุมัติ' });
    expect(approveButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(approveButtons[0]);

    // Terminal chip replaces the action buttons for that row.
    expect(screen.getByText('อนุมัติแล้ว')).toBeInTheDocument();
    // Confirmation toast appears.
    expect(screen.getByText(/อนุมัติคำขอลาของ/)).toBeInTheDocument();
  });

  it('flips a pending row to a rejected chip on Reject', () => {
    render(<HumiTimeoffPage />);

    const rejectButtons = screen.getAllByRole('button', { name: 'ปฏิเสธ' });
    fireEvent.click(rejectButtons[0]);

    expect(screen.getByText('ไม่อนุมัติ')).toBeInTheDocument();
    expect(screen.getByText(/ปฏิเสธคำขอลาของ/)).toBeInTheDocument();
  });

  it('opens the full leave-policy modal from "อ่านนโยบายฉบับเต็ม"', () => {
    render(<HumiTimeoffPage />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'อ่านนโยบายฉบับเต็ม' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/ยกยอดไปใช้ในปีถัดไป/)).toBeInTheDocument();
  });

  it('shows a draft-saved toast from "บันทึกร่าง" on the request tab', () => {
    mockTab = 'request';
    render(<HumiTimeoffPage />);

    fireEvent.click(screen.getByRole('button', { name: 'บันทึกร่าง' }));
    expect(screen.getByText(/บันทึกร่างคำขอลาแล้ว/)).toBeInTheDocument();
  });
});
